export const OPPORTUNITY_STATUSES = [
  'draft', 'evaluating', 'evaluated', 'failed', 'tracked', 'dismissed',
] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const EMPLOYMENT_TYPES = [
  'fulltime', 'intern', 'contract', 'parttime',
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const RECOMMENDATIONS = [
  'strongly_recommend', 'recommend', 'neutral', 'cautious', 'not_recommend',
] as const;
export type Recommendation = (typeof RECOMMENDATIONS)[number];

export const CONFIDENCE_LEVELS = [
  'high', 'medium', 'low', 'insufficient',
] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const EVIDENCE_KINDS = [
  'resume_match', 'salary_data', 'feed_item', 'diagnosis_history',
  'market_signal', 'jd_analysis',
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const ACTION_TYPES = [
  'optimize_resume', 'write_cover_letter', 'prepare_interview',
  'research_company', 'apply', 'dismiss',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const ACTION_STATUSES = [
  'pending', 'in_progress', 'done', 'skipped',
] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];
