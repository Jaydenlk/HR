import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

// 健康检查模块。DataSource 由根 TypeOrmModule.forRootAsync 全局提供,无需在此再 import。
// 接线说明:本模块需由 app.module.ts 的 imports 数组挂载(集成轨负责),否则 /api/health 不可达。
@Module({
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
