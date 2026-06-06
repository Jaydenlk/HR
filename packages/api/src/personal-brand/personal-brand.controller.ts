import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  PersonalBrandService,
  BrandStrategyResult,
  PortfolioAdviceResult,
} from './personal-brand.service';
import { BrandStrategyDto } from './dto/brand-strategy.dto';
import { PortfolioAdviceDto } from './dto/portfolio-advice.dto';

@Controller('personal-brand')
@UseGuards(JwtAuthGuard)
export class PersonalBrandController {
  constructor(private readonly personalBrand: PersonalBrandService) {}

  @Post('brand-strategy')
  @HttpCode(200)
  brandStrategy(
    @CurrentUser() _user: { id: string },
    @Body() dto: BrandStrategyDto,
  ): Promise<BrandStrategyResult> {
    return this.personalBrand.brandStrategy(dto);
  }

  @Post('portfolio-advice')
  @HttpCode(200)
  portfolioAdvice(
    @CurrentUser() _user: { id: string },
    @Body() dto: PortfolioAdviceDto,
  ): Promise<PortfolioAdviceResult> {
    return this.personalBrand.portfolioAdvice(dto);
  }
}
