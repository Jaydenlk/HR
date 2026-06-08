import { Injectable, ServiceUnavailableException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ConcurrencyLimiter } from './concurrency-limiter';
import { AiConfig } from '../config/ai.config';

interface CompleteParams {
  system: string;
  prompt: string;
  tools?: Anthropic.Tool[];
  maxTokens?: number;
}

interface CompleteStructuredParams {
  system: string;
  prompt: string;
  toolName: string;
  toolDescription: string;
  schema: Record<string, unknown>;
  // 结构化输出默认上限 8192:4合1/比对类重 schema 在 4096 下易被截断。可按调用方上调。
  maxTokens?: number;
}

interface Provider {
  name: string;
  client: Anthropic;
  model: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly primary: Provider;
  private readonly fallback: Provider | null;

  constructor(
    private readonly limiter: ConcurrencyLimiter,
    config: ConfigService,
  ) {
    const ai = config.get<AiConfig>('ai')!;

    if (!ai.primary.apiKey) {
      throw new Error('CLOUDDREAM_API_KEY is required but not set');
    }

    // 主通道:CloudDreamAI 中转(auto-v2)。默认 maxRetries=0 快速失败,交由降级逻辑切备用,
    // 避免中转挂起时长时间阻塞。超时/重试经 AI_PRIMARY_TIMEOUT_MS / AI_PRIMARY_MAX_RETRIES 调整。
    this.primary = {
      name: ai.primary.model,
      model: ai.primary.model,
      client: new Anthropic({
        apiKey: ai.primary.apiKey,
        baseURL: ai.primary.baseURL,
        timeout: ai.primary.timeoutMs,
        maxRetries: ai.primary.maxRetries,
      }),
    };

    // 备用通道:DeepSeek(Anthropic 兼容端点)。仅当配置了 DEEPSEEK_API_KEY 时启用。
    // 默认 maxRetries=3:SDK 对瞬时连接错误(Connection error/ECONNRESET/5xx/429)自动指数退避重试,
    // 使单次网络抖动不再直接冒泡成 503。可经 AI_FALLBACK_MAX_RETRIES 调整。
    this.fallback = ai.fallback.apiKey
      ? {
          name: ai.fallback.model,
          model: ai.fallback.model,
          client: new Anthropic({
            apiKey: ai.fallback.apiKey,
            baseURL: ai.fallback.baseURL,
            timeout: ai.fallback.timeoutMs,
            maxRetries: ai.fallback.maxRetries,
          }),
        }
      : null;
  }

  async complete(params: CompleteParams): Promise<string> {
    const { system, prompt, tools, maxTokens = 4096 } = params;
    const build = (model: string): Anthropic.MessageCreateParamsNonStreaming => {
      const p: Anthropic.MessageCreateParamsNonStreaming = {
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
      };
      if (tools && tools.length > 0) p.tools = tools;
      return p;
    };

    return this.withFailover('complete', async (provider) => {
      const response = await this.limiter.run(() =>
        provider.client.messages.create(build(provider.model)),
      );
      for (const block of response.content) {
        if (block.type === 'text') return block.text;
      }
      return '';
    });
  }

  async completeStructured<T>(params: CompleteStructuredParams): Promise<T> {
    const { system, prompt, toolName, toolDescription, schema, maxTokens = 8192 } = params;

    const tool: Anthropic.Tool = {
      name: toolName,
      description: toolDescription,
      input_schema: schema as Anthropic.Tool['input_schema'],
    };

    const build = (model: string): Anthropic.MessageCreateParamsNonStreaming => ({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
      tools: [tool],
      tool_choice: { type: 'tool', name: toolName },
    });

    return this.withFailover('completeStructured', (provider) =>
      this.attemptStructured<T>(provider, build(provider.model), toolName, schema),
    );
  }

  // 默认走主通道;主通道抛错(超时/连接/5xx/空块耗尽)即降级到备用通道;两者都失败才抛 503。
  private async withFailover<T>(op: string, run: (provider: Provider) => Promise<T>): Promise<T> {
    try {
      return await run(this.primary);
    } catch (primaryErr) {
      if (!this.fallback) {
        throw this.unavailable(op, primaryErr);
      }
      this.logger.warn(
        `${op}: 主通道(${this.primary.name})失败,降级到备用(${this.fallback.name}) —— ${this.errMsg(primaryErr)}`,
      );
      try {
        return await run(this.fallback);
      } catch (fallbackErr) {
        throw this.unavailable(op, fallbackErr);
      }
    }
  }

