import { IsString, IsOptional, IsIn, IsInt, Min, Max, MinLength } from 'class-validator';

const COMPANY_TYPES = ['internet', 'state_owned', 'foreign', 'startup', 'any'] as const;
type CompanyType = (typeof COMPANY_TYPES)[number];

export class AnalyzeRoleTransitionDto {
  @IsString()
  @MinLength(20, { message: '请提供足够的背景信息（至少 20 字）以进行转岗分析' })
  profile: string;

  @IsString()
  @MinLength(2, { message: '目标职位名称至少 2 字' })
  target_role: string;

  @IsIn(COMPANY_TYPES)
  @IsOptional()
  target_company_type?: CompanyType;

  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  timeline_months?: number;
}
