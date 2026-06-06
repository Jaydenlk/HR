// Response DTO — strips user_id, exposes question bank result fields

export interface QuestionItem {
  id: string;
  question: string;
  category: string;
  subcategory?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  frequency: 'very_high' | 'high' | 'medium' | 'low';
  source: string;
  answer_hint?: string;
  time_estimate?: number;
}

export interface CoverageResult {
  total_questions: number;
  by_category: Record<string, number>;
  estimated_coverage_percentage: number;
}

export interface GapItem {
  area: string;
  reason: string;
  workaround?: string;
}

export interface QuestionBankResult {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  evidence_used: unknown[];
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  question_bank: QuestionItem[];
  coverage: CoverageResult;
  gaps: GapItem[];
}

// What gets returned to the client — no user_id
export interface QuestionBankResponse {
  id: string;
  company: string;
  role: string;
  result: QuestionBankResult;
  created_at: string;
}

// List item — summary only
export interface QuestionBankListItem {
  id: string;
  company: string;
  role: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  total_questions: number;
  created_at: string;
}
