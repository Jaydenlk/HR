import { registerAs } from '@nestjs/config';

// 通道顺序:测试期默认 deepseek 主力(直连官方,pro/flash 两档),relay(auto-v2 中转)备份,glm(智谱 Anthropic 兼容端点)可选第三通道。
// AI_PRIMARY_PROVIDER=deepseek|relay|glm 切换主备顺序,日后切主力不改代码;面板切换由 ai_provider_settings DB 覆盖(运行时,免重启)。
export type AiProviderKind = 'deepseek' | 'relay' | 'glm';

// 默认通道顺序:deepseek 主、relay 次、glm 末。运行时无 DB 配置 / env 无显式 primary 时回退此序。
// 无密钥的通道在 AiService 构造期被 filter,不影响实际可用顺位。
export const DEFAULT_PROVIDER_ORDER: AiProviderKind[] = ['deepseek', 'relay', 'glm'];

/**
 * 通用通道排序:给定「主力 provider」+「降级顺序」,产出去重后的有序 AiProviderKind 列表。
 * 规则:primary 永远排第一;其后按 order 去重补齐;最后用 DEFAULT_PROVIDER_ORDER 兜底补齐遗漏的通道。
 * 构造期默认排序(按 env primaryProvider)与运行时 resolveOrder(按 DB 配置)共用此函数,避免两处排序逻辑分叉。
 * 仅排序已知通道名,不校验密钥(密钥过滤由 AiService 构造期完成)。
 */
export function orderProviders(
  primary: AiProviderKind,
  order?: AiProviderKind[],
): AiProviderKind[] {
  const seen = new Set<AiProviderKind>();
  const result: AiProviderKind[] = [];
  const push = (k: AiProviderKind): void => {
    if (!seen.has(k)) {
      seen.add(k);
      result.push(k);
    }
  };
  push(primary);
  for (const k of order ?? []) push(k);
  for (const k of DEFAULT_PROVIDER_ORDER) push(k);
  return result;
}

// DeepSeek 直连官方:按场景档位选型号(deepseek-v4-pro / deepseek-v4-flash),
// 官方 Anthropic 兼容端点支持 SSE 流式。
export interface AiDeepseekConfig {
  apiKey: string | undefined;
  modelPro: string;
  modelFlash: string;
  baseURL: string;
  timeoutMs: number;
  maxRetries: number;
}

// CloudDreamAI 中转(auto-v2):单一别名路由,pro/flash 两档共用同一型号(降档保命)。
export interface AiRelayConfig {
  apiKey: string;
  model: string;
  baseURL: string;
  timeoutMs: number;
  maxRetries: number;
}

