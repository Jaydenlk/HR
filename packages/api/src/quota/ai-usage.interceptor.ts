import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AiUsage } from './entities/ai-usage.entity';
import { OpsEventsService } from '../ops/ops-events.service';

// 仅当错误是服务端失败时才计为「AI 调用失败」:HttpException 取其 status,>=500 才算(503 降级耗尽等);
// 非 HttpException(如 SDK 抛的原生 Error/超时)一律视为服务端失败。4xx 客户端错误(畸形入参/内容校验
// 拒绝等)返回 false——它们不是 AI 坏了,不应进成功率分母或报错流水。
// 单一真相源:HTTP 拦截器与 interviews 后台转写 runner 共用本函数,避免两处各写一份判定漂移。
export function isAiCallFailure(err: unknown): boolean {
  if (err instanceof HttpException) {
    return err.getStatus() >= 500;
  }
  return true;
}

// AI 调用「成功」后写一条 ai_usage(失败/503 不计数)。
// 只在 tap 的 next 回调里落库;error 路径不写,保证用户不为失败请求耗配额。
// 失败路径单独经 catchError 写一条 ops_events AI_CALL_FAILED(供成功率统计/报错流水),
// 然后原样 rethrow——绝不吞错,业务错误语义不变。
@Injectable()
export class AiUsageInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AiUsageInterceptor.name);

  constructor(
    @InjectRepository(AiUsage)
    private readonly usageRepo: Repository<AiUsage>,
    private readonly opsEvents: OpsEventsService,
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
      // AI 端点抛错:只把「真正的 AI/服务端失败」(超时/降级耗尽/5xx/非 HTTP 异常)记 AI_CALL_FAILED,
      // 供成功率分母与报错流水。4xx 客户端错误(畸形入参等)不是 AI 调用失败,不计入(避免污染失败率)。
      // OpsEventsService.record 内部已吞写库异常,这里 void 即可;无论是否记录都【原样 rethrow】,绝不吞错。
      catchError((err: unknown) => {
        if (isAiCallFailure(err)) {
          const reason = err instanceof Error ? err.message : String(err);
          void this.opsEvents.record('AI_CALL_FAILED', {
            endpoint,
            ...(userId ? { user_id: userId } : {}),
            error: reason,
          });
        }
        return throwError(() => err);
      }),
    );
  }
}
