import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { AiUsage } from './entities/ai-usage.entity';
import { User } from '../users/entities/user.entity';

const DEFAULT_DAILY_AI_QUOTA = 20;

// 放在 JwtAuthGuard 之后:依赖 request.user 已被 passport 填充。
// 统计「本地时区当日」的 ai_usage 行数,达到上限即 429。
// 每用户上限 = user.daily_quota_override ?? DAILY_AI_QUOTA(env,默认 20)。
@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    @InjectRepository(AiUsage)
    private readonly usageRepo: Repository<AiUsage>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: { id?: string } }>();
    const userId = request.user?.id;
    // 未认证(理论上 JwtAuthGuard 已拦截)→ 不在此处兜底鉴权,放行交由后续。
    if (!userId) {
      return true;
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, daily_quota_override: true },
    });

    const limit = this.resolveLimit(user?.daily_quota_override ?? null);

    const usedToday = await this.usageRepo.count({
      where: {
        user_id: userId,
        created_at: MoreThanOrEqual(this.startOfLocalDay()),
      },
    });

    if (usedToday >= limit) {
      throw new HttpException(
        '今日 AI 次数已用完,明天再来或联系管理员提额',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  // override 优先(含显式 0:封顶为 0 次);否则取 DAILY_AI_QUOTA env;非法/缺失回落默认 20。
  private resolveLimit(override: number | null): number {
    if (override !== null) {
      return override;
    }
    const raw = this.config.get('DAILY_AI_QUOTA');
    const parsed = Number(raw);
    return Number.isFinite(parsed) && raw !== undefined && raw !== ''
      ? parsed
      : DEFAULT_DAILY_AI_QUOTA;
  }

  // 本地时区当日 00:00:00.000(服务器时区)。
  private startOfLocalDay(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }
}
