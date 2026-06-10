import { Controller, Post, Body, UseGuards, UseInterceptors, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LearningRoadmapService, BuildRoadmapResult } from './learning-roadmap.service';
import { BuildRoadmapDto } from './dto/build-roadmap.dto';

@Controller('learning-roadmap')
@UseGuards(JwtAuthGuard)
export class LearningRoadmapController {
  constructor(private readonly learningRoadmap: LearningRoadmapService) {}

  @Post('build')
  @HttpCode(200)
  @UseGuards(QuotaGuard)
  @UseInterceptors(AiUsageInterceptor)
  build(
    @CurrentUser() _user: { id: string },
    @Body() dto: BuildRoadmapDto,
  ): Promise<BuildRoadmapResult> {
    return this.learningRoadmap.build(dto);
  }
}
