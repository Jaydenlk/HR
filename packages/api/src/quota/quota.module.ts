import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiUsage } from './entities/ai-usage.entity';
import { User } from '../users/entities/user.entity';
import { QuotaGuard } from './quota.guard';
import { AiUsageInterceptor } from './ai-usage.interceptor';

// 导出 QuotaGuard / AiUsageInterceptor。各 AI 控制器所在 feature module 需 import 本模块,
// 这样 @UseGuards(QuotaGuard)/@UseInterceptors(AiUsageInterceptor) 引用类时,
// NestJS 能在该模块注入器里解析到本模块导出的单例(及其在本模块内解析好的依赖)。
// 注:@UseGuards(类引用) 的实例化上下文是宿主控制器所在模块,故 @Global 无法满足其依赖解析,
// 必须逐个 feature module 显式 import QuotaModule。
// User 仅读取 daily_quota_override;不修改 User 实体字段(该列由 auth 轨负责新增)。
@Module({
  imports: [TypeOrmModule.forFeature([AiUsage, User])],
  providers: [QuotaGuard, AiUsageInterceptor],
  // 同时导出 TypeOrmModule:@UseGuards(类引用)/@UseInterceptors(类引用) 会在宿主控制器
  // 所在模块的注入器里实例化 Guard/Interceptor,故它们的依赖(AiUsageRepository/UserRepository)
  // 必须在导入方注入器内可解析 → 必须 re-export forFeature。
  exports: [QuotaGuard, AiUsageInterceptor, TypeOrmModule],
})
export class QuotaModule {}
