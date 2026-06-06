import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { IndustryTrendController } from './industry-trend.controller';
import { IndustryTrendService } from './industry-trend.service';

@Module({
  imports: [AiModule],
  controllers: [IndustryTrendController],
  providers: [IndustryTrendService],
})
export class IndustryTrendModule {}
