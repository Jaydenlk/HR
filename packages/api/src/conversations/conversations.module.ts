import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Diagnosis } from '../diagnoses/entities/diagnosis.entity';
import { Opportunity } from '../opportunity/entities/opportunity.entity';
import { OpportunityEvaluation } from '../opportunity/entities/opportunity-evaluation.entity';
import { Resume } from '../resumes/entities/resume.entity';
import { CoverLetter } from '../cover-letters/entities/cover-letter.entity';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ChatService } from './chat.service';
import { CoachContextService } from './coach-context.service';
import { AiModule } from '../ai/ai.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';
import { CoachHandoffsModule } from '../coach-handoffs/coach-handoffs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation, Message, Diagnosis, Opportunity, OpportunityEvaluation,
      Resume, CoverLetter,
    ]),
    AiModule,
    IntelligenceModule,
    QuotaModule,
    CreditModule,
    CoachHandoffsModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, ChatService, CoachContextService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
