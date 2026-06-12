import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common';
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

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.mock.remove(id, user.id);
  }
}
