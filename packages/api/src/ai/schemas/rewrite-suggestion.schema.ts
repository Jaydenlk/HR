// schema 范式对照 career_analysis(修复波1):顶层 required 只保留骨架容器(suggestions),
// 内层 object items 不设 required。原因:主通道走 deepseek-chat 时,内嵌
// required[section,type,priority,original,suggested,reason] 任一缺字段都会被
// AiService.validateAgainstSchema 判失败 → 主备各 3 次重试耗尽 → 503。
// 缺字段改由 RewriterService.suggestAgainstPreset 归一兜底:isWellFormed 仍强制 suggested/reason 非空
// (空建议无价值),section/type/priority 缺失给安全默认;enum 保留走既有重试链,防编造红线不放宽。
export const REWRITE_SUGGESTIONS_SCHEMA = {
  type: 'object' as const,
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          section: { type: 'string' },
          item_index: { type: 'number' },
          type: {
            type: 'string',
            enum: ['rewrite', 'add_keywords', 'restructure', 'quantify', 'gap_advice'],
          },
          priority: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
          },
          original: { type: 'string' },
          suggested: { type: 'string' },
          reason: { type: 'string' },
          jd_requirement: { type: 'string' },
        },
      },
    },
  },
  required: ['suggestions'],
};
