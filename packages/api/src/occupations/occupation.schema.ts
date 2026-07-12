/**
 * 职业维基 · Stage0 · 骨架(skeleton)JSON Schema —— .ts 字面量常量
 *
 * 唯一结构源(docs/refactor2/t3-codex56-review-2026-07-10.md §R2/R1):本 Schema 是骨架结构
 * 约束的**唯一权威规则**,由 occupation.validator.ts 内的 Ajv 实例编译执行(`ajv.compile`),
 * 不存在第二份手写结构校验逻辑。历史上本文件曾只是声明性文档、真正的结构校验是
 * occupation.validator.ts 里的手写逐字段函数(getLayer/requireNonEmptyString/requireStringArray),
 * 两者会漂移(如 OrgNature 枚举只在这里查、validator 手写规则却各自维护)——TC-01 消灭了这个
 * 双源问题:本文件描述结构,Ajv 执行结构,validator.ts 只保留 Ajv 表达不了的跨字段/跨文件语义
 * (被禁证据字段深扫、哨兵文案深扫、boundary↔coordinates 双向一致、development min<=max、
 * edges 引用完整性)。
 *
 * 依赖:ajv@^8(pnpm --filter @coach/api add ajv@^8.17.1)。
 *
 * 本 Schema 遵循 JSON Schema draft-07 词汇表书写(type/properties/required/enum/additionalProperties
 * /minItems/maxItems/$defs/$ref/anyOf),由 Ajv({strict:true}) 编译执行。
 *
 * 红线:本 Schema 只描述 skeleton 的结构约束,不得出现证据侧字段
 * (source_ref/tier/verdict 等)——那些属于 occupation_evidence 表,不属于 skeleton。
 *
 * R2 null 语义(docs/refactor2/t3-codex56-review-2026-07-10.md §R2):
 * "存在但未知"用 JSON null;nullable 数组 null=证据不足、[]=已核验为无。
 * 唯二不允许 null 的核心字段:positioning 三字段、coordinates.adjacent_occupations(≥3)、
 * boundary.adjacent_diffs(≥3)——百科最核心的"这是谁 + 它和谁不一样"不能是空的。
 */
import { AXIS_VALUES, DOMAIN_SPECIFICS_MAX } from './occupation.types';

/** 非空字符串(不可 null)。 */
const nonEmptyString = { type: 'string', minLength: 1 } as const;

/** 可空字符串:要么非空字符串,要么 null(证据不足)。 */
const nullableString = { type: ['string', 'null'], minLength: 1 } as const;

/** 非空字符串数组(不可 null,但数组本身可以是 []——由各层单独决定 minItems)。 */
const stringArray = { type: 'array', items: { type: 'string', minLength: 1 } } as const;

/** 可空字符串数组:要么字符串数组(元素禁止空串),要么 null(证据不足);[]=已核验为无。 */
const nullableStringArray = { type: ['array', 'null'], items: { type: 'string', minLength: 1 } } as const;

