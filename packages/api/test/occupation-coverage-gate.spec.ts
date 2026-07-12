/**
 * Gate A claim-evidence 覆盖闸单测(TC-02,docs/refactor2/t3-gate-a-taskcards-2026-07-10.md)。
 * 权威规格:docs/refactor2/t3-codex56-review-2026-07-10.md §R3。
 *
 * fixture:test/fixtures/occupations/gate-a-coverage-cases.json —— 1 valid + 10 反例,
 * 每条反例独立 it(),断言具体 expected_code(不循环、不只断言"有错误")。
 */
import * as fs from 'fs';
import * as path from 'path';
import { evaluateOccupationCoverageGate, isValidClaimId, isAtomicClaimText, normalizeLeafValue, computeFieldValueHash } from '../src/occupations/occupation-coverage-gate';
import type { CoverageGateInput, CoverageGateErrorCode } from '../src/occupations/occupation-coverage-gate';
import type { OccupationSkeleton } from '../src/occupations/occupation.types';

interface FixtureCase {
  name: string;
  skeleton: OccupationSkeleton;
  prose: string;
  evidence: CoverageGateInput['evidence'];
  expect: { validated: boolean; code?: CoverageGateErrorCode };
}

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'occupations', 'gate-a-coverage-cases.json');

function loadCases(): FixtureCase[] {
  const raw = fs.readFileSync(FIXTURE_PATH, 'utf-8');
  return JSON.parse(raw) as FixtureCase[];
}

function findCase(cases: FixtureCase[], name: string): FixtureCase {
  const found = cases.find((c) => c.name === name);
  if (!found) throw new Error(`fixture case "${name}" not found`);
  return found;
}

