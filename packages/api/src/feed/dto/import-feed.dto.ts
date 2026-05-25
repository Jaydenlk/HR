import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ImportFeedDto {
  @IsOptional()
  @IsString()
  source_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  keyword?: string;
}

