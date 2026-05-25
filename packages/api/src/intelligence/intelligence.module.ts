import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resume } from '../resumes/entities/resume.entity';
import { Diagnosis } from '../diagnoses/entities/diagnosis.entity';
import { Application } from '../applications/entities/application.entity';
import { DailyTask } from '../tasks/entities/daily-task.entity';
import { Opportunity } from '../opportunity/entities/opportunity.entity';
import { OpportunityEvaluation } from '../opportunity/entities/opportunity-evaluation.entity';
import { FeedItem } from '../feed/entities/feed-item.entity';
import { SalaryEntry } from '../salary/entities/salary-entry.entity';
import { EvidenceService } from './evidence.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Resume,
      Diagnosis,
      Application,
      DailyTask,
      Opportunity,
      OpportunityEvaluation,
      FeedItem,
      SalaryEntry,
    ]),
  ],
  providers: [EvidenceService],
  exports: [EvidenceService],
})
export class IntelligenceModule {}
