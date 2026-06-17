import { UnauthorizedException } from '@nestjs/common';
import { QrUploadTokenService } from './qr-upload-token.service';

// 短随机 id + 内存映射模型:验签发→校验闭环,断言安全语义(归属/一次性/过期/不可伪造)。
// 不再依赖 JwtService:令牌是不透明短 id,绑定关系只存服务端内存。

function makeService(): QrUploadTokenService {
  return new QrUploadTokenService();
}

describe('QrUploadTokenService', () => {
  it('签发的短令牌可被自身校验,取出绑定的 interviewId/userId/tokenId', () => {
    const svc = makeService();
    const { token, expiresInSec } = svc.sign('iv-1', 'user-1');

    expect(expiresInSec).toBe(60);
    // 短令牌:url-safe、远短于 JWT(此前数百字符),足以塞进低版本二维码。
    expect(typeof token).toBe('string');
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeLessThanOrEqual(24);

    const verified = svc.verify(token);
    expect(verified.interviewId).toBe('iv-1');
    expect(verified.userId).toBe('user-1');
    expect(verified.tokenId).toBe(token);
  });

  it('归属红线:校验产出严格等于签发输入,归属来自服务端映射、不可被外部覆盖', () => {
    const svc = makeService();
    const { token } = svc.sign('iv-A', 'user-A');
    const verified = svc.verify(token);
    expect(verified.interviewId).toBe('iv-A');
    expect(verified.userId).toBe('user-A');
  });

  it('一次性:烧掉令牌后再次校验同一令牌 → 401', () => {
    const svc = makeService();
    const { token } = svc.sign('iv-1', 'user-1');
    const verified = svc.verify(token);

    svc.burn(verified.tokenId);

    expect(() => svc.verify(token)).toThrow(UnauthorizedException);
  });

  it('不可伪造:不在映射里的任意字符串(含旧登录 JWT 形态)→ 401', () => {
    const svc = makeService();
    // 一个看起来像 JWT 的字符串,但从未由本服务签发 → 不命中映射 → 401。
    const fakeJwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEiLCJlbWFpbCI6ImFAYi5jb20ifQ.sig';
    expect(() => svc.verify(fakeJwt)).toThrow(UnauthorizedException);
  });

  it('过期红线:超过 TTL 后校验 → 401(用 fake timers 推进 61s)', () => {
    jest.useFakeTimers();
    try {
      const svc = makeService();
      const { token } = svc.sign('iv-1', 'user-1');
      // 推进到 TTL(60s)之后,令牌应已过期。
      jest.advanceTimersByTime(61_000);
      expect(() => svc.verify(token)).toThrow(UnauthorizedException);
    } finally {
      jest.useRealTimers();
    }
  });

  it('结构红线:乱码 / 空 token → 401', () => {
    const svc = makeService();
    expect(() => svc.verify('not-a-token')).toThrow(UnauthorizedException);
    expect(() => svc.verify('')).toThrow(UnauthorizedException);
  });
});
