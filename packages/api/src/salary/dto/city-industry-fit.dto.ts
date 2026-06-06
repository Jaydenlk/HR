import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Profile sub-objects ────────────────────────────────────────────────────────

class ProfileConstraintsDto {
  @IsString()
  @IsOptional()
  location?: string; // 用户偏好城市，逗号分隔或单城市

  @IsString()
  @IsOptional()
  salary_expectation?: string;

  @IsString()
  @IsOptional()
  work_life_balance?: string;
}

class ProfileDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsString()
  @IsOptional()
  current_role?: string;

  @IsString()
  @IsOptional()
  years_of_experience?: string;

  @IsString()
  @IsOptional()
  industry_background?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ProfileConstraintsDto)
  @IsOptional()
  constraints?: ProfileConstraintsDto;
}

// ── Request DTO ────────────────────────────────────────────────────────────────

export class CityIndustryFitDto {
  @ValidateNested()
  @Type(() => ProfileDto)
  @IsNotEmpty()
  profile: ProfileDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  target_cities?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  target_industries?: string[];
}

// ── Output types (returned by CityIndustryFitService) ─────────────────────────

export interface FitBreakdown {
  skill_match: number;
  career_ceiling: number;
  cost_sustainability: number;
  constraint_satisfaction: number;
}

export interface FitMatrixItem {
  city: string;
  industry: string;
  fit_score: number;
  fit_breakdown: FitBreakdown;
  evidence_basis: string[];
}

export interface CostOfLivingItem {
  city: string;
  typical_salary_range: string;
  housing_cost_note: string;
  purchasing_power_note: string;
}

export interface IndustryHubItem {
  city: string;
  key_companies: string[];
  cluster_effect: string;
  career_ceiling: string;
}

export interface CityIndustryFitResult {
  summary: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  evidence_used: Array<{ field: string; value: string; relevance: string }>;
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  fit_matrix: FitMatrixItem[];
  cost_of_living_impact: CostOfLivingItem[];
  industry_hub_analysis: IndustryHubItem[];
  recommendation: string;
}
