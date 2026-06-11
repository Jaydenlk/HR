// schema 范式对照 career_analysis(修复波1):顶层 required 只保留骨架容器(dimensions),
// 内层 object items 一律不设 required。原因:主通道走 deepseek-chat 时,内嵌 required[key,name,score,...]
// 任一缺字段都会被 AiService.validateAgainstSchema 判失败 → 主备各 3 次重试耗尽 → 503
// (本批要修的 profession_standard_review 真 bug)。缺字段改由 AnalyzerService 端归一兜底:
//   - dimensions 已有 preset 对齐归一(d?.why ?? '' 等),退化产物仍由 isDegenerate 拦下重试,内容红线不放宽;
//   - conventionChecks / interviewHooks 由 service 端 normalize 过滤掉缺字段条目,而非逼模型补满。
export const PROFESSION_STANDARD_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    total_score: { type: 'number' },
    dimensions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          name: { type: 'string' },
          score: { type: 'number' },
          max: { type: 'number' },
          why: { type: 'string' },
          evidenceFound: { type: 'array', items: { type: 'string' } },
          gap: { type: 'string' },
        },
      },
    },
    conventionChecks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          // enum 保留:非法枚举走既有重试链(validateAgainstSchema 仅在值存在且非法时判失败)。
          status: { type: 'string', enum: ['ok', 'warn', 'missing'] },
          note: { type: 'string' },
        },
      },
    },
    interviewHooks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          resumeHit: { type: 'string' },
          interviewQuestion: { type: 'string' },
          prepDirection: { type: 'string' },
        },
      },
    },
  },
  // 顶层只强制 dimensions(分维诊断是核心产物);conventionChecks/interviewHooks 缺失由 service 端兜底为 []。
  required: ['dimensions'],
};
