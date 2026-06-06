import { IsString, IsOptional, IsIn, MinLength } from 'class-validator';

const PLATFORMS = ['wechat', 'maimai', 'linkedin', 'email'] as const;
export type Platform = (typeof PLATFORMS)[number];

const RELATIONSHIP_TYPES = ['direct_friend', 'alumni_or_ex_colleague', 'friend_of_friend', 'stranger'] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export class NetworkingMessageDto {
  @IsString()
  @MinLength(1)
  target_company: string;

  @IsString()
  @MinLength(1)
  target_position: string;

  /** 联系人描述（可选），如「大学校友，在该公司做后端工程师两年」 */
  @IsString()
  @IsOptional()
  contact_description?: string;

  @IsIn(RELATIONSHIP_TYPES)
  @IsOptional()
  relationship_type?: RelationshipType;

  @IsIn(PLATFORMS)
  @IsOptional()
  platform?: Platform;

  /** 候选人自述背景（可选），如工作年限、技能栈、学校 */
  @IsString()
  @IsOptional()
  candidate_background?: string;

  /** 可分享的共同背景（可选），如同一所学校/前公司 */
  @IsString()
  @IsOptional()
  shared_background?: string;
}
