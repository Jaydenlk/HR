import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { IndustryTrendController } from './industry-trend.controller';
import { IndustryTrendService } from './industry-trend.service';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [AiModule, QuotaModule, CreditModule],
  controllers: [IndustryTrendController],
  providers: [IndustryTrendService],
})
export class IndustryTrendModule {}
