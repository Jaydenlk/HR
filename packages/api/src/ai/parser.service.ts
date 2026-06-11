import { Injectable } from '@nestjs/common';
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

@Injectable()
export class ParserService {
  constructor(private readonly ai: AiService) {}

  async parseResume(text: string): Promise<ParsedResume> {
    const raw = await this.ai.completeStructured<RawParsedResume>({
      system: RESUME_SYSTEM,
      prompt: buildParseResumePrompt(text),
      toolName: 'parse_resume',
      toolDescription: '将简历文本解析为结构化 JSON 数据',
      schema: PARSED_RESUME_SCHEMA,
    });
    return this.normalizeResume(raw);
  }

  async parseJD(text: string): Promise<ParsedJD> {
    const raw = await this.ai.completeStructured<RawParsedJD>({
      system: JD_SYSTEM,
      prompt: buildParseJDPrompt(text),
      toolName: 'parse_jd',
      toolDescription: '将招聘 JD 文本解析为结构化 JSON 数据',
      schema: PARSED_JD_SCHEMA,
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
