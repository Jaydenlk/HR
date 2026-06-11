import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpsEvent } from './entities/ops-event.entity';
import { OpsEventsService } from './ops-events.service';

// OpsEventsModule 导出 OpsEventsService,供 AiModule / T3 管理后台 import 使用。
// Controller 由 T3 轨在 AdminModule 中添加,本轨只做 Service + Module。
@Module({
  imports: [TypeOrmModule.forFeature([OpsEvent])],
  providers: [OpsEventsService],
  exports: [OpsEventsService],
})
export class OpsEventsModule {}
