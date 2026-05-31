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

export type DiagnosisMode = 'jd_match' | 'profession_standard';

// 难度档:standard=校招友好融合版;pressure=高标准压力版。与后端 ProfessionTier 一致。
export type ProfessionTier = 'standard' | 'pressure';

// 校招职业清单项:与后端 ProfessionPresetsService.list() 的 ProfessionOption 一致。
export interface ProfessionOption {
  profession: string;
  tiers: Array<{ tier: ProfessionTier; presetId: string; displayName: string }>;
}

// 职业按大类分组(后端 /diagnoses/campus/professions 返回),供前端下拉 optgroup 渲染。
export interface ProfessionGroup {
  category: string;
  options: ProfessionOption[];
}

interface DiagnosisBase {
  id: string;
  resume_id: string;
  jd_text: string | null;
  jd_company: string | null;
  jd_role: string | null;
  score: number;
  suggestions: RewriteSuggestion[];
  created_at: string;
  resume?: Resume;
}

// JD 匹配诊断:dimensions 为 MatchDimensions,带命中/缺失关键词。
interface JdMatchDiagnosis extends DiagnosisBase {
  mode?: 'jd_match';
  dimensions?: MatchDimensions;
  keywords_hit: string[];
  keywords_miss: string[];
}

// 校招职业标尺诊断:dimensions 为 ProfessionStandardResult,带目标职业与难度档。
export interface ProfessionStandardDiagnosis extends DiagnosisBase {
  mode: 'profession_standard';
  dimensions: ProfessionStandardResult;
  profession: string;
  tier?: ProfessionTier;
}

// mode 为判别字段:渲染时按 diagnosis.mode 收窄 dimensions,无需类型断言。
export type Diagnosis = JdMatchDiagnosis | ProfessionStandardDiagnosis;

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
  type: 'rewrite' | 'add_keywords' | 'restructure' | 'quantify' | 'gap_advice';
  priority: 'high' | 'medium' | 'low';
  original: string;
  suggested: string;
  reason: string;
  jd_requirement?: string;
}

// ===== 职业预设引擎(校招职业标尺诊断)=====
// 与后端 packages/api/src/common/types/index.ts 保持一致
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
  interviewHooks?: InterviewHook[]; // 旧诊断无此字段,故可选
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

export interface MockQuestion {
  n: number;
  type: string;
  topic: string;
  difficulty: string;
  question: string;
  hint: string;
}

export interface MockAnswer {
  n: number;
  answer: string;
  score: number;
  feedback: string;
  filler_count: number;
}

export interface MockEvaluation {
  overall_score: number;
  overall_grade: string;
  strengths: string[];
  weaknesses: string[];
  summary: string;
}

export interface MockSession {
  id: string;
  company: string | null;
  role: string | null;
  jd_text: string | null;
  mode: string;
  status: string;
  questions: MockQuestion[] | null;
  answers: MockAnswer[] | null;
  evaluation: MockEvaluation | null;
  total_filler_count: number | null;
  created_at: string;
}

export interface DailyTask {
  id: string;
  task_date: string;
  title: string;
  duration_min: number | null;
  task_type: string;
  reason: string | null;
  status: 'todo' | 'done';
  linked_type: string | null;
  linked_id: string | null;
  created_at: string;
}

export type FeedSourceKind =
  | 'xhs'
  | 'nowcoder'
  | 'wechat'
  | 'blog'
  | 'ugc'
  | 'coach';

export type FeedCategory =
  | 'interview_exp'
  | 'market_insight'
  | 'job_tips'
  | 'hiring_signal'
  | 'editorial';

export type FeedSourceStatus = 'active' | 'paused' | 'needs_config';

export type DigestRunStatus = 'running' | 'success' | 'partial' | 'failed';

export interface FeedSource {
  id: string;
  kind: FeedSourceKind;
  name: string;
  homepage_url: string | null;
  status: FeedSourceStatus;
  description: string | null;
  last_run_at: string | null;
}

export interface DigestRun {
  id: string;
  source_id: string | null;
  status: DigestRunStatus;
  fetched_count: number;
  saved_count: number;
  skipped_count: number;
  error_message: string | null;
  created_at: string;
  source?: FeedSource | null;
}

export type DateConfidence = 'high' | 'medium' | 'low' | 'unknown';

export interface FeedItem {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  company: string | null;
  role: string | null;
  outcome: string | null;
  source_kind: FeedSourceKind;
  source_name: string | null;
  category: FeedCategory;
  source_url: string | null;
  author: string | null;
  quality_score: number;
  published_at: string | null;
  fetched_at: string | null;
  created_at: string;
  date_confidence: DateConfidence;
  user?: User | null;
}

export interface RadarResult {
  items: FeedItem[];
  total: number;
  company_stats: Array<{ company: string; count: number }>;
  role_stats: Array<{ role_category: string; count: number }>;
}

// Radar workspace types
export interface CompanyRadarItem {
  company: string;
  company_id: string | null;
  company_type: string | null;
  priority: string | null;
  sector: string | null;
  total_count: number;
  usable_count: number;
  low_confidence_count: number;
  candidate_count: number;
  rejected_count: number;
  xhs_count: number;
  nowcoder_count: number;
  wechat_count: number;
  top_roles: string[];
  high_confidence_count: number;
  quality_score_avg: number;
  latest_collected_at: string | null;
  dominant_signal: string | null;
}

export interface CompanyRadarResponse {
  companies: CompanyRadarItem[];
  total_companies: number;
  generated_at: string;
}

