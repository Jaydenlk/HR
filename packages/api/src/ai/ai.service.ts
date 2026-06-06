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

    // 主通道:CloudDreamAI 中转(auto-v2)。超时即失败(maxRetries=0),交由降级逻辑切备用,
    // 避免中转挂起时长时间阻塞。超时阈值可经 AI_PRIMARY_TIMEOUT_MS 调整。
    this.primary = {
      name: ai.primary.model,
      model: ai.primary.model,
      client: new Anthropic({
        apiKey: ai.primary.apiKey,
        baseURL: ai.primary.baseURL,
        timeout: ai.primary.timeoutMs,
        maxRetries: 0,
      }),
    };

    // 备用通道:DeepSeek(Anthropic 兼容端点)。仅当配置了 DEEPSEEK_API_KEY 时启用。
    this.fallback = ai.fallback.apiKey
      ? {
          name: ai.fallback.model,
          model: ai.fallback.model,
          client: new Anthropic({
            apiKey: ai.fallback.apiKey,
            baseURL: ai.fallback.baseURL,
            timeout: ai.fallback.timeoutMs,
            maxRetries: 1,
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
    const { system, prompt, toolName, toolDescription, schema } = params;

    const tool: Anthropic.Tool = {
      name: toolName,
      description: toolDescription,
      input_schema: schema as Anthropic.Tool['input_schema'],
    };

    const build = (model: string): Anthropic.MessageCreateParamsNonStreaming => ({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: prompt }],
      tools: [tool],
      tool_choice: { type: 'tool', name: toolName },
    });

    return this.withFailover('completeStructured', (provider) =>
      this.attemptStructured<T>(provider, build(provider.model), toolName),
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
  ): Promise<T> {
    // 中转偶发对强制 tool_use 返回空块({} 或无 tool_use),个位数概率、与业务无关:最多取 3 次非空。
    // 全空视为该通道失败(抛错),交由 withFailover 决定是否降级。
    const ATTEMPTS = 3;
    for (let i = 0; i < ATTEMPTS; i++) {
      const input = this.extractToolInput<T>(
        await this.limiter.run(() => provider.client.messages.create(messageParams)),
        toolName,
      );
      if (input !== null) {
        return input;
      }
    }
    throw new Error(`通道 ${provider.name} 对工具 "${toolName}" 连续 ${ATTEMPTS} 次返回空结果`);
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
