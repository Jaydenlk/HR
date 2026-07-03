import { IsIn, IsString, MinLength } from 'class-validator';

export type LinkTargetType = 'interview' | 'mock' | 'cover_letter' | 'resume_version' | 'company_research';
export type LinkAction = 'link' | 'unlink';

const TARGET_TYPES: LinkTargetType[] = [
  'interview',
  'mock',
  'cover_letter',
  'resume_version',
  'company_research',
];
const ACTIONS: LinkAction[] = ['link', 'unlink'];

export class LinkApplicationDto {
  @IsIn(TARGET_TYPES)
  type: LinkTargetType;

  @IsString()
  @MinLength(1)
  target_id: string;

  @IsIn(ACTIONS)
  action: LinkAction;
}
