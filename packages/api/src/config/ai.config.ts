import { registerAs } from '@nestjs/config';

export interface AiPrimaryConfig {
  apiKey: string;
  model: string;
  baseURL: string;
  timeoutMs: number;
}

export interface AiFallbackConfig {
  apiKey: string | undefined;
  model: string;
  baseURL: string;
  timeoutMs: number;
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

// 默认值与 ai.service.ts / concurrency-limiter.ts 里的内联默认完全一致:
//   primary.model        = 'auto-v2'
//   primary.baseURL      = 'https://api.tutorial.clouddreamai.com'
//   primary.timeoutMs    = 60000
//   fallback.model       = 'deepseek-chat'
//   fallback.baseURL     = 'https://api.deepseek.com/anthropic'
//   fallback.timeoutMs   = 120000
//   concurrency.max      = 2
//   concurrency.queue    = 8
export const aiConfig = registerAs('ai', (): AiConfig => ({
  primary: {
    apiKey: process.env.CLOUDDREAM_API_KEY ?? '',
    model: process.env.CLOUDDREAM_MODEL ?? 'auto-v2',
    baseURL: process.env.CLOUDDREAM_BASE_URL ?? 'https://api.tutorial.clouddreamai.com',
    timeoutMs: Number(process.env.AI_PRIMARY_TIMEOUT_MS ?? 60000),
  },
  fallback: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
    baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/anthropic',
    timeoutMs: Number(process.env.AI_FALLBACK_TIMEOUT_MS ?? 120000),
  },
  concurrency: {
    max: Math.max(1, Number(process.env.AI_MAX_CONCURRENCY ?? 2)),
    queue: Math.max(0, Number(process.env.AI_MAX_QUEUE ?? 8)),
  },
}));
