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

// AI 原始产出形态:降级到 deepseek-chat 时字段可能缺省/残缺,故全部可选,由 service 端兜底为权威 CareerAnalysis。
interface RawCareerPath {
  title?: string;
  fit_pct?: number;
  description?: string;
  skills?: string[];
  alumni_count?: number | null;
}
interface RawSkillAuditItem {
  name?: string;
  current?: number;
  needed?: number;
}
interface RawCareerAnalysis {
  paths?: RawCareerPath[];
  skill_audit?: RawSkillAuditItem[];
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
      // 空态非错误:无简历是一个正常的"尚未开始"状态,而非系统故障。后端契约维持 400 不变
      // (改 204 破坏面大,需集成轨道协调前端),前端据 message 含『简历』关键词识别 noResume 并静默走空态,
      // 不打 console error。message 文案务必稳定含『请先上传简历』,作为前端 noResume 判定的契约。
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
重要：所有分析必须严格基于简历中的真实信息，不要编造任何技能、经历或数据。
请输出：
- paths：1-3 条职业发展路径。每条含 title（路径名）、fit_pct（契合度 0-100 整数）、description（说明）、skills（相关技能数组）。
- skill_audit：技能差距清单。每条含 name（技能名）、current（当前水平 0-10 整数）、needed（目标水平 0-10 整数）。
关于 alumni_count（同校友进入该路径的人数）：你没有任何校友数据库，简历中也几乎不可能包含此类统计，
因此该字段一律填 null，绝对禁止凭空估算或编造任何具体校友人数。
关于 skill_audit：是否达标（ok）由服务端依据 current>=needed 计算，无需你给出。`;

    const prompt = `## 候选人简历\n${primaryResume.raw_text}\n\n请严格基于该简历的真实内容生成职业发展分析，不要添加简历中没有的信息。`;

    // schema 范式对照 industry_trend / parse_jd:顶层 required 只列两个容器(paths/skill_audit),
    // 内层 object 不设 required、paths 不设 minItems/maxItems。原因:降级到 deepseek-chat 时,
    // 内嵌 required[title,fit_pct,...] 任一缺字段都会被 AiService.validateAgainstSchema 判失败 →
    // 主备各 3 次重试耗尽 → 503(本批要修的真 bug)。缺字段改由 service 端 ?? 兜底,容器为空也放行。
    const raw = await this.ai.completeStructured<RawCareerAnalysis>({
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
                fit_pct: { type: 'number' },
                description: { type: 'string' },
                skills: { type: 'array', items: { type: 'string' } },
                // 校友数:无真实数据时为 null。nullable 且不必填,避免逼 AI 编数字。
                alumni_count: { type: ['number', 'null'] },
              },
            },
          },
          skill_audit: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                current: { type: 'number' },
                needed: { type: 'number' },
              },
            },
          },
        },
        required: ['paths', 'skill_audit'],
      },
    });

    // 服务端为权威,对缺/残缺字段做兜底,并修正两类不可信的 AI 自报字段:
    // 1) DEFECT-1: ok 一律按 current>=needed 重算,消除 ok 与分值矛盾(有差距技能自动进补强清单)。
    // 2) DEFECT-3: alumni_count 仅接受有限非负整数,否则置 null,绝不放行编造/非法数字。
    // 容器缺失/非数组 → 空数组(不抛);路径缺 title/description → 文案兜底;fit_pct 非法 → 0;skills 缺 → []。
    // skill_audit 条目缺 current/needed → 跳过该条(无两端水平无从比较达标)。
    return {
      paths: (Array.isArray(raw.paths) ? raw.paths : []).map((p) => ({
        title: p.title ?? '职业路径',
        fit_pct: this.normalizeFitPct(p.fit_pct),
        description: p.description ?? '',
        skills: Array.isArray(p.skills) ? p.skills : [],
        alumni_count: this.normalizeAlumniCount(p.alumni_count),
      })),
      skill_audit: (Array.isArray(raw.skill_audit) ? raw.skill_audit : [])
        .filter(
          (s): s is { name?: string; current: number; needed: number } =>
            typeof s.current === 'number' && typeof s.needed === 'number',
        )
        .map((s) => ({
          name: s.name ?? '技能',
          current: s.current,
          needed: s.needed,
          ok: s.current >= s.needed,
        })),
    };
  }

  // 契合度只接受 0-100 的有限数字,非法值(缺失/NaN/Infinity/越界)→ 0,绝不放行编造的越界百分比。
  private normalizeFitPct(value: number | null | undefined): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
  }

  private normalizeAlumniCount(value: number | null | undefined): number | null {
    // 校友数只接受"有限的非负整数"。NaN/Infinity/非整数(如 12.6 人)都是模型臆造的信号,
    // 一律置 null,绝不四舍五入成一个看似精确实则编造的整数。
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      return null;
    }
    return value;
  }
}
