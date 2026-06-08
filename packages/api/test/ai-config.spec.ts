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
