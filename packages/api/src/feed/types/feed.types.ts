export const FEED_SOURCE_KINDS = [
  'xhs',
  'nowcoder',
  'wechat',
  'blog',
  'ugc',
  'coach',
  // T2 月刊校招情报三类适配器。与既有 'wechat'(We-MP-RSS API 拉取式导入器)是两条独立通道,
  // 不复用、不覆盖其行为:'wechat_dump' 是公众号现成爬取工具/人工整理产物的文件上传通道。
  'sheet_file',
  'sheet_link',
  'wechat_dump',
] as const;
export type FeedSourceKind = (typeof FEED_SOURCE_KINDS)[number];

export const EXTERNAL_SOURCE_KINDS: FeedSourceKind[] = ['xhs', 'nowcoder', 'wechat'];

// 校招情报三类源:管理员通过 POST /feed/sources 手动创建(不走 digest_sources.json 种子),
// 产出落 recruit_events 表而非 feed_items,因此不参与 Radar/company registry(EXTERNAL_SOURCE_KINDS)。
export const RECRUIT_INTEL_SOURCE_KINDS = ['sheet_file', 'sheet_link', 'wechat_dump'] as const;
export type RecruitIntelSourceKind = (typeof RECRUIT_INTEL_SOURCE_KINDS)[number];

export const RECRUIT_EVENT_TYPES = [
  '网申开启',
  '网申截止',
  '宣讲会',
  '笔试',
  '面试批次',
  '其他',
] as const;
export type RecruitEventType = (typeof RECRUIT_EVENT_TYPES)[number];

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

