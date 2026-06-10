import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from './entities/opportunity.entity';
import { OpportunityEvaluation } from './entities/opportunity-evaluation.entity';
import { OpportunityEvidence } from './entities/opportunity-evidence.entity';
import { OpportunityAction } from './entities/opportunity-action.entity';
import { Application } from '../applications/entities/application.entity';
import { ApplicationEvent } from '../applications/entities/application-event.entity';
import { DailyTask } from '../tasks/entities/daily-task.entity';
import { AiModule } from '../ai/ai.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { QuotaModule } from '../quota/quota.module';
import { OpportunityService } from './opportunity.service';
import { OpportunityParserService } from './opportunity-parser.service';
import { OpportunityRiskService } from './opportunity-risk.service';
import { OpportunityEvaluatorService } from './opportunity-evaluator.service';
import { OpportunityIntegrationService } from './opportunity-integration.service';
import { OpportunityController } from './opportunity.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Opportunity, OpportunityEvaluation, OpportunityEvidence, OpportunityAction,
      Application, ApplicationEvent, DailyTask,
    ]),
    AiModule,
    IntelligenceModule,
    QuotaModule,
  ],
  controllers: [OpportunityController],
  providers: [
    OpportunityService,
    OpportunityParserService,
    OpportunityRiskService,
    OpportunityEvaluatorService,
    OpportunityIntegrationService,
  ],
  exports: [OpportunityService],
})
export class OpportunityModule {}
