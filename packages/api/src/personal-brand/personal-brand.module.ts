import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PersonalBrandController } from './personal-brand.controller';
import { PersonalBrandService } from './personal-brand.service';

@Module({
  imports: [AiModule],
  controllers: [PersonalBrandController],
  providers: [PersonalBrandService],
})
export class PersonalBrandModule {}
