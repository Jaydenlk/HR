import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CoverLettersService } from './cover-letters.service';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';

@Controller('cover-letters')
@UseGuards(JwtAuthGuard)
export class CoverLettersController {
  constructor(private readonly coverLetters: CoverLettersService) {}

  @Post()
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
  regenerate(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.coverLetters.regenerate(id, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.coverLetters.remove(id, user.id);
  }
}
