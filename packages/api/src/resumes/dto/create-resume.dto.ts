import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateResumeDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @IsOptional()
  raw_text?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  is_primary?: boolean;
}
