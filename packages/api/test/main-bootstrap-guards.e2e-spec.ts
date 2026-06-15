import { assertJwtSecret, assertDevLoginClosed } from '../src/main';

// ─────────────────────────────────────────────────────────────────────────────
// 波0 安全自检纯函数单测(规格 §3③ 用例②④;§2 波0)
//
// main.ts 把两条生产 fail-closed 自检抽成可单测纯函数:
//   - assertJwtSecret(secret, isProd):production 下 JWT_SECRET 为 dev-secret / 过短 / 缺失 → throw
//   - assertDevLoginClosed(devLogin, isProd):production 下 DEV_LOGIN=1 → throw
//
// 越狱②(dev-secret 自签 admin):靠 assertJwtSecret 在生产启动期拒启,弱密钥永不上线。
// 越狱④(prod devLogin / DEV_LOGIN=1+NODE_ENV=production):靠 assertDevLoginClosed 启动期拒启。
// 不真启进程,直接断言纯函数 throw。
// ─────────────────────────────────────────────────────────────────────────────

describe('波0 自检:assertJwtSecret(用例②)', () => {
  it('production + JWT_SECRET=dev-secret → throw(占位弱密钥拒启)', () => {
    expect(() => assertJwtSecret('dev-secret', true)).toThrow(/JWT_SECRET/);
  });

  it('production + JWT_SECRET 过短(<32)→ throw', () => {
    expect(() => assertJwtSecret('short-secret', true)).toThrow(/JWT_SECRET/);
  });

  it('production + JWT_SECRET 恰好 31 位 → throw(边界 <32)', () => {
    expect(() => assertJwtSecret('x'.repeat(31), true)).toThrow(/JWT_SECRET/);
  });

  it('production + JWT_SECRET 缺失(undefined)→ throw', () => {
    expect(() => assertJwtSecret(undefined, true)).toThrow(/JWT_SECRET/);
  });

  it('production + JWT_SECRET 恰好 32 位强随机 → 不抛(边界 =32 放行)', () => {
    expect(() => assertJwtSecret('x'.repeat(32), true)).not.toThrow();
  });

  it('production + JWT_SECRET 长强随机 → 不抛', () => {
    expect(() => assertJwtSecret('a'.repeat(64), true)).not.toThrow();
  });

  it('非 production + JWT_SECRET=dev-secret → 不抛(开发态放行)', () => {
    expect(() => assertJwtSecret('dev-secret', false)).not.toThrow();
  });

  it('非 production + JWT_SECRET 缺失 → 不抛(开发态放行)', () => {
    expect(() => assertJwtSecret(undefined, false)).not.toThrow();
  });
});

describe('波0 自检:assertDevLoginClosed(用例④)', () => {
  it('production + DEV_LOGIN=1 → throw(免验证码后门拒启)', () => {
    expect(() => assertDevLoginClosed('1', true)).toThrow(/DEV_LOGIN/);
  });

  it('production + DEV_LOGIN 未设(undefined)→ 不抛', () => {
    expect(() => assertDevLoginClosed(undefined, true)).not.toThrow();
  });

  it('production + DEV_LOGIN=0 → 不抛', () => {
    expect(() => assertDevLoginClosed('0', true)).not.toThrow();
  });

  it('非 production + DEV_LOGIN=1 → 不抛(开发态可开后门)', () => {
    expect(() => assertDevLoginClosed('1', false)).not.toThrow();
  });
});
