import { validate } from '../src/config/env.validation';

const BASE = { CLOUDDREAM_API_KEY: 'key', JWT_SECRET: 'secret' };

describe('EnvironmentVariables validate()', () => {
  // ── 必填字段 ──────────────────────────────────────────────────────
  it('缺 CLOUDDREAM_API_KEY → 抛错', () => {
    expect(() => validate({ JWT_SECRET: 'secret' })).toThrow();
  });

  it('缺 JWT_SECRET → 抛错', () => {
    expect(() => validate({ CLOUDDREAM_API_KEY: 'key' })).toThrow();
  });

  it('CLOUDDREAM_API_KEY 为空字符串 → 抛错', () => {
    expect(() => validate({ CLOUDDREAM_API_KEY: '', JWT_SECRET: 'secret' })).toThrow();
  });

  it('JWT_SECRET 为空字符串 → 抛错', () => {
    expect(() => validate({ CLOUDDREAM_API_KEY: 'key', JWT_SECRET: '' })).toThrow();
  });

  it('合法最小配置 → 通过并返回实例', () => {
    const result = validate(BASE);
    expect(result).toBeDefined();
  });

  // ── 数值型可选字段 ────────────────────────────────────────────────
  it('数值型可选字段(字符串形式)→ 通过', () => {
    const result = validate({
      ...BASE,
      AI_PRIMARY_TIMEOUT_MS: '30000',
      AI_FALLBACK_TIMEOUT_MS: '60000',
      AI_PRIMARY_MAX_RETRIES: '0',
      AI_FALLBACK_MAX_RETRIES: '3',
      AI_MAX_CONCURRENCY: '4',
      AI_MAX_QUEUE: '16',
      PORT: '3002',
    });
    expect(result).toBeDefined();
  });

  it('AI_PRIMARY_MAX_RETRIES 为非数字字符串 → 抛错', () => {
    expect(() => validate({ ...BASE, AI_PRIMARY_MAX_RETRIES: 'abc' })).toThrow();
  });

  it('AI_FALLBACK_MAX_RETRIES 为非数字字符串 → 抛错', () => {
    expect(() => validate({ ...BASE, AI_FALLBACK_MAX_RETRIES: 'bad' })).toThrow();
  });

  it('AI_PRIMARY_MAX_RETRIES 缺省(undefined)→ 通过', () => {
    const result = validate({ ...BASE });
    expect(result.AI_PRIMARY_MAX_RETRIES).toBeUndefined();
  });

  it('AI_FALLBACK_MAX_RETRIES 缺省(undefined)→ 通过', () => {
    const result = validate({ ...BASE });
    expect(result.AI_FALLBACK_MAX_RETRIES).toBeUndefined();
  });

  // ── 字符串型可选字段(#36 新增) ────────────────────────────────────
  it('CLOUDDREAM_MODEL/CLOUDDREAM_BASE_URL 合法字符串 → 通过', () => {
    const result = validate({
      ...BASE,
      CLOUDDREAM_MODEL: 'auto-v2',
      CLOUDDREAM_BASE_URL: 'https://api.tutorial.clouddreamai.com',
    });
    expect(result.CLOUDDREAM_MODEL).toBe('auto-v2');
    expect(result.CLOUDDREAM_BASE_URL).toBe('https://api.tutorial.clouddreamai.com');
  });

  it('DEEPSEEK_API_KEY/DEEPSEEK_MODEL/DEEPSEEK_BASE_URL 合法字符串 → 通过', () => {
    const result = validate({
      ...BASE,
      DEEPSEEK_API_KEY: 'sk-xxx',
      DEEPSEEK_MODEL: 'deepseek-chat',
      DEEPSEEK_BASE_URL: 'https://api.deepseek.com/anthropic',
    });
    expect(result.DEEPSEEK_API_KEY).toBe('sk-xxx');
    expect(result.DEEPSEEK_MODEL).toBe('deepseek-chat');
    expect(result.DEEPSEEK_BASE_URL).toBe('https://api.deepseek.com/anthropic');
  });

  it('字符串型可选字段全部缺省 → 通过', () => {
    const result = validate({ ...BASE });
    expect(result.CLOUDDREAM_MODEL).toBeUndefined();
    expect(result.CLOUDDREAM_BASE_URL).toBeUndefined();
    expect(result.DEEPSEEK_API_KEY).toBeUndefined();
    expect(result.DEEPSEEK_MODEL).toBeUndefined();
    expect(result.DEEPSEEK_BASE_URL).toBeUndefined();
  });
});
