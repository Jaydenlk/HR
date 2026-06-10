import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalaryEntry } from './entities/salary-entry.entity';
import { SalaryController } from './salary.controller';
import { SalaryService } from './salary.service';
import { SalaryAnalysisService } from './salary-analysis.service';
import { CityIndustryFitService } from './city-industry-fit.service';
import { AiModule } from '../ai/ai.module';
import { QuotaModule } from '../quota/quota.module';

@Module({
  imports: [TypeOrmModule.forFeature([SalaryEntry]), AiModule, QuotaModule],
  controllers: [SalaryController],
  providers: [SalaryService, SalaryAnalysisService, CityIndustryFitService],
  exports: [SalaryService, SalaryAnalysisService, CityIndustryFitService],
})
export class SalaryModule {}
