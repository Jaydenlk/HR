import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interview } from './entities/interview.entity';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { DebriefService } from './debrief.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Interview]), AiModule],
  controllers: [InterviewsController],
  providers: [InterviewsService, DebriefService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
