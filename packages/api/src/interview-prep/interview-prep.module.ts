import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { InterviewPrepController } from './interview-prep.controller';
import { InterviewPrepService } from './interview-prep.service';

@Module({
  imports: [AiModule],
  controllers: [InterviewPrepController],
  providers: [InterviewPrepService],
})
export class InterviewPrepModule {}
