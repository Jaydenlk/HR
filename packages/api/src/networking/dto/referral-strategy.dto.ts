import { IsString, IsOptional, IsArray, ArrayMaxSize, ArrayNotEmpty, MinLength } from 'class-validator';

export class ReferralStrategyDto {
  /** 目标公司（可多个，JSON 数组或单个字符串） */
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  target_companies: string[];

  /** 目标职位 */
  @IsString()
  @MinLength(1)
  target_position: string;

  /**
   * 用户已知的人脉列表描述。
   * 每条：「张三，字节跳动后端工程师，大学同学」。
   * 留空代表无已知人脉，系统将返回 referral_paths=[] + cold_outreach 建议。
   */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  known_contacts?: string[];

  /** 候选人自述背景（可选） */
  @IsString()
  @IsOptional()
  candidate_background?: string;
}
