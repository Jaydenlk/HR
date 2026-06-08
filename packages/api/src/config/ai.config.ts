import { registerAs } from '@nestjs/config';

export interface AiPrimaryConfig {
  apiKey: string;
  model: string;
  baseURL: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface AiFallbackConfig {
  apiKey: string | undefined;
  model: string;
  baseURL: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface AiConcurrencyConfig {
  max: number;
  queue: number;
}

export interface AiConfig {
  primary: AiPrimaryConfig;
  fallback: AiFallbackConfig;
  concurrency: AiConcurrencyConfig;
}

// 默认值:
//   primary.model        = 'auto-v2'   ← CloudDreamAI 唯一能接到 GLM-5 的路由别名,不要改
//   primary.baseURL      = 'https://api.tutorial.clouddreamai.com'
//   primary.timeoutMs    = 60000
//   primary.maxRetries   = 0           ← 主通道快速失败,立即降级到备用(主通道挂时不空等)
//   fallback.model       = 'deepseek-chat'
//   fallback.baseURL     = 'https://api.deepseek.com/anthropic'
//   fallback.timeoutMs   = 120000
//   fallback.maxRetries  = 3           ← 备用通道对瞬时连接错误(Connection error/ECONNRESET)自动退避重试,
//                                         避免单次网络抖动直接抛 503(用户实测到的硬报错根因)
//   concurrency.max      = 2
//   concurrency.queue    = 8
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

export const aiConfig = registerAs('ai', (): AiConfig => ({
  primary: {
    apiKey: process.env.CLOUDDREAM_API_KEY ?? '',
    model: process.env.CLOUDDREAM_MODEL ?? 'auto-v2',
    baseURL: process.env.CLOUDDREAM_BASE_URL ?? 'https://api.tutorial.clouddreamai.com',
    timeoutMs: parseTimeoutMs(process.env.AI_PRIMARY_TIMEOUT_MS, 60000),
    maxRetries: parseMaxRetries(process.env.AI_PRIMARY_MAX_RETRIES, 0),
  },
  fallback: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
    baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/anthropic',
    timeoutMs: parseTimeoutMs(process.env.AI_FALLBACK_TIMEOUT_MS, 120000),
    maxRetries: parseMaxRetries(process.env.AI_FALLBACK_MAX_RETRIES, 3),
  },
  concurrency: {
    max: Math.max(1, parseEnvNumber(process.env.AI_MAX_CONCURRENCY, 2)),
    queue: Math.max(0, parseEnvNumber(process.env.AI_MAX_QUEUE, 8)),
  },
}));
