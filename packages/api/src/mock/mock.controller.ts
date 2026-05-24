import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MockService } from './mock.service';
import { CreateMockSessionDto } from './dto/create-mock-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@Controller('mock-sessions')
@UseGuards(JwtAuthGuard)
export class MockController {
  constructor(private readonly mock: MockService) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateMockSessionDto,
  ) {
    return this.mock.create(user.id, dto);
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
  submitAnswer(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.mock.submitAnswer(id, user.id, dto);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.mock.complete(id, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.mock.remove(id, user.id);
  }
}
