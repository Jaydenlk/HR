import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateResumeVersionDto {
  // 新版本正文必填,且与简历正文同口径(>=30 字),空/过短直接 400 而非落到 DB 约束 500。
  @IsString()
  @MinLength(30, { message: '版本正文至少需要 30 字，请粘贴包含完整工作经历和技能的简历正文' })
  raw_text: string;

  @IsString()
  @IsOptional()
  change_note?: string;
}
