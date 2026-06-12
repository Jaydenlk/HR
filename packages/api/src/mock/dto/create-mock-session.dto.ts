import { IsString, IsOptional, IsIn, IsInt, Min, Max, IsObject, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import type { ConfirmedCompanyInfo } from '../mock.service';

class ConfirmedCompanyInfoDto implements ConfirmedCompanyInfo {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(500)
  summary!: string;

  @IsString()
  @MaxLength(500)
  source_url!: string;

  @IsString()
  @MaxLength(40)
  searched_at!: string;
}

export class CreateMockSessionDto {
  @IsString()
  @IsOptional()
  application_id?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  jd_text?: string;

  @IsString()
  @IsIn(['text', 'voice'])
  @IsOptional()
  mode?: string;

  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  question_count?: number;

  /** 前端用户确认的联网搜索公司信息（库外公司搜索确认后带入） */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ConfirmedCompanyInfoDto)
  confirmed_company_info?: ConfirmedCompanyInfo;
}
