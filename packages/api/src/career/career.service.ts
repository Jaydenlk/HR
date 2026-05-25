import { Injectable, BadRequestException } from '@nestjs/common';
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

    if (resumes.length === 0) {
      throw new BadRequestException('请先上传简历后再使用职业地图功能');
    }

    const primaryResume = resumes.find((r) => r.is_primary) ?? resumes[0];

    const resumeText = primaryResume.raw_text?.trim() ?? '';
    if (resumeText.length < 30) {
      throw new BadRequestException(
        '简历内容不足，无法生成职业发展分析。请上传包含完整工作经历和技能的简历（至少 30 字）。',
      );
    }

    const system = `你是一位资深职业发展顾问，深谙职场发展规律与就业市场趋势。
请用中文分析候选人背景，生成职业发展路径推荐和技能差距分析。
语言：中文（简体）
严格按照指定 JSON Schema 输出，不要添加任何额外内容。
重要：所有分析必须严格基于简历中的真实信息，不要编造任何技能、经历或数据。`;

    const prompt = `## 候选人简历\n${primaryResume.raw_text}\n\n请严格基于该简历的真实内容生成职业发展分析，不要添加简历中没有的信息。`;

    return this.ai.completeStructured<CareerAnalysis>({
      system,
      prompt,
      toolName: 'career_analysis',
      toolDescription: '输出结构化职业路径分析和技能差距评估',
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