export interface RoleRadarItem {
  role_category: string;
  label: string;
  total_count: number;
  usable_count: number;
  candidate_count: number;
  rejected_count: number;
  xhs_count: number;
  nowcoder_count: number;
  wechat_count: number;
  top_companies: string[];
  companies_covered: number;
  common_question_keywords: string[];
  representative_posts: Array<{
    title: string;
    company: string | null;
    source_url: string;
    source_kind: string;
  }>;
}

export interface RoleRadarResponse {
  roles: RoleRadarItem[];
  total_roles: number;
  generated_at: string;
}

export interface TrendRadarResponse {
  period: {
    current_start: string;
    current_end: string;
    previous_start: string;
    previous_end: string;
  };
  this_week: {
    new_items: number;
    new_companies: string[];
    new_role_categories: string[];
    top_sources: Array<{ source_kind: string; count: number }>;
  };
  comparison: {
    has_baseline: boolean;
    item_count_delta: number;
    item_count_previous: number;
    message: string;
  };
  hot_posts: Array<{
    title: string;
    company: string | null;
    role_category: string | null;
    source_kind: string;
    source_url: string;
    created_at: string;
    published_at: string | null;
    date_confidence: DateConfidence;
  }>;
}

export interface CoverLetter {
  id: string;
  company: string | null;
  role: string | null;
  tone: string;
  length_words: number | null;
  content: string;
  version: number;
  created_at: string;
}

export interface SalaryEntry {
  id: string;
  company: string;
  role: string;
  location: string | null;
  base_salary: number;
  bonus: number | null;
  stock_value: number | null;
  total_comp: number;
  level: string | null;
  source: string;
  created_at: string;
}

export interface CareerPath {
  title: string;
  fit_pct: number;
  description: string;
  skills: string[];
  alumni_count: number;
}

export interface CareerAnalysis {
  paths: CareerPath[];
  skill_audit: Array<{ name: string; current: number; needed: number; ok: boolean }>;
}

export interface DashboardData {
  funnel: Record<string, number>;
  interviews: {
    total: number;
    avgGrade: string | null;
    recentGrades: Array<{ company: string; grade: string; date: string }>;
  };
  resumes: {
    total: number;
    primaryTitle: string | null;
    latestDiagnosisScore: number | null;
  };
  activity: {
    totalDiagnoses: number;
    totalConversations: number;
  };
}

// Opportunity Intelligence
export type OpportunityStatus = 'draft' | 'evaluating' | 'evaluated' | 'failed' | 'tracked' | 'dismissed';
export type Recommendation = 'strongly_recommend' | 'recommend' | 'neutral' | 'cautious' | 'not_recommend';
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient';
export type EvidenceKind = 'resume_match' | 'salary_data' | 'feed_item' | 'diagnosis_history' | 'market_signal' | 'jd_analysis';
export type ActionType = 'optimize_resume' | 'write_cover_letter' | 'prepare_interview' | 'research_company' | 'apply' | 'dismiss';
export type ActionStatus = 'pending' | 'in_progress' | 'done' | 'skipped';

export interface Opportunity {
  id: string;
  company: string | null;
  role: string | null;
  location: string | null;
  employment_type: string | null;
  source_platform: string | null;
  source_url: string | null;
  jd_text: string;
  jd_snapshot: Record<string, unknown> | null;
  status: OpportunityStatus;
  application_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  evaluations?: OpportunityEvaluation[];
  evidences?: OpportunityEvidence[];
  actions?: OpportunityAction[];
}

export interface OpportunityEvaluation {
  id: string;
  opportunity_id: string;
  match_score: number;
  value_score: number;
  credibility_score: number;
  overall_score: number;
  recommendation: Recommendation;
  confidence: ConfidenceLevel;
  risk_flags: Array<{ type: string; severity: string; evidence: string; confidence: string }>;
  strengths: Array<{ dimension: string; description: string; evidence_ref: string }>;
  gaps: Array<{ dimension: string; description: string; severity: string; suggestion: string }>;
  next_actions: Array<{ action_type: string; title: string; reason: string; priority: string }>;
  created_at: string;
}

export interface OpportunityEvidence {
  id: string;
  opportunity_id: string;
  kind: EvidenceKind;
  source_platform: string | null;
  source_url: string | null;
  title: string;
  excerpt: string;
  company: string | null;
  role: string | null;
  published_at: string | null;
  fetched_at: string | null;
  confidence: ConfidenceLevel;
  created_at: string;
}

export interface OpportunityAction {
  id: string;
  opportunity_id: string;
  action_type: ActionType;
  title: string;
  reason: string;
  due_date: string | null;
  linked_task_id: string | null;
  status: ActionStatus;
  created_at: string;
}

// Monthly Newspaper
export interface HeadlineObservation {
  observation: string;
  evidence_items: FeedItem[];
}

export interface InsightCard {
  title: string;
  source_name: string;
  source_url: string;
  why_read: string;
  career_implication: string;
  impact_tags: string[];
  summary: string;
}

export interface RoleTrend {
  role_category: string;
  label: string;
  hot_topics: string[];
  item_count: number;
}

export interface CoachAction {
  action: string;
  reason: string;
  data_source: string;
}

export interface NewspaperEdition {
  headline_observations: HeadlineObservation[];
  insight_cards: InsightCard[];
  user_voice: FeedItem[];
  tech_radar: FeedItem[];
  role_trends: RoleTrend[];
  coach_actions: CoachAction[];
  trending_tags: string[];
  total_count: number;
  categories: Record<string, number>;
}
