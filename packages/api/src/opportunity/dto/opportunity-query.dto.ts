import { IsIn, IsOptional } from 'class-validator';
import { OPPORTUNITY_STATUSES } from '../types/opportunity.types';
import type { OpportunityStatus } from '../types/opportunity.types';

export class OpportunityQueryDto {
  @IsIn([...OPPORTUNITY_STATUSES])
  @IsOptional()
  status?: OpportunityStatus;
}
