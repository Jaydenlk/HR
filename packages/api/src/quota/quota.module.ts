import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiUsage } from './entities/ai-usage.entity';
import { AiUsageInterceptor } from './ai-usage.interceptor';

// 导出 AiUsageInterceptor(运营口径 ai_usage,继续记账)。各 AI 控制器所在 feature module import 本模块,
// 这样 @UseInterceptors(AiUsageInterceptor) 引用类时,NestJS 能在宿主控制器所在模块的注入器里
// 解析到本模块导出的单例及其依赖(AiUsageRepository)。
// 注:QuotaGuard 已退役(credit 完全替代制),配额计费改由 CreditModule 的 CreditGuard/CreditInterceptor 负责;
// ai_usage 与 credit_transactions 双轨并存(运营口径 vs 账务口径),故本模块仅保留 AiUsageInterceptor。
@Module({
  imports: [TypeOrmModule.forFeature([AiUsage])],
  providers: [AiUsageInterceptor],
  // 同时导出 TypeOrmModule:@UseInterceptors(类引用) 会在宿主控制器所在模块的注入器里实例化 Interceptor,
  // 故其依赖(AiUsageRepository)必须在导入方注入器内可解析 → 必须 re-export forFeature。
  exports: [AiUsageInterceptor, TypeOrmModule],
})
export class QuotaModule {}
