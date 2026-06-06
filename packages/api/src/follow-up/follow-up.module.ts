import { Module } from '@nestjs/common';
import { FollowUpController } from './follow-up.controller';
import { FollowUpService } from './follow-up.service';
import { AiModule } from '../ai/ai.module';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [AiModule, ApplicationsModule],
  controllers: [FollowUpController],
  providers: [FollowUpService],
})
export class FollowUpModule {}
