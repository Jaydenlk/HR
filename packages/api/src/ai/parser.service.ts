import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AiService } from './ai.service';
import { SYSTEM as RESUME_SYSTEM, buildParseResumePrompt } from './prompts/parse-resume';
import { SYSTEM as JD_SYSTEM, buildParseJDPrompt } from './prompts/parse-jd';
import { PARSED_RESUME_SCHEMA } from './schemas/parsed-resume.schema';
import { PARSED_JD_SCHEMA } from './schemas/parsed-jd.schema';
import { ParsedResume, ParsedJD } from '../common/types';

// AI 原始解析形态:schema 内层 required 已放宽(主通道走 deepseek-chat 时易漏字段),
// 故 Raw 类型字段全部可选,由 normalizeResume / normalizeJD 归一为权威 ParsedResume / ParsedJD。无 any。
interface RawBasicInfo {
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
  linkedin?: string;
}
interface RawWorkExperience {
  company?: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  achievements?: string[];
}
interface RawEducation {
  school?: string;
  degree?: string;
  major?: string;
  graduation_date?: string;
  gpa?: string;
}
interface RawSkills {
  technical?: string[];
  soft?: string[];
  languages?: string[];
  certifications?: string[];
}
interface RawProject {
  name?: string;
  description?: string;
  technologies?: string[];
  role?: string;
}
interface RawParsedResume {
  basic_info?: RawBasicInfo;
  summary?: string;
  work_experience?: RawWorkExperience[];
  education?: RawEducation[];
  skills?: RawSkills;
  projects?: RawProject[];
  links?: string[];
  awards_honors?: string[];
}

interface RawRequiredSkill {
  skill?: string;
  level?: ParsedJD['required_skills'][number]['level'];
  years?: string;
}
interface RawQualifications {
  education?: string;
  experience_years?: string;
  must_have?: string[];
  nice_to_have?: string[];
}
interface RawParsedJD {
  job_title?: string;
  company?: string;
  department?: string;
  required_skills?: RawRequiredSkill[];
  responsibilities?: string[];
  qualifications?: RawQualifications;
  keywords?: string[];
}

const JD_LEVELS = new Set<ParsedJD['required_skills'][number]['level']>([
  'required',
  'preferred',
  'nice_to_have',
]);

/** 缺失/非字符串 → fallback;字符串原样保留(不裁剪、不编造)。 */
function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
/** 缺失/非数组 → [];过滤掉非字符串元素,保证下游 .join/.map 安全。 */
function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/**
 * 简历解析是否「抽到了实质内容」。
 *
 * PARSED_RESUME_SCHEMA 顶层 required 仅 ['basic_info'] 且内层不设 required(主通道 deepseek-chat
 * 漏字段易 503 的折中),故中转偶发返回 `{ basic_info: {} }` 这种 schema 合法但语义为空的退化产物会
 * 通过 AiService 校验。normalizeResume 把它归一为「全空 ParsedResume」(name='' / 各数组 []),
 * renderResumeForReview 渲染出仅 "姓名:"(3 字)→ analyzeAgainstPreset 误抛「简历内容过短」
 * (把锅扣在用户没动过的简历上),且该空解析会被 updateParsedJson 落库,永久毒化该简历。
 *
 * 判据:渲染后能进入诊断的任一实质字段命中即视为有效——姓名/个人简介/工作/教育/项目/荣誉/任一技能。
 * 仅当全部为空(真·没抽到东西)才判退化。绝不编造,只判定「这次解析是否成功」。
 */
export function isResumeParseMeaningful(r: ParsedResume): boolean {
  // 调用方 resolveParsedResume 会把 DB 缓存 parsed_json 直接传入:normalize 之后的新解析恒为
  // 完整 shape,但 DB 里可能存在 normalize 机制建立之前写入的【畸形遗留行】(basic_info 在但 name
  // 缺、skills 整体缺、顶层数组缺)。对这类缺字段一律按「空」处理(判 false 那一支)走重解自愈,
  // 绝不抛 TypeError(否则 500、不自愈)。正常 normalize 行各字段必在,可选链全不短路 → 判定不变。
  const b = r.basic_info;
  const s = r.skills;
  return (
    (b?.name?.trim().length ?? 0) > 0 ||
    (r.summary?.trim().length ?? 0) > 0 ||
    (r.work_experience?.length ?? 0) > 0 ||
    (r.education?.length ?? 0) > 0 ||
    (r.projects?.length ?? 0) > 0 ||
    (r.awards_honors?.length ?? 0) > 0 ||
    (s?.technical?.length ?? 0) > 0 ||
    (s?.soft?.length ?? 0) > 0 ||
    (s?.languages?.length ?? 0) > 0 ||
    (s?.certifications?.length ?? 0) > 0
  );
}

