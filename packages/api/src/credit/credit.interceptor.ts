import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CreditService } from './credit.service';

// AI 端点「成功」后扣 1 点(失败/503 不扣,语义对齐现行 AiUsageInterceptor)。
// 只在 tap 的 next 回调里 consume;error 路径不扣,保证用户不为失败请求耗点数。
// 与 AiUsageInterceptor 并列挂载:ai_usage 记运营口径,credit 记账务口径,双轨并存。
@Injectable()
export class CreditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CreditInterceptor.name);

  constructor(private readonly credit: CreditService) {}

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
          // 扣点失败不应影响业务响应:仅记录日志,不抛错。
          this.credit
            .consume(userId, endpoint)
            .catch((err: unknown) =>
              this.logger.error(`扣减 credit 失败: ${String(err)}`),
            );
        },
      }),
    );
  }
}
