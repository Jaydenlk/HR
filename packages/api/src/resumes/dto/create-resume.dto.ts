import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class CreateResumeDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @IsOptional()
  raw_text?: string;

  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;
}
