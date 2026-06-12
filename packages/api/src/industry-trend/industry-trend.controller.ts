import { Controller, Post, Body, UseGuards, UseInterceptors, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreditGuard } from '../credit/credit.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CreditInterceptor } from '../credit/credit.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IndustryTrendService, IndustryTrendResult } from './industry-trend.service';
import { AnalyzeIndustryDto } from './dto/analyze-industry.dto';

@Controller('industry-trend')
@UseGuards(JwtAuthGuard)
export class IndustryTrendController {
  constructor(private readonly industryTrend: IndustryTrendService) {}

  @Post('analyze')
  @HttpCode(200)
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  analyze(
    @CurrentUser() _user: { id: string },
    @Body() dto: AnalyzeIndustryDto,
  ): Promise<IndustryTrendResult> {
    return this.industryTrend.analyze(dto);
  }
}
