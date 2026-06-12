import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interview } from './entities/interview.entity';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { DebriefService } from './debrief.service';
import { AiModule } from '../ai/ai.module';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Interview]), AiModule, QuotaModule, CreditModule],
  controllers: [InterviewsController],
  providers: [InterviewsService, DebriefService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
