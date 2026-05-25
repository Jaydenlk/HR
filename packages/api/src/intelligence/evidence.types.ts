export interface Evidence {
  source_type:
    | 'resume'
    | 'diagnosis'
    | 'application'
    | 'interview'
    | 'opportunity'
    | 'task'
    | 'feed'
    | 'salary';
  source_id: string;
  confidence: 'high' | 'medium' | 'low';
  freshness: 'current' | 'recent' | 'stale';
  summary: string;
  structured: Record<string, unknown>;
  reason: string;
  url?: string;
  quote?: string;
  observed_at: string;
  weight: number;
}

export interface UserIntelligence {
  user_id: string;
  gathered_at: string;
  resume: Evidence | null;
  skills: string[];
  target_roles: string[];
  applications: Evidence[];
  application_companies: string[];
  opportunities: Evidence[];
  opportunity_companies: string[];
  diagnoses: Evidence[];
  diagnosis_patterns: { hit: string[]; miss: string[] };
  tasks: Evidence[];
  feed_relevant: Evidence[];
  salary_context: Evidence[];
  companies_of_interest: string[];
  has_resume: boolean;
  has_applications: boolean;
  has_opportunities: boolean;
}