describe('evaluateOccupationCoverageGate', () => {
  const cases = loadCases();

  it('1 valid 样例:全部 13 个非 null 可见叶子被 directly_supported 覆盖,status=validated', () => {
    const c = findCase(cases, 'valid');
    const result = evaluateOccupationCoverageGate({ skeleton: c.skeleton, prose: c.prose, evidence: c.evidence });
    expect(result.errors).toEqual([]);
    expect(result.validated).toBe(true);
    expect(result.status).toBe('validated');
  });

  it('反例①missing-evidence:evidence=null → EVIDENCE_MISSING,status=draft', () => {
    const c = findCase(cases, 'missing-evidence');
    const result = evaluateOccupationCoverageGate({ skeleton: c.skeleton, prose: c.prose, evidence: c.evidence });
    expect(result.validated).toBe(false);
    expect(result.status).toBe('draft');
    expect(result.errors.some((e) => e.code === 'EVIDENCE_MISSING')).toBe(true);
  });

  it('反例②empty-evidence:evidence=[] → EVIDENCE_EMPTY,status=draft', () => {
    const c = findCase(cases, 'empty-evidence');
    const result = evaluateOccupationCoverageGate({ skeleton: c.skeleton, prose: c.prose, evidence: c.evidence });
    expect(result.validated).toBe(false);
    expect(result.status).toBe('draft');
    expect(result.errors.some((e) => e.code === 'EVIDENCE_EMPTY')).toBe(true);
  });

  it('反例③partial-compound-field:一字段两 claim 只验一半 span → CLAIM_COVERAGE_INCOMPLETE', () => {
    const c = findCase(cases, 'partial-compound-field');
    const result = evaluateOccupationCoverageGate({ skeleton: c.skeleton, prose: c.prose, evidence: c.evidence });
    expect(result.validated).toBe(false);
    expect(result.errors.some((e) => e.code === 'CLAIM_COVERAGE_INCOMPLETE' && e.field === 'positioning.social_rationale')).toBe(true);
  });

  it('反例④same-number-different-scope:claim写2024但excerpt只有2023 → NUMERIC_SCOPE_MISMATCH', () => {
    const c = findCase(cases, 'same-number-different-scope');
    const result = evaluateOccupationCoverageGate({ skeleton: c.skeleton, prose: c.prose, evidence: c.evidence });
    expect(result.validated).toBe(false);
    expect(result.errors.some((e) => e.code === 'NUMERIC_SCOPE_MISMATCH')).toBe(true);
  });

  it('反例⑤single-jd-generalization:高危字段仅单一JD来源 → SOURCE_NOT_INDEPENDENT', () => {
    const c = findCase(cases, 'single-jd-generalization');
    const result = evaluateOccupationCoverageGate({ skeleton: c.skeleton, prose: c.prose, evidence: c.evidence });
    expect(result.validated).toBe(false);
    expect(result.errors.some((e) => e.code === 'SOURCE_NOT_INDEPENDENT')).toBe(true);
  });

  it('反例⑥rejected-still-in-skeleton:rejected断言hash仍匹配当前骨架 → REJECTED_CONTENT_PRESENT', () => {
    const c = findCase(cases, 'rejected-still-in-skeleton');
    const result = evaluateOccupationCoverageGate({ skeleton: c.skeleton, prose: c.prose, evidence: c.evidence });
    expect(result.validated).toBe(false);
    expect(result.errors.some((e) => e.code === 'REJECTED_CONTENT_PRESENT')).toBe(true);
  });

  it('反例⑦rewritten-value-old-hash:骨架值已改写但证据仍是旧值hash → FIELD_HASH_MISMATCH', () => {
    const c = findCase(cases, 'rewritten-value-old-hash');
    const result = evaluateOccupationCoverageGate({ skeleton: c.skeleton, prose: c.prose, evidence: c.evidence });
    expect(result.validated).toBe(false);
    expect(result.errors.some((e) => e.code === 'FIELD_HASH_MISMATCH')).toBe(true);
  });

  it('反例⑧inference-uses-rejected-premise:推理链前提引用了 rejected 断言 → INFERENCE_CHAIN_INVALID', () => {
    const c = findCase(cases, 'inference-uses-rejected-premise');
    const result = evaluateOccupationCoverageGate({ skeleton: c.skeleton, prose: c.prose, evidence: c.evidence });
    expect(result.validated).toBe(false);
    expect(result.errors.some((e) => e.code === 'INFERENCE_CHAIN_INVALID')).toBe(true);
  });

  it('反例⑨same-publisher-two-urls:两个不同URL但同一hostname → SOURCE_NOT_INDEPENDENT', () => {
    const c = findCase(cases, 'same-publisher-two-urls');
    const result = evaluateOccupationCoverageGate({ skeleton: c.skeleton, prose: c.prose, evidence: c.evidence });
    expect(result.validated).toBe(false);
    expect(result.errors.some((e) => e.code === 'SOURCE_NOT_INDEPENDENT')).toBe(true);
  });

  it('反例⑩year-range-single-source:typical_years非null但仅单一来源 → YEAR_RANGE_SOURCE_INSUFFICIENT', () => {
    const c = findCase(cases, 'year-range-single-source');
    const result = evaluateOccupationCoverageGate({ skeleton: c.skeleton, prose: c.prose, evidence: c.evidence });
    expect(result.validated).toBe(false);
    expect(result.errors.some((e) => e.code === 'YEAR_RANGE_SOURCE_INSUFFICIENT')).toBe(true);
  });
});

