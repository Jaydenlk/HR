import { Controller, Post, Body, UseGuards, UseInterceptors, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OfferComparatorService, CompareOffersResult } from './offer-comparator.service';
import { CompareOffersDto } from './dto/compare-offers.dto';

@Controller('offer-comparator')
@UseGuards(JwtAuthGuard)
export class OfferComparatorController {
  constructor(private readonly offerComparator: OfferComparatorService) {}

  @Post('compare')
  @HttpCode(200)
  @UseGuards(QuotaGuard)
  @UseInterceptors(AiUsageInterceptor)
  compare(
    @CurrentUser() _user: { id: string },
    @Body() dto: CompareOffersDto,
  ): Promise<CompareOffersResult> {
    return this.offerComparator.compare(dto);
  }
}