  private async attemptStructured<T>(
    provider: Provider,
    messageParams: Anthropic.MessageCreateParamsNonStreaming,
    toolName: string,
    schema: Record<string, unknown>,
  ): Promise<T> {
    // 中转偶发对强制 tool_use 返回空块、缺 required 字段或被 max_tokens 截断的残缺 JSON:最多取 3 次完整。
    // 全部失败视为该通道失败(抛错),交由 withFailover 决定是否降级——绝不把残缺/截断结果当成功返回(防编造红线)。
    const ATTEMPTS = 3;
    for (let i = 0; i < ATTEMPTS; i++) {
      const response = await this.limiter.run(() => provider.client.messages.create(messageParams));
      // 截断检测:max_tokens 处截断的 tool_use 是残缺 JSON,继续用会静默落库不完整数据,必须当失败处理。
      if (response.stop_reason === 'max_tokens') {
        throw new Error(
          `通道 ${provider.name} 工具 "${toolName}" 输出在 max_tokens 处被截断,结构化结果不完整`,
        );
      }
      const input = this.extractToolInput<T>(response, toolName);
      if (input !== null && this.validateAgainstSchema(input, schema)) {
        return input;
      }
    }
    throw new Error(`通道 ${provider.name} 对工具 "${toolName}" 连续 ${ATTEMPTS} 次返回空/不完整结果`);
  }

  // 运行期 schema 校验:Anthropic input_schema 仅作提示不强制,模型可漏 required 字段。
  // 校验"required 字段存在 + 容器/标量类型正确",递归进嵌套对象与数组元素。
  // 校验失败 → 当作该次失败(retry / 降级 / 最终 503),而非把残缺对象 `as T` 透传给下游导致 .map/.length 崩。
  private validateAgainstSchema(value: unknown, schema: Record<string, unknown>): boolean {
    const type = schema.type as string | undefined;
    if (type === 'object') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
      const obj = value as Record<string, unknown>;
      const required = (schema.required as string[] | undefined) ?? [];
      const props = (schema.properties as Record<string, Record<string, unknown>> | undefined) ?? {};
      for (const key of required) {
        const v = obj[key];
        // 缺字段(undefined)一律视为不完整 → 重试/降级。
        // 但 null 是"无数据"的合法信号(防编造:如 salary_range_estimate 无来源时返回 null);
        // 仅当该字段是数组类型时 null 才非法(下游会对其 .map/.length 而崩),其余 null 放行。
        if (v === undefined) return false;
        if (v === null && (props[key]?.type as string | undefined) === 'array') return false;
      }
      for (const [key, sub] of Object.entries(props)) {
        const v = obj[key];
        if (v !== undefined && v !== null && !this.validateAgainstSchema(v, sub)) return false;
      }
      return true;
    }
    if (type === 'array') {
      if (!Array.isArray(value)) return false;
      const items = schema.items as Record<string, unknown> | undefined;
      if (items) {
        for (const el of value) {
          if (!this.validateAgainstSchema(el, items)) return false;
        }
      }
      return true;
    }
    if (type === 'string') return typeof value === 'string';
    if (type === 'number' || type === 'integer') return typeof value === 'number';
    if (type === 'boolean') return typeof value === 'boolean';
    return true; // 未知/未声明 type → 不阻拦
  }

  private unavailable(op: string, err: unknown): ServiceUnavailableException {
    return new ServiceUnavailableException(
      `AI 服务暂时不可用(${op} 主备通道均失败:${this.errMsg(err)}),请稍后重试。`,
    );
  }

  private errMsg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }

  private extractToolInput<T>(response: Anthropic.Message, toolName: string): T | null {
    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === toolName) {
        const input = block.input;
        if (typeof input === 'object' && input !== null && Object.keys(input).length > 0) {
          return input as T;
        }
        return null;
      }
    }
    return null;
  }
}
