import { validate } from '../src/config/env.validation';

describe('EnvironmentVariables validate()', () => {
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

  it('合法最小配置 → 通过并原样返回 config', () => {
    const result = validate({ CLOUDDREAM_API_KEY: 'key', JWT_SECRET: 'secret' });
    expect(result).toBeDefined();
  });

  it('数值型可选字段(字符串形式)→ 通过', () => {
    const result = validate({
      CLOUDDREAM_API_KEY: 'key',
      JWT_SECRET: 'secret',
      AI_PRIMARY_TIMEOUT_MS: '30000',
      AI_MAX_CONCURRENCY: '4',
      PORT: '3002',
    });
    expect(result).toBeDefined();
  });
});
