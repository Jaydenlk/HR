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
        required: ['skill', 'level'],
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
      required: ['must_have', 'nice_to_have'],
    },
    keywords: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['job_title', 'required_skills', 'responsibilities', 'qualifications', 'keywords'],
};
