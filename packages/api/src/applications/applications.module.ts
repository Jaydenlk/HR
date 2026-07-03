import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './entities/application.entity';
import { ApplicationEvent } from './entities/application-event.entity';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ApplicationLinksService } from './application-links.service';
import { StrategyService } from './strategy.service';
import { AiModule } from '../ai/ai.module';
import { Resume } from '../resumes/entities/resume.entity';
import { Diagnosis } from '../diagnoses/entities/diagnosis.entity';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';
// T5 聚合/link/建议:直接对消费方实体 forFeature 二次注册拿独立 Repository(不 import
// InterviewsModule/MockModule/CoverLettersModule,避免它们对本模块的依赖成环,见 application-links.service.ts 头注)。
import { ResumeVersion } from '../resumes/entities/resume-version.entity';
import { Interview } from '../interviews/entities/interview.entity';
import { MockSession } from '../mock/entities/mock-session.entity';
import { CoverLetter } from '../cover-letters/entities/cover-letter.entity';
import { CompanyResearch } from '../company-research/entities/company-research.entity';
import { InterviewTranscribeTask } from '../speech/entities/transcribe-task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      ApplicationEvent,
      Resume,
      Diagnosis,
      ResumeVersion,
      Interview,
      MockSession,
      CoverLetter,
      CompanyResearch,
      InterviewTranscribeTask,
    ]),
    AiModule,
    QuotaModule,
    CreditModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, StrategyService, ApplicationLinksService],
  exports: [ApplicationsService, StrategyService],
})
export class ApplicationsModule {}
