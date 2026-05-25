import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from './entities/opportunity.entity';
import { OpportunityEvaluation } from './entities/opportunity-evaluation.entity';
import { OpportunityEvidence } from './entities/opportunity-evidence.entity';
import { OpportunityAction } from './entities/opportunity-action.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Opportunity, OpportunityEvaluation, OpportunityEvidence, OpportunityAction,
    ]),
    AiModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class OpportunityModule {}
