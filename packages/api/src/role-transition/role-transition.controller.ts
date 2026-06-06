import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RoleTransitionService } from './role-transition.service';
import { AnalyzeRoleTransitionDto } from './dto/analyze-role-transition.dto';

@Controller('role-transition')
@UseGuards(JwtAuthGuard)
export class RoleTransitionController {
  constructor(private readonly roleTransition: RoleTransitionService) {}

  @Post('analyze')
  @HttpCode(200)
  analyze(@Body() dto: AnalyzeRoleTransitionDto) {
    return this.roleTransition.analyze(dto);
  }
}
