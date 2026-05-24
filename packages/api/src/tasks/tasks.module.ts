import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyTask } from './entities/daily-task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskGeneratorService } from './task-generator.service';
import { AiModule } from '../ai/ai.module';
import { ResumesModule } from '../resumes/resumes.module';
import { ApplicationsModule } from '../applications/applications.module';
import { InterviewsModule } from '../interviews/interviews.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DailyTask]),
    AiModule,
    ResumesModule,
    ApplicationsModule,
    InterviewsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskGeneratorService],
  exports: [TasksService],
})
export class TasksModule {}
