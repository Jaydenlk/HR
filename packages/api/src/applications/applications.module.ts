import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './entities/application.entity';
import { ApplicationEvent } from './entities/application-event.entity';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { StrategyService } from './strategy.service';
import { AiModule } from '../ai/ai.module';
import { Resume } from '../resumes/entities/resume.entity';
import { Diagnosis } from '../diagnoses/entities/diagnosis.entity';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Application, ApplicationEvent, Resume, Diagnosis]), AiModule, QuotaModule, CreditModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, StrategyService],
  exports: [ApplicationsService, StrategyService],
})
export class ApplicationsModule {}
