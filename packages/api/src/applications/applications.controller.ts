import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApplicationsService } from './applications.service';
import { StrategyService } from './strategy.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationStrategyDto } from './dto/application-strategy.dto';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly strategy: StrategyService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateApplicationDto,
  ) {
    return this.applications.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.applications.findAllByUser(user.id);
  }

  // IMPORTANT: /stats and /strategy must be defined BEFORE /:id to avoid route collision
  @Get('stats')
  getStats(@CurrentUser() user: { id: string }) {
    return this.applications.getStats(user.id);
  }

  @Post('strategy')
  generateStrategy(@Body() dto: ApplicationStrategyDto) {
    return this.strategy.generateStrategy(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.applications.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applications.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.applications.remove(id, user.id);
  }

  @Get(':id/events')
  getEvents(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.applications.getEvents(id, user.id);
  }
}
