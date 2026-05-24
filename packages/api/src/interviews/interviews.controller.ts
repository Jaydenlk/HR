import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';

@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  @Post()
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

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateInterviewDto,
  ) {
    return this.interviews.update(id, user.id, dto);
  }

  // IMPORTANT: /:id/analyze must be defined BEFORE generic /:id routes
  @Post(':id/analyze')
  analyze(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.interviews.analyze(id, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.interviews.remove(id, user.id);
  }
}
