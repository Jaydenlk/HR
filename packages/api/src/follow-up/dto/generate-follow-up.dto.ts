import { IsString, IsIn, IsOptional, MinLength } from 'class-validator';

const SCENARIOS = [
  'thank_you',
  'status_inquiry',
  'rejection_reply',
  'offer_urge',
  'acceptance',
] as const;

export type FollowUpScenario = (typeof SCENARIOS)[number];

export class GenerateFollowUpDto {
  @IsIn(SCENARIOS)
  scenario: FollowUpScenario;

  @IsString()
  @IsOptional()
  application_id?: string;

  /** 面试细节（职位/公司/日期/面试官/谈及话题）— 感谢信时高度相关 */
  @IsString()
  @MinLength(1)
  @IsOptional()
  interview_details?: string;

  /** 联系人信息（姓名/职位/公司）*/
  @IsString()
  @IsOptional()
  contact?: string;
}
