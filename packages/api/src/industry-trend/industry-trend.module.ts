import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { IndustryTrendController } from './industry-trend.controller';
import { IndustryTrendService } from './industry-trend.service';
import { IndustryBochaService } from './industry-bocha.service';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [AiModule, QuotaModule, CreditModule],
  controllers: [IndustryTrendController],
  providers: [IndustryTrendService, IndustryBochaService],
})
export class IndustryTrendModule {}
