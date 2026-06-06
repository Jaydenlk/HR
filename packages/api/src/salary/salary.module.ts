import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalaryEntry } from './entities/salary-entry.entity';
import { SalaryController } from './salary.controller';
import { SalaryService } from './salary.service';
import { SalaryAnalysisService } from './salary-analysis.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([SalaryEntry]), AiModule],
  controllers: [SalaryController],
  providers: [SalaryService, SalaryAnalysisService],
  exports: [SalaryService, SalaryAnalysisService],
})
export class SalaryModule {}
