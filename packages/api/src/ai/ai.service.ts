import { Injectable, Optional, ServiceUnavailableException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ConcurrencyLimiter } from './concurrency-limiter';
import { AiConfig, AiTier } from '../config/ai.config';
import { OpsEventsService } from '../ops/ops-events.service';

interface CompleteParams {
  system: string;
  prompt: string;
  tools?: Anthropic.Tool[];
  maxTokens?: number;
  // 场景档位:'pro' 走重档型号(诊断/改写核心产出),'flash'(默认)走轻档(解析类)。
  tier?: AiTier;
}

interface CompleteStructuredParams {
  system: string;
  prompt: string;
  toolName: string;
  toolDescription: string;
  schema: Record<string, unknown>;
  // 结构化输出默认上限 8192:4合1/比对类重 schema 在 4096 下易被截断。可按调用方上调。
  maxTokens?: number;
  tier?: AiTier;
}

interface ChatParams {
  system: string;
  // 真多轮:user/assistant 交替的完整消息数组(首条须 user)。
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  tier?: AiTier;
}

// 通道:封装 SDK client + 按 tier 选型号的 modelFor。deepseek 直连按档分型号,relay 中转单一别名。
interface Provider {
  name: string;
  client: Anthropic;
  modelFor: (tier: AiTier) => string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  // 按 AI_PRIMARY_PROVIDER 排序后的可用通道:[0]=主、[1]=备(若存在)。
  private readonly providers: Provider[];

  constructor(
    private readonly limiter: ConcurrencyLimiter,
    @Optional() private readonly opsEvents: OpsEventsService | undefined,
    config: ConfigService,
  ) {
    const ai = config.get<AiConfig>('ai')!;

    // DeepSeek 直连官方(Anthropic 兼容端点,支持 SSE 流式)。按 tier 选 pro/flash 型号。
    // 默认 maxRetries=3:SDK 对瞬时连接错误(Connection error/ECONNRESET/5xx/429)自动指数退避重试,
    // 使单次网络抖动不再直接冒泡成 503。
    const deepseek: Provider | null = ai.deepseek.apiKey
      ? {
          name: 'deepseek',
          client: new Anthropic({
            apiKey: ai.deepseek.apiKey,
            baseURL: ai.deepseek.baseURL,
            timeout: ai.deepseek.timeoutMs,
            maxRetries: ai.deepseek.maxRetries,
          }),
          modelFor: (tier) => (tier === 'pro' ? ai.deepseek.modelPro : ai.deepseek.modelFlash),
        }
      : null;

    // CloudDreamAI 中转(auto-v2):pro/flash 共用同一别名(降档保命)。默认 maxRetries=0 快速失败,
    // 交由降级逻辑切另一通道,避免中转挂起时长时间阻塞。
    const relay: Provider | null = ai.relay.apiKey
      ? {
          name: 'relay',
          client: new Anthropic({
            apiKey: ai.relay.apiKey,
            baseURL: ai.relay.baseURL,
            timeout: ai.relay.timeoutMs,
            maxRetries: ai.relay.maxRetries,
          }),
          modelFor: () => ai.relay.model,
        }
      : null;

    // 按通道顺序排列:测试期默认 deepseek 在前。配置的主通道无密钥时,顺位由另一通道顶上。
    const ordered =
      ai.primaryProvider === 'relay' ? [relay, deepseek] : [deepseek, relay];
    this.providers = ordered.filter((p): p is Provider => p !== null);

    if (this.providers.length === 0) {
      throw new Error(
        '至少需要配置一个 AI 通道密钥(AI_DEEPSEEK_API_KEY 或 AI_RELAY_API_KEY,或旧名 DEEPSEEK_API_KEY/CLOUDDREAM_API_KEY)',
      );
    }
  }

