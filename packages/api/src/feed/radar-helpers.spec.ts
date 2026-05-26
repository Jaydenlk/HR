import {
  normalizeQualityScore,
  isUsable,
  isCandidate,
  isRejected,
  normalizeQuarter,
  normalizeRoleCategory,
  buildDominantSignal,
} from './radar-helpers';

describe('normalizeQualityScore', () => {
  it('returns 0 for null', () => expect(normalizeQualityScore(null)).toBe(0));
  it('returns 0 for undefined', () => {
    const undef = undefined as unknown as (number | null);
    expect(normalizeQualityScore(undef)).toBe(0);
  });
  it('returns 0 for -1 (rejected)', () => expect(normalizeQualityScore(-1)).toBe(0));
  it('returns 0 for negative values', () => expect(normalizeQualityScore(-5)).toBe(0));
  it('scales 0-10 range to 0-100', () => {
    expect(normalizeQualityScore(0)).toBe(0);
    expect(normalizeQualityScore(5)).toBe(50);
    expect(normalizeQualityScore(10)).toBe(100);
  });
  it('passes through 11-100 range as-is', () => {
    expect(normalizeQualityScore(50)).toBe(50);
    expect(normalizeQualityScore(100)).toBe(100);
  });
  it('clamps values above 100', () => expect(normalizeQualityScore(150)).toBe(100));
});

describe('isUsable', () => {
  const baseItem = {
    quality_score: 7,
    confidence: 'high' as const,
    source_url: 'https://example.com',
    content: 'a'.repeat(200),
  };
  it('returns true for high quality + high confidence + valid url + long content', () => {
    expect(isUsable(baseItem)).toBe(true);
  });
  it('returns true for medium confidence', () => {
    expect(isUsable({ ...baseItem, confidence: 'medium' })).toBe(true);
  });
  it('returns false for low confidence', () => {
    expect(isUsable({ ...baseItem, confidence: 'low' })).toBe(false);
  });
  it('returns false for normalized quality < 50', () => {
    expect(isUsable({ ...baseItem, quality_score: 3 })).toBe(false);
  });
  it('returns false for null source_url', () => {
    expect(isUsable({ ...baseItem, source_url: null })).toBe(false);
  });
  it('returns false for empty source_url', () => {
    expect(isUsable({ ...baseItem, source_url: '' })).toBe(false);
  });
  it('returns false for content < 200 chars', () => {
    expect(isUsable({ ...baseItem, content: 'short' })).toBe(false);
  });
});

describe('isCandidate', () => {
  it('returns true for low confidence but not rejected', () => {
    expect(isCandidate({
      quality_score: 7, confidence: 'low',
      source_url: 'https://example.com', content: 'a'.repeat(200),
    })).toBe(true);
  });
  it('returns false for rejected items (quality_score = -1)', () => {
    expect(isCandidate({
      quality_score: -1, confidence: 'low',
      source_url: 'https://example.com', content: 'a'.repeat(200),
    })).toBe(false);
  });
  it('returns false for usable items', () => {
    expect(isCandidate({
      quality_score: 7, confidence: 'high',
      source_url: 'https://example.com', content: 'a'.repeat(200),
    })).toBe(false);
  });
});

describe('isRejected', () => {
  it('returns true for quality_score = -1', () => {
    expect(isRejected({ quality_score: -1 })).toBe(true);
  });
  it('returns false for quality_score >= 0', () => {
    expect(isRejected({ quality_score: 0 })).toBe(false);
  });
});

describe('normalizeQuarter', () => {
  it('maps "current" to actual quarter string', () => {
    const result = normalizeQuarter('current');
    expect(result).toMatch(/^\d{4}Q[1-4]$/);
  });
  it('maps "previous" to previous quarter', () => {
    const result = normalizeQuarter('previous');
    expect(result).toMatch(/^\d{4}Q[1-4]$/);
    expect(result).not.toBe(normalizeQuarter('current'));
  });
  it('passes through "2026Q2" unchanged', () => {
    expect(normalizeQuarter('2026Q2')).toBe('2026Q2');
  });
  it('returns null for empty string', () => {
    expect(normalizeQuarter('')).toBeNull();
  });
  it('returns null for literal "null"', () => {
    expect(normalizeQuarter('null')).toBeNull();
  });
  it('returns null for "all"', () => {
    expect(normalizeQuarter('all')).toBeNull();
  });
});

describe('normalizeRoleCategory', () => {
  it('returns value unchanged for known keys', () => {
    expect(normalizeRoleCategory('backend')).toBe('backend');
    expect(normalizeRoleCategory('product')).toBe('product');
  });
  it('returns "general" for null', () => {
    expect(normalizeRoleCategory(null)).toBe('general');
  });
  it('returns "general" for empty string', () => {
    expect(normalizeRoleCategory('')).toBe('general');
  });
  it('returns "general" for literal "null"', () => {
    expect(normalizeRoleCategory('null')).toBe('general');
  });
  it('returns "general" for unknown values', () => {
    expect(normalizeRoleCategory('mystery_role')).toBe('general');
  });
  it('normalizes management_trainee', () => expect(normalizeRoleCategory('management_trainee')).toBe('management_trainee'));
  it('normalizes testing', () => expect(normalizeRoleCategory('testing')).toBe('testing'));
  it('normalizes client', () => expect(normalizeRoleCategory('client')).toBe('client'));
  it('normalizes general', () => expect(normalizeRoleCategory('general')).toBe('general'));
});

describe('buildDominantSignal', () => {
  it('returns role concentration signal when one role > 50%', () => {
    const result = buildDominantSignal({
      roleCounts: new Map([['backend', 8], ['frontend', 2]]),
      totalCount: 10, xhsCount: 5, nowcoderCount: 5,
      hasRecentItems: false, usableCount: 5,
    });
    expect(result).toContain('后端开发');
    expect(result).toContain('集中');
  });
  it('returns xhs voice signal when xhs > nowcoder * 2', () => {
    const result = buildDominantSignal({
      roleCounts: new Map([['backend', 3], ['frontend', 3]]),
      totalCount: 6, xhsCount: 10, nowcoderCount: 2,
      hasRecentItems: false, usableCount: 5,
    });
    expect(result).toContain('用户之声活跃');
  });
  it('returns weekly signal when recent items exist', () => {
    const result = buildDominantSignal({
      roleCounts: new Map([['backend', 3], ['frontend', 3]]),
      totalCount: 6, xhsCount: 3, nowcoderCount: 3,
      hasRecentItems: true, usableCount: 5,
    });
    expect(result).toContain('本周有新面经');
  });
  it('returns no-data signal when usableCount = 0', () => {
    const result = buildDominantSignal({
      roleCounts: new Map(), totalCount: 0,
      xhsCount: 0, nowcoderCount: 0,
      hasRecentItems: false, usableCount: 0,
    });
    expect(result).toContain('暂无高质量数据');
  });
});
