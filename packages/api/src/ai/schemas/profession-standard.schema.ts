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
        required: ['key', 'name', 'score', 'max', 'why', 'evidenceFound', 'gap'],
      },
    },
    conventionChecks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          status: { type: 'string', enum: ['ok', 'warn', 'missing'] },
          note: { type: 'string' },
        },
        required: ['key', 'status', 'note'],
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
        required: ['resumeHit', 'interviewQuestion', 'prepDirection'],
      },
    },
  },
  required: ['total_score', 'dimensions', 'conventionChecks', 'interviewHooks'],
};
