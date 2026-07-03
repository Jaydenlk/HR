import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyResearch } from './entities/company-research.entity';
import { CompanyResearchService } from './company-research.service';
import { BochaClient } from './bocha.client';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyResearch]), AiModule],
  providers: [CompanyResearchService, BochaClient],
  exports: [CompanyResearchService],
})
export class CompanyResearchModule {}
