import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  // GET /tasks/today — get today's tasks (DB query only, no auto-generate)
  @Get('today')
  getToday(@CurrentUser() user: { id: string }) {
    return this.tasks.getToday(user.id);
  }

  // GET /tasks?date=YYYY-MM-DD — get tasks for a specific date
  @Get()
  getByDate(
    @CurrentUser() user: { id: string },
    @Query('date') date: string,
  ) {
    // If no date provided, default to today
    const targetDate = date ?? new Date().toISOString().slice(0, 10);
    return this.tasks.getByDate(user.id, targetDate);
  }

  // POST /tasks/generate — force regenerate today's tasks
  @Post('generate')
  @UseGuards(QuotaGuard)
  @UseInterceptors(AiUsageInterceptor)
  forceGenerate(@CurrentUser() user: { id: string }) {
    return this.tasks.forceGenerate(user.id);
  }

  // PATCH /tasks/:id — update task (mark done)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(id, user.id, dto);
  }
}
