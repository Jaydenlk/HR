export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  locale: string;
}

export interface Resume {
  id: string;
  title: string;
  raw_text: string;
  parsed_json: ParsedResume | null;
  file_url: string | null;
  file_type: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  diagnoses?: Diagnosis[];
  versions?: ResumeVersion[];
}

export interface ResumeVersion {
  id: string;
  version_num: number;
  raw_text: string;
  change_note: string | null;
  created_at: string;
}

export interface Diagnosis {
  id: string;
  resume_id: string;
  jd_text: string;
  jd_company: string | null;
  jd_role: string | null;
  score: number;
  dimensions: MatchDimensions;
  keywords_hit: string[];
  keywords_miss: string[];
  suggestions: RewriteSuggestion[];
  created_at: string;
  resume?: Resume;
}

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
  skills: {
    score: number;
    max: number;
    matched: string[];
    missing: string[];
    partial: string[];
  };
  experience: { score: number; max: number; analysis: string };
  education: { score: number; max: number; analysis: string };
  keywords: {
    score: number;
    max: number;
    coverage_rate: number;
    missing_keywords: string[];
  };
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

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  rich_card: Record<string, unknown> | null;
  tool_used: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  context_type: string;
  context_id: string | null;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
}

export interface Application {
  id: string;
  company: string;
  role: string;
  location: string | null;
  stage: 'wishlist' | 'applied' | 'interview' | 'final' | 'offer' | 'rejected';
  salary_range: string | null;
  deadline: string | null;
  referrer: string | null;
  notes: string | null;
  resume_id: string | null;
  diagnosis_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationEvent {
  id: string;
  application_id: string;
  type: string;
  note: string | null;
  occurred_at: string;
  created_at: string;
}

export interface InterviewScore {
  name: string;
  score: number;
  color: string;
}

export interface InterviewQuestion {
  n: number;
  time: string;
  type: string;
  topic: string;
  diff: string;
  tone: 'good' | 'warn' | 'bad';
  q: string;
  you: string;
  ai: string;
  better: string | null;
  gap: { topic: string; url: string } | null;
}

export interface InterviewPrediction {
  nextRound: string;
  nextWhen: string;
  likely: Array<{ topic: string; pct: number }>;
}

export interface Interview {
  id: string;
  application_id: string | null;
  company: string | null;
  role: string | null;
  round: string;
  interview_at: string | null;
  duration_min: number | null;
  interviewer: string | null;
  audio_url: string | null;
  transcript: string | null;
  overall_grade: string | null;
  overall_note: string | null;
  scores: InterviewScore[] | null;
  questions: InterviewQuestion[] | null;
  prediction: InterviewPrediction | null;
  created_at: string;
}
