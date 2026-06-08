import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

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

  /**
   * Preferred output language. Restricted to 'zh' | 'en' so an invalid value
   * is rejected with 400 instead of silently falling back to English (#88).
   * Default is 'zh' (中文 only product).
   */
  @IsIn(['zh', 'en'])
  @IsOptional()
  preferred_language?: 'zh' | 'en';
}
