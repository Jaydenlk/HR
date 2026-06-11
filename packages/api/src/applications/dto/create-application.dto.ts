import { IsString, IsOptional, IsIn, MinLength, MaxLength } from 'class-validator';
import type { ApplicationStage } from '../entities/application.entity';

const STAGES: ApplicationStage[] = ['wishlist', 'applied', 'interview', 'final', 'offer', 'rejected'];

export class CreateApplicationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100, { message: '公司名称不能超过 100 个字符' })
  company: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100, { message: '岗位名称不能超过 100 个字符' })
  role: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '城市不能超过 100 个字符' })
  location?: string;

  @IsIn(STAGES)
  @IsOptional()
  stage?: ApplicationStage;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '薪资范围不能超过 100 个字符' })
  salary_range?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '截止日期不能超过 100 个字符' })
  deadline?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '内推人不能超过 100 个字符' })
  referrer?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000, { message: '备注不能超过 2000 个字符' })
  notes?: string;

  @IsString()
  @IsOptional()
  resume_id?: string;

  @IsString()
  @IsOptional()
  diagnosis_id?: string;
}
