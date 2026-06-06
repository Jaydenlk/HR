import { IsString, IsOptional, IsIn } from 'class-validator';

export const CASE_INTERVIEW_TYPES = [
  'product_design',
  'market_estimation',
  'case_consulting',
  'group_discussion',
  'business_analysis',
] as const;

const EXPERIENCE_LEVELS = ['fresh_grad', '1-3yr', '3-5yr', '5yr_plus'] as const;

/** case-interview-coach 输入：Case/产品设计/群面备考 */
export class CaseCoachDto {
  /** Case 面试类型（非法枚举由 DTO 校验拦截 → 400） */
  @IsIn(CASE_INTERVIEW_TYPES, {
    message: `interview_type 必须是以下之一：${CASE_INTERVIEW_TYPES.join('、')}`,
  })
  interview_type: (typeof CASE_INTERVIEW_TYPES)[number];

  /** 目标公司或行业（用于定制练习案例背景） */
  @IsString()
  @IsOptional()
  target_company?: string;

  /** 候选人经验水平 */
  @IsOptional()
  @IsIn(EXPERIENCE_LEVELS)
  experience_level?: (typeof EXPERIENCE_LEVELS)[number];

  /** 重点练习方向 */
  @IsString()
  @IsOptional()
  focus_area?: string;
}
