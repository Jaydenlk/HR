import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoverLetter } from './entities/cover-letter.entity';
import { CoverLettersController } from './cover-letters.controller';
import { CoverLettersService } from './cover-letters.service';
import { AiModule } from '../ai/ai.module';
import { ResumesModule } from '../resumes/resumes.module';
import { QuotaModule } from '../quota/quota.module';

@Module({
  imports: [TypeOrmModule.forFeature([CoverLetter]), AiModule, ResumesModule, QuotaModule],
  controllers: [CoverLettersController],
  providers: [CoverLettersService],
  exports: [CoverLettersService],
})
export class CoverLettersModule {}
