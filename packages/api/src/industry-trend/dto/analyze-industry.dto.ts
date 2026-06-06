import { IsString, IsOptional, MinLength } from 'class-validator';

export class AnalyzeIndustryDto {
  @IsString()
  @MinLength(1)
  industry: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  timeframe?: string;
}
