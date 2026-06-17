import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { QrUploadTokenService } from './qr-upload-token.service';

// 直接用真实 JwtService(同一 secret)验签发→校验闭环,断言安全语义(归属/用途/一次性/过期)。
const SECRET = 'test-secret-for-qr-upload-token-spec';

function makeService(): { svc: QrUploadTokenService; jwt: JwtService } {
  const jwt = new JwtService({ secret: SECRET });
  return { svc: new QrUploadTokenService(jwt), jwt };
}

describe('QrUploadTokenService', () => {
  it('签发的令牌可被自身校验,解出绑定的 interviewId/userId/jti', () => {
    const { svc } = makeService();
    const { token, expiresInSec } = svc.sign('iv-1', 'user-1');

    expect(expiresInSec).toBe(60);
    const verified = svc.verify(token);
    expect(verified.interviewId).toBe('iv-1');
    expect(verified.userId).toBe('user-1');
    expect(typeof verified.jti).toBe('string');
  });

  it('归属红线:令牌只携带签发时的 interviewId/userId,不可被外部覆盖', () => {
    const { svc } = makeService();
    const { token } = svc.sign('iv-A', 'user-A');
    const verified = svc.verify(token);
    // 校验产出严格等于签发输入,杜绝越权传到别的 interview/user。
    expect(verified.interviewId).toBe('iv-A');
    expect(verified.userId).toBe('user-A');
  });

  it('一次性:烧掉 jti 后再次校验同一令牌 → 401', () => {
    const { svc } = makeService();
    const { token } = svc.sign('iv-1', 'user-1');
    const verified = svc.verify(token);

    svc.burn(verified.jti);

    expect(() => svc.verify(token)).toThrow(UnauthorizedException);
  });

  it('用途红线:主登录令牌形状 {sub,email}(无 purpose)→ 401', () => {
    const { svc, jwt } = makeService();
    // 模拟 auth.service 签发的主令牌:仅 {sub,email},无 purpose/interviewId。
    const loginToken = jwt.sign({ sub: 'user-1', email: 'a@b.com' });
    expect(() => svc.verify(loginToken)).toThrow(UnauthorizedException);
  });

  it('签名红线:用不同 secret 签的令牌 → 401', () => {
    const { svc } = makeService();
    const forge = new JwtService({ secret: 'attacker-secret' });
    const forged = forge.sign({
      purpose: 'audio_upload',
      interviewId: 'iv-1',
      sub: 'user-1',
      jti: 'forged-jti',
    });
    expect(() => svc.verify(forged)).toThrow(UnauthorizedException);
  });

  it('过期红线:已过期令牌 → 401', () => {
    const { svc, jwt } = makeService();
    // expiresIn 负值 → 立即过期。
    const expired = jwt.sign(
      { purpose: 'audio_upload', interviewId: 'iv-1', sub: 'user-1', jti: 'jti-x' },
      { expiresIn: -10 },
    );
    expect(() => svc.verify(expired)).toThrow(UnauthorizedException);
  });

  it('结构红线:乱码 token → 401', () => {
    const { svc } = makeService();
    expect(() => svc.verify('not-a-jwt')).toThrow(UnauthorizedException);
  });
});
