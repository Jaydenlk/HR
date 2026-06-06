import { IsString, IsOptional, IsInt, Min, MinLength } from 'class-validator';

export class AnalyzeSalaryDto {
  @IsString()
  @MinLength(1)
  role: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  years_of_experience?: number;

  @IsString()
  @IsOptional()
  industry?: string;
}

// ── Output types (returned by SalaryAnalysisService) ──────────────────────────

export interface SalaryRange {
  p25: number;
  p50: number;
  p75: number;
  unit: 'monthly_rmb' | 'annual_rmb';
  year: string;
  city: string;
  role: string;
  grade: 'A' | 'B' | 'C' | 'D';
  freshness: 'fresh' | 'stale' | 'unknown';
}

export interface SalaryBreakdown {
  base_monthly?: number;
  months_per_year?: number;
  annual_bonus?: string;
  equity?: string;
  social_insurance?: string;
}

export interface DataSource {
  source_name: string;
  url?: string;
  date?: string;
  grade: 'A' | 'B' | 'C' | 'D';
}

export interface Comparison {
  dimension: string;
  value: string;
  grade: 'A' | 'B' | 'C' | 'D';
}

export interface SalaryAnalysisResult {
  summary: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  salary_range: SalaryRange | null;
  breakdown: SalaryBreakdown | null;
  data_sources: DataSource[];
  comparison: Comparison[];
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  data_freshness: 'fresh' | 'stale' | 'unavailable';
}
