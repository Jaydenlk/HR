import { IsString, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';

export class CreateMockSessionDto {
  @IsString()
  @IsOptional()
  application_id?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  jd_text?: string;

  @IsString()
  @IsIn(['text', 'voice'])
  @IsOptional()
  mode?: string;

  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  question_count?: number;
}
