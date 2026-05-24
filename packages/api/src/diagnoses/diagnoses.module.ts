import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Diagnosis } from './entities/diagnosis.entity';
import { DiagnosesController } from './diagnoses.controller';
import { DiagnosesService } from './diagnoses.service';
import { ResumesModule } from '../resumes/resumes.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Diagnosis]),
    ResumesModule,
    AiModule,
  ],
  controllers: [DiagnosesController],
  providers: [DiagnosesService],
  exports: [DiagnosesService],
})
export class DiagnosesModule {}
