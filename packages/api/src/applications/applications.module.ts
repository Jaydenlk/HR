import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './entities/application.entity';
import { ApplicationEvent } from './entities/application-event.entity';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { StrategyService } from './strategy.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Application, ApplicationEvent]), AiModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, StrategyService],
  exports: [ApplicationsService, StrategyService],
})
export class ApplicationsModule {}
