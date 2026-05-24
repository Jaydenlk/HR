import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { ResumesService } from '../resumes/resumes.service';

export interface CareerPath {
  title: string;
  fit_pct: number;
  description: string;
  skills: string[];
  alumni_count: number;
}

export interface SkillAuditItem {
  name: string;
  current: number;
  needed: number;
  ok: boolean;
}

export interface CareerAnalysis {
  paths: CareerPath[];
  skill_audit: SkillAuditItem[];
}

@Injectable()
export class CareerService {
  constructor(
    private readonly ai: AiService,
    private readonly resumes: ResumesService,
  ) {}

  async analyze(userId: string): Promise<CareerAnalysis> {
    const resumes = await this.resumes.findAllByUser(userId);

    const primaryResume = resumes.find((r) => r.is_primary) ?? resumes[0];
    const resumeText = primaryResume?.raw_text ?? '';

    const system = `You are a career advisor with deep knowledge of job markets and career progression.
Analyze the candidate's background and generate career path recommendations with skill gap analysis.
Return ONLY valid JSON matching the exact schema provided.`;

    const prompt = resumeText
      ? `## Candidate Resume\n${resumeText}\n\nBased on this resume, generate a career analysis.`
      : 'Generate a career analysis for a candidate without a resume on file.';

    return this.ai.completeStructured<CareerAnalysis>({
      system,
      prompt,
      toolName: 'career_analysis',
      toolDescription: 'Output structured career path analysis and skill audit',
      schema: {
        type: 'object',
        properties: {
          paths: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                fit_pct: { type: 'number', minimum: 0, maximum: 100 },
                description: { type: 'string' },
                skills: { type: 'array', items: { type: 'string' } },
                alumni_count: { type: 'number' },
              },
              required: ['title', 'fit_pct', 'description', 'skills', 'alumni_count'],
            },
            minItems: 1,
            maxItems: 3,
          },
          skill_audit: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                current: { type: 'number', minimum: 0, maximum: 10 },
                needed: { type: 'number', minimum: 0, maximum: 10 },
                ok: { type: 'boolean' },
              },
              required: ['name', 'current', 'needed', 'ok'],
            },
          },
        },
        required: ['paths', 'skill_audit'],
      },
    });
  }
}
