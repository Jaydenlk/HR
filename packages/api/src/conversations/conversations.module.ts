import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Diagnosis } from '../diagnoses/entities/diagnosis.entity';
import { Opportunity } from '../opportunity/entities/opportunity.entity';
import { OpportunityEvaluation } from '../opportunity/entities/opportunity-evaluation.entity';
import { Resume } from '../resumes/entities/resume.entity';
import { Application } from '../applications/entities/application.entity';
import { DailyTask } from '../tasks/entities/daily-task.entity';
import { FeedItem } from '../feed/entities/feed-item.entity';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ChatService } from './chat.service';
import { CoachContextService } from './coach-context.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation, Message, Diagnosis, Opportunity, OpportunityEvaluation,
      Resume, Application, DailyTask, FeedItem,
    ]),
    AiModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, ChatService, CoachContextService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
