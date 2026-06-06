import { IsArray, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class BuildRoadmapDto {
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  skill_gaps: string[];

  /** Optional context about the user (current role, experience level, goal) */
  @IsString()
  @IsOptional()
  profile?: string;

  /** Learning hours per week (default: 10) */
  @IsInt()
  @Min(1)
  @Max(80)
  @IsOptional()
  weekly_hours?: number;

  /** Preferred output language: 'zh' | 'en' (default: 'zh') */
  @IsString()
  @IsOptional()
  preferred_language?: string;
}
