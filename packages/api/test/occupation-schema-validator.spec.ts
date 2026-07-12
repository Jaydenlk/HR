/**
 * 骨架校验器单测:1 个合规样例通过;5 类违规样例各一条,断言被拒绝且错误信息能定位到具体字段。
 * fixtures 见 test/fixtures/occupations/{valid,invalid-*}/occupations/*.json。
 *
 * TC-01(R2 null 语义 + 发展层三分支 + Ajv 单一结构源)新增断言见文件末尾
 * "TC-01: R2 null 语义与发展层三分支" describe 块。
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

/** 深拷贝合规样例的 skeleton,供 TC-01 nullable/development 断言在此基础上做最小变异。 */
function cloneValidSkeleton(): Record<string, unknown> {
  const fixture = loadFixture('valid/occupations/structural-engineer-building.json');
  return JSON.parse(JSON.stringify(fixture.skeleton)) as Record<string, unknown>;
}

/** 把合规样例的 development 层替换为三分支定稿结构(供各 nullable 断言复用)。 */
function withThreeBranchDevelopment(skeleton: Record<string, unknown>): Record<string, unknown> {
  skeleton.development = {
    promotion_path: {
      professional_ic: [{ title: '结构设计师', typical_years: { min: 0, max: 3, unit: 'year' } }],
      management: [{ title: '专业负责人', typical_years: { min: 3, max: 6, unit: 'year' } }],
      independent: null,
    },
    ceiling: { professional_ic: '专业负责人一级', management: null, independent: null },
    lateral_moves: ['转岗施工单位技术负责人'],
  };
  return skeleton;
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

// ─────────────────────────────────────────────
// TC-01: R2 null 语义与发展层三分支(docs/refactor2/t3-gate-a-taskcards-2026-07-10.md TC-01 step2)
// 先红后绿:本描述块的断言在 occupation.types.ts / occupation.schema.ts / occupation.validator.ts
// 完成三分支 + nullable 改造前必须失败(类型不匹配 / 校验器逐字段规则拒绝 null)。
// ─────────────────────────────────────────────
describe('TC-01: R2 null 语义与发展层三分支', () => {
  describe('nullable 字段允许 null 通过', () => {
    it('coordinates.industry_scenes/upstream/downstream=null 可过', () => {
      const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
      const coordinates = skeleton.coordinates as Record<string, unknown>;
      coordinates.industry_scenes = null;
      coordinates.upstream = null;
      coordinates.downstream = null;
      const result = validateSkeleton(skeleton);
      expect(result.valid).toBe(true);
    });

    it('operations.workflow 三键(daily/project/cycle)=null 可过', () => {
      const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
      const operations = skeleton.operations as Record<string, unknown>;
      operations.workflow = { daily: null, project: null, cycle: null };
      const result = validateSkeleton(skeleton);
      expect(result.valid).toBe(true);
    });

    it('operations.deliverables/tools_systems/eval_metrics=null 可过', () => {
      const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
      const operations = skeleton.operations as Record<string, unknown>;
      operations.deliverables = null;
      operations.tools_systems = null;
      operations.eval_metrics = null;
      const result = validateSkeleton(skeleton);
      expect(result.valid).toBe(true);
    });

    it('entry 五字段全部 null 可过', () => {
      const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
      skeleton.entry = {
        eligible_majors: null,
        non_major_route: null,
        campus_recruitment_signals: null,
        resume_valid_experiences: null,
        resume_looks_relevant_but_useless: null,
      };
      const result = validateSkeleton(skeleton);
      expect(result.valid).toBe(true);
    });

    it('variation 两数组(industry_diffs/org_nature_diffs)=null 可过', () => {
      const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
      skeleton.variation = { industry_diffs: null, org_nature_diffs: null };
      const result = validateSkeleton(skeleton);
      expect(result.valid).toBe(true);
    });

    it('variation 两数组=[] 也可过', () => {
      const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
      skeleton.variation = { industry_diffs: [], org_nature_diffs: [] };
      const result = validateSkeleton(skeleton);
      expect(result.valid).toBe(true);
    });

    it('threshold 五字段全部 null 可过', () => {
      const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
      skeleton.threshold = {
        hidden_cost: null,
        attrition_reality: null,
        income_structure: null,
        common_misconceptions: null,
        who_should_not: null,
      };
      const result = validateSkeleton(skeleton);
      expect(result.valid).toBe(true);
    });

    it('trend 三数组=null 可过', () => {
      const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
      skeleton.trend = { ai_tasks_replaced: null, ai_tasks_augmented: null, ai_new_skills: null };
      const result = validateSkeleton(skeleton);
      expect(result.valid).toBe(true);
    });

    it('trend 三数组=[] 也可过', () => {
      const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
      skeleton.trend = { ai_tasks_replaced: [], ai_tasks_augmented: [], ai_new_skills: [] };
      const result = validateSkeleton(skeleton);
      expect(result.valid).toBe(true);
    });
  });

  describe('positioning/adjacent_occupations 不允许 null(硬数据叶子之外的核心字段)', () => {
    it('positioning 任一字段 null 必须失败', () => {
      const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
      const positioning = skeleton.positioning as Record<string, unknown>;
      positioning.one_liner = null;
      const result = validateSkeleton(skeleton);
      expect(result.valid).toBe(false);
    });

    it('coordinates.adjacent_occupations=null 必须失败', () => {
      const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
      const coordinates = skeleton.coordinates as Record<string, unknown>;
      coordinates.adjacent_occupations = null;
      const result = validateSkeleton(skeleton);
      expect(result.valid).toBe(false);
    });
  });

  describe('nullable 数组元素禁止空串', () => {
    it('nullable 数组含 "" 必须失败', () => {
      const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
      const operations = skeleton.operations as Record<string, unknown>;
      operations.deliverables = ['结构施工图', ''];
      const result = validateSkeleton(skeleton);
      expect(result.valid).toBe(false);
    });
  });

  describe('哨兵文案深扫(禁止用"看似有值"的套话冒充有证据)', () => {
    it.each(['暂无数据', '待补充', '未知', 'TBD', '不详', '视情况而定'])(
      '哨兵文案 "%s" 必须失败',
      (sentinel) => {
        const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
        const threshold = skeleton.threshold as Record<string, unknown>;
        threshold.hidden_cost = sentinel;
        const result = validateSkeleton(skeleton);
        expect(result.valid).toBe(false);
      },
    );
  });

  describe('org_nature 枚举由 Ajv 拒绝', () => {
    it('非法 org_nature 值必须失败', () => {
      const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
      skeleton.variation = {
        industry_diffs: [{ scene: '房建住宅', diff: '标准化程度高。' }],
        org_nature_diffs: [{ org_nature: '外星企业', diff: '不存在的组织性质。' }],
      };
      const result = validateSkeleton(skeleton);
      expect(result.valid).toBe(false);
    });
  });

  describe('development 三分支结构', () => {
    it('development 三分支结构(promotion_path 三键 + ceiling 三键 + lateral_moves)可过', () => {
      const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
      const result = validateSkeleton(skeleton);
      expect(result.valid).toBe(true);
    });

    it('typical_years.min>max 必须失败', () => {
      const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
      skeleton.development = {
        promotion_path: {
          professional_ic: [{ title: '结构设计师', typical_years: { min: 5, max: 2, unit: 'year' } }],
          management: null,
          independent: null,
        },
        ceiling: { professional_ic: null, management: null, independent: null },
        lateral_moves: null,
      };
      const result = validateSkeleton(skeleton);
      expect(result.valid).toBe(false);
    });
  });

  describe('boundary 与 coordinates.adjacent_occupations 相邻集合双向一致', () => {
    it('boundary 与 coordinates 相邻集合不一致时必须失败', () => {
      const skeleton = withThreeBranchDevelopment(cloneValidSkeleton());
      const boundary = skeleton.boundary as Record<string, unknown>;
      boundary.adjacent_diffs = [
        { occupation: '一个不在坐标层里的职业A', diff: '差异描述A。' },
        { occupation: '一个不在坐标层里的职业B', diff: '差异描述B。' },
        { occupation: '一个不在坐标层里的职业C', diff: '差异描述C。' },
      ];
      const result = validateSkeleton(skeleton);
      expect(result.valid).toBe(false);
    });
  });
});