// 智谱 GLM 直连官方 Anthropic 兼容端点:按场景档位选型号(pro/flash),复用 @anthropic-ai/sdk client 形态。
// 端点固定 https://open.bigmodel.cn/api/anthropic(Anthropic 原生兼容,勿手动加 /v1;见 baseURL 默认值注释)。
export interface AiGlmConfig {
  apiKey: string | undefined;
  modelPro: string;
  modelFlash: string;
  baseURL: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface AiConcurrencyConfig {
  max: number;
  queue: number;
}

export interface AiConfig {
  primaryProvider: AiProviderKind;
  deepseek: AiDeepseekConfig;
  relay: AiRelayConfig;
  glm: AiGlmConfig;
  concurrency: AiConcurrencyConfig;
}

// 场景档位:复用 AiService 调用方传入的 tier 选择 deepseek 直连的型号。
export type AiTier = 'pro' | 'flash';

// 槽位 env 名:
//   通道顺序   AI_PRIMARY_PROVIDER=deepseek|relay(缺省 deepseek;测试期 deepseek 主力)
//   DeepSeek   AI_DEEPSEEK_API_KEY(?? 旧名 DEEPSEEK_API_KEY/AI_FALLBACK_API_KEY 兜底)、
//              AI_MODEL_PRO(缺省 deepseek-v4-pro)、AI_MODEL_FLASH(缺省 deepseek-v4-flash)、
//              AI_DEEPSEEK_BASE_URL(?? DEEPSEEK_BASE_URL/AI_FALLBACK_BASE_URL,缺省官方 anthropic 端点)、
//              AI_DEEPSEEK_TIMEOUT_MS / AI_DEEPSEEK_MAX_RETRIES(?? 旧 AI_FALLBACK_* 兜底)
//   Relay      AI_RELAY_API_KEY(?? CLOUDDREAM_API_KEY/AI_PRIMARY_API_KEY 兜底)、
//              AI_RELAY_MODEL(?? CLOUDDREAM_MODEL/AI_PRIMARY_MODEL,缺省 auto-v2)、
//              AI_RELAY_BASE_URL(?? CLOUDDREAM_BASE_URL/AI_PRIMARY_BASE_URL)、
//              AI_RELAY_TIMEOUT_MS / AI_RELAY_MAX_RETRIES(?? 旧 AI_PRIMARY_* 兜底)
// 默认值:
//   primaryProvider       = 'deepseek'                      ← 测试期 DeepSeek 主力(用户拍板)
//   deepseek.modelPro     = 'deepseek-v4-pro'
//   deepseek.modelFlash   = 'deepseek-v4-flash'             ← 取代弃用的 deepseek-chat(2026-07-24 弃用)
//   deepseek.baseURL      = 'https://api.deepseek.com/anthropic'
//   deepseek.timeoutMs    = 120000
//   deepseek.maxRetries   = 3       ← 直连官方对瞬时连接错误自动退避重试
//   relay.model           = 'auto-v2'   ← CloudDreamAI 唯一能接到 GLM-5 的路由别名,不要改
//   relay.baseURL         = 'https://api.tutorial.clouddreamai.com'
//   relay.timeoutMs       = 60000
//   relay.maxRetries      = 0           ← 中转通道快速失败,立即切另一通道(中转挂时不空等)
//   concurrency.max       = 2
//   concurrency.queue     = 8
/** 解析数值 env,非法(NaN / Infinity)时回退到 fallback,防止污染 SDK 调用参数。 */
export function parseEnvNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * 解析超时毫秒数:最小值 1000ms,防止 0 或负值导致 SDK 立即超时或行为未定义。
 * 非法值(NaN/Infinity/负值/0)一律回退到 fallback。
 */
export function parseTimeoutMs(raw: string | undefined, fallback: number): number {
  return Math.max(1000, parseEnvNumber(raw, fallback));
}

/**
 * 解析重试次数:最小值 0,防止负值进入 SDK retry 逻辑。
 * 非法值(NaN/Infinity/负值)一律回退到 fallback。
 */
export function parseMaxRetries(raw: string | undefined, fallback: number): number {
  return Math.max(0, parseEnvNumber(raw, fallback));
}

/** 通道顺序:识别 'relay'/'glm',其余(含缺省)落 'deepseek'(测试期主力)。 */
function parsePrimaryProvider(raw: string | undefined): AiProviderKind {
  if (raw === 'relay') return 'relay';
  if (raw === 'glm') return 'glm';
  return 'deepseek';
}

export const aiConfig = registerAs('ai', (): AiConfig => ({
  primaryProvider: parsePrimaryProvider(process.env.AI_PRIMARY_PROVIDER),
  // DeepSeek 直连官方:新名 AI_DEEPSEEK_*/AI_MODEL_* 优先,?? 旧名 DEEPSEEK_*/AI_FALLBACK_* 兜底
  // (存量 .env 与 19 个 module 测试文件仍设旧名)。
  deepseek: {
    apiKey:
      process.env.AI_DEEPSEEK_API_KEY ??
      process.env.DEEPSEEK_API_KEY ??
      process.env.AI_FALLBACK_API_KEY,
    modelPro: process.env.AI_MODEL_PRO ?? 'deepseek-v4-pro',
    modelFlash:
      process.env.AI_MODEL_FLASH ??
      process.env.DEEPSEEK_MODEL ??
      process.env.AI_FALLBACK_MODEL ??
      'deepseek-v4-flash',
    baseURL:
      process.env.AI_DEEPSEEK_BASE_URL ??
      process.env.DEEPSEEK_BASE_URL ??
      process.env.AI_FALLBACK_BASE_URL ??
      'https://api.deepseek.com/anthropic',
    timeoutMs: parseTimeoutMs(
      process.env.AI_DEEPSEEK_TIMEOUT_MS ?? process.env.AI_FALLBACK_TIMEOUT_MS,
      120000,
    ),
    maxRetries: parseMaxRetries(
      process.env.AI_DEEPSEEK_MAX_RETRIES ?? process.env.AI_FALLBACK_MAX_RETRIES,
      3,
    ),
  },
  // CloudDreamAI 中转(auto-v2):新名 AI_RELAY_* 优先,?? 旧名 CLOUDDREAM_*/AI_PRIMARY_* 兜底。
  relay: {
    apiKey:
      process.env.AI_RELAY_API_KEY ??
      process.env.CLOUDDREAM_API_KEY ??
      process.env.AI_PRIMARY_API_KEY ??
      '',
    model:
      process.env.AI_RELAY_MODEL ??
      process.env.CLOUDDREAM_MODEL ??
      process.env.AI_PRIMARY_MODEL ??
      'auto-v2',
    baseURL:
      process.env.AI_RELAY_BASE_URL ??
      process.env.CLOUDDREAM_BASE_URL ??
      process.env.AI_PRIMARY_BASE_URL ??
      'https://api.tutorial.clouddreamai.com',
    timeoutMs: parseTimeoutMs(
      process.env.AI_RELAY_TIMEOUT_MS ?? process.env.AI_PRIMARY_TIMEOUT_MS,
      60000,
    ),
    maxRetries: parseMaxRetries(
      process.env.AI_RELAY_MAX_RETRIES ?? process.env.AI_PRIMARY_MAX_RETRIES,
      0,
    ),
  },
  // 智谱 GLM 直连官方 Anthropic 兼容端点(可选第三通道):无 AI_GLM_API_KEY 时该通道不构造、不可设主力。
  // 型号默认 glm-4.6(pro)/glm-4.5-air(flash):2026-06-16 智谱官方文档 + 多源交叉核实的真实代号
  // (社区个别摘要出现 GLM-5.x 系列疑为幻觉,以智谱开放平台模型列表为准;运维可经 AI_GLM_MODEL_* 覆盖)。
  glm: {
    apiKey: process.env.AI_GLM_API_KEY,
    modelPro: process.env.AI_GLM_MODEL_PRO ?? 'glm-4.6',
    modelFlash: process.env.AI_GLM_MODEL_FLASH ?? 'glm-4.5-air',
    // Anthropic 原生兼容端点;勿手动加 /v1(OpenAI 兼容模式会被强拼 /v1 致 404,Anthropic SDK 走 /api/anthropic 即可)。
    baseURL: process.env.AI_GLM_BASE_URL ?? 'https://open.bigmodel.cn/api/anthropic',
    timeoutMs: parseTimeoutMs(process.env.AI_GLM_TIMEOUT_MS, 120000),
    maxRetries: parseMaxRetries(process.env.AI_GLM_MAX_RETRIES, 3),
  },
  concurrency: {
    max: Math.max(1, parseEnvNumber(process.env.AI_MAX_CONCURRENCY, 2)),
    queue: Math.max(0, parseEnvNumber(process.env.AI_MAX_QUEUE, 8)),
  },
}));
