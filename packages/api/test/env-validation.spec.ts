import { validate } from '../src/config/env.validation';

// 主通道密钥用新名 AI_PRIMARY_API_KEY;旧名 CLOUDDREAM_API_KEY 仍兜底(单独用例覆盖)。
const BASE = { AI_PRIMARY_API_KEY: 'key', JWT_SECRET: 'secret' };

describe('EnvironmentVariables validate()', () => {
  // ── 必填字段 ──────────────────────────────────────────────────────
  it('缺主通道密钥(AI_PRIMARY_API_KEY 与 CLOUDDREAM_API_KEY 都缺) → 抛错', () => {
    expect(() => validate({ JWT_SECRET: 'secret' })).toThrow();
  });

  it('缺 JWT_SECRET → 抛错', () => {
    expect(() => validate({ AI_PRIMARY_API_KEY: 'key' })).toThrow();
  });

  it('AI_PRIMARY_API_KEY 为空字符串(且无旧名) → 抛错', () => {
    expect(() => validate({ AI_PRIMARY_API_KEY: '', JWT_SECRET: 'secret' })).toThrow();
  });

  it('JWT_SECRET 为空字符串 → 抛错', () => {
    expect(() => validate({ AI_PRIMARY_API_KEY: 'key', JWT_SECRET: '' })).toThrow();
  });

  it('合法最小配置(新名) → 通过并返回实例', () => {
    const result = validate(BASE);
    expect(result).toBeDefined();
  });

  // ── 主通道密钥新名/旧名二选一 ──────────────────────────────────────
  it('仅旧名 CLOUDDREAM_API_KEY → 通过(向后兼容兜底)', () => {
    const result = validate({ CLOUDDREAM_API_KEY: 'legacy-key', JWT_SECRET: 'secret' });
    expect(result.CLOUDDREAM_API_KEY).toBe('legacy-key');
  });

  it('新名 AI_PRIMARY_API_KEY 透传 → 通过', () => {
    const result = validate(BASE);
    expect(result.AI_PRIMARY_API_KEY).toBe('key');
  });

  it('AI_FALLBACK_* 新名字符串 → 通过并透传', () => {
    const result = validate({
      ...BASE,
      AI_PRIMARY_MODEL: 'deepseek-chat',
      AI_PRIMARY_BASE_URL: 'https://api.deepseek.com/anthropic',
      AI_FALLBACK_API_KEY: 'sk-fallback',
      AI_FALLBACK_MODEL: 'auto-v2',
      AI_FALLBACK_BASE_URL: 'https://api.tutorial.clouddreamai.com',
    });
    expect(result.AI_FALLBACK_API_KEY).toBe('sk-fallback');
    expect(result.AI_FALLBACK_MODEL).toBe('auto-v2');
    expect(result.AI_PRIMARY_MODEL).toBe('deepseek-chat');
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

  // ── 试运行新增字段(SMTP / ADMIN_EMAILS / DAILY_AI_QUOTA / CORS_ORIGINS) ──
  it('SMTP / ADMIN_EMAILS / CORS_ORIGINS 合法字符串 → 通过', () => {
    const result = validate({
      ...BASE,
      SMTP_HOST: 'smtp.exmail.qq.com',
      SMTP_PORT: '465',
      SMTP_USER: 'no-reply@coach.dev',
      SMTP_PASS: 'app-pass',
      SMTP_FROM: 'no-reply@coach.dev',
      ADMIN_EMAILS: 'a@coach.dev,b@coach.dev',
      CORS_ORIGINS: 'https://coach.example.com,https://www.coach.example.com',
    });
    expect(result.SMTP_HOST).toBe('smtp.exmail.qq.com');
    expect(result.ADMIN_EMAILS).toBe('a@coach.dev,b@coach.dev');
    expect(result.CORS_ORIGINS).toBe('https://coach.example.com,https://www.coach.example.com');
  });

  it('DAILY_AI_QUOTA 数字字符串 → 通过', () => {
    const result = validate({ ...BASE, DAILY_AI_QUOTA: '20' });
    expect(result.DAILY_AI_QUOTA).toBe('20');
  });

  it('SMTP_PORT 非数字字符串 → 抛错', () => {
    expect(() => validate({ ...BASE, SMTP_PORT: 'abc' })).toThrow();
  });

  it('DAILY_AI_QUOTA 非数字字符串 → 抛错', () => {
    expect(() => validate({ ...BASE, DAILY_AI_QUOTA: 'ten' })).toThrow();
  });

  it('试运行新增字段全部缺省 → 通过', () => {
    const result = validate({ ...BASE });
    expect(result.SMTP_HOST).toBeUndefined();
    expect(result.ADMIN_EMAILS).toBeUndefined();
    expect(result.DAILY_AI_QUOTA).toBeUndefined();
    expect(result.CORS_ORIGINS).toBeUndefined();
  });
});
