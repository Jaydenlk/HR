import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IndustryTrendService, IndustryTrendResult } from './industry-trend.service';
import { AnalyzeIndustryDto } from './dto/analyze-industry.dto';

@Controller('industry-trend')
@UseGuards(JwtAuthGuard)
export class IndustryTrendController {
  constructor(private readonly industryTrend: IndustryTrendService) {}

  @Post('analyze')
  @HttpCode(200)
  analyze(
    @CurrentUser() _user: { id: string },
    @Body() dto: AnalyzeIndustryDto,
  ): Promise<IndustryTrendResult> {
    return this.industryTrend.analyze(dto);
  }
}
