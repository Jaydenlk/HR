import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { RoleTransitionController } from './role-transition.controller';
import { RoleTransitionService } from './role-transition.service';

@Module({
  imports: [AiModule],
  controllers: [RoleTransitionController],
  providers: [RoleTransitionService],
})
export class RoleTransitionModule {}
