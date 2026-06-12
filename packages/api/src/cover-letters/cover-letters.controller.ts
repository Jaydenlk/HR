import { Controller, Get, Post, Delete, Param, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreditGuard } from '../credit/credit.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CreditInterceptor } from '../credit/credit.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CoverLettersService } from './cover-letters.service';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';

@Controller('cover-letters')
@UseGuards(JwtAuthGuard)
export class CoverLettersController {
  constructor(private readonly coverLetters: CoverLettersService) {}

  @Post()
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  generate(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCoverLetterDto,
  ) {
    return this.coverLetters.generate(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.coverLetters.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.coverLetters.findOne(id, user.id);
  }

  @Post(':id/regenerate')
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  regenerate(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.coverLetters.regenerate(id, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.coverLetters.remove(id, user.id);
  }
}
