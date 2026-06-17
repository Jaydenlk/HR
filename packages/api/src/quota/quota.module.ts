import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiUsage } from './entities/ai-usage.entity';
import { AiUsageInterceptor } from './ai-usage.interceptor';
import { OpsEventsModule } from '../ops/ops-events.module';

// 导出 AiUsageInterceptor(运营口径 ai_usage,继续记账)。各 AI 控制器所在 feature module import 本模块,
// 这样 @UseInterceptors(AiUsageInterceptor) 引用类时,NestJS 能在宿主控制器所在模块的注入器里
// 解析到本模块导出的单例及其依赖(AiUsageRepository)。
// 注:QuotaGuard 已退役(credit 完全替代制),配额计费改由 CreditModule 的 CreditGuard/CreditInterceptor 负责;
// ai_usage 与 credit_transactions 双轨并存(运营口径 vs 账务口径),故本模块仅保留 AiUsageInterceptor。
@Module({
  imports: [TypeOrmModule.forFeature([AiUsage]), OpsEventsModule],
  providers: [AiUsageInterceptor],
  // 同时导出 TypeOrmModule:@UseInterceptors(类引用) 会在宿主控制器所在模块的注入器里实例化 Interceptor,
  // 故其依赖(AiUsageRepository)必须在导入方注入器内可解析 → 必须 re-export forFeature。
  // 须 re-export OpsEventsModule:AiUsageInterceptor 现依赖 OpsEventsService(AI 调用失败记 AI_CALL_FAILED),
  // 该拦截器在「导入 QuotaModule 的宿主控制器模块」注入器内实例化,故其依赖 OpsEventsService 必须在宿主注入器可解析。
  exports: [AiUsageInterceptor, TypeOrmModule, OpsEventsModule],
})
export class QuotaModule {}
