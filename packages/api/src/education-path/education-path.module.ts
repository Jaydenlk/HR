import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { EducationPathController } from './education-path.controller';
import { EducationPathService } from './education-path.service';

@Module({
  imports: [AiModule],
  controllers: [EducationPathController],
  providers: [EducationPathService],
})
export class EducationPathModule {}
