import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { OfferComparatorController } from './offer-comparator.controller';
import { OfferComparatorService } from './offer-comparator.service';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [AiModule, QuotaModule, CreditModule],
  controllers: [OfferComparatorController],
  providers: [OfferComparatorService],
})
export class OfferComparatorModule {}
