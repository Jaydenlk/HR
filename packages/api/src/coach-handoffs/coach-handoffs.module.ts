import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoachHandoff } from './entities/coach-handoff.entity';
import { CoachHandoffsController } from './coach-handoffs.controller';
import { CoachHandoffsService } from './coach-handoffs.service';

@Module({
  imports: [TypeOrmModule.forFeature([CoachHandoff])],
  controllers: [CoachHandoffsController],
  providers: [CoachHandoffsService],
  exports: [CoachHandoffsService],
})
export class CoachHandoffsModule {}
