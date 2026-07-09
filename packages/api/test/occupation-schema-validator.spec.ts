/**
 * 骨架校验器单测:1 个合规样例通过;5 类违规样例各一条,断言被拒绝且错误信息能定位到具体字段。
 * fixtures 见 test/fixtures/occupations/{valid,invalid-*}/occupations/*.json。
 */
import * as fs from 'fs';
import * as path from 'path';
import { validateSkeleton, validateEdgesReferentialIntegrity } from '../src/occupations/occupation.validator';
import type { OccupationSkeleton, OccupationEdgeRow } from '../src/occupations/occupation.types';

const FIXTURES_ROOT = path.join(__dirname, 'fixtures', 'occupations');

interface FixtureFile {
  slug: string;
  skeleton: OccupationSkeleton;
  edges?: { to_slug: string; type: string; note?: string }[];
}

function loadFixture(relativePath: string): FixtureFile {
  const raw = fs.readFileSync(path.join(FIXTURES_ROOT, relativePath), 'utf-8');
  return JSON.parse(raw) as FixtureFile;
}

describe('validateSkeleton', () => {
  it('合规样例通过,errors 为空数组', () => {
    const fixture = loadFixture('valid/occupations/structural-engineer-building.json');
    const result = validateSkeleton(fixture.skeleton);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('第二条合规样例(最小骨架)也通过', () => {
    const fixture = loadFixture('valid/occupations/geotechnical-engineer-fixture.json');
    const result = validateSkeleton(fixture.skeleton);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('①缺层:骨架缺失 trend 层,应被拒绝且定位到 "trend"', () => {
    const fixture = loadFixture('invalid-missing-layer/occupations/broken.json');
    const result = validateSkeleton(fixture.skeleton);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'trend' && e.message.includes('缺层'))).toBe(true);
  });

  it('①缺层(发展层):同一 fixture 本就同时缺失 development 层,应一并被拒绝且定位到 "development"', () => {
    const fixture = loadFixture('invalid-missing-layer/occupations/broken.json');
    const result = validateSkeleton(fixture.skeleton);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'development' && e.message.includes('缺层'))).toBe(true);
  });

  it('②混入被禁字段:骨架 positioning 层混入 tier,应被拒绝且定位到 "positioning.tier"', () => {
    const fixture = loadFixture('invalid-forbidden-field/occupations/broken.json');
    const result = validateSkeleton(fixture.skeleton);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.field === 'positioning.tier' && e.message.includes('证据侧字段')),
    ).toBe(true);
  });

  it('③axis 不在枚举内:axis="quarterly",应被拒绝且定位到 "axis"', () => {
    const fixture = loadFixture('invalid-axis/occupations/broken.json');
    const result = validateSkeleton(fixture.skeleton);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'axis' && e.message.includes('不在允许的 10 个枚举内'))).toBe(true);
  });

  it('④domain_specifics 超过 5 条,应被拒绝且定位到 "domain_specifics"', () => {
    const fixture = loadFixture('invalid-domain-specifics/occupations/broken.json');
    const result = validateSkeleton(fixture.skeleton);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.field === 'domain_specifics' && e.message.includes('超过封顶 5 条')),
    ).toBe(true);
  });
});

describe('validateEdgesReferentialIntegrity', () => {
  it('全部引用有效时通过', () => {
    const edges: OccupationEdgeRow[] = [
      { from_slug: 'a', to_slug: 'b', type: 'adjacent', note: '' },
      { from_slug: 'a', to_slug: 'c', type: 'upstream', note: '' },
    ];
    const result = validateEdgesReferentialIntegrity(edges, new Set(['a', 'b', 'c']));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('⑤悬空引用:edges 引用不存在的 slug,应被拒绝且定位到具体下标字段', () => {
    const fixture = loadFixture('invalid-dangling-edge/occupations/broken.json');
    const edges: OccupationEdgeRow[] = (fixture.edges ?? []).map((e) => ({
      from_slug: fixture.slug,
      to_slug: e.to_slug,
      type: e.type as OccupationEdgeRow['type'],
      note: e.note ?? '',
    }));
    // 已知 slug 集合只含自身,不含 edges 指向的 "ghost-slug-not-registered"。
    const result = validateEdgesReferentialIntegrity(edges, new Set([fixture.slug]));
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.field === 'edges[0].to_slug' && e.message.includes('悬空引用')),
    ).toBe(true);
  });

  it('type 不在三选一内时拒绝(老 EdgeType 残留场景)', () => {
    const edges: OccupationEdgeRow[] = [
      // @ts-expect-error 刻意构造非法 type,验证运行时拒绝而非依赖编译期类型
      { from_slug: 'a', to_slug: 'b', type: 'traditional_to_ai', note: '' },
    ];
    const result = validateEdgesReferentialIntegrity(edges, new Set(['a', 'b']));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'edges[0].type')).toBe(true);
  });
});
