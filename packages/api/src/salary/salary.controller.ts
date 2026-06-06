import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SalaryService } from './salary.service';
import { SalaryAnalysisService } from './salary-analysis.service';
import { CreateSalaryEntryDto } from './dto/create-salary-entry.dto';
import { AnalyzeSalaryDto } from './dto/analyze-salary.dto';

@Controller('salary')
@UseGuards(JwtAuthGuard)
export class SalaryController {
  constructor(
    private readonly salary: SalaryService,
    private readonly analysis: SalaryAnalysisService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSalaryEntryDto,
  ) {
    return this.salary.create(user.id, dto);
  }

  // IMPORTANT: /stats and /analyze must be defined BEFORE /:id to avoid route collision
  @Get('stats')
  getStats() {
    return this.salary.getStats();
  }

  @Post('analyze')
  analyze(@Body() dto: AnalyzeSalaryDto) {
    return this.analysis.analyze(dto);
  }

  @Get()
  findAll(
    @Query('company') company?: string,
    @Query('role') role?: string,
    @Query('location') location?: string,
  ) {
    return this.salary.findAll({ company, role, location });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.salary.findOne(id, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.salary.remove(id, user.id);
  }
}
