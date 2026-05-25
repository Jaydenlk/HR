import { IsString, IsOptional, IsIn, IsUrl, MinLength } from 'class-validator';
import { EMPLOYMENT_TYPES } from '../types/opportunity.types';
import type { EmploymentType } from '../types/opportunity.types';

export class CreateOpportunityDto {
  @IsString()
  @MinLength(20, { message: 'JD 文本至少 20 字' })
  jd_text: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsIn([...EMPLOYMENT_TYPES])
  @IsOptional()
  employment_type?: EmploymentType;

  @IsString()
  @IsOptional()
  source_platform?: string;

  @IsUrl({}, { message: '来源 URL 格式不正确' })
  @IsOptional()
  source_url?: string;
}
