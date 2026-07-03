import { createHash } from 'crypto';
import type { RecruitEventType } from './types/feed.types';

// 常见公司后缀:仅剥离法律实体后缀,不做更激进的归一化(避免把不同公司名压成同一个键——
// reviewer 关注点⑥:去重不得误合并不同公司的同名事件)。故意不剥离"科技"/"技术"等行业描述词
// (如"腾讯科技有限公司"只剥到"腾讯科技",不再剥到"腾讯")——这些词有时是真实区分信息的一部分。
const COMPANY_SUFFIXES = [
  '股份有限公司',
  '有限责任公司',
  '有限公司',
  '控股集团',
  '集团',
  '公司',
];

/** 归一化公司名:去空白、去大小写差异、剥离法律实体后缀。仅用于去重键计算,不用于展示。
 * 命名刻意区别于 common/normalize-company-name.ts 的共享版 normalizeCompanyName——
 * 两者行为不同(共享版会进一步剥行业词,本版为防误合并故意保守),同名会埋误 import 隐患。 */
export function normalizeCompanyForDedup(name: string): string {
  let normalized = name.trim().toLowerCase().replace(/\s+/g, '');
  for (const suffix of COMPANY_SUFFIXES) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length);
      break;
    }
  }
  return normalized;
}

/** event_date 缺失时用固定占位串参与哈希,保证同一“无日期事件”跨批次/跨来源重复摄入时仍能命中同一 dedup_key。 */
const NO_DATE_PLACEHOLDER = 'unscheduled';

export function computeDedupKey(
  company: string,
  eventType: RecruitEventType,
  eventDate: Date | null,
): string {
  const dateKey = eventDate ? eventDate.toISOString().slice(0, 10) : NO_DATE_PLACEHOLDER;
  const raw = `${normalizeCompanyForDedup(company)}|${eventType}|${dateKey}`;
  return createHash('sha256').update(raw).digest('hex');
}

export interface DedupCandidate {
  confidence: 'high' | 'medium' | 'low';
  created_at: Date;
  apply_url: string | null;
}

const CONFIDENCE_RANK: Record<'high' | 'medium' | 'low', number> = { high: 2, medium: 1, low: 0 };

/**
 * 冲突合并策略(设计定稿:"保留 source 更权威/更早者,合并 apply_url")。
 * 权威度用 confidence 排序(GLM 抽取置信度),同级按 created_at 更早者为准;
 * apply_url 做补空合并——不覆盖已有的真实链接,只在为空时补上另一方的值,避免静默丢失。
 * 返回值:最终应落库的字段(其余业务字段取"更权威者"的,调用方按此覆写)。
 */
export function resolveDedupConflict(
  existing: DedupCandidate,
  incoming: DedupCandidate,
): { winner: 'existing' | 'incoming'; apply_url: string | null } {
  const existingRank = CONFIDENCE_RANK[existing.confidence];
  const incomingRank = CONFIDENCE_RANK[incoming.confidence];
  let winner: 'existing' | 'incoming';
  if (existingRank !== incomingRank) {
    winner = existingRank > incomingRank ? 'existing' : 'incoming';
  } else {
    winner = existing.created_at <= incoming.created_at ? 'existing' : 'incoming';
  }
  // 补空合并:谁有真实值就用谁的;两者都有时优先保留“更权威者”自己的值,不做覆盖式丢弃。
  const winnerRecord = winner === 'existing' ? existing : incoming;
  const otherRecord = winner === 'existing' ? incoming : existing;
  const apply_url = winnerRecord.apply_url ?? otherRecord.apply_url ?? null;
  return { winner, apply_url };
}
