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

    expect(expiresInSec).toBe(600);
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

  it('10 分钟有效窗口:9 分钟时仍可校验,10 分 1 秒后过期 → 401(fake timers)', () => {
    jest.useFakeTimers();
    try {
      const svc = makeService();
      const { token } = svc.sign('iv-1', 'user-1');

      // 9 分钟(540s)< 10 分钟 TTL:令牌仍有效,可正常校验。
      jest.advanceTimersByTime(540_000);
      const verified = svc.verify(token);
      expect(verified.interviewId).toBe('iv-1');
      expect(verified.userId).toBe('user-1');

      // 再推进到 10 分 1 秒(总 601s)> 600s TTL:令牌已过期 → 401。
      jest.advanceTimersByTime(61_000);
      expect(() => svc.verify(token)).toThrow(UnauthorizedException);
    } finally {
      jest.useRealTimers();
    }
  });

  it('并发有效:先后签发的多枚未用、未过期令牌可同时校验(2 分钟前那张码仍能上传)', () => {
    jest.useFakeTimers();
    try {
      const svc = makeService();
      // t=0 签发第一张码(模拟"2 分钟前扫的码")。
      const { token: tokenA } = svc.sign('iv-1', 'user-1');

      // 2 分钟后前端轮换二维码,签发第二张(模拟"刚换的新码")。
      jest.advanceTimersByTime(120_000);
      const { token: tokenB } = svc.sign('iv-1', 'user-1');

      // 两张码此刻都未用、未过期(均在 10 分钟窗口内)→ 均可校验。
      // 关键:换码不会让旧码失效,2 分钟前扫的那张码照样能上传。
      expect(svc.verify(tokenA).interviewId).toBe('iv-1');
      expect(svc.verify(tokenB).interviewId).toBe('iv-1');

      // 一次性仍守:烧掉 A 后 A 失效,但 B 不受影响(各自独立)。
      svc.burn(tokenA);
      expect(() => svc.verify(tokenA)).toThrow(UnauthorizedException);
      expect(svc.verify(tokenB).interviewId).toBe('iv-1');
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
