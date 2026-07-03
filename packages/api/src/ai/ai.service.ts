import { Injectable, Optional, ServiceUnavailableException, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ConcurrencyLimiter } from './concurrency-limiter';
import { AiTier } from '../config/ai.config';
import { OpsEventsService } from '../ops/ops-events.service';
import { AiProviderService, LoadedProvider } from './ai-provider.service';

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
  // D1:诊断管线内层调用置 true,令底层 limiter.run 跳过二次 acquire(外层 runObservable 已持槽,
  // 避免嵌套自锁)。仅 diagnoses 管线经 analyzer/rewriter/parser 传入;其余消费方不传 → 照常受限流。
  skipLimiter?: boolean;
}

interface ChatParams {
  system: string;
  // 真多轮:user/assistant 交替的完整消息数组(首条须 user)。
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  tier?: AiTier;
  // 可选中止信号:客户端断连时由上层传入,透传给 SDK 以释放并发槽。
  signal?: AbortSignal;
}

// 通道:封装 SDK client + 按 tier 选型号的 modelFor + 协议(anthropic-compat / openai-compat)。
// 型号/baseURL/密钥/协议均来自 DB 配置(运行时解密)。openai-compat 通道(如 GLM coding 端点)
// 不经 Anthropic SDK,而用原生 fetch 直打 OpenAI Chat Completions 端点;client 字段仍保留(缓存一致)
// 但 openai 路径不使用它。
interface Provider {
  name: string;
  client: Anthropic;
  protocol: string;
  baseURL: string;
  apiKey: string;
  timeoutMs: number;
  modelFor: (tier: AiTier) => string;
}

// OpenAI Chat Completions 最小请求/响应类型(原生 fetch,不引入 openai 依赖)。
// 仅声明本服务实际读写的字段;GLM coding 端点(glm-5.1)为 OpenAI 兼容,推理模型额外返回 reasoning_content。
interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
interface OpenAiTool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}
interface OpenAiChatRequest {
  model: string;
  messages: OpenAiMessage[];
  max_tokens: number;
  temperature?: number;
  stream?: boolean;
  tools?: OpenAiTool[];
  tool_choice?: { type: 'function'; function: { name: string } };
  // GLM coding 端点认 Anthropic 风格 thinking 开关(实测 thinking:{type:'disabled'} 令 reasoning_tokens=0):
  // 结构化输出关思考,既对齐现有 anthropic 路径语义,又避免推理 token 吃光 max_tokens 致正文/工具调用空。
  thinking?: { type: 'disabled' };
}
interface OpenAiToolCall {
  function?: { name?: string; arguments?: string };
}
interface OpenAiChoice {
  finish_reason?: string;
  message?: {
    content?: string | null;
    reasoning_content?: string | null;
    tool_calls?: OpenAiToolCall[];
  };
}
interface OpenAiChatResponse {
  choices?: OpenAiChoice[];
}
// 流式 chunk:delta 携带增量 content / reasoning_content(推理增量,跳过不外吐)。
interface OpenAiStreamChunk {
  choices?: Array<{
    finish_reason?: string | null;
    delta?: { content?: string | null; reasoning_content?: string | null };
  }>;
}

