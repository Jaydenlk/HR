import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreditGuard } from '../credit/credit.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CreditInterceptor } from '../credit/credit.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CareerService } from './career.service';

@Controller('career')
@UseGuards(JwtAuthGuard)
export class CareerController {
  constructor(private readonly career: CareerService) {}

  @Get('analysis')
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  analyze(@CurrentUser() user: { id: string }) {
    return this.career.analyze(user.id);
  }
}
