import { Module } from '@nestjs/common';
import { CareerController } from './career.controller';
import { CareerService } from './career.service';
import { AiModule } from '../ai/ai.module';
import { ResumesModule } from '../resumes/resumes.module';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [AiModule, ResumesModule, QuotaModule, CreditModule],
  controllers: [CareerController],
  providers: [CareerService],
  exports: [CareerService],
})
export class CareerModule {}
