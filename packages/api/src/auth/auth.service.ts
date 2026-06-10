import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { createHmac, randomInt } from 'crypto';
import { UsersService } from '../users/users.service';
import { InvitesService } from '../invites/invites.service';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { LoginCode } from './entities/login-code.entity';
import { RequestCodeDto } from './dto/request-code.dto';
import { LoginDto } from './dto/login.dto';

const CODE_TTL_MS = 10 * 60 * 1000; // 验证码 10 分钟有效
const MAX_ATTEMPTS = 5; // 错误尝试上限
const RESEND_COOLDOWN_MS = 60 * 1000; // 同邮箱重发冷却 60 秒

@Injectable()
export class AuthService {
  private readonly adminEmails: Set<string>;

  constructor(
    private readonly users: UsersService,
    private readonly invites: InvitesService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(LoginCode) private readonly codes: Repository<LoginCode>,
  ) {
    this.adminEmails = new Set(
      (this.config.get<string>('ADMIN_EMAILS') ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0),
    );
  }

  // 申请登录验证码:作废旧码 → 生成新码 → 存 HMAC 摘要 → 发邮件。
  // 返回 registered 标识该邮箱是否已注册。
  // 注:试运行邀请制下,registered 暴露存在枚举风险,但运营可控,可接受。
  async requestCode(dto: RequestCodeDto): Promise<{ registered: boolean; dev_code?: string }> {
    const email = dto.email;
    const existing = await this.users.findByEmail(email);

    // 60s 冷却:throttler 按 IP 计数,挡不住分布式刷同一邮箱;此处按邮箱补一道防线。
    // 查该邮箱最近一条未消费码的生成时间,距今 <60s 则拒绝。须在作废旧码前判断。
    const last = await this.codes.findOne({
      where: { email, consumed: false },
      order: { created_at: 'DESC' },
    });
    if (last && Date.now() - last.created_at.getTime() < RESEND_COOLDOWN_MS) {
      throw new HttpException('请求过于频繁,请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
    }

    // 同邮箱新申请使旧码 consumed,避免多码并存。
    await this.codes.update({ email, consumed: false }, { consumed: true });

    const code = this.generateCode();
    await this.codes.save(
      this.codes.create({
        email,
        code_hash: this.hashCode(code),
        expires_at: new Date(Date.now() + CODE_TTL_MS),
      }),
    );
    await this.mail.sendLoginCode(email, code);

    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const result: { registered: boolean; dev_code?: string } = { registered: existing !== null };
    // dev_code 仅在 SMTP 未配置且非 production 时返回,便于开发/测试自动化。
    if (!this.mail.configured && !isProd) {
      result.dev_code = code;
    }
    return result;
  }

  // 登录:校验验证码 → 区分新老用户 → 签发 JWT。
  async login(dto: LoginDto): Promise<{ access_token: string; user: User }> {
    await this.verifyCode(dto.email, dto.code);

    const existing = await this.users.findByEmail(dto.email);
    const isAdmin = this.adminEmails.has(dto.email);

    let user: User;
    if (existing) {
      if (existing.status === 'banned') {
        throw new UnauthorizedException('账号已被停用');
      }
      user = await this.users.promoteIfAdmin(existing, isAdmin);
    } else {
      // 新用户必须带有效邀请码 + 姓名。
      if (!dto.invite_code) {
        throw new ForbiddenException('新用户首次登录需要邀请码');
      }
      if (!dto.name) {
        throw new ForbiddenException('新用户首次登录需要填写姓名');
      }
      const consumed = await this.invites.consume(dto.invite_code);
      if (!consumed) {
        throw new ForbiddenException('邀请码无效或已用完');
      }
      user = await this.users.createUser(dto.email, dto.name, dto.invite_code, isAdmin);
    }

    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { access_token: token, user };
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  // 校验验证码:取该邮箱最新未消费码,判过期/锁定/匹配;错误则累加 attempts。
  private async verifyCode(email: string, code: string): Promise<void> {
    const record = await this.codes.findOne({
      where: { email, consumed: false },
      order: { created_at: 'DESC' },
    });
    if (!record) {
      throw new UnauthorizedException('验证码无效,请重新获取');
    }
    if (record.expires_at.getTime() < Date.now()) {
      throw new UnauthorizedException('验证码已过期,请重新获取');
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      throw new UnauthorizedException('验证码错误次数过多,请重新获取');
    }
    if (record.code_hash !== this.hashCode(code)) {
      record.attempts += 1;
      await this.codes.save(record);
      const message =
        record.attempts >= MAX_ATTEMPTS
          ? '验证码错误次数过多,请重新获取'
          : '验证码错误,请重试';
      throw new UnauthorizedException(message);
    }
    record.consumed = true;
    await this.codes.save(record);
  }

  // 每日 04:00(服务器时区)清理过期未消费码,避免 login_codes 表无限膨胀。
  // ScheduleModule.forRoot() 已在 app.module 挂载,@Cron 由 SchedulerRegistry 接管。
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async purgeExpiredCodes(): Promise<void> {
    await this.codes.delete({ consumed: false, expires_at: LessThan(new Date()) });
  }

  // 密码学安全随机:randomInt(100000, 1000000) 均匀产出 6 位码(上界 exclusive)。
  // 不用 Math.random(可预测,易被爆破)。
  private generateCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  private hashCode(code: string): string {
    const secret = this.config.get<string>('JWT_SECRET', 'dev-secret');
    return createHmac('sha256', secret).update(code).digest('hex');
  }
}
