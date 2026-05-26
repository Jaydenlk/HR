export function normalizeQualityScore(raw: number | null): number {
  if (raw === null || raw === undefined || raw < 0) return 0;
  if (raw <= 10) return raw * 10;
  if (raw > 100) return 100;
  return raw;
}

interface UsableCheckFields {
  quality_score: number;
  confidence: string;
  source_url: string | null;
  content: string;
}

export function isUsable(item: UsableCheckFields): boolean {
  return (
    normalizeQualityScore(item.quality_score) >= 50 &&
    (item.confidence === 'medium' || item.confidence === 'high') &&
    !!item.source_url &&
    item.source_url.trim() !== '' &&
    item.content.length >= 200
  );
}

export function isCandidate(item: UsableCheckFields): boolean {
  return !isRejected(item) && !isUsable(item);
}

export function isRejected(item: Pick<UsableCheckFields, 'quality_score'>): boolean {
  return item.quality_score === -1;
}

export function normalizeQuarter(input: string): string | null {
  if (!input || input === 'null' || input === 'all') return null;
  if (input === 'current') {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `${now.getFullYear()}Q${q}`;
  }
  if (input === 'previous') {
    const now = new Date();
    let q = Math.ceil((now.getMonth() + 1) / 3) - 1;
    let year = now.getFullYear();
    if (q <= 0) { q = 4; year--; }
    return `${year}Q${q}`;
  }
  return input;
}

const KNOWN_ROLE_KEYS = new Set([
  'backend', 'frontend', 'algorithm', 'embedded', 'product',
  'operations', 'hr', 'design', 'data', 'finance', 'consulting', 'marketing',
]);

export function normalizeRoleCategory(value: string | null): string {
  if (!value || value === 'null' || value.trim() === '') return 'general';
  if (KNOWN_ROLE_KEYS.has(value)) return value;
  return 'general';
}

interface DominantSignalInput {
  roleCounts: Map<string, number>;
  totalCount: number;
  xhsCount: number;
  nowcoderCount: number;
  hasRecentItems: boolean;
  usableCount: number;
}

export function buildDominantSignal(input: DominantSignalInput): string | null {
  if (input.usableCount === 0) return '暂无高质量数据';
  for (const [role, count] of input.roleCounts) {
    if (input.totalCount > 0 && count / input.totalCount > 0.5) {
      return `${role}岗面经集中`;
    }
  }
  if (input.xhsCount > input.nowcoderCount * 2) {
    return '用户之声活跃';
  }
  if (input.hasRecentItems) {
    return '本周有新面经';
  }
  return null;
}
