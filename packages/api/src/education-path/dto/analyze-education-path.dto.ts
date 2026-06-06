import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  MinLength,
  IsIn,
} from 'class-validator';

const SCHOOL_TIERS = ['985', '211', 'double_first_class', 'regular', 'any'] as const;
type SchoolTier = (typeof SCHOOL_TIERS)[number];

export class AnalyzeEducationPathDto {
  @IsString()
  @MinLength(20, { message: '请提供足够的背景信息（至少 20 字）以进行读研分析' })
  profile: string;

  @IsNumber()
  @Min(0)
  @Max(4)
  @IsOptional()
  gpa?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  gpa_percentile?: number;

  @IsIn(SCHOOL_TIERS)
  @IsOptional()
  target_school_tier?: SchoolTier;

  @IsBoolean()
  @IsOptional()
  economic_pressure?: boolean;

  @IsBoolean()
  @IsOptional()
  has_internship?: boolean;
}
