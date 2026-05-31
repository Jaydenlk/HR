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
        required: ['section', 'type', 'priority', 'original', 'suggested', 'reason'],
      },
    },
  },
  required: ['suggestions'],
};