export const OCCUPATION_SKELETON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'OccupationSkeleton',
  type: 'object',
  additionalProperties: false,
  required: [
    'positioning',
    'coordinates',
    'boundary',
    'operations',
    'entry',
    'variation',
    'threshold',
    'development',
    'trend',
    'axis',
    'domain_specifics',
  ],
  $defs: {
    yearRange: {
      type: 'object',
      additionalProperties: false,
      required: ['min', 'max', 'unit'],
      properties: {
        min: { type: 'number', minimum: 0 },
        max: { type: 'number', minimum: 0 },
        unit: { const: 'year' },
      },
    },
    developmentStep: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'typical_years'],
      properties: {
        title: nonEmptyString,
        typical_years: { anyOf: [{ $ref: '#/$defs/yearRange' }, { type: 'null' }] },
      },
    },
    developmentBranch: {
      type: ['array', 'null'],
      items: { $ref: '#/$defs/developmentStep' },
    },
  },
  properties: {
    // 1. 定位层(唯二不允许 null 的层之一:三字段都是非空字符串)
    positioning: {
      type: 'object',
      additionalProperties: false,
      required: ['one_liner', 'problem_solved', 'social_rationale'],
      properties: {
        one_liner: nonEmptyString,
        problem_solved: nonEmptyString,
        social_rationale: nonEmptyString,
      },
    },
    // 2. 坐标层:occupation_family/adjacent_occupations(≥3)不允许 null;其余三个可 null。
    coordinates: {
      type: 'object',
      additionalProperties: false,
      required: ['occupation_family', 'industry_scenes', 'adjacent_occupations', 'upstream', 'downstream'],
      properties: {
        occupation_family: nonEmptyString,
        industry_scenes: nullableStringArray,
        // 相邻职业(≥3),原稿一、2 节:「没有相邻对比,就不是百科、只是介绍」。不允许 null。
        adjacent_occupations: { ...stringArray, minItems: 3 },
        upstream: nullableStringArray,
        downstream: nullableStringArray,
      },
    },
    // 3. 边界层(唯二不允许 null 的层之一:≥3 条差异,每条 occupation/diff 均非空)
    boundary: {
      type: 'object',
      additionalProperties: false,
      required: ['adjacent_diffs'],
      properties: {
        adjacent_diffs: {
          type: 'array',
          minItems: 3,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['occupation', 'diff'],
            properties: {
              occupation: nonEmptyString,
              diff: nonEmptyString,
            },
          },
        },
      },
    },
    // 4. 实操层:workflow 对象及三键键位始终存在,值可 null;三数组整体可 null。
    operations: {
      type: 'object',
      additionalProperties: false,
      required: ['workflow', 'deliverables', 'tools_systems', 'eval_metrics'],
      properties: {
        workflow: {
          type: 'object',
          additionalProperties: false,
          required: ['daily', 'project', 'cycle'],
          properties: {
            daily: nullableString,
            project: nullableString,
            cycle: nullableString,
          },
        },
        deliverables: nullableStringArray,
        tools_systems: nullableStringArray,
        eval_metrics: nullableStringArray,
      },
    },
    // 5. 入行层:层对象及全部键存在,五个字段全部可 null。
    entry: {
      type: 'object',
      additionalProperties: false,
      required: [
        'eligible_majors',
        'non_major_route',
        'campus_recruitment_signals',
        'resume_valid_experiences',
        'resume_looks_relevant_but_useless',
      ],
      properties: {
        eligible_majors: nullableStringArray,
        non_major_route: nullableString,
        campus_recruitment_signals: nullableStringArray,
        resume_valid_experiences: nullableStringArray,
        resume_looks_relevant_but_useless: nullableStringArray,
      },
    },
    // 6. 差异层:两数组键存在,整体可 null 或 [];有条目时 scene/org_nature/diff 非空。
    variation: {
      type: 'object',
      additionalProperties: false,
      required: ['industry_diffs', 'org_nature_diffs'],
      properties: {
        industry_diffs: {
          type: ['array', 'null'],
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['scene', 'diff'],
            properties: {
              scene: nonEmptyString,
              diff: nonEmptyString,
            },
          },
        },
        org_nature_diffs: {
          type: ['array', 'null'],
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['org_nature', 'diff'],
            properties: {
              org_nature: {
                type: 'string',
                enum: ['民企', '外企', '央企', '国企', '政府', '事业单位', '法院检察院', '高校科研', '创业'],
              },
              diff: nonEmptyString,
            },
          },
        },
      },
    },
    // 7. 门槛层:层对象及全部键存在,五字段全部可 null。
    threshold: {
      type: 'object',
      additionalProperties: false,
      required: ['hidden_cost', 'attrition_reality', 'income_structure', 'common_misconceptions', 'who_should_not'],
      properties: {
        hidden_cost: nullableString,
        attrition_reality: nullableString,
        income_structure: nullableString,
        common_misconceptions: nullableString,
        who_should_not: nullableString,
      },
    },
    // 8. 发展层(三分支定稿):promotion_path 三分支键/ceiling 三分支键/lateral_moves 键存在,
    // 各分支整体、每级 typical_years、三类 ceiling、lateral_moves 均可 null。
    // typical_years.min<=max 属跨字段语义,Ajv 表达不了,由 validator.ts 补做一次深扫。
    development: {
      type: 'object',
      additionalProperties: false,
      required: ['promotion_path', 'ceiling', 'lateral_moves'],
      properties: {
        promotion_path: {
          type: 'object',
          additionalProperties: false,
          required: ['professional_ic', 'management', 'independent'],
          properties: {
            professional_ic: { $ref: '#/$defs/developmentBranch' },
            management: { $ref: '#/$defs/developmentBranch' },
            independent: { $ref: '#/$defs/developmentBranch' },
          },
        },
        ceiling: {
          type: 'object',
          additionalProperties: false,
          required: ['professional_ic', 'management', 'independent'],
          properties: {
            professional_ic: nullableString,
            management: nullableString,
            independent: nullableString,
          },
        },
        lateral_moves: nullableStringArray,
      },
    },
    // 9. 趋势层:层对象及三键存在,三数组全部可 null。
    trend: {
      type: 'object',
      additionalProperties: false,
      required: ['ai_tasks_replaced', 'ai_tasks_augmented', 'ai_new_skills'],
      properties: {
        ai_tasks_replaced: nullableStringArray,
        ai_tasks_augmented: nullableStringArray,
        ai_new_skills: nullableStringArray,
      },
    },
    // 微调槽 1:axis(差异主轴,10 个枚举值,焊死)
    axis: { type: 'string', enum: [...AXIS_VALUES] },
    // 微调槽 2:domain_specifics(专有槽,封顶 5 条)
    domain_specifics: {
      type: 'array',
      maxItems: DOMAIN_SPECIFICS_MAX,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'value'],
        properties: {
          key: nonEmptyString,
          value: nonEmptyString,
        },
      },
    },
  },
} as const;
