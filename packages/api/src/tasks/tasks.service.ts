import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyTask } from './entities/daily-task.entity';
import { TaskGeneratorService } from './task-generator.service';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(DailyTask)
    private readonly repo: Repository<DailyTask>,
    private readonly generator: TaskGeneratorService,
  ) {}

  /**
   * Get today's tasks, auto-generating them if none exist yet.
   */
  async getToday(userId: string): Promise<DailyTask[]> {
    return this.generator.generateDailyTasks(userId);
  }

  /**
   * Get tasks for a specific date.
   */
  async getByDate(userId: string, date: string): Promise<DailyTask[]> {
    return this.repo.find({
      where: { user_id: userId, task_date: date },
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Force regenerate today's tasks — deletes existing ones first.
   */
  async forceGenerate(userId: string): Promise<DailyTask[]> {
    const today = new Date().toISOString().slice(0, 10);

    // Delete existing tasks for today
    const existing = await this.repo.find({
      where: { user_id: userId, task_date: today },
    });
    if (existing.length > 0) {
      await this.repo.remove(existing);
    }

    return this.generator.generateDailyTasks(userId);
  }

  /**
   * Update a task (e.g., mark done).
   */
  async update(id: string, userId: string, dto: UpdateTaskDto): Promise<DailyTask> {
    const task = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!task) throw new NotFoundException();
    Object.assign(task, dto);
    return this.repo.save(task);
  }
}
