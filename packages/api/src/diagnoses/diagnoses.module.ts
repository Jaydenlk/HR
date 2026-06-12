import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Diagnosis } from './entities/diagnosis.entity';
import { DiagnosesController } from './diagnoses.controller';
import { DiagnosesService } from './diagnoses.service';
import { ResumesModule } from '../resumes/resumes.module';
import { AiModule } from '../ai/ai.module';
import { ProfessionPresetsModule } from '../profession-presets/profession-presets.module';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Diagnosis]),
    ResumesModule,
    AiModule,
    ProfessionPresetsModule,
    QuotaModule,
    CreditModule,
  ],
  controllers: [DiagnosesController],
  providers: [DiagnosesService],
  exports: [DiagnosesService],
})
export class DiagnosesModule {}
