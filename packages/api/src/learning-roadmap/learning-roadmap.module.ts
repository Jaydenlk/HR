import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { LearningRoadmapController } from './learning-roadmap.controller';
import { LearningRoadmapService } from './learning-roadmap.service';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [AiModule, QuotaModule, CreditModule],
  controllers: [LearningRoadmapController],
  providers: [LearningRoadmapService],
})
export class LearningRoadmapModule {}
