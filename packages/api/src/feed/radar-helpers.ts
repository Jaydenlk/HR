export function getCurrentQuarter(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  const year = now.getFullYear();
  const start = new Date(year, (q - 1) * 3, 1);
  const end = new Date(year, q * 3, 0, 23, 59, 59, 999);
  return { start, end, label: `${year}Q${q}` };
}

export function isCurrentQuarter(publishedAt: Date | string | null): boolean {
  if (!publishedAt) return false;
  const date = typeof publishedAt === 'string' ? new Date(publishedAt) : publishedAt;
  const { start, end } = getCurrentQuarter();
  return date >= start && date <= end;
}

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

export function deriveQuarterFromPublishedAt(
  publishedAt: Date | string | null,
  dateConfidence: string,
): string | null {
  if (!publishedAt) return null;
  if (dateConfidence === 'low' || dateConfidence === 'unknown') return null;
  const date = typeof publishedAt === 'string' ? new Date(publishedAt) : publishedAt;
  if (isNaN(date.getTime())) return null;
  const q = Math.ceil((date.getMonth() + 1) / 3);
  return `${date.getFullYear()}Q${q}`;
}

export function isValidCompany(c: string | null): c is string {
  if (!c) return false;
  const trimmed = c.trim();
  return (
    trimmed !== '' &&
    trimmed.toLowerCase() !== 'null' &&
    trimmed !== '(未分类)' &&
    trimmed !== '(???)'
  );
}

export interface GroupStats {
  usableCount: number;
  candidateCount: number;
  rejectedCount: number;
  xhsCount: number;
  nowcoderCount: number;
  wechatCount: number;
}

export function computeGroupStats(items: UsableCheckFields[]): GroupStats {
  let usableCount = 0;
  let candidateCount = 0;
  let rejectedCount = 0;
  let xhsCount = 0;
  let nowcoderCount = 0;
  let wechatCount = 0;

  for (const item of items) {
    if (isRejected(item)) rejectedCount++;
    else if (isUsable(item)) usableCount++;
    else candidateCount++;

    const sk = (item as { source_kind?: string }).source_kind;
    if (sk === 'xhs') xhsCount++;
    else if (sk === 'nowcoder') nowcoderCount++;
    else if (sk === 'wechat') wechatCount++;
  }
  return { usableCount, candidateCount, rejectedCount, xhsCount, nowcoderCount, wechatCount };
}

const KNOWN_ROLE_KEYS = new Set([
  'backend', 'frontend', 'algorithm', 'embedded', 'product',
  'operations', 'hr', 'design', 'data', 'finance', 'consulting', 'marketing',
  'management_trainee', 'testing', 'client', 'general',
]);

export function normalizeRoleCategory(value: string | null): string {
  if (!value || value === 'null' || value.trim() === '') return 'general';
  if (KNOWN_ROLE_KEYS.has(value)) return value;
  return 'general';
}

const ROLE_LABELS: Record<string, string> = {
  backend: '后端开发', frontend: '前端开发', algorithm: '算法',
  embedded: '嵌入式', product: '产品', operations: '运营',
  hr: 'HR', design: '设计', data: '数据分析',
  finance: '金融', consulting: '咨询', marketing: '市场',
  management_trainee: '管培', testing: '测试', client: '客户端',
  general: '综合',
};

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
      return `${ROLE_LABELS[role] || role}岗面经集中`;
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
