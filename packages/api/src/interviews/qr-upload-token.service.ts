import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

/**
 * 扫码上传 scoped 令牌(QR 一次性令牌)的签发与校验。
 *
 * 设计依据(handoff §令牌机制):复用现有 JwtModule(secret=JWT_SECRET)签发一种「窄权限、
 * 短时效、一次性」的令牌,专供手机端在「未登录」状态下,把音频直传到电脑端用户指定的某个 interview。
 *
 * 与主登录令牌的本质区别(故绝不复用 passport JwtStrategy / JwtAuthGuard):
 *  - payload 形状不同:主令牌 {sub,email};本令牌 {purpose,interviewId,sub,jti}。
 *  - 取值位置不同:主令牌走 Authorization Bearer 头;本令牌在 URL 路径参数里(/upload/:token)。
 *  - 校验语义不同:主令牌查 users 表认人;本令牌只认「purpose + 绑定的 interviewId + 拥有者 sub +
 *    未过期 + jti 未用过」,不需要也不应该当作登录态。
 * 故本服务用 jwt.verify 显式校验签名+exp,再断言业务字段,完全独立于 passport 链路。
 *
 * 一次性保证(无迁移):
 *  - 短 TTL(60s):令牌出生即将死,扫码窗口极短。
 *  - jti 内存黑名单:首次成功上传即把 jti 烧入内存 Map,后续携同 jti 的请求直接拒(用后即焚)。
 *    单机部署可接受内存态(重启/多实例失效仅意味着「已烧的 jti 在重启后短暂可复用至其自然过期」,
 *    而 60s TTL 把这个窗口压到极小,且配合上传端点的「该 interview 无进行中任务」检查兜底)。
 *    若未来要强持久化 burn,再加 1 张表(届时才有 migration),当前不引入。
 */

/** scoped 令牌固定用途标识;校验时硬断言,杜绝主登录令牌被拿来当上传令牌用。 */
const QR_UPLOAD_PURPOSE = 'audio_upload' as const;

/** 令牌有效期(秒)。出生即将死:60s 足够扫码打开页面并直传,过期窗口极短。 */
const QR_UPLOAD_TTL_SECONDS = 60;

/** scoped 令牌 payload 形状(签发时写入,校验时逐字段断言)。 */
export interface QrUploadTokenPayload {
  /** 用途标识,恒为 'audio_upload';非此值一律拒(防主令牌冒用)。 */
  purpose: typeof QR_UPLOAD_PURPOSE;
  /** 令牌绑定的面试 ID;校验时必须与路由真实操作的 interview 一致(绝不放宽归属)。 */
  interviewId: string;
  /** 令牌签发者(电脑端已登录用户)ID;上传落库 user_id 以此为准(绝不放宽归属)。 */
  sub: string;
  /** 一次性标识;首次成功上传即烧入黑名单,复用即拒。 */
  jti: string;
}

/** 校验通过后回给上传端点的最小上下文(均来自令牌,不可被请求体篡改)。 */
export interface VerifiedQrUploadToken {
  interviewId: string;
  userId: string;
  jti: string;
}

@Injectable()
export class QrUploadTokenService {
  private readonly logger = new Logger(QrUploadTokenService.name);

  /**
   * 已烧 jti → 该 jti 自然过期的时间戳(ms)。仅在过期后才可清理,清理前都视为已用。
   * 单机内存态;定期惰性清理过期项,避免无界增长。
   */
  private readonly burnedJti = new Map<string, number>();

  constructor(private readonly jwt: JwtService) {}

  /**
   * 为「已登录用户的某个 interview」签发一次性上传令牌。
   * 调用方(controller)必须已用 JwtAuthGuard 鉴权,且已校验 interview 归属该 user(service 层 findOne)。
   * 这里只负责把 {purpose,interviewId,sub,jti} 签成 60s 短令牌。
   */
  sign(interviewId: string, userId: string): { token: string; expiresInSec: number } {
    const payload: QrUploadTokenPayload = {
      purpose: QR_UPLOAD_PURPOSE,
      interviewId,
      sub: userId,
      jti: randomUUID(),
    };
    // expiresIn 覆盖 JwtModule 默认 7d:本令牌专用 60s 短时效。
    const token = this.jwt.sign(payload, { expiresIn: QR_UPLOAD_TTL_SECONDS });
    return { token, expiresInSec: QR_UPLOAD_TTL_SECONDS };
  }

  /**
   * 校验 URL 里的 scoped 令牌:签名+exp(jwt.verify)→ purpose → jti 未烧 → 字段完整。
   * 任一不满足 → 401(不泄露细节)。注意:此处不烧 jti,成功上传后由 burn() 烧。
   *
   * 绝不复用 JwtAuthGuard:本令牌不在 Bearer 头、payload 形状不同、不代表登录态。
   */
  verify(token: string): VerifiedQrUploadToken {
    this.sweepExpired();

    let payload: QrUploadTokenPayload;
    try {
      // verify 同时校验 HMAC 签名 + exp(过期即抛);用 JwtModule 注入的同一 secret。
      payload = this.jwt.verify<QrUploadTokenPayload>(token);
    } catch {
      // 签名错 / 已过期 / 结构非法 → 统一 401,不区分原因(不给攻击者反馈)。
      throw new UnauthorizedException('上传链接无效或已过期，请在电脑端重新生成二维码');
    }

    // 业务字段硬断言:用途、归属字段必须齐全且类型正确,杜绝主登录令牌(无 purpose/interviewId)冒用。
    if (
      payload.purpose !== QR_UPLOAD_PURPOSE ||
      typeof payload.interviewId !== 'string' ||
      typeof payload.sub !== 'string' ||
      typeof payload.jti !== 'string'
    ) {
      throw new UnauthorizedException('上传链接无效，请在电脑端重新生成二维码');
    }

    // 一次性:jti 已烧(且未到自然过期)→ 拒(用后即焚)。
    if (this.burnedJti.has(payload.jti)) {
      throw new UnauthorizedException('该上传链接已使用，请在电脑端重新生成二维码');
    }

    return {
      interviewId: payload.interviewId,
      userId: payload.sub,
      jti: payload.jti,
    };
  }

  /**
   * 烧掉 jti(首次成功上传后调用):记到黑名单直至其自然过期。
   * 由调用方在「上传真实成功(已建 transcribe task)」后调用,确保失败不烧(允许用户在 60s 内重试)。
   */
  burn(jti: string): void {
    // 记录到「现在 + TTL」即可:超过该时刻令牌本身也已过期,清理掉不影响安全。
    this.burnedJti.set(jti, Date.now() + QR_UPLOAD_TTL_SECONDS * 1000);
  }

  /** 惰性清理已自然过期的 jti,避免内存无界增长(每次 verify 触发一次,成本 O(已烧条数))。 */
  private sweepExpired(): void {
    const now = Date.now();
    for (const [jti, expireAt] of this.burnedJti) {
      if (expireAt <= now) {
        this.burnedJti.delete(jti);
      }
    }
  }
}
