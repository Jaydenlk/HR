import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  InterviewPrepService,
  CompanyPlaybookResult,
  StarStoriesResult,
  TechCoachResult,
  CaseCoachResult,
} from './interview-prep.service';
import { CompanyPlaybookDto } from './dto/company-playbook.dto';
import { StarStoriesDto } from './dto/star-stories.dto';
import { TechCoachDto } from './dto/tech-coach.dto';
import { CaseCoachDto } from './dto/case-coach.dto';

@Controller('interview-prep')
@UseGuards(JwtAuthGuard)
export class InterviewPrepController {
  constructor(private readonly interviewPrep: InterviewPrepService) {}

  @Post('playbook')
  @HttpCode(200)
  playbook(@Body() dto: CompanyPlaybookDto): Promise<CompanyPlaybookResult> {
    return this.interviewPrep.playbook(dto);
  }

  @Post('star-stories')
  @HttpCode(200)
  starStories(@Body() dto: StarStoriesDto): Promise<StarStoriesResult> {
    return this.interviewPrep.starStories(dto);
  }

  @Post('tech-coach')
  @HttpCode(200)
  techCoach(@Body() dto: TechCoachDto): Promise<TechCoachResult> {
    return this.interviewPrep.techCoach(dto);
  }

  @Post('case-coach')
  @HttpCode(200)
  caseCoach(@Body() dto: CaseCoachDto): Promise<CaseCoachResult> {
    return this.interviewPrep.caseCoach(dto);
  }
}
