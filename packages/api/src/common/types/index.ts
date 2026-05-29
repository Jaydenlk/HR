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
  type: 'rewrite' | 'add_keywords' | 'restructure' | 'quantify';
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
  whatGoodLooksLike: string;
  campusEvidence: string;
  commonGaps: string;
}
export interface ProfessionPreset {
  id: string;
  profession: string;
  stage: 'campus';
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
export interface ProfessionStandardResult {
  total_score: number;
  dimensions: ProfessionStandardDimension[];
  conventionChecks: ConventionCheck[];
}
