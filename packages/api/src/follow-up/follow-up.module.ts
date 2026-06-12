import { Module } from '@nestjs/common';
import { FollowUpController } from './follow-up.controller';
import { FollowUpService } from './follow-up.service';
import { AiModule } from '../ai/ai.module';
import { ApplicationsModule } from '../applications/applications.module';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [AiModule, ApplicationsModule, QuotaModule, CreditModule],
  controllers: [FollowUpController],
  providers: [FollowUpService],
})
export class FollowUpModule {}
