export const MATCH_RESULT_SCHEMA = {
  type: 'object' as const,
  properties: {
    total_score: { type: 'number' },
    dimensions: {
      type: 'object',
      properties: {
        skills: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            max: { type: 'number' },
            matched: { type: 'array', items: { type: 'string' } },
            missing: { type: 'array', items: { type: 'string' } },
            partial: { type: 'array', items: { type: 'string' } },
          },
          required: ['score', 'max', 'matched', 'missing', 'partial'],
        },
        experience: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            max: { type: 'number' },
            analysis: { type: 'string' },
          },
          required: ['score', 'max', 'analysis'],
        },
        education: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            max: { type: 'number' },
            analysis: { type: 'string' },
          },
          required: ['score', 'max', 'analysis'],
        },
        keywords: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            max: { type: 'number' },
            coverage_rate: { type: 'number' },
            missing_keywords: { type: 'array', items: { type: 'string' } },
          },
          required: ['score', 'max', 'coverage_rate', 'missing_keywords'],
        },
        overall: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            max: { type: 'number' },
            analysis: { type: 'string' },
          },
          required: ['score', 'max', 'analysis'],
        },
      },
      required: ['skills', 'experience', 'education', 'keywords', 'overall'],
    },
  },
  required: ['total_score', 'dimensions'],
};
