import { IsString, IsOptional, IsInt, MinLength, Min } from 'class-validator';

export class CreateInterviewDto {
  @IsString()
  @MinLength(1)
  round: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  interview_at?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  duration_min?: number;

  @IsString()
  @IsOptional()
  interviewer?: string;

  @IsString()
  @IsOptional()
  transcript?: string;

  @IsString()
  @IsOptional()
  application_id?: string;
}
