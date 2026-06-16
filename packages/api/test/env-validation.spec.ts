import { validate } from '../src/config/env.validation';

// 主通道密钥用新名 AI_PRIMARY_API_KEY;旧名 CLOUDDREAM_API_KEY 仍兜底(单独用例覆盖)。
const BASE = { AI_PRIMARY_API_KEY: 'key', JWT_SECRET: 'secret' };

// ── e2e seal 旗标隔离 ──────────────────────────────────────────────────────────
// jest-setup-env.ts(jest-e2e.json setupFiles)会置 __SEAL_OPS_ENV__='1',
// 该旗标在 env.validation.validate() 内会把「不在 process.env 的密封键」从 config 中剔除。
// 本文件是纯函数单测,入参 config 全部显式构造,不应受 e2e seal 约束。
// beforeAll 清除旗标(还原交给 afterAll),保证普通单测与带旗标跑法都绿。
let _sealFlagSaved: string | undefined;
beforeAll(() => {
  _sealFlagSaved = process.env.__SEAL_OPS_ENV__;
  delete process.env.__SEAL_OPS_ENV__;
});
afterAll(() => {
  if (_sealFlagSaved !== undefined) {
    process.env.__SEAL_OPS_ENV__ = _sealFlagSaved;
  } else {
    delete process.env.__SEAL_OPS_ENV__;
  }
});

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

  // ── 波0 安全:production JWT_SECRET 强度跨字段校验(规格 §3③ 用例②) ──────────
  // production 下 JWT_SECRET 为占位 'dev-secret' 或长度 <32 → validate throw 拒启,
  // 防被人猜中密钥自签 admin token 越权。非生产放行(开发/测试常用短密钥)。
  describe('波0:production JWT_SECRET 强度', () => {
    const STRONG = 'x'.repeat(32); // 恰好 32 位强随机占位

    it('②production + JWT_SECRET=dev-secret → 抛错(占位密钥拒启)', () => {
      expect(() =>
        validate({ AI_PRIMARY_API_KEY: 'key', JWT_SECRET: 'dev-secret', NODE_ENV: 'production' }),
      ).toThrow(/JWT_SECRET/);
    });

    it('②production + JWT_SECRET 过短(<32)→ 抛错', () => {
      expect(() =>
        validate({ AI_PRIMARY_API_KEY: 'key', JWT_SECRET: 'short-secret-123', NODE_ENV: 'production' }),
      ).toThrow(/JWT_SECRET/);
    });

    it('production + JWT_SECRET 恰好 31 位 → 抛错(边界:<32 拒绝)', () => {
      expect(() =>
        validate({ AI_PRIMARY_API_KEY: 'key', JWT_SECRET: 'x'.repeat(31), NODE_ENV: 'production' }),
      ).toThrow(/JWT_SECRET/);
    });

    it('production + JWT_SECRET 恰好 32 位强随机 → 通过(边界:=32 放行)', () => {
      const result = validate({ AI_PRIMARY_API_KEY: 'key', JWT_SECRET: STRONG, NODE_ENV: 'production' });
      expect(result.JWT_SECRET).toBe(STRONG);
    });

    it('非 production + JWT_SECRET=dev-secret → 通过(开发态放行)', () => {
      const result = validate({ AI_PRIMARY_API_KEY: 'key', JWT_SECRET: 'dev-secret', NODE_ENV: 'development' });
      expect(result.JWT_SECRET).toBe('dev-secret');
    });

    it('NODE_ENV 缺省 + JWT_SECRET=dev-secret → 通过(仅 production 强制)', () => {
      const result = validate({ AI_PRIMARY_API_KEY: 'key', JWT_SECRET: 'dev-secret' });
      expect(result.JWT_SECRET).toBe('dev-secret');
    });
  });
});
