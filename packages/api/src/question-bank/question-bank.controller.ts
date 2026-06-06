import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QuestionBankService } from './question-bank.service';
import { GenerateQuestionBankDto } from './dto/generate-question-bank.dto';

@Controller('question-bank')
@UseGuards(JwtAuthGuard)
export class QuestionBankController {
  constructor(private readonly questionBank: QuestionBankService) {}

  @Post('generate')
  generate(
    @CurrentUser() user: { id: string },
    @Body() dto: GenerateQuestionBankDto,
  ) {
    return this.questionBank.generate(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.questionBank.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.questionBank.findOne(id, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.questionBank.remove(id, user.id);
  }
}
