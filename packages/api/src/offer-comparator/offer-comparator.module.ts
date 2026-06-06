import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { OfferComparatorController } from './offer-comparator.controller';
import { OfferComparatorService } from './offer-comparator.service';

@Module({
  imports: [AiModule],
  controllers: [OfferComparatorController],
  providers: [OfferComparatorService],
})
export class OfferComparatorModule {}
