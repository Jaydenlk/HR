import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { LearningRoadmapController } from './learning-roadmap.controller';
import { LearningRoadmapService } from './learning-roadmap.service';

@Module({
  imports: [AiModule],
  controllers: [LearningRoadmapController],
  providers: [LearningRoadmapService],
})
export class LearningRoadmapModule {}
