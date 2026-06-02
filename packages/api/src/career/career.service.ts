import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { ResumesService } from '../resumes/resumes.service';

export interface CareerPath {
  title: string;
  fit_pct: number;
  description: string;
  skills: string[];
  // 防编造:简历无学校/校友数据时不得生成具体校友数字,此处为 null(前端需省略展示)。
  alumni_count: number | null;
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
重要：所有分析必须严格基于简历中的真实信息，不要编造任何技能、经历或数据。
关于 alumni_count（同校友进入该路径的人数）：这是一个需要真实校友/院校数据才能给出的数字。
你没有任何校友数据库，简历中也几乎不可能包含此类统计。因此 alumni_count 必须填 null，
绝对禁止凭空估算或编造任何具体校友人数。
关于 skill_audit：current 是候选人当前水平、needed 是目标路径要求水平（均为 0-10 整数）。
只需如实给出 current 和 needed，是否达标（ok）由服务端依据 current>=needed 计算，你填的 ok 会被忽略。`;

    const prompt = `## 候选人简历\n${primaryResume.raw_text}\n\n请严格基于该简历的真实内容生成职业发展分析，不要添加简历中没有的信息。`;

    const raw = await this.ai.completeStructured<CareerAnalysis>({
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
                // 校友数:无真实数据时为 null。设为 nullable 且不强制必填,避免逼 AI 编数字。
                alumni_count: { type: ['number', 'null'] },
              },
              required: ['title', 'fit_pct', 'description', 'skills'],
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
              },
              // ok 由服务端依据 current/needed 计算,不让 AI 自判,故不在 schema 内要求。
              required: ['name', 'current', 'needed'],
            },
          },
        },
        required: ['paths', 'skill_audit'],
      },
    });

    // 服务端为权威,修正两类不可信的 AI 自报字段:
    // 1) DEFECT-1: ok 一律按 current>=needed 重算,消除 ok 与分值矛盾(有差距技能自动进补强清单)。
    // 2) DEFECT-3: alumni_count 仅接受有限非负整数,否则置 null,绝不放行编造/非法数字。
    return {
      paths: raw.paths.map((p) => ({
        title: p.title,
        fit_pct: p.fit_pct,
        description: p.description,
        skills: p.skills,
        alumni_count: this.normalizeAlumniCount(p.alumni_count),
      })),
      skill_audit: raw.skill_audit.map((s) => ({
        name: s.name,
        current: s.current,
        needed: s.needed,
        ok: s.current >= s.needed,
      })),
    };
  }

  private normalizeAlumniCount(value: number | null | undefined): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return null;
    }
    return Math.round(value);
  }
}
