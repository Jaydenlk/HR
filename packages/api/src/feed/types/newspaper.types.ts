export const COMPANY_TYPES = [
  'big_tech', 'stable_mid', 'foreign_brand', 'startup_ai',
  'new_energy_hardtech', 'finance_tech_state', 'ai_robot_global',
] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

export const COMPANY_PRIORITIES = ['A', 'B', 'C'] as const;
export type CompanyPriority = (typeof COMPANY_PRIORITIES)[number];

export const REASON_TYPES = [
  'verified_source', 'product_judgment', 'user_requested', 'dynamic_discovered',
] as const;
export type ReasonType = (typeof REASON_TYPES)[number];

export const FEED_CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;
export type FeedConfidence = (typeof FEED_CONFIDENCE_LEVELS)[number];

export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];
