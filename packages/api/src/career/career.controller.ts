import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CareerService } from './career.service';

@Controller('career')
@UseGuards(JwtAuthGuard)
export class CareerController {
  constructor(private readonly career: CareerService) {}

  @Get('analysis')
  @UseGuards(QuotaGuard)
  @UseInterceptors(AiUsageInterceptor)
  analyze(@CurrentUser() user: { id: string }) {
    return this.career.analyze(user.id);
  }
}
