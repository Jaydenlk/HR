import {
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class ProfileSkillDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  level?: string;
}

export class BrandStrategyDto {
  /** profile-builder 输出的用户画像（核心必填） */
  @IsObject()
  profile: Record<string, unknown>;

  /** 品牌方向偏好；auto 由 AI 选择 */
  @IsString()
  @IsOptional()
  brand_focus?: 'technical_depth' | 'industry_insight' | 'career_experience' | 'auto';

  /** 目标受众描述（可选）*/
  @IsString()
  @IsOptional()
  target_audience?: string;
}