  async complete(params: CompleteParams): Promise<string> {
    const { system, prompt, tools, maxTokens = 4096, tier = 'flash' } = params;
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
        provider.client.messages.create(build(provider.modelFor(tier))),
      );
      for (const block of response.content) {
        if (block.type === 'text' && block.text.length > 0) return block.text;
      }
      // 无 text 块(或仅空 text):中转偶发对纯文本请求返回空块。绝不静默返回 '' ——
      // 否则求职信等用户面产物会被持久化为空白。抛错交 withFailover 重试/降级,两通道皆空才 503。
      throw new Error(`通道 ${provider.name} 返回无文本内容,无法生成结果`);
    });
  }

  async completeStructured<T>(params: CompleteStructuredParams): Promise<T> {
    const { system, prompt, toolName, toolDescription, schema, maxTokens = 8192, tier = 'flash' } =
      params;

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
      this.attemptStructured<T>(provider, build(provider.modelFor(tier)), toolName, schema),
    );
  }

  /**
   * 多轮对话(流式)。返回增量文本的 async iterable:逐 chunk 交付,供上层(B2 SSE)推送给前端。
   * 降级语义:**首 token 之前**任一通道失败 → 切下一通道重试;**首 token 之后**通道失败 → 直接上抛
   * 明确错误(不静默换通道重发——否则用户会看到前半段重复)。所有通道在首 token 前皆失败 → 503。
   */
  async *chat(params: ChatParams): AsyncGenerator<string, void, void> {
    const { system, messages, maxTokens = 4096, tier = 'flash' } = params;
    const build = (model: string): Anthropic.MessageStreamParams => ({
      model,
      max_tokens: maxTokens,
      system,
      messages,
    });

    let lastErr: unknown;
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      const isLast = i === this.providers.length - 1;
      let emitted = false;
      try {
        // 流式调用仍占并发槽:runStreaming 在整段流消费完毕(或抛错/提前关闭)后才释放槽位,
        // 避免后半段流脱离并发护栏。
        const chunks = this.limiter.runStreaming(() =>
          this.streamProvider(provider, build(provider.modelFor(tier))),
        );
        for await (const text of chunks) {
          emitted = true;
          yield text;
        }
        return;
      } catch (err) {
        lastErr = err;
        if (emitted) {
          // 首 token 之后失败:绝不换通道重发(会让用户看到重复内容)。上抛明确错误。
          throw new Error(
            `通道 ${provider.name} 流式中途失败(已输出部分内容,不重试):${this.errMsg(err)}`,
          );
        }
        if (isLast) break;
        // 首 token 之前失败:可安全切下一通道。
        this.logger.warn(
          `chat: 通道 ${provider.name} 首 token 前失败,切下一通道 —— ${this.errMsg(err)}`,
        );
        const next = this.providers[i + 1];
        void this.opsEvents
          ?.record('AI_FAILOVER', {
            op: 'chat',
            primary: provider.name,
            fallback: next.name,
            error: this.errMsg(err),
          })
          .catch((e: unknown) =>
            this.logger.warn(`OpsEvents AI_FAILOVER 写入失败:${this.errMsg(e)}`),
          );
      }
    }
    // 所有通道首 token 前皆失败。
    void this.opsEvents
      ?.record('AI_BOTH_DOWN', {
        op: 'chat',
        providers: this.providers.map((p) => p.name).join(','),
        error: this.errMsg(lastErr),
      })
      .catch((e: unknown) => this.logger.warn(`OpsEvents AI_BOTH_DOWN 写入失败:${this.errMsg(e)}`));
    throw this.unavailable('chat', lastErr);
  }

  // 用 SDK messages.stream 消费 SSE,逐 text_delta 产出增量文本。
  // 该生成器的首次 yield 即"首 token 到达";其前抛错代表首 token 前失败(可切通道)。
  private async *streamProvider(
    provider: Provider,
    params: Anthropic.MessageStreamParams,
  ): AsyncGenerator<string, void, void> {
    const stream = provider.client.messages.stream(params);
    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta' &&
        event.delta.text.length > 0
      ) {
        yield event.delta.text;
      }
    }
  }

  // 默认走主通道(providers[0]);失败按顺序降级到后续通道;全部失败才抛 503。
  private async withFailover<T>(op: string, run: (provider: Provider) => Promise<T>): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      try {
        return await run(provider);
      } catch (err) {
        lastErr = err;
        const next = this.providers[i + 1];
        if (!next) break;
        this.logger.warn(
          `${op}: 主通道(${provider.name})失败,降级到备用(${next.name}) —— ${this.errMsg(err)}`,
        );
        // 记录降级事件;catch 吞掉写入失败,不阻断主流程;opsEvents 不存在(单元测试无 DB)则跳过
        void this.opsEvents
          ?.record('AI_FAILOVER', { op, primary: provider.name, fallback: next.name, error: this.errMsg(err) })
          .catch((e: unknown) => this.logger.warn(`OpsEvents AI_FAILOVER 写入失败:${this.errMsg(e)}`));
      }
    }
    // 全部通道失败:记录两通道皆败事件后抛 503。
    void this.opsEvents
      ?.record('AI_BOTH_DOWN', {
        op,
        providers: this.providers.map((p) => p.name).join(','),
        error: this.errMsg(lastErr),
      })
      .catch((e: unknown) => this.logger.warn(`OpsEvents AI_BOTH_DOWN 写入失败:${this.errMsg(e)}`));
    throw this.unavailable(op, lastErr);
  }

  private async attemptStructured<T>(
    provider: Provider,
    messageParams: Anthropic.MessageCreateParamsNonStreaming,
    toolName: string,
    schema: Record<string, unknown>,
  ): Promise<T> {
    // 中转偶发对强制 tool_use 返回空块、缺 required 字段或被 max_tokens 截断的残缺 JSON:最多取 3 次完整。
    // 全部失败视为该通道失败(抛错),交由 withFailover 决定是否降级——绝不把残缺/截断结果当成功返回(防编造红线)。
    const ATTEMPTS = 4;
    // 重型工具(如 profession_standard_review)在 DeepSeek 思考模式 + 强制特定工具下会发生 prefill text-mode
    // 锁定:返回空 tool_use,且重发"完全相同"的请求往往持续锁定(社区实测:同参重试不解锁)。
    // 双重扰动打破锁定:① 失败后给 user 消息追加纠正提示;② 逐次抬高 temperature(社区实测高温恢复 tool-call,
    // 见 DeepSeek-V3 #826),使采样路径偏离锁定态。仅扰动 user 文本 + temperature(不构造 tool_use/tool_result
    // 多轮,避免违反工具调用配对协议),绝不污染原始入参。
    const baseUserText = this.firstUserText(messageParams.messages);
    for (let i = 0; i < ATTEMPTS; i++) {
      const userText =
        i === 0
          ? baseUserText
          : `${baseUserText}\n\n[系统提示] 上一次未能通过工具 "${toolName}" 返回完整结果(空调用或字段残缺)。请立即且只能调用该工具,把所有字段填满后返回,不要输出任何正文。`;
      const params: Anthropic.MessageCreateParamsNonStreaming = {
        ...messageParams,
        messages: [{ role: 'user', content: userText }],
        // 首次默认采样;失败后抬温(0.4/0.8/1.0)打破确定性 prefill 锁定,不影响成功首跑的稳定性。
        ...(i > 0 ? { temperature: Math.min(0.4 + (i - 1) * 0.3, 1) } : {}),
      };
      const response = await this.limiter.run(() => provider.client.messages.create(params));
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
    // oneOf/anyOf:匹配任一分支即通过。常用于"对象 或 null"等联合(如 {oneOf:[{type:'object',...},{type:'null'}]}),
    // {type:'null'} 分支天然允许 null。模型只要命中其中一支即视为合法,不强求全部满足。
    const branches = (schema.oneOf ?? schema.anyOf) as Record<string, unknown>[] | undefined;
    if (Array.isArray(branches) && branches.length > 0) {
      return branches.some((branch) => this.validateAgainstSchema(value, branch));
    }

    const type = schema.type as string | undefined;
    if (type === 'null') return value === null;

    // enum:仅当值存在且非法时判失败(缺失/null 由上层 required 逻辑管,此处不误伤)。
    // 真实模型偶发枚举漂移走既有重试链(retry→降级),不直接放大成 503。
    const enumValues = schema.enum as unknown[] | undefined;
    if (Array.isArray(enumValues) && value !== undefined && value !== null) {
      if (!enumValues.includes(value)) return false;
    }

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

  // 取首条 user 消息的文本(completeStructured 的 messages 恒为 [{role:'user', content: string}])。
  // content 为数组形态时拼接其 text 块;无文本则回退空串(纠正轮提示仍可独立生效)。
  private firstUserText(messages: Anthropic.MessageParam[]): string {
    const first = messages.find((m) => m.role === 'user');
    if (!first) return '';
    if (typeof first.content === 'string') return first.content;
    return first.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .filter((t) => t.length > 0)
      .join('\n');
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
