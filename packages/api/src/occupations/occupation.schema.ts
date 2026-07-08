/**
 * 职业维基 · Stage0 · 骨架(skeleton)JSON Schema —— .ts 字面量常量
 *
 * 技术选型决策:用 .ts 字面量常量而非 .json 文件。
 * 理由(IMPL 报告已展开):
 *  1. 本仓库无 ajv/zod/joi,没有运行时 JSON Schema 解释器消费它——它的作用是「结构约束的
 *     权威声明 + 未来若引入 ajv/供其它工具读取时的现成输入」,不是本次校验器的执行依赖
 *     (校验器是手写函数,见 occupation.validator.ts)。既然不被解释器消费,.ts 字面量能带
 *     逐字段 JSDoc/注释追溯到设计文档出处,.json 文件做不到(JSON 无注释)。
 *  2. 与同目录 occupation.types.ts / occupation.validator.ts 保持统一的 .ts 后缀,tsc --noEmit
 *     能对字面量结构做基本的语法级检查,零额外构建步骤(resolveJsonModule 虽已开,但这里没有
 *     必要引入 .json 导入的额外间接层)。
 *
 * 本 Schema 遵循 JSON Schema draft-07 词汇表书写(type/properties/required/enum/additionalProperties
 * /minItems/maxItems),但当前仅作声明性文档使用,不接入运行时解释器。
 *
 * 红线:本 Schema 只描述 skeleton 的结构约束,不得出现证据侧字段
 * (source_ref/tier/verdict 等)——那些属于 occupation_evidence 表,不属于 skeleton。
 */
import { AXIS_VALUES, DOMAIN_SPECIFICS_MAX } from './occupation.types';

const stringArray = { type: 'array', items: { type: 'string' } } as const;

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
    'trend',
    'axis',
    'domain_specifics',
  ],
  properties: {
    // 1. 定位层
    positioning: {
      type: 'object',
      additionalProperties: false,
      required: ['one_liner', 'problem_solved', 'social_rationale'],
      properties: {
        one_liner: { type: 'string', minLength: 1 },
        problem_solved: { type: 'string', minLength: 1 },
        social_rationale: { type: 'string', minLength: 1 },
      },
    },
    // 2. 坐标层
    coordinates: {
      type: 'object',
      additionalProperties: false,
      required: ['occupation_family', 'industry_scenes', 'adjacent_occupations', 'upstream', 'downstream'],
      properties: {
        occupation_family: { type: 'string', minLength: 1 },
        industry_scenes: { ...stringArray, minItems: 1 },
        // 相邻职业(≥3),原稿一、2 节:「没有相邻对比,就不是百科、只是介绍」。
        adjacent_occupations: { ...stringArray, minItems: 3 },
        upstream: { ...stringArray, minItems: 1 },
        downstream: { ...stringArray, minItems: 1 },
      },
    },
    // 3. 边界层
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
              occupation: { type: 'string', minLength: 1 },
              diff: { type: 'string', minLength: 1 },
            },
          },
        },
      },
    },
    // 4. 实操层
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
            daily: { type: 'string', minLength: 1 },
            project: { type: 'string', minLength: 1 },
            cycle: { type: 'string', minLength: 1 },
          },
        },
        deliverables: { ...stringArray, minItems: 1 },
        tools_systems: { ...stringArray, minItems: 1 },
        eval_metrics: { ...stringArray, minItems: 1 },
      },
    },
    // 5. 入行层
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
        eligible_majors: { ...stringArray, minItems: 1 },
        non_major_route: { type: 'string', minLength: 1 },
        campus_recruitment_signals: { ...stringArray, minItems: 1 },
        resume_valid_experiences: { ...stringArray, minItems: 1 },
        resume_looks_relevant_but_useless: { ...stringArray, minItems: 1 },
      },
    },
    // 6. 差异层
    variation: {
      type: 'object',
      additionalProperties: false,
      required: ['industry_diffs', 'org_nature_diffs'],
      properties: {
        industry_diffs: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['scene', 'diff'],
            properties: {
              scene: { type: 'string', minLength: 1 },
              diff: { type: 'string', minLength: 1 },
            },
          },
        },
        org_nature_diffs: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['org_nature', 'diff'],
            properties: {
              org_nature: {
                type: 'string',
                enum: ['民企', '外企', '央企', '国企', '政府', '事业单位', '法院检察院', '高校科研', '创业'],
              },
              diff: { type: 'string', minLength: 1 },
            },
          },
        },
      },
    },
    // 7. 门槛层
    threshold: {
      type: 'object',
      additionalProperties: false,
      required: ['hidden_cost', 'attrition_reality', 'income_structure', 'common_misconceptions', 'who_should_not'],
      properties: {
        hidden_cost: { type: 'string', minLength: 1 },
        attrition_reality: { type: 'string', minLength: 1 },
        income_structure: { type: 'string', minLength: 1 },
        common_misconceptions: { type: 'string', minLength: 1 },
        who_should_not: { type: 'string', minLength: 1 },
      },
    },
    // 8. 趋势层
    trend: {
      type: 'object',
      additionalProperties: false,
      required: ['ai_tasks_replaced', 'ai_tasks_augmented', 'ai_new_skills'],
      properties: {
        ai_tasks_replaced: { ...stringArray, minItems: 1 },
        ai_tasks_augmented: { ...stringArray, minItems: 1 },
        ai_new_skills: { ...stringArray, minItems: 1 },
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
          key: { type: 'string', minLength: 1 },
          value: { type: 'string', minLength: 1 },
        },
      },
    },
  },
} as const;