describe('evaluateOccupationCoverageGate: 补充规则单元断言(非 fixture 驱动)', () => {
  it('PENDING_CLAIM:任意一条 verdict=pending 即整批拒绝', () => {
    const cases = loadCases();
    const base = findCase(cases, 'valid');
    const evidence = (base.evidence as NonNullable<CoverageGateInput['evidence']>).map((e, i) =>
      i === 0 ? { ...e, verdict: 'pending' as const } : e,
    );
    const result = evaluateOccupationCoverageGate({ skeleton: base.skeleton, prose: base.prose, evidence });
    expect(result.validated).toBe(false);
    expect(result.errors.some((e) => e.code === 'PENDING_CLAIM')).toBe(true);
  });

  it('CLAIM_ID_INVALID:claim_id 不是合法 UUIDv7(版本位非7)时被拒', () => {
    const cases = loadCases();
    const base = findCase(cases, 'valid');
    const evidence = (base.evidence as NonNullable<CoverageGateInput['evidence']>).map((e, i) =>
      i === 0 ? { ...e, claim_id: '00000000-0000-4000-8000-000000000000' } : e,
    );
    const result = evaluateOccupationCoverageGate({ skeleton: base.skeleton, prose: base.prose, evidence });
    expect(result.validated).toBe(false);
    expect(result.errors.some((e) => e.code === 'CLAIM_ID_INVALID')).toBe(true);
  });

  it('CLAIM_NOT_ATOMIC:claim_text 命中"且"等复合连接词时被拒', () => {
    const cases = loadCases();
    const base = findCase(cases, 'valid');
    const evidence = (base.evidence as NonNullable<CoverageGateInput['evidence']>).map((e, i) =>
      i === 0 ? { ...e, claim_text: '负责结构设计且负责施工配合' } : e,
    );
    const result = evaluateOccupationCoverageGate({ skeleton: base.skeleton, prose: base.prose, evidence });
    expect(result.validated).toBe(false);
    expect(result.errors.some((e) => e.code === 'CLAIM_NOT_ATOMIC')).toBe(true);
  });

  it('SPAN_INVALID:span_end <= span_start 时被拒', () => {
    const cases = loadCases();
    const base = findCase(cases, 'valid');
    const evidence = (base.evidence as NonNullable<CoverageGateInput['evidence']>).map((e, i) =>
      i === 0 ? { ...e, span_start: 5, span_end: 5 } : e,
    );
    const result = evaluateOccupationCoverageGate({ skeleton: base.skeleton, prose: base.prose, evidence });
    expect(result.validated).toBe(false);
    expect(result.errors.some((e) => e.code === 'SPAN_INVALID')).toBe(true);
  });

  it('INFERENCE_RATIO_EXCEEDED:inference_supported 占比超过 0.30 时被拒(即使推理链本身合法)', () => {
    const cases = loadCases();
    const base = findCase(cases, 'valid');
    const validEvidence = base.evidence as NonNullable<CoverageGateInput['evidence']>;
    // 把前 5 条(共13条,5/13≈38%>30%)改成合法的 inference_supported,互相引用彼此为前提。
    const directlyIds = validEvidence.slice(5).map((e) => e.claim_id);
    const evidence = validEvidence.map((e, i) => {
      if (i >= 5) return e;
      return {
        ...e,
        verdict: 'inference_supported' as const,
        reasoning_chain: {
          premise_claim_ids: [directlyIds[0]],
          bridge_rule: '同一职业族的相邻岗位描述可类比推出本字段内容。',
          conclusion: e.claim_text,
          scope_limit: '仅适用于本 fixture 测试场景。',
          counterevidence_note: null,
        },
      };
    });
    const result = evaluateOccupationCoverageGate({ skeleton: base.skeleton, prose: base.prose, evidence });
    expect(result.validated).toBe(false);
    expect(result.errors.some((e) => e.code === 'INFERENCE_RATIO_EXCEEDED')).toBe(true);
  });

  it('HIGH_RISK_NOT_DIRECT:含数字的高危叶子(income_structure)用 inference_supported 被拒', () => {
    const cases = loadCases();
    const base = findCase(cases, 'valid');
    const sk = JSON.parse(JSON.stringify(base.skeleton)) as OccupationSkeleton;
    sk.threshold.income_structure = '底薪加绩效,绩效占比约30%。';
    const claimText = '底薪加绩效,绩效占比约30%。';
    const directlyId = (base.evidence as NonNullable<CoverageGateInput['evidence']>)[0].claim_id;
    const evidence = (base.evidence as NonNullable<CoverageGateInput['evidence']>).concat([
      {
        claim_id: '00000000-0000-7abc-8000-000000000abc',
        field_path: 'threshold.income_structure',
        field_value_hash: computeFieldValueHash(sk.threshold.income_structure),
        claim_text: claimText,
        span_start: 0,
        span_end: normalizeLeafValue(claimText).length,
        source_excerpt: '行业访谈:底薪加绩效,绩效占比约30%。',
        source_url: 'https://survey.example-hr.com/income',
        tier: 'A2',
        verdict: 'inference_supported',
        reasoning_chain: {
          premise_claim_ids: [directlyId],
          bridge_rule: '同行业岗位薪酬结构可类比推知。',
          conclusion: claimText,
          scope_limit: '仅适用于本测试场景。',
          counterevidence_note: null,
        },
        last_verified: null,
      },
    ]);
    const result = evaluateOccupationCoverageGate({ skeleton: sk, prose: base.prose, evidence });
    expect(result.validated).toBe(false);
    expect(result.errors.some((e) => e.code === 'HIGH_RISK_NOT_DIRECT')).toBe(true);
  });

  it('UNSUPPORTED_VISIBLE_CLAIM:证据指向的 field_path 在当前骨架中不存在对应叶子', () => {
    const cases = loadCases();
    const base = findCase(cases, 'valid');
    const evidence = (base.evidence as NonNullable<CoverageGateInput['evidence']>).concat([
      {
        claim_id: '00000000-0000-7abc-9000-000000000abc',
        field_path: 'positioning.nonexistent_field',
        field_value_hash: computeFieldValueHash('孤立断言'),
        claim_text: '孤立断言',
        span_start: 0,
        span_end: 4,
        source_excerpt: '来源摘录:孤立断言',
        source_url: 'https://hr.example-corp.com/jd/orphan',
        tier: 'A2',
        verdict: 'directly_supported',
        reasoning_chain: null,
        last_verified: null,
      },
    ]);
    const result = evaluateOccupationCoverageGate({ skeleton: base.skeleton, prose: base.prose, evidence });
    expect(result.validated).toBe(false);
    expect(result.errors.some((e) => e.code === 'UNSUPPORTED_VISIBLE_CLAIM')).toBe(true);
  });

  it('SOURCE_TIER_INSUFFICIENT:校招门槛字段(eligible_majors)仅有 A3 来源,未达 A2 门槛', () => {
    const cases = loadCases();
    const base = findCase(cases, 'valid');
    const sk = JSON.parse(JSON.stringify(base.skeleton)) as OccupationSkeleton;
    sk.entry.eligible_majors = ['财政学', '税收学'];
    const claimText = '对口专业为财政学与税收学';
    const evidence = (base.evidence as NonNullable<CoverageGateInput['evidence']>).concat([
      {
        claim_id: '00000000-0000-7abc-a000-000000000abc',
        field_path: 'entry.eligible_majors',
        field_value_hash: computeFieldValueHash(sk.entry.eligible_majors),
        claim_text: claimText,
        span_start: 0,
        span_end: claimText.length,
        source_excerpt: '行业文章:该岗位对口专业一般为财政学与税收学。',
        source_url: 'https://blog.example.com/tax-career-guide',
        tier: 'A3',
        verdict: 'directly_supported',
        reasoning_chain: null,
        last_verified: null,
      },
    ]);
    const result = evaluateOccupationCoverageGate({ skeleton: sk, prose: base.prose, evidence });
    expect(result.validated).toBe(false);
    expect(result.errors.some((e) => e.code === 'SOURCE_TIER_INSUFFICIENT')).toBe(true);
  });
});