// openai-compat 协议标识:与 ai-provider.entity.ts / VALID_PROTOCOLS 保持一致。
const PROTOCOL_OPENAI = 'openai-compat';
// 推理模型(GLM coding 端点 glm-5.1)非结构化产出(complete/chat)保留思考能力,但思考占 token——
// 给一个输出预算下限,防止调用方传入的极小 maxTokens(如判别器 maxTokens:8)被 reasoning 吃光致正文空。
const OPENAI_REASONING_MIN_MAX_TOKENS = 8192;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  // Anthropic client 缓存:按「baseURL|apiKey|timeout|maxRetries」签名复用,避免每次调用重建 client。
  // DB 配置变更(改 key/baseURL)→ 签名变 → 自然构造新 client;缓存对失效配置无害(下次不再命中)。
  private readonly clientCache = new Map<string, Anthropic>();

  constructor(
    private readonly limiter: ConcurrencyLimiter,
    @Optional() private readonly opsEvents: OpsEventsService | undefined,
    // provider 池源:从 ai_providers 表加载已解密、已排序的通道(带短 TTL 缓存)。
    // @Optional 兼容个别仅测纯逻辑的单测(不注入时 resolveOrder 抛 503,业务路径恒注入)。
    @Optional() private readonly providers?: AiProviderService,
  ) {}

  /** 按签名复用/构造 Anthropic client(同一通道配置只建一次)。 */
  private clientFor(p: LoadedProvider): Anthropic {
    const sig = `${p.baseURL}|${p.apiKey}|${p.timeoutMs}|${p.maxRetries}`;
    const cached = this.clientCache.get(sig);
    if (cached) return cached;
    const client = new Anthropic({
      apiKey: p.apiKey,
      baseURL: p.baseURL,
      timeout: p.timeoutMs,
      maxRetries: p.maxRetries,
    });
    this.clientCache.set(sig, client);
    return client;
  }

  /** LoadedProvider → 运行期 Provider(含 client + 协议/连接信息 + tier 选型)。 */
  private toProvider(p: LoadedProvider): Provider {
    return {
      name: p.name,
      client: this.clientFor(p),
      protocol: p.protocol,
      baseURL: p.baseURL,
      apiKey: p.apiKey,
      timeoutMs: p.timeoutMs,
      modelFor: (tier) => (tier === 'pro' ? p.modelPro : p.modelFlash),
    };
  }

  /**
   * 运行时解析通道顺序:每次 AI 调用进入时从 ai_providers 表读已解密、已排序的池(带短 TTL 缓存)。
   * 池为空 / service 缺失 → 抛 503(无可用通道,绝不静默成功);单次读取失败由 loadPool 内部容错。
   */
  private async resolveOrder(): Promise<Provider[]> {
    if (!this.providers) {
      throw new ServiceUnavailableException('AI 服务未配置任何可用通道');
    }
    const loaded = await this.providers.loadPool();
    return loaded.map((p) => this.toProvider(p));
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
      if (provider.protocol === PROTOCOL_OPENAI) {
        // openai-compat:推理模型保留思考(不关 thinking),但抬高 max_tokens 下限确保正文不被 reasoning 吃空。
        return this.openaiComplete(provider, provider.modelFor(tier), system, prompt, maxTokens);
      }
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
    const {
      system,
      prompt,
      toolName,
      toolDescription,
      schema,
      maxTokens = 8192,
      tier = 'flash',
      skipLimiter = false,
    } = params;

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
      // 关思考(ThinkingConfigDisabled={type:'disabled'}):DeepSeek v4-pro 默认思考模式与强制
      // tool_choice 冲突 → 直连返 HTTP 400 "Thinking mode does not support this tool_choice",
      // 被迫 failover 降级到 flash 才出结果(pro 档形同虚设)。结构化输出本就不需思考,显式关闭后
      // v4-pro 完全支持强制工具调用,直出 pro 质量。该字段对所有 Anthropic 兼容端点合法(显式声明
      // 不思考);备通道某型号若不识别,SDK 仅透传不报错,降级容错不受影响。
      thinking: { type: 'disabled' },
    });

    return this.withFailover('completeStructured', (provider) => {
      if (provider.protocol === PROTOCOL_OPENAI) {
        // openai-compat:OpenAI function-calling(强制 tool_choice)+ 关思考(thinking:disabled,
        // 实测 GLM coding 端点令 reasoning_tokens=0,与 anthropic 路径关思考语义一致);从 tool_calls 解析。
        return this.attemptStructuredOpenAi<T>(
          provider,
          provider.modelFor(tier),
          system,
          prompt,
          toolName,
          toolDescription,
          schema,
          maxTokens,
          skipLimiter,
        );
      }
      return this.attemptStructured<T>(
        provider,
        build(provider.modelFor(tier)),
        toolName,
        schema,
        skipLimiter,
      );
    });
  }

  /**
   * 多轮对话(流式)。返回增量文本的 async iterable:逐 chunk 交付,供上层(B2 SSE)推送给前端。
   * 降级语义:**首 token 之前**任一通道失败 → 切下一通道重试;**首 token 之后**通道失败 → 直接上抛
   * 明确错误(不静默换通道重发——否则用户会看到前半段重复)。所有通道在首 token 前皆失败 → 503。
   *
   * "干净结束但零正文"也算首 token 前失败:GLM-5.1 默认开思考,chat 不关思考,整段只产
   * reasoning_content(被静默跳过、不置位 emitted)+ 干净 [DONE] 时,流正常结束但用户一个字都没收到。
   * 此前无条件 return 会把它当成功返回空回复(用户收到空白)。现按首 token 前失败处理:切下一通道;
   * 所有通道都零正文 → 抛 503(与非流式 complete 空内容即抛错语义对齐;503 不进 CreditInterceptor 的
   * tap.next,故不扣点)。不关 chat 的思考(保留质量),靠 failover 兜底。
   */
  async *chat(params: ChatParams): AsyncGenerator<string, void, void> {
    const { system, messages, maxTokens = 4096, tier = 'flash', signal } = params;
    const build = (model: string): Anthropic.MessageStreamParams => ({
      model,
      max_tokens: maxTokens,
      system,
      messages,
    });

    const providers = await this.resolveOrder();
    let lastErr: unknown;
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const isLast = i === providers.length - 1;
      let emitted = false;
      try {
        // 流式调用仍占并发槽:runStreaming 在整段流消费完毕(或抛错/提前关闭)后才释放槽位,
        // 避免后半段流脱离并发护栏。按 protocol 分流:anthropic 走 SDK,openai 走原生 fetch SSE。
        const model = provider.modelFor(tier);
        const chunks = this.limiter.runStreaming(() =>
          provider.protocol === PROTOCOL_OPENAI
            ? this.streamProviderOpenAi(provider, model, system, messages, maxTokens, signal)
            : this.streamProvider(provider, build(model), signal),
        );
        for await (const text of chunks) {
          emitted = true;
          yield text;
        }
        // 流干净结束:有正文(emitted)→ 正常完成;零正文 → 视为首 token 前失败,落到 catch 走 failover。
        // (GLM-5.1 整段只产 reasoning_content + 干净 [DONE] 的"静默空回复"由此被切通道兜底,绝不静默成功。)
        if (emitted) return;
        throw new Error(`通道 ${provider.name} 流式干净结束但零正文(纯思考无正文),视为首 token 前失败`);
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
        const next = providers[i + 1];
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
        providers: providers.map((p) => p.name).join(','),
        error: this.errMsg(lastErr),
      })
      .catch((e: unknown) => this.logger.warn(`OpsEvents AI_BOTH_DOWN 写入失败:${this.errMsg(e)}`));
    throw this.unavailable('chat', lastErr);
  }

  // 用 SDK messages.stream 消费 SSE,逐 text_delta 产出增量文本。
  // 该生成器的首次 yield 即"首 token 到达";其前抛错代表首 token 前失败(可切通道)。
  //
  // 看门狗(watchdog-v2):per-event 空闲超时 + 总时长 deadline,与 streamProviderOpenAi 同构。
  // idle 重置点是收到任何 SDK 事件(含 thinking_delta),思考期不误杀。
  private async *streamProvider(
    provider: Provider,
    params: Anthropic.MessageStreamParams,
    signal?: AbortSignal,
  ): AsyncGenerator<string, void, void> {
    // ── 流式看门狗 ──────────────────────────────────────────────────────
    const streamAbort = new AbortController();
    const idleMs = this.streamIdleMs();
    const maxMs = this.streamMaxMs();
    const cleanupExternalSignal = this.forwardAbort(signal, streamAbort);
    const deadlineTimer = setTimeout(() => {
      this.logger.warn(`streamProvider: 流式总时长超过 ${maxMs}ms,强制中止`);
      streamAbort.abort();
    }, maxMs);
    if (typeof deadlineTimer === 'object' && 'unref' in deadlineTimer) deadlineTimer.unref();
    let idleTimer = this.startIdleTimer(idleMs, streamAbort, 'streamProvider');

    // 传 streamAbort.signal 给 SDK:abort 时 SDK 中止底层 fetch,async iterator 抛错退出。
    const stream = provider.client.messages.stream(params, { signal: streamAbort.signal });
    try {
      for await (const event of stream) {
        // 收到任何 SDK 事件即重置 idle(含 thinking_delta、content_block_start 等)。
        clearTimeout(idleTimer);
        idleTimer = this.startIdleTimer(idleMs, streamAbort, 'streamProvider');
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta' &&
          event.delta.text.length > 0
        ) {
          yield event.delta.text;
        }
        // thinking_delta(DeepSeek-v4-pro 思考模型产生)在此被静默跳过:
        //   1. 不对外吐出:thinking 是内部推理过程,不属于用户面内容,透出会污染前端流。
        //   2. 不置位 emitted:emitted 标志"用户已收到首字节",思考增量从未透出,
        //      故主通道若只产出 thinking 就挂掉,上层 chat() 视为"首 token 前失败"
        //      → 可安全切备通道重发。用户不会看到重复内容(思考从未到达前端)。
        //   代价:pro 档在纯思考阶段挂掉会触发备通道重发,比 flash 额外增加一次完整延迟,
        //   属有意取舍——防止用户看到半截重复内容的代价高于偶发额外延迟。
      }
    } finally {
      clearTimeout(idleTimer);
      clearTimeout(deadlineTimer);
      cleanupExternalSignal();
    }
  }

  // ============================================================
  // openai-compat 协议运行时(原生 fetch,不引入 openai 依赖)。
  // GLM coding 端点(glm-5.1)为 OpenAI Chat Completions 兼容的推理模型:
  //   - 非流式答案在 choices[0].message.content;思考在 reasoning_content,绝不混入正文;
  //   - 结构化走 OpenAI function-calling(强制 tool_choice)+ 关思考,从 tool_calls.arguments 解析;
  //   - 流式为标准 SSE(data: {...} / [DONE]),delta.content 外吐、delta.reasoning_content 跳过。
  // ============================================================

  /** 推理模型非结构化产出(complete/chat)的 max_tokens:抬到下限,防极小预算被 reasoning 吃光致正文空。 */
  private openaiMaxTokens(requested: number): number {
    return Math.max(requested, OPENAI_REASONING_MIN_MAX_TOKENS);
  }

  /** Anthropic 多轮消息(content 为 string 或 block 数组)→ OpenAI messages(role + 纯文本 content)。 */
  private toOpenAiMessages(messages: Anthropic.MessageParam[]): OpenAiMessage[] {
    return messages.map((m) => {
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      const content =
        typeof m.content === 'string'
          ? m.content
          : m.content
              .map((block) => (block.type === 'text' ? block.text : ''))
              .filter((t) => t.length > 0)
              .join('\n');
      return { role, content };
    });
  }

  /** 原生 fetch POST {baseURL}/chat/completions(Bearer 鉴权 + 超时)。非 2xx 抛错交 withFailover 降级。 */
  private async openaiFetch(
    provider: Provider,
    body: OpenAiChatRequest,
    signal?: AbortSignal,
  ): Promise<Response> {
    const url = `${provider.baseURL.replace(/\/+$/, '')}/chat/completions`;
    // 自带超时控制器:与外部 signal(客户端断连)合并——任一触发即中止。
    const timeoutCtrl = new AbortController();
    const timer = setTimeout(() => timeoutCtrl.abort(), provider.timeoutMs);
    const onExternalAbort = (): void => timeoutCtrl.abort();
    if (signal) {
      if (signal.aborted) timeoutCtrl.abort();
      else signal.addEventListener('abort', onExternalAbort, { once: true });
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: timeoutCtrl.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`通道 ${provider.name} HTTP ${res.status}:${text.slice(0, 300)}`);
      }
      return res;
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onExternalAbort);
    }
  }

  /** openai-compat 非流式文本生成:取 content 作正文,reasoning_content 不混入;空 content 抛错触发降级。 */
  private async openaiComplete(
    provider: Provider,
    model: string,
    system: string,
    prompt: string,
    maxTokens: number,
  ): Promise<string> {
    const body: OpenAiChatRequest = {
      model,
      max_tokens: this.openaiMaxTokens(maxTokens),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    };
    const text = await this.limiter.run(async () => {
      const res = await this.openaiFetch(provider, body);
      const data = (await res.json()) as OpenAiChatResponse;
      return data.choices?.[0]?.message?.content ?? '';
    });
    if (text.length > 0) return text;
    // 空 content(推理模型把预算耗在思考 / 端点偶发空):绝不静默返回 '',抛错交 withFailover 降级。
    throw new Error(`通道 ${provider.name} 返回无文本内容,无法生成结果`);
  }

  /**
   * openai-compat 结构化输出:OpenAI function-calling + 强制 tool_choice + 关思考(thinking:disabled)。
   * 与 anthropic 路径同构的重试/校验语义:空 tool_call / 缺字段 / 非法枚举 → 重试;
   * 连续 ATTEMPTS 次失败 → 抛错交 withFailover 降级。绝不把残缺结果当成功返回(防编造红线)。
   */
  private async attemptStructuredOpenAi<T>(
    provider: Provider,
    model: string,
    system: string,
    prompt: string,
    toolName: string,
    toolDescription: string,
    schema: Record<string, unknown>,
    maxTokens: number,
    skipLimiter = false,
  ): Promise<T> {
    const tool: OpenAiTool = {
      type: 'function',
      function: { name: toolName, description: toolDescription, parameters: schema },
    };
    const ATTEMPTS = 4;
    for (let i = 0; i < ATTEMPTS; i++) {
      const userText =
        i === 0
          ? prompt
          : `${prompt}\n\n[系统提示] 上一次未能通过工具 "${toolName}" 返回完整结果(空调用或字段残缺)。请立即且只能调用该工具,把所有字段填满后返回,不要输出任何正文。`;
      const body: OpenAiChatRequest = {
        model,
        // 结构化关思考,无需大预算;沿用调用方上限即可。
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userText },
        ],
        tools: [tool],
        tool_choice: { type: 'function', function: { name: toolName } },
        thinking: { type: 'disabled' },
        ...(i > 0 ? { temperature: Math.min(0.4 + (i - 1) * 0.3, 1) } : {}),
      };
      const data = await this.limiter.run(async () => {
        const res = await this.openaiFetch(provider, body);
        return (await res.json()) as OpenAiChatResponse;
      }, { skipLimiter });
      const choice = data.choices?.[0];
      // 截断检测:length 截断的 arguments 是残缺 JSON,继续用会静默落库不完整数据,当失败处理。
      if (choice?.finish_reason === 'length') {
        throw new Error(
          `通道 ${provider.name} 工具 "${toolName}" 输出在 max_tokens 处被截断,结构化结果不完整`,
        );
      }
      const input = this.extractOpenAiToolInput<T>(choice, toolName);
      if (input !== null && this.validateAgainstSchema(input, schema)) {
        return input;
      }
    }
    throw new Error(`通道 ${provider.name} 对工具 "${toolName}" 连续 ${ATTEMPTS} 次返回空/不完整结果`);
  }

  /** 从 OpenAI 响应的 tool_calls 解析目标工具的入参(JSON.parse arguments);空/缺/解析失败 → null。 */
  private extractOpenAiToolInput<T>(choice: OpenAiChoice | undefined, toolName: string): T | null {
    const calls = choice?.message?.tool_calls;
    if (!Array.isArray(calls)) return null;
    for (const call of calls) {
      if (call.function?.name === toolName && call.function.arguments) {
        try {
          const parsed = JSON.parse(call.function.arguments) as unknown;
          if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) {
            return parsed as T;
          }
        } catch {
          return null;
        }
        return null;
      }
    }
    return null;
  }

  /**
   * openai-compat 流式(原生 fetch + 标准 OpenAI SSE)。逐 delta.content 产出增量文本;
   * delta.reasoning_content(思考增量)静默跳过——类比 anthropic 路径跳过 thinking_delta:
   *   不外吐、不置位 emitted,故主通道纯思考阶段挂掉仍被上层 chat() 视为"首 token 前失败"可切通道。
   * 首次 yield 即"首 token 到达";其前抛错代表首 token 前失败(可切通道)。
   *
   * 看门狗(watchdog-v2):per-chunk 空闲超时 + 总时长 deadline。
   *   根因:TCP 半开/远端挂死时 reader.read() 永久 hang → limiter 槽位永占(2026-06-27 线上事故)。
   *   idle 重置点是 reader.read() 返回(收到任何网络数据),不是 yield(外吐正文):
   *     推理模型思考期(60-120s)只产 reasoning_content(被跳过不 yield),
   *     但 reader.read() 仍在返回数据——idle 正确重置,不会误杀正常思考。
   */
  private async *streamProviderOpenAi(
    provider: Provider,
    model: string,
    system: string,
    messages: Anthropic.MessageParam[],
    maxTokens: number,
    signal?: AbortSignal,
  ): AsyncGenerator<string, void, void> {
    const body: OpenAiChatRequest = {
      model,
      max_tokens: this.openaiMaxTokens(maxTokens),
      stream: true,
      messages: [{ role: 'system', content: system }, ...this.toOpenAiMessages(messages)],
    };

    // ── 流式看门狗 ──────────────────────────────────────────────────────
    const streamAbort = new AbortController();
    const idleMs = this.streamIdleMs();
    const maxMs = this.streamMaxMs();
    const cleanupExternalSignal = this.forwardAbort(signal, streamAbort);
    const deadlineTimer = setTimeout(() => {
      this.logger.warn(`streamProviderOpenAi: 流式总时长超过 ${maxMs}ms,强制中止`);
      streamAbort.abort();
    }, maxMs);
    if (typeof deadlineTimer === 'object' && 'unref' in deadlineTimer) deadlineTimer.unref();
    let idleTimer = this.startIdleTimer(idleMs, streamAbort, 'streamProviderOpenAi');
    const resetIdle = (): void => {
      clearTimeout(idleTimer);
      idleTimer = this.startIdleTimer(idleMs, streamAbort, 'streamProviderOpenAi');
    };

    const res = await this.openaiFetch(provider, body, streamAbort.signal);
    if (!res.body) throw new Error(`通道 ${provider.name} 流式响应无 body`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for (;;) {
        // readWithAbort: reader.read() 与 streamAbort.signal 竞速;abort 触发时立即 reject,
        // 不依赖 fetch 内部 signal 传播(openaiFetch 返回后其信号监听已清理)。
        const { done, value } = await this.readWithAbort(reader, streamAbort.signal);
        if (done) break;
        // 收到任何网络数据即重置 idle(包括 reasoning_content 帧、keep-alive、空帧)。
        resetIdle();
        buffer += decoder.decode(value, { stream: true });
        // SSE 以 \n 分行;data: 行携带 JSON chunk,[DONE] 收尾。跨 chunk 半行留 buffer 下轮拼接。
        let idx: number;
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx).replace(/\r$/, '');
          buffer = buffer.slice(idx + 1);
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload.length === 0 || payload === '[DONE]') continue;
          let chunk: OpenAiStreamChunk;
          try {
            chunk = JSON.parse(payload) as OpenAiStreamChunk;
          } catch {
            continue; // 半行/噪声行跳过,后续 chunk 补齐。
          }
          const text = chunk.choices?.[0]?.delta?.content;
          if (typeof text === 'string' && text.length > 0) {
            yield text;
          }
          // delta.reasoning_content(思考增量)静默跳过(见方法注释)。
        }
      }
    } finally {
      clearTimeout(idleTimer);
      clearTimeout(deadlineTimer);
      cleanupExternalSignal();
      // 释放底层流(提前关闭 / 异常退出时归还连接)。
      void reader.cancel().catch(() => undefined);
    }
  }

  // 默认走主通道(运行时解析顺序的 [0]);失败按顺序降级到后续通道;全部失败才抛 503。
  private async withFailover<T>(op: string, run: (provider: Provider) => Promise<T>): Promise<T> {
    const providers = await this.resolveOrder();
    let lastErr: unknown;
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      try {
        return await run(provider);
      } catch (err) {
        lastErr = err;
        const next = providers[i + 1];
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
        providers: providers.map((p) => p.name).join(','),
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
    skipLimiter = false,
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
      const response = await this.limiter.run(
        () => provider.client.messages.create(params),
        { skipLimiter },
      );
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

  /**
   * 连通性测试:用给定通道配置发一次最小请求(flash 型号),返回 {ok, latencyMs, error}。
   * 按协议分流:openai-compat 走原生 fetch 打 /chat/completions(与运行期 openaiFetch 同语义),
   * 其它(anthropic-compat)走 Anthropic SDK。error 经 sanitizeError 剔除可能含密钥的片段(只回
   * 状态/消息),绝不回明文 key。该方法不走并发护栏 / 不走 failover —— 它就是单通道探活,供 admin
   * 测试端点调用。
   */
  async testConnection(p: LoadedProvider): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    if (p.protocol === PROTOCOL_OPENAI) {
      return this.testConnectionOpenai(p);
    }
    const client = this.clientFor(p);
    const start = Date.now();
    try {
      await client.messages.create({
        model: p.modelFlash,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - start, error: this.sanitizeError(err, p.apiKey) };
    }
  }

  /**
   * openai-compat 探活:原生 fetch POST {baseURL}/chat/completions(Bearer + 超时),与 openaiFetch
   * 同构(URL 拼接/Bearer/AbortController 超时)。判 ok 以 HTTP 状态为准:2xx → ok=true(关思考 +
   * max_tokens:16 足够端点吐 content,但端点偶发空不应判失败,故不依赖 content 非空)。非 2xx 或网络
   * 异常 → ok=false,error 经 sanitizeError 剔 key。
   */
  private async testConnectionOpenai(
    p: LoadedProvider,
  ): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const url = `${p.baseURL.replace(/\/+$/, '')}/chat/completions`;
    const body: OpenAiChatRequest = {
      model: p.modelFlash,
      max_tokens: 16,
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: 'ping' }],
    };
    const timeoutCtrl = new AbortController();
    const timer = setTimeout(() => timeoutCtrl.abort(), p.timeoutMs);
    const start = Date.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${p.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: timeoutCtrl.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return {
          ok: false,
          latencyMs: Date.now() - start,
          error: this.sanitizeError(`HTTP ${res.status}:${text.slice(0, 300)}`, p.apiKey),
        };
      }
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - start, error: this.sanitizeError(err, p.apiKey) };
    } finally {
      clearTimeout(timer);
    }
  }

  // 清洗错误消息:剔除明文密钥(若意外出现在 SDK 错误里),只保留状态码/类型/简短消息。
  private sanitizeError(err: unknown, apiKey: string): string {
    let msg = this.errMsg(err);
    if (apiKey && apiKey.length >= 6 && msg.includes(apiKey)) {
      msg = msg.split(apiKey).join('***');
    }
    // 限长,避免把超长 body 透出。
    return msg.length > 300 ? `${msg.slice(0, 300)}…` : msg;
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

  // ── 流式看门狗辅助(watchdog-v2) ─────────────────────────────────────────

  /** 流式 chunk 间空闲超时(毫秒):默认 180000(3 分钟)。经 AI_STREAM_IDLE_MS 覆盖。 */
  private streamIdleMs(): number {
    const parsed = Number.parseInt(process.env.AI_STREAM_IDLE_MS ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 180000;
  }

  /** 流式总时长上限(毫秒):默认 900000(15 分钟)。经 AI_STREAM_MAX_MS 覆盖。 */
  private streamMaxMs(): number {
    const parsed = Number.parseInt(process.env.AI_STREAM_MAX_MS ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 900000;
  }

  /**
   * Race reader.read() against an AbortSignal:signal 触发时立即 reject,
   * 不依赖 fetch 内部 signal 传播(openaiFetch 返回后其 signal 监听已清理)。
   */
  private readWithAbort(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    signal: AbortSignal,
  ): Promise<ReadableStreamReadResult<Uint8Array>> {
    if (signal.aborted) {
      return Promise.reject(new DOMException('流式读取已被看门狗中止', 'AbortError'));
    }
    return new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
      const onAbort = (): void => {
        reject(new DOMException('流式读取已被看门狗中止', 'AbortError'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
      reader.read().then(
        (result) => { signal.removeEventListener('abort', onAbort); resolve(result); },
        (err) => { signal.removeEventListener('abort', onAbort); reject(err as Error); },
      );
    });
  }

  /** 将外部 abort signal 转发到内部 AbortController;返回清理函数。 */
  private forwardAbort(external: AbortSignal | undefined, target: AbortController): () => void {
    if (!external) return () => {};
    if (external.aborted) { target.abort(); return () => {}; }
    const onAbort = (): void => target.abort();
    external.addEventListener('abort', onAbort, { once: true });
    return () => external.removeEventListener('abort', onAbort);
  }

  /** 启动空闲计时器:超时后触发 abort。unref() 使计时器不阻止进程正常退出。 */
  private startIdleTimer(
    ms: number,
    ctrl: AbortController,
    label: string,
  ): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      this.logger.warn(`${label}: chunk 间空闲超过 ${ms}ms,强制中止`);
      ctrl.abort();
    }, ms);
    if (typeof timer === 'object' && 'unref' in timer) timer.unref();
    return timer;
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
