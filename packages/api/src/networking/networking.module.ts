import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { NetworkingController } from './networking.controller';
import { NetworkingService } from './networking.service';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [AiModule, QuotaModule, CreditModule],
  controllers: [NetworkingController],
  providers: [NetworkingService],
})
export class NetworkingModule {}
