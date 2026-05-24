import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateResumeDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;
}
