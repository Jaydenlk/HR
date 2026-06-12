import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreditGuard } from '../credit/credit.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CreditInterceptor } from '../credit/credit.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';

@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  // 无 transcript 的草稿也计 1 次 AI 配额——试运行防滥用优先于精确计量,与 opportunity create 同语义
  @Post()
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateInterviewDto,
  ) {
    return this.interviews.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.interviews.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.interviews.findOne(id, user.id);
  }

  // 纯元数据 PATCH 也计 1 次 AI 配额——试运行防滥用优先于精确计量,与 opportunity create 同语义
  @Patch(':id')
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateInterviewDto,
  ) {
    return this.interviews.update(id, user.id, dto);
  }

  // IMPORTANT: /:id/analyze must be defined BEFORE generic /:id routes
  @Post(':id/analyze')
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  analyze(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.interviews.analyze(id, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.interviews.remove(id, user.id);
  }
}
