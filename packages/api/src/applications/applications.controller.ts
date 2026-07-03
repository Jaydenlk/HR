import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreditGuard } from '../credit/credit.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CreditInterceptor } from '../credit/credit.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApplicationsService } from './applications.service';
import { ApplicationLinksService } from './application-links.service';
import { StrategyService } from './strategy.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationStrategyDto } from './dto/application-strategy.dto';
import { LinkApplicationDto } from './dto/link-application.dto';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly strategy: StrategyService,
    private readonly links: ApplicationLinksService,
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
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
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

  // ── T5 投递详情二级页:聚合 / 手动 link / AI 建议(建议只读,不写库) ──────────────
  @Get(':id/related')
  getRelated(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.links.getRelated(id, user.id);
  }

  @Patch(':id/link')
  link(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: LinkApplicationDto,
  ) {
    return this.links.link(id, user.id, dto);
  }

  @Get(':id/link-suggestions')
  getLinkSuggestions(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.links.getLinkSuggestions(id, user.id);
  }
}
