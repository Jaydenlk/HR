import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from './entities/opportunity.entity';
import { OpportunityEvaluation } from './entities/opportunity-evaluation.entity';
import { OpportunityEvidence } from './entities/opportunity-evidence.entity';
import { OpportunityAction } from './entities/opportunity-action.entity';
import { AiModule } from '../ai/ai.module';
import { OpportunityService } from './opportunity.service';
import { OpportunityParserService } from './opportunity-parser.service';
import { OpportunityRiskService } from './opportunity-risk.service';
import { OpportunityEvaluatorService } from './opportunity-evaluator.service';
import { OpportunityController } from './opportunity.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Opportunity, OpportunityEvaluation, OpportunityEvidence, OpportunityAction,
    ]),
    AiModule,
  ],
  controllers: [OpportunityController],
  providers: [
    OpportunityService,
    OpportunityParserService,
    OpportunityRiskService,
    OpportunityEvaluatorService,
  ],
  exports: [OpportunityService],
})
export class OpportunityModule {}
