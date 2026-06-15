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

  @Get('company-check')
  companyCheck(@Query() query: CompanyCheckQueryDto) {
    return this.mock.checkCompany(query.name ?? '');
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
