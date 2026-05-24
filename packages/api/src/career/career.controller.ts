import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CareerService } from './career.service';

@Controller('career')
@UseGuards(JwtAuthGuard)
export class CareerController {
  constructor(private readonly career: CareerService) {}

  @Get('analysis')
  analyze(@CurrentUser() user: { id: string }) {
    return this.career.analyze(user.id);
  }
}
