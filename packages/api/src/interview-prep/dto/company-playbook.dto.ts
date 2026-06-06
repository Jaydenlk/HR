import { IsString, IsOptional, IsObject, MinLength } from 'class-validator';

/** company-interview-playbook 输入：为特定公司生成面试攻略手册 */
export class CompanyPlaybookDto {
  @IsString()
  @MinLength(1, { message: '公司名称不能为空' })
  company_name: string;

  /** 目标岗位（提供后攻略更定向） */
  @IsString()
  @IsOptional()
  job_title?: string;

  /** 面试情报（来自 interview-intelligence，用户可提供真实面经） */
  @IsObject()
  @IsOptional()
  interview_intelligence?: Record<string, unknown>;

  /** 用户画像 */
  @IsObject()
  @IsOptional()
  user_profile?: Record<string, unknown>;
}
