import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OverviewService } from './overview.service';

@Controller('overview')
@UseGuards(JwtAuthGuard)
export class OverviewController {
  constructor(private readonly overview: OverviewService) {}

  @Get()
  getDashboard(@CurrentUser() user: { id: string }) {
    return this.overview.getDashboard(user.id);
  }
}
