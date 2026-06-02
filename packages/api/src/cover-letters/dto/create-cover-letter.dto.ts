import { IsString, IsOptional, IsIn, IsInt, Min, MinLength } from 'class-validator';
import type { CoverLetterTone } from '../entities/cover-letter.entity';

const TONES: CoverLetterTone[] = ['professional', 'warm', 'direct'];

export class CreateCoverLetterDto {
  @IsString()
  @MinLength(1)
  company: string;

  @IsString()
  @MinLength(1)
  role: string;

  @IsString()
  @MinLength(50, { message: 'JD 文本至少需要 50 字，包含岗位职责和要求' })
  jd_text: string;

  @IsString()
  @IsOptional()
  resume_id?: string;

  @IsString()
  @IsOptional()
  application_id?: string;

  @IsIn(TONES)
  @IsOptional()
  tone?: CoverLetterTone;

  @IsInt()
  @Min(1)
  @IsOptional()
  length_words?: number;
}
