import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interview } from './entities/interview.entity';
import { InterviewsController } from './interviews.controller';
import { QrUploadController } from './qr-upload.controller';
import { InterviewsService } from './interviews.service';
import { QrUploadTokenService } from './qr-upload-token.service';
import { DebriefService } from './debrief.service';
import { AiModule } from '../ai/ai.module';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';
import { SpeechModule } from '../speech/speech.module';
import { OpsEventsModule } from '../ops/ops-events.module';
import { InterviewTranscribeTask } from '../speech/entities/transcribe-task.entity';

@Module({
  // forFeature 再次注册转写任务实体:同一实体在本模块作用域内拿到仓库,供 InterviewsService 注入
  // (SpeechModule 已在自身作用域注册同一实体,二者各自获得仓库,实体本身经 autoLoadEntities 单次建表)。
  // import SpeechModule:消费其 export 的 SpeechService(ASR 转写)+ LabelService(角色打标)。
  imports: [
    TypeOrmModule.forFeature([Interview, InterviewTranscribeTask]),
    AiModule,
    QuotaModule,
    CreditModule,
    SpeechModule,
  ],
  controllers: [InterviewsController, QrUploadController],
  providers: [InterviewsService, QrUploadTokenService, DebriefService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
