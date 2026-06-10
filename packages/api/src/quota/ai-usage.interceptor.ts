import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AiUsage } from './entities/ai-usage.entity';

// AI 调用「成功」后写一条 ai_usage(失败/503 不计数)。
// 只在 tap 的 next 回调里落库;error 路径不写,保证用户不为失败请求耗配额。
@Injectable()
export class AiUsageInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AiUsageInterceptor.name);

  constructor(
    @InjectRepository(AiUsage)
    private readonly usageRepo: Repository<AiUsage>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { id?: string }; route?: { path?: string }; url?: string }>();
    const userId = request.user?.id;
    const endpoint = request.route?.path ?? request.url ?? 'unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          if (!userId) {
            return;
          }
          // 计数失败不应影响业务响应:仅记录日志,不抛错。
          this.usageRepo
            .insert({ user_id: userId, endpoint })
            .catch((err: unknown) =>
              this.logger.error(`写入 ai_usage 失败: ${String(err)}`),
            );
        },
      }),
    );
  }
}
