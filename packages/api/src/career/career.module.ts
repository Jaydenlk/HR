import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareerController } from './career.controller';
import { CareerService } from './career.service';
import { CareerAnalysisRecord } from './entities/career-analysis.entity';
import { UserSkillSelfAssessment } from './entities/user-skill-self-assessment.entity';
import { AiModule } from '../ai/ai.module';
import { ResumesModule } from '../resumes/resumes.module';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CareerAnalysisRecord, UserSkillSelfAssessment]),
    AiModule,
    ResumesModule,
    QuotaModule,
    CreditModule,
  ],
  controllers: [CareerController],
  providers: [CareerService],
  exports: [CareerService],
})
export class CareerModule {}
