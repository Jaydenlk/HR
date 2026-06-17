import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';

/**
 * 扫码上传 scoped 令牌(QR 一次性令牌)的签发与校验。
 *
 * 设计依据(handoff §令牌机制):手机端在「未登录」状态下,把音频直传到电脑端用户指定的某个 interview。
 * 鉴权完全靠 URL 路径里的这枚 scoped 令牌:它窄权限(只能传它绑定的那一个 interview)、短时效(10 分钟)、
 * 一次性(成功即焚)。
 *
 * 为什么用「短随机不透明 id + 内存映射」而不是 JWT:
 *  - 令牌进的是二维码,而二维码内容越长所需版本越高。JWT(header.payload.signature,内含
 *    purpose/interviewId/sub/jti/iat/exp 多个 UUID 字段)动辄 200–300+ 字符,加上站点 origin 拼成
 *    完整 URL 后,二维码所需版本高、模块密、在小尺寸下更难被手机扫出。
 *  - 改成 24 字符以内的 url-safe 短 id,绑定关系(interviewId/userId/过期/是否用过)全部存在服务端内存,
 *    URL 极短,二维码用最低版本即可编码,且令牌本身不携带任何归属信息(更不可被伪造/篡改)。
 *
 * 与主登录令牌的本质区别(故绝不复用 passport JwtStrategy / JwtAuthGuard):
 *  - 取值位置不同:主令牌走 Authorization Bearer 头;本令牌在 URL 路径参数里(/upload/:token)。
 *  - 校验语义不同:主令牌查 users 表认人;本令牌只认「服务端映射里存在 + 未过期 + 未用过」,
 *    再由映射取出它在签发时绑定的 interviewId/userId,不需要也不应该当作登录态。
 *
 * 安全属性(全部保留,与旧 JWT 版等价):
 *  - 不可伪造:16 字节随机 id(128 bit 熵),且必须命中服务端映射才有效——攻击者无法构造一个
 *    「碰巧存在」的 id,更无法塞进自定义归属(归属只来自签发时服务端写入的映射,不来自 URL/请求体)。
 *  - 短 TTL(10 分钟):窗口够完成"扫码→选文件→上传",仍远短于长效令牌;过期项惰性清理。
 *  - 一次性:首次成功上传即把映射项 used=true(用后即焚),后续携同 id 的请求直接拒。
 *
 * 单机内存映射的取舍(无迁移,同旧版 jti 黑名单的取舍):
 *  - 单实例部署可接受内存态;重启会丢失未用尽的令牌(只意味着「重启前已发的码失效」,用户重生成即可,
 *    无安全风险)。10 分钟 TTL 仍把窗口压得很小。若未来要强持久化/多实例,再加 1 张表(届时才有 migration)。
 */

/**
 * 令牌有效期(秒)。10 分钟:留足"扫码 → 在手机上找文件 → 选文件 → 上传"的真实操作时长
 * (60s 实测太紧,用户挑录音常超时)。安全不因延长 TTL 而削弱:令牌仍是一次性(成功即焚)+
 * 绑死单个 interview+签发者本人,延长的只是单次可用窗口,不放大任何越权面。
 */
const QR_UPLOAD_TTL_SECONDS = 600;

/** 短 id 随机字节数。16 字节 = 128 bit 熵,base64url 后 22 字符;碰撞与暴力枚举均不可行。 */
const QR_TOKEN_RANDOM_BYTES = 16;

/** 服务端为每枚短令牌保存的绑定关系(签发时写入,校验时读出,URL/请求体均不可影响)。 */
interface UploadTokenEntry {
  /** 令牌绑定的面试 ID;校验时由此取出,绝不来自请求方。 */
  interviewId: string;
  /** 令牌签发者(电脑端已登录用户)ID;上传落库 user_id 以此为准,绝不来自请求方。 */
  userId: string;
  /** 自然过期时间戳(ms);超过即视为无效并可清理。 */
  expiresAt: number;
  /** 一次性标识;首次成功上传后置 true(用后即焚),为 true 时再校验即拒。 */
  used: boolean;
}

/** 校验通过后回给上传端点的最小上下文(均来自服务端映射,不可被请求体篡改)。 */
export interface VerifiedQrUploadToken {
  interviewId: string;
  userId: string;
  /** 短令牌 id;上传真实成功后由调用方据此 burn(用后即焚)。 */
  tokenId: string;
}

@Injectable()
export class QrUploadTokenService {
  private readonly logger = new Logger(QrUploadTokenService.name);

  /**
   * 短令牌 id → 绑定关系。单机内存态;每次签发/校验惰性清理已过期项,避免无界增长。
   */
  private readonly tokens = new Map<string, UploadTokenEntry>();

  /**
   * 为「已登录用户的某个 interview」签发一次性上传令牌。
   * 调用方(service.issueUploadToken)必须已校验 interview 归属该 user(findOne)。
   * 这里只负责生成短 id 并把绑定关系写入服务端映射,返回不透明的短 id。
   */
  sign(interviewId: string, userId: string): { token: string; expiresInSec: number } {
    this.sweepExpired();

    // url-safe(base64url)短 id;命中映射才有效,故无需在 id 内携带任何归属/签名字段。
    const token = randomBytes(QR_TOKEN_RANDOM_BYTES).toString('base64url');
    this.tokens.set(token, {
      interviewId,
      userId,
      expiresAt: Date.now() + QR_UPLOAD_TTL_SECONDS * 1000,
      used: false,
    });
    return { token, expiresInSec: QR_UPLOAD_TTL_SECONDS };
  }

  /**
   * 校验 URL 里的短令牌:命中服务端映射 → 未过期 → 未用过 → 取出绑定的 interviewId/userId。
   * 任一不满足 → 401(不泄露细节)。注意:此处不烧令牌,成功上传后由 burn() 烧。
   *
   * 绝不复用 JwtAuthGuard:本令牌不在 Bearer 头、不代表登录态。
   */
  verify(token: string): VerifiedQrUploadToken {
    this.sweepExpired();

    const entry = this.tokens.get(token);

    // 不存在(乱码 / 从未签发 / 已被清理 / 主登录令牌冒用):统一 401,不区分原因(不给攻击者反馈)。
    if (!entry) {
      throw new UnauthorizedException('上传链接无效或已过期，请在电脑端重新生成二维码');
    }

    // 已过期(sweep 之外的二次兜底,防边界竞态)。
    if (entry.expiresAt <= Date.now()) {
      this.tokens.delete(token);
      throw new UnauthorizedException('上传链接已过期，请在电脑端重新生成二维码');
    }

    // 一次性:已烧 → 拒(用后即焚)。
    if (entry.used) {
      throw new UnauthorizedException('该上传链接已使用，请在电脑端重新生成二维码');
    }

    return {
      interviewId: entry.interviewId,
      userId: entry.userId,
      tokenId: token,
    };
  }

  /**
   * 烧掉短令牌(首次成功上传后调用):置 used=true,直至其自然过期被清理。
   * 由调用方在「上传真实成功(已建 transcribe task)」后调用,确保失败不烧(允许用户在有效期内重试)。
   */
  burn(tokenId: string): void {
    const entry = this.tokens.get(tokenId);
    if (entry) entry.used = true;
  }

  /** 惰性清理已自然过期的令牌,避免内存无界增长(签发/校验各触发一次,成本 O(在册条数))。 */
  private sweepExpired(): void {
    const now = Date.now();
    for (const [token, entry] of this.tokens) {
      if (entry.expiresAt <= now) {
        this.tokens.delete(token);
      }
    }
  }
}
