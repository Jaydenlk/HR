import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { InterviewPrepController } from './interview-prep.controller';
import { InterviewPrepService } from './interview-prep.service';
import { QuotaModule } from '../quota/quota.module';

@Module({
  imports: [AiModule, QuotaModule],
  controllers: [InterviewPrepController],
  providers: [InterviewPrepService],
})
export class InterviewPrepModule {}
