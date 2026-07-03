import { computeDedupKey, normalizeCompanyName, resolveDedupConflict } from '../src/feed/recruit-dedup.util';

describe('normalizeCompanyName', () => {
  it('strips common corporate suffixes', () => {
    expect(normalizeCompanyName('字节跳动有限公司')).toBe('字节跳动');
    expect(normalizeCompanyName('阿里巴巴集团')).toBe('阿里巴巴');
    // 只剥离法律实体后缀"有限公司",不进一步剥离"科技"这类行业描述词(避免过度归一化误合并)。
    expect(normalizeCompanyName('腾讯科技有限公司')).toBe('腾讯科技');
  });

  it('trims whitespace and lowercases ascii', () => {
    expect(normalizeCompanyName('  ByteDance  ')).toBe('bytedance');
  });

  it('does not collapse distinct company names into the same value', () => {
    expect(normalizeCompanyName('字节跳动')).not.toBe(normalizeCompanyName('阿里巴巴'));
  });
});

describe('computeDedupKey', () => {
  it('is stable across suffix/casing variants of the same company', () => {
    const a = computeDedupKey('字节跳动有限公司', '网申开启', new Date('2026-08-01'));
    const b = computeDedupKey('字节跳动', '网申开启', new Date('2026-08-01'));
    expect(a).toBe(b);
  });

  it('differs when event_type differs', () => {
    const a = computeDedupKey('字节跳动', '网申开启', new Date('2026-08-01'));
    const b = computeDedupKey('字节跳动', '网申截止', new Date('2026-08-01'));
    expect(a).not.toBe(b);
  });

  it('differs when event_date differs', () => {
    const a = computeDedupKey('字节跳动', '网申开启', new Date('2026-08-01'));
    const b = computeDedupKey('字节跳动', '网申开启', new Date('2026-08-02'));
    expect(a).not.toBe(b);
  });

  it('uses a stable placeholder for null event_date (idempotent repeated ingestion of undated events)', () => {
    const a = computeDedupKey('字节跳动', '其他', null);
    const b = computeDedupKey('字节跳动', '其他', null);
    expect(a).toBe(b);
  });

  it('reviewer 关注点⑥:不同公司的同名事件绝不应产生相同 dedup_key', () => {
    const a = computeDedupKey('字节跳动', '网申开启', new Date('2026-08-01'));
    const b = computeDedupKey('阿里巴巴', '网申开启', new Date('2026-08-01'));
    expect(a).not.toBe(b);
  });
});

describe('resolveDedupConflict', () => {
  it('higher confidence wins', () => {
    const existing = { confidence: 'low' as const, created_at: new Date('2026-01-01'), apply_url: null };
    const incoming = { confidence: 'high' as const, created_at: new Date('2026-06-01'), apply_url: null };
    const result = resolveDedupConflict(existing, incoming);
    expect(result.winner).toBe('incoming');
  });

  it('equal confidence: earlier created_at wins', () => {
    const existing = { confidence: 'medium' as const, created_at: new Date('2026-01-01'), apply_url: null };
    const incoming = { confidence: 'medium' as const, created_at: new Date('2026-06-01'), apply_url: null };
    const result = resolveDedupConflict(existing, incoming);
    expect(result.winner).toBe('existing');
  });

  it('merges apply_url by filling the gap, never silently dropping a real link', () => {
    const existing = { confidence: 'medium' as const, created_at: new Date('2026-01-01'), apply_url: null };
    const incoming = {
      confidence: 'medium' as const,
      created_at: new Date('2026-06-01'),
      apply_url: 'https://apply.example.com/x',
    };
    // existing wins (earlier, equal confidence) but its own apply_url is empty — should fall back to incoming's
    const result = resolveDedupConflict(existing, incoming);
    expect(result.winner).toBe('existing');
    expect(result.apply_url).toBe('https://apply.example.com/x');
  });

  it('keeps the winner own apply_url when both sides have a real value (no silent overwrite)', () => {
    const existing = {
      confidence: 'high' as const,
      created_at: new Date('2026-01-01'),
      apply_url: 'https://apply.example.com/existing',
    };
    const incoming = {
      confidence: 'low' as const,
      created_at: new Date('2026-06-01'),
      apply_url: 'https://apply.example.com/incoming',
    };
    const result = resolveDedupConflict(existing, incoming);
    expect(result.winner).toBe('existing');
    expect(result.apply_url).toBe('https://apply.example.com/existing');
  });
});
