import { IsIn } from 'class-validator';
import type { HandoffStatus } from '../entities/coach-handoff.entity';

export class UpdateHandoffStatusDto {
  @IsIn(['accepted', 'dismissed', 'completed'])
  status: HandoffStatus;
}
