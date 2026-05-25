export const FEED_SOURCE_KINDS = ['xhs', 'nowcoder', 'wechat', 'blog', 'ugc', 'coach'] as const;
export type FeedSourceKind = (typeof FEED_SOURCE_KINDS)[number];

export const FEED_CATEGORIES = [
  'interview_exp',
  'market_insight',
  'job_tips',
  'hiring_signal',
  'editorial',
] as const;
export type FeedCategory = (typeof FEED_CATEGORIES)[number];

export const FEED_SOURCE_STATUSES = ['active', 'paused', 'needs_config'] as const;
export type FeedSourceStatus = (typeof FEED_SOURCE_STATUSES)[number];

export const DIGEST_RUN_STATUSES = ['running', 'success', 'partial', 'failed'] as const;
export type DigestRunStatus = (typeof DIGEST_RUN_STATUSES)[number];

export interface FeedTags {
  companies: string[];
  roles: string[];
  topics: string[];
}

