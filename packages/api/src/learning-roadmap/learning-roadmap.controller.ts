import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LearningRoadmapService, BuildRoadmapResult } from './learning-roadmap.service';
import { BuildRoadmapDto } from './dto/build-roadmap.dto';

@Controller('learning-roadmap')
@UseGuards(JwtAuthGuard)
export class LearningRoadmapController {
  constructor(private readonly learningRoadmap: LearningRoadmapService) {}

  @Post('build')
  @HttpCode(200)
  build(
    @CurrentUser() _user: { id: string },
    @Body() dto: BuildRoadmapDto,
  ): Promise<BuildRoadmapResult> {
    return this.learningRoadmap.build(dto);
  }
}
