/**
 * ai.config.ts 辅助函数单测
 *
 * 覆盖重点:负值/0/NaN/Infinity 等非法输入的下限钳制行为,
 * 防止污染 SDK 的 timeout / maxRetries 参数。
 */
import {
  parseEnvNumber,
  parseTimeoutMs,
  parseMaxRetries,
  aiConfig,
  type AiConfig,
} from '../src/config/ai.config';

describe('parseEnvNumber()', () => {
  it('undefined → 返回 fallback', () => {
    expect(parseEnvNumber(undefined, 5000)).toBe(5000);
  });

  it('空字符串 → 返回 fallback', () => {
    expect(parseEnvNumber('', 5000)).toBe(5000);
  });

  it('合法正整数 → 返回解析值', () => {
    expect(parseEnvNumber('30000', 5000)).toBe(30000);
  });

  it('合法 0 → 返回 0(parseEnvNumber 本身不钳制)', () => {
    expect(parseEnvNumber('0', 5000)).toBe(0);
  });

  it('负整数 → 返回负值(parseEnvNumber 本身不钳制)', () => {
    expect(parseEnvNumber('-1', 5000)).toBe(-1);
  });

  it('NaN 字符串 → 返回 fallback', () => {
    expect(parseEnvNumber('abc', 5000)).toBe(5000);
  });

  it('Infinity 字符串 → 返回 fallback', () => {
    expect(parseEnvNumber('Infinity', 5000)).toBe(5000);
  });

  it('-Infinity 字符串 → 返回 fallback', () => {
    expect(parseEnvNumber('-Infinity', 5000)).toBe(5000);
  });

  it('浮点数字符串 → 返回解析值', () => {
    expect(parseEnvNumber('1.5', 5000)).toBe(1.5);
  });
});

describe('parseTimeoutMs() — 最小值 1000ms 钳制', () => {
  it('合法正值(> 1000)→ 原样返回', () => {
    expect(parseTimeoutMs('60000', 30000)).toBe(60000);
  });

  it('恰好 1000 → 返回 1000', () => {
    expect(parseTimeoutMs('1000', 30000)).toBe(1000);
  });

  it('正值但低于 1000(如 500)→ 钳制到 1000', () => {
    expect(parseTimeoutMs('500', 30000)).toBe(1000);
  });

  it('0 → 钳制到 1000', () => {
    expect(parseTimeoutMs('0', 30000)).toBe(1000);
  });

  it('负值(-5000)→ 钳制到 1000', () => {
    expect(parseTimeoutMs('-5000', 30000)).toBe(1000);
  });

  it('NaN 字符串 → 使用 fallback,若 fallback >= 1000 则返回 fallback', () => {
    expect(parseTimeoutMs('abc', 30000)).toBe(30000);
  });

  it('NaN 字符串 + fallback 也小于 1000 → 钳制到 1000', () => {
    expect(parseTimeoutMs('abc', 500)).toBe(1000);
  });

  it('undefined → 使用 fallback', () => {
    expect(parseTimeoutMs(undefined, 60000)).toBe(60000);
  });

  it('undefined + fallback 小于 1000 → 钳制到 1000', () => {
    expect(parseTimeoutMs(undefined, 0)).toBe(1000);
  });

  it('Infinity 字符串 → 使用 fallback', () => {
    expect(parseTimeoutMs('Infinity', 60000)).toBe(60000);
  });
});

describe('parseMaxRetries() — 最小值 0 钳制', () => {
  it('合法正值 → 原样返回', () => {
    expect(parseMaxRetries('3', 1)).toBe(3);
  });

  it('恰好 0 → 返回 0', () => {
    expect(parseMaxRetries('0', 1)).toBe(0);
  });

  it('负值(-1)→ 钳制到 0', () => {
    expect(parseMaxRetries('-1', 3)).toBe(0);
  });

  it('大负值(-100)→ 钳制到 0', () => {
    expect(parseMaxRetries('-100', 3)).toBe(0);
  });

  it('NaN 字符串 → 使用 fallback', () => {
    expect(parseMaxRetries('abc', 3)).toBe(3);
  });

  it('NaN 字符串 + fallback 为负 → 钳制到 0', () => {
    expect(parseMaxRetries('abc', -1)).toBe(0);
  });

  it('undefined → 使用 fallback', () => {
    expect(parseMaxRetries(undefined, 3)).toBe(3);
  });

  it('undefined + fallback 为负 → 钳制到 0', () => {
    expect(parseMaxRetries(undefined, -5)).toBe(0);
  });

  it('Infinity 字符串 → 使用 fallback', () => {
    expect(parseMaxRetries('Infinity', 3)).toBe(3);
  });
});

