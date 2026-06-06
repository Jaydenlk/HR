import { IsArray, IsObject, IsOptional } from 'class-validator';

export class PortfolioAdviceDto {
  /** profile-builder 输出的用户画像（核心必填） */
  @IsObject()
  profile: Record<string, unknown>;

  /** skill-gap-planner 输出的技能差距列表（可选，提升推荐精度）*/
  @IsArray()
  @IsOptional()
  skill_gaps?: string[];
}
