import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OpportunityService } from './opportunity.service';
import { OpportunityEvaluatorService } from './opportunity-evaluator.service';
import { OpportunityIntegrationService } from './opportunity-integration.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { OpportunityQueryDto } from './dto/opportunity-query.dto';

@Controller('opportunities')
@UseGuards(JwtAuthGuard)
export class OpportunityController {
  constructor(
    private readonly opportunityService: OpportunityService,
    private readonly evaluator: OpportunityEvaluatorService,
    private readonly integration: OpportunityIntegrationService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateOpportunityDto,
  ) {
    const opportunity = await this.opportunityService.create(user.id, dto);
    // Fire-and-forget evaluation
    this.evaluator.evaluate(opportunity.id, user.id).catch(() => {});
    return opportunity;
  }

  @Get()
  findAll(
    @CurrentUser() user: { id: string },
    @Query() query: OpportunityQueryDto,
  ) {
    return this.opportunityService.findAllByUser(user.id, query.status);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.opportunityService.findOneWithDetails(id, user.id);
  }

  @Post(':id/evaluate')
  async triggerEvaluation(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    // Verify ownership
    await this.opportunityService.findOne(id, user.id);
    // Fire-and-forget
    this.evaluator.evaluate(id, user.id).catch(() => {});
    return { status: 'evaluating' };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
  ) {
    if (dto.status) {
      await this.opportunityService.setStatus(id, user.id, dto.status);
    }
    return this.opportunityService.findOne(id, user.id);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.opportunityService.remove(id, user.id);
  }

  @Post(':id/track')
  async trackToApplication(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const result = await this.integration.trackToApplication(id, user.id);
    // Fire-and-forget task generation so tracking response is not delayed
    this.integration.generateTasks(id, user.id).catch(() => {});
    return result;
  }

  @Post(':id/tasks')
  generateTasks(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.integration.generateTasks(id, user.id);
  }

  @Get(':id/chat-context')
  getChatContext(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.integration.getChatContext(id, user.id);
  }
}
