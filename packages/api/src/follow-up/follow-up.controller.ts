import { Controller, Post, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreditGuard } from '../credit/credit.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CreditInterceptor } from '../credit/credit.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FollowUpService } from './follow-up.service';
import { GenerateFollowUpDto } from './dto/generate-follow-up.dto';

@Controller('follow-up')
@UseGuards(JwtAuthGuard)
export class FollowUpController {
  constructor(private readonly followUp: FollowUpService) {}

  @Post('generate')
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  generate(
    @CurrentUser() user: { id: string },
    @Body() dto: GenerateFollowUpDto,
  ) {
    return this.followUp.generate(dto, user.id);
  }
}
