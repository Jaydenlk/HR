import { Module } from '@nestjs/common';
import { ApplicationsModule } from '../applications/applications.module';
import { InterviewsModule } from '../interviews/interviews.module';
import { ResumesModule } from '../resumes/resumes.module';
import { DiagnosesModule } from '../diagnoses/diagnoses.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { OverviewController } from './overview.controller';
import { OverviewService } from './overview.service';

@Module({
  imports: [
    ApplicationsModule,
    InterviewsModule,
    ResumesModule,
    DiagnosesModule,
    ConversationsModule,
  ],
  controllers: [OverviewController],
  providers: [OverviewService],
  exports: [OverviewService],
})
export class OverviewModule {}
