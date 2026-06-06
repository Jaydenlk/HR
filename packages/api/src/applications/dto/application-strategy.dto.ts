import { IsString, IsOptional, IsArray } from 'class-validator';

export class ApplicationStrategyDto {
  @IsString()
  user_profile: string;

  @IsString()
  @IsOptional()
  application_timeline?: string;

  @IsArray()
  @IsOptional()
  current_applications?: string[];
}

// ─── Result types (mirrors output_schema.json) ────────────────────────────────

export interface CompanyTier {
  tier: 'stretch' | 'target' | 'safety';
  description: string;
  rationale: string;
  example_types: string[];
  priority?: number;
}

export interface ApplicationSequenceWeek {
  week: string;
  focus: string;
  target_count: number;
  channels: string[];
}

export interface DailyAction {
  action: string;
  time_estimate: string;
  priority: 'high' | 'medium' | 'low';
}

export interface RiskAssessment {
  main_risks: string[];
  mitigation: string[];
}

export interface EvidenceItem {
  source: string;
  content: string;
}

export interface ApplicationStrategyResult {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  evidence_used: EvidenceItem[];
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  target_company_tiers: CompanyTier[];
  application_sequence: ApplicationSequenceWeek[];
  daily_action_plan: DailyAction[];
  risk_assessment: RiskAssessment;
}
