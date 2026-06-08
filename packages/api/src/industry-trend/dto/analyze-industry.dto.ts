import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class AnalyzeIndustryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  industry: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  region?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  timeframe?: string;
}
