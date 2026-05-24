import { IsIn, IsOptional } from 'class-validator';
import type { TaskStatus } from '../entities/daily-task.entity';

const STATUSES: TaskStatus[] = ['todo', 'done'];

export class UpdateTaskDto {
  @IsIn(STATUSES)
  @IsOptional()
  status?: TaskStatus;
}