describe('确定性规则函数单测', () => {
  it('isValidClaimId:版本位必须是 7,变体位必须是 8/9/a/b', () => {
    expect(isValidClaimId('00000000-0000-7000-8000-000000000000')).toBe(true);
    expect(isValidClaimId('00000000-0000-7000-9000-000000000000')).toBe(true);
    expect(isValidClaimId('00000000-0000-4000-8000-000000000000')).toBe(false); // v4 不合法
    expect(isValidClaimId('not-a-uuid')).toBe(false);
  });

  it('isAtomicClaimText:命中"且/同时/以及/并且"判定非原子', () => {
    expect(isAtomicClaimText('负责结构设计')).toBe(true);
    expect(isAtomicClaimText('负责结构设计且负责施工配合')).toBe(false);
    expect(isAtomicClaimText('负责结构设计同时兼顾造价核算')).toBe(false);
    expect(isAtomicClaimText('负责结构设计以及施工配合')).toBe(false);
    expect(isAtomicClaimText('负责结构设计并且提交施工图')).toBe(false);
  });

  it('normalizeLeafValue:字符串 NFC+trim+连续空白压一格', () => {
    expect(normalizeLeafValue('  会计   与  审计  ')).toBe('会计 与 审计');
  });

  it('normalizeLeafValue:YearRange 按 min,max,unit 固定序序列化', () => {
    expect(normalizeLeafValue({ min: 0, max: 3, unit: 'year' })).toBe('min=0;max=3;unit=year');
  });

  it('computeFieldValueHash:同一 normalize 结果产生同一 hash(确定性)', () => {
    const h1 = computeFieldValueHash('会计');
    const h2 = computeFieldValueHash('会计');
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });
});