@Injectable()
export class ParserService {
  constructor(private readonly ai: AiService) {}

  // skipLimiter:诊断流式管线内层调用置 true(外层 runObservable 已持槽,避免嵌套自锁,见 D1)。
  async parseResume(text: string, skipLimiter = false): Promise<ParsedResume> {
    const raw = await this.ai.completeStructured<RawParsedResume>({
      system: RESUME_SYSTEM,
      prompt: buildParseResumePrompt(text),
      toolName: 'parse_resume',
      toolDescription: '将简历文本解析为结构化 JSON 数据',
      schema: PARSED_RESUME_SCHEMA,
      skipLimiter,
    });
    const parsed = this.normalizeResume(raw);
    // 退化解析(schema 合法但语义为空)= 解析失败,不可静默放行:否则下游渲染成 "姓名:" 误判
    // 「简历内容过短」、并被调用方缓存毒化该简历。原文已在上游过 ≥30 字闸,空解析必是 AI 解析失败
    // (中转返回空 tool_use),抛 503 走重试/降级,绝不返回空解析、绝不让调用方落库空结果。
    if (!isResumeParseMeaningful(parsed)) {
      throw new ServiceUnavailableException(
        '简历解析未能提取到有效信息,请稍后重试。',
      );
    }
    return parsed;
  }

  async parseJD(text: string, skipLimiter = false): Promise<ParsedJD> {
    const raw = await this.ai.completeStructured<RawParsedJD>({
      system: JD_SYSTEM,
      prompt: buildParseJDPrompt(text),
      toolName: 'parse_jd',
      toolDescription: '将招聘 JD 文本解析为结构化 JSON 数据',
      schema: PARSED_JD_SCHEMA,
      skipLimiter,
    });
    return this.normalizeJD(raw);
  }

  // schema 内层 required 放宽后兜底:缺字段给安全默认(name 缺 → ''、各数组缺 → []),
  // 绝不编造姓名/公司/技能等业务内容。下游 renderResumeForReview 强类型访问,故须保证形状完整。
  private normalizeResume(raw: RawParsedResume): ParsedResume {
    const b = raw.basic_info ?? {};
    const s = raw.skills ?? {};
    return {
      basic_info: {
        name: str(b.name),
        phone: str(b.phone) || undefined,
        email: str(b.email) || undefined,
        location: str(b.location) || undefined,
        linkedin: str(b.linkedin) || undefined,
      },
      summary: str(raw.summary) || undefined,
      work_experience: (Array.isArray(raw.work_experience) ? raw.work_experience : []).map((w) => ({
        company: str(w.company),
        title: str(w.title),
        start_date: str(w.start_date),
        end_date: str(w.end_date) || undefined,
        description: str(w.description),
        achievements: strArray(w.achievements),
      })),
      education: (Array.isArray(raw.education) ? raw.education : []).map((e) => ({
        school: str(e.school),
        degree: str(e.degree),
        major: str(e.major),
        graduation_date: str(e.graduation_date) || undefined,
        gpa: str(e.gpa) || undefined,
      })),
      skills: {
        technical: strArray(s.technical),
        soft: strArray(s.soft),
        languages: strArray(s.languages),
        certifications: strArray(s.certifications),
      },
      projects: (Array.isArray(raw.projects) ? raw.projects : []).map((p) => ({
        name: str(p.name),
        description: str(p.description),
        technologies: strArray(p.technologies),
        role: str(p.role) || undefined,
      })),
      links: strArray(raw.links),
      awards_honors: strArray(raw.awards_honors),
    };
  }

  // schema 内层 required 放宽后兜底:job_title 缺 → ''、各数组缺 → []。
  // required_skills 条目缺 skill 则丢弃(无技能名无意义);level 缺/越枚举 → 'required'(最保守,纳入硬性匹配)。
  private normalizeJD(raw: RawParsedJD): ParsedJD {
    const q = raw.qualifications ?? {};
    return {
      job_title: str(raw.job_title),
      company: str(raw.company) || undefined,
      department: str(raw.department) || undefined,
      required_skills: (Array.isArray(raw.required_skills) ? raw.required_skills : [])
        .filter((rs) => typeof rs.skill === 'string' && rs.skill.length > 0)
        .map((rs) => ({
          skill: rs.skill as string,
          level: rs.level && JD_LEVELS.has(rs.level) ? rs.level : 'required',
          years: str(rs.years) || undefined,
        })),
      responsibilities: strArray(raw.responsibilities),
      qualifications: {
        education: str(q.education) || undefined,
        experience_years: str(q.experience_years) || undefined,
        must_have: strArray(q.must_have),
        nice_to_have: strArray(q.nice_to_have),
      },
      keywords: strArray(raw.keywords),
    };
  }
}
