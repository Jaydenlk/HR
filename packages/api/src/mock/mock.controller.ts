import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
  StreamableFile,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreditGuard } from '../credit/credit.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CreditInterceptor } from '../credit/credit.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MockService } from './mock.service';
import { CreateMockSessionDto } from './dto/create-mock-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { CompanyCheckQueryDto } from './dto/company-check-query.dto';

@Controller('mock-sessions')
@UseGuards(JwtAuthGuard)
export class MockController {
  constructor(private readonly mock: MockService) {}

  @Post()
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateMockSessionDto,
  ) {
    return this.mock.create(user.id, dto);
  }

  // 专属节流(m3 审计校准,与 T4 协同):company-check 会触发真实计费的博查调用,T6 重设计后
  // count 10 + 两路查询,单次成本翻倍,不能只靠共享的全局 IP 限流(120次/60s)兜底。
  // 每 IP 每分钟 20 次:足够覆盖正常填表场景下的多次改名重查/重试,同时把单 IP 最坏情况下的
  // 博查调用量(20×2路=40次/分钟)锁在远低于全局上限的范围内。
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get('company-check')
  companyCheck(@Query() query: CompanyCheckQueryDto) {
    // force=true:缓存候选被拒后的强制重搜(绕缓存走两路真实博查);同受上方 @Throttle 约束。
    return this.mock.checkCompany(query.name ?? '', query.force === true);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.mock.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.mock.findOne(id, user.id);
  }

  // IMPORTANT: /:id/answer and /:id/complete must be defined BEFORE generic /:id routes
  @Post(':id/answer')
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  submitAnswer(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.mock.submitAnswer(id, user.id, dto);
  }

  @Post(':id/complete')
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  complete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.mock.complete(id, user.id);
  }

  // 语音模式读题:把第 n 题(0-based)的题面 TTS 合成音频返回(audio/mpeg 等)。
  // 仅 JwtAuthGuard,不计费:读题是已付费会话内的辅助朗读,与 GET 详情同性质,不独立扣点。
  // 仅 mode='voice' 会话可用(service 校验);所有权不匹配 → 404;题号越界 → 400。
  @Get(':id/question-audio/:n')
  async questionAudio(
    @Param('id') id: string,
    @Param('n', ParseIntPipe) n: number,
    @CurrentUser() user: { id: string },
  ): Promise<StreamableFile> {
    const { audio, mimeType } = await this.mock.synthesizeQuestion(id, user.id, n);
    return new StreamableFile(audio, { type: mimeType });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.mock.remove(id, user.id);
  }
}
