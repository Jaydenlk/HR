export interface ParsedResume {
  basic_info: {
    name: string;
    phone?: string;
    email?: string;
    location?: string;
    linkedin?: string;
  };
  summary?: string;
  work_experience: Array<{
    company: string;
    title: string;
    start_date: string;
    end_date?: string;
    description: string;
    achievements: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    major: string;
    graduation_date?: string;
    gpa?: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
    certifications: string[];
  };
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    role?: string;
  }>;
  links?: string[];
  awards_honors?: string[]; // 竞赛/获奖/荣誉/奖学金等强信号,独立成段避免被漏读
}

export interface ParsedJD {
  job_title: string;
  company?: string;
  department?: string;
  required_skills: Array<{
    skill: string;
    level: 'required' | 'preferred' | 'nice_to_have';
    years?: string;
  }>;
  responsibilities: string[];
  qualifications: {
    education?: string;
    experience_years?: string;
    must_have: string[];
    nice_to_have: string[];
  };
  keywords: string[];
}

export interface MatchDimensions {
  skills: { score: number; max: number; matched: string[]; missing: string[]; partial: string[] };
  experience: { score: number; max: number; analysis: string };
  education: { score: number; max: number; analysis: string };
  keywords: { score: number; max: number; coverage_rate: number; missing_keywords: string[] };
  overall: { score: number; max: number; analysis: string };
}

export interface RewriteSuggestion {
  section: string;
  item_index?: number;
  type: 'rewrite' | 'add_keywords' | 'restructure' | 'quantify' | 'gap_advice';
  priority: 'high' | 'medium' | 'low';
  original: string;
  suggested: string;
  reason: string;
  jd_requirement?: string;
}

// ===== 职业预设引擎(校招简历诊断) =====
export interface ProfessionPresetDimension {
  key: string;
  name: string;
  weight: number;            // 满分占比,整数,所有维度之和 = 100
  whatGoodLooksLike: string; // 应届水平"好"的样子
  campusEvidence: string;    // 该维度在应届简历靠什么体现:实习/项目/竞赛/课程
  commonGaps: string;        // 应届常见缺失
}
export const PROFESSION_TIERS = ['standard', 'pressure'] as const; // standard=校招友好融合版;pressure=高标准压力版
export type ProfessionTier = (typeof PROFESSION_TIERS)[number];
export interface ProfessionPreset {
  id: string;
  profession: string;
  stage: 'campus';           // 校招;留字段为社招/转行铺路
  tier: ProfessionTier;      // 难度档:同一职业可有 standard/pressure 两套标尺
  displayName: string;
  dimensions: ProfessionPresetDimension[];
  explanationRubric: string;
  rewriteGuidance: string;
  resumeConventions: string;
}
export interface ProfessionStandardDimension {
  key: string;
  name: string;
  score: number;
  max: number;
  why: string;
  evidenceFound: string[];
  gap: string;
}
export interface ConventionCheck {
  key: string;
  status: 'ok' | 'warn' | 'missing';
  note: string;
}
export interface InterviewHook {
  resumeHit: string; // 简历中的具体命中点/原句
  interviewQuestion: string; // 面试官很可能据此追问的问题
  prepDirection: string; // 诚实的准备方向,不教编造
}
export interface ProfessionStandardResult {
  total_score: number;
  dimensions: ProfessionStandardDimension[];
  conventionChecks: ConventionCheck[];
  interviewHooks?: InterviewHook[]; // 旧诊断无此字段,故可选;新诊断由 schema 强制生成
}
