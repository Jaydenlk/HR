// schema 范式对照 career_analysis(修复波1):顶层 required 只保留骨架(job_title),内层 object items 不设 required。
// 原因:主通道走 deepseek-chat 时,内嵌 required(如 required_skills.items.required[skill,level])任一缺字段
// 都会被 AiService.validateAgainstSchema 判失败 → 主备各 3 次重试耗尽 → 503。
// 缺字段改由 ParserService.normalizeJD 归一兜底为权威 ParsedJD;enum 保留走既有重试链。
export const PARSED_JD_SCHEMA = {
  type: 'object' as const,
  properties: {
    job_title: { type: 'string' },
    company: { type: 'string' },
    department: { type: 'string' },
    required_skills: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          skill: { type: 'string' },
          level: { type: 'string', enum: ['required', 'preferred', 'nice_to_have'] },
          years: { type: 'string' },
        },
      },
    },
    responsibilities: {
      type: 'array',
      items: { type: 'string' },
    },
    qualifications: {
      type: 'object',
      properties: {
        education: { type: 'string' },
        experience_years: { type: 'string' },
        must_have: { type: 'array', items: { type: 'string' } },
        nice_to_have: { type: 'array', items: { type: 'string' } },
      },
    },
    keywords: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['job_title'],
};
