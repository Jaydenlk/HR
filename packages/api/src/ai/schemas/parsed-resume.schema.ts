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
      required: ['name'],
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
        required: ['company', 'title', 'start_date', 'description', 'achievements'],
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
        required: ['school', 'degree', 'major'],
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
      required: ['technical', 'soft', 'languages', 'certifications'],
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
        required: ['name', 'description', 'technologies'],
      },
    },
    links: { type: 'array', items: { type: 'string' } },
  },
  required: ['basic_info', 'work_experience', 'education', 'skills', 'projects'],
};
