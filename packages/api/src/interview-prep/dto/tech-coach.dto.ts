import {
  IsString,
  IsOptional,
  IsObject,
  IsInt,
  Min,
  MinLength,
} from 'class-validator';

/** technical-interview-coach 输入：技术岗备考计划 */
export class TechCoachDto {
  @IsString()
  @MinLength(1, { message: '目标技术岗位名称不能为空' })
  job_title: string;

  /** 目标公司名称（提供后可定制公司专项重点） */
  @IsString()
  @IsOptional()
  company_name?: string;

  /** 用户画像 */
  @IsObject()
  @IsOptional()
  user_profile?: Record<string, unknown>;

  /** 面试情报（来自 interview-intelligence，公司专项重点的唯一可信来源） */
  @IsObject()
  @IsOptional()
  interview_intelligence?: Record<string, unknown>;

  /** 可用备考时间（周） */
  @IsInt()
  @Min(1)
  @IsOptional()
  available_weeks?: number;
}
