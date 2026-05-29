import { Module } from '@nestjs/common';
import { ProfessionPresetsService } from './profession-presets.service';

@Module({
  providers: [ProfessionPresetsService],
  exports: [ProfessionPresetsService],
})
export class ProfessionPresetsModule {}
