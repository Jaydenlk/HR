// schema 范式对照 career_analysis(修复波1):顶层 required 只保留骨架容器,内层 object items 不设 required。
// 原因:主通道走 deepseek-chat 时,内嵌 required(如 work_experience.items.required[company,title,...])
// 任一缺字段都会被 AiService.validateAgainstSchema 判失败 → 主备各 3 次重试耗尽 → 503。
// 缺字段改由 ParserService.normalizeResume 归一兜底为权威 ParsedResume(下游 renderResumeForReview 强类型访问),
// basic_info 缺失给空对象、各数组缺失给 []、条目缺关键字段给安全默认,绝不编造业务内容。
export const PARSED_RESUME_SCHEMA = {
  type: 'object' as const,
  properties: {
    basic_info: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        location: { type: 'string' },
        linkedin: { type: 'string' },
      },
    },
    summary: { type: 'string' },
    work_experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: { type: 'string' },
          title: { type: 'string' },
          start_date: { type: 'string' },
          end_date: { type: 'string' },
          description: { type: 'string' },
          achievements: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          school: { type: 'string' },
          degree: { type: 'string' },
          major: { type: 'string' },
          graduation_date: { type: 'string' },
          gpa: { type: 'string' },
        },
      },
    },
    skills: {
      type: 'object',
      properties: {
        technical: { type: 'array', items: { type: 'string' } },
        soft: { type: 'array', items: { type: 'string' } },
        languages: { type: 'array', items: { type: 'string' } },
        certifications: { type: 'array', items: { type: 'string' } },
      },
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          technologies: { type: 'array', items: { type: 'string' } },
          role: { type: 'string' },
        },
      },
    },
    links: { type: 'array', items: { type: 'string' } },
    awards_honors: { type: 'array', items: { type: 'string' } },
  },
  required: ['basic_info'],
};