// ── aiConfig() 工厂:档位型号默认值 + 通道顺序 + env 覆盖 ──────────────────────
describe('aiConfig() 工厂', () => {
  // 隔离 env:仅快照/还原本套用到的键,避免污染其他套件。
  const KEYS = [
    'AI_PRIMARY_PROVIDER',
    'AI_DEEPSEEK_API_KEY',
    'AI_MODEL_PRO',
    'AI_MODEL_FLASH',
    'AI_DEEPSEEK_BASE_URL',
    'AI_DEEPSEEK_TIMEOUT_MS',
    'AI_DEEPSEEK_MAX_RETRIES',
    'AI_RELAY_API_KEY',
    'AI_RELAY_MODEL',
    'AI_RELAY_BASE_URL',
    'AI_RELAY_TIMEOUT_MS',
    'AI_RELAY_MAX_RETRIES',
    'DEEPSEEK_API_KEY',
    'DEEPSEEK_MODEL',
    'DEEPSEEK_BASE_URL',
    'AI_FALLBACK_API_KEY',
    'AI_FALLBACK_MODEL',
    'CLOUDDREAM_API_KEY',
    'CLOUDDREAM_MODEL',
    'AI_PRIMARY_API_KEY',
    'AI_PRIMARY_MODEL',
  ] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  function read(): AiConfig {
    return aiConfig() as unknown as AiConfig;
  }

  it('全缺省 → 通道顺序 deepseek(测试期主力)、分档型号 pro/flash、relay auto-v2', () => {
    const cfg = read();
    expect(cfg.primaryProvider).toBe('deepseek');
    expect(cfg.deepseek.modelPro).toBe('deepseek-v4-pro');
    expect(cfg.deepseek.modelFlash).toBe('deepseek-v4-flash'); // 取代弃用的 deepseek-chat
    expect(cfg.relay.model).toBe('auto-v2');
  });

  it('AI_PRIMARY_PROVIDER=relay → 通道顺序切到 relay 主力', () => {
    process.env.AI_PRIMARY_PROVIDER = 'relay';
    expect(read().primaryProvider).toBe('relay');
  });

  it('AI_PRIMARY_PROVIDER 非法值 → 回退 deepseek', () => {
    process.env.AI_PRIMARY_PROVIDER = 'garbage';
    expect(read().primaryProvider).toBe('deepseek');
  });

  it('AI_MODEL_PRO / AI_MODEL_FLASH 覆盖 → 透传', () => {
    process.env.AI_MODEL_PRO = 'deepseek-v9-pro';
    process.env.AI_MODEL_FLASH = 'deepseek-v9-flash';
    const cfg = read();
    expect(cfg.deepseek.modelPro).toBe('deepseek-v9-pro');
    expect(cfg.deepseek.modelFlash).toBe('deepseek-v9-flash');
  });

  it('旧名 DEEPSEEK_API_KEY/DEEPSEEK_BASE_URL 兜底 deepseek 通道(向后兼容)', () => {
    process.env.DEEPSEEK_API_KEY = 'sk-legacy';
    process.env.DEEPSEEK_BASE_URL = 'https://legacy.deepseek/anthropic';
    const cfg = read();
    expect(cfg.deepseek.apiKey).toBe('sk-legacy');
    expect(cfg.deepseek.baseURL).toBe('https://legacy.deepseek/anthropic');
  });

  it('旧名 CLOUDDREAM_API_KEY 兜底 relay 通道(向后兼容)', () => {
    process.env.CLOUDDREAM_API_KEY = 'cd-legacy';
    expect(read().relay.apiKey).toBe('cd-legacy');
  });

  it('旧名 DEEPSEEK_MODEL 兜底 flash 档(现状:存量 .env 用 deepseek-chat 仍生效)', () => {
    process.env.DEEPSEEK_MODEL = 'deepseek-chat';
    expect(read().deepseek.modelFlash).toBe('deepseek-chat');
  });
});
