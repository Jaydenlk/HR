export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  locale: string;
}

// ─── Auth (两步式登录:邮箱验证码 + 邀请制) ──────────────────────────────
// 与认证 API 契约一致:
// POST /api/auth/request-code  body {email}
//   → { registered, dev_code? }  registered 表示该邮箱是否已注册;
//     dev_code 仅在 SMTP 未配置且非 production 时返回(开发态自动填充)。
export interface RequestCodeResponse {
  registered: boolean;
  dev_code?: string;
}

// POST /api/auth/login  body {email, code, invite_code?, name?}
//   → { access_token, user }  老用户(registered)只需 email+code;
//     新用户(registered=false)必须带 invite_code + name。
export interface LoginResponse {
  access_token: string;
  user: User;
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
  // 后端 entity nullable: true,旧数据可能为 null,消费处须 ?? [] 兜底。
  suggestions: RewriteSuggestion[] | null;
  created_at: string;
  resume?: Resume;
}

// JD 匹配诊断:dimensions 为 MatchDimensions,带命中/缺失关键词。
interface JdMatchDiagnosis extends DiagnosisBase {
  mode?: 'jd_match';
  dimensions?: MatchDimensions;
  // 后端 entity nullable: true,旧数据可能为 null,消费处须 ?? [] 兜底。
  keywords_hit: string[] | null;
  keywords_miss: string[] | null;
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

export type CoverLetterTone = 'professional' | 'warm' | 'direct';

export interface CoverLetter {
  id: string;
  company: string | null;
  role: string | null;
  tone: CoverLetterTone;
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
  alumni_count: number | null;
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

// ── Offer Comparator ───────────────────────────────────────────────────────────

export interface OfferItem {
  id: string;
  company: string;
  base_monthly: number;
  months_per_year?: number;
  annual_bonus?: number;
  city?: string;
  level?: string;
  weekly_hours?: number;
  probation_discount?: number;
  probation_months?: number;
  social_insurance_monthly?: number;
  equity_annual?: number;
  equity_type?: string;
  notes?: string;
}

export interface OfferCompareRequest {
  offers: OfferItem[];
  weights?: {
    compensation?: number;
    growth?: number;
    stability?: number;
    work_life_balance?: number;
  };
  user_priorities?: string[];
}

export interface OfferCompareDimensions {
  annual_total_compensation?: number;
  effective_monthly?: number;
  social_insurance_annual?: number;
  probation_loss?: number;
  stability_score?: number;
  growth_potential?: string;
}

export interface OfferCompareEntry {
  offer_id: string;
  company: string;
  dimensions: OfferCompareDimensions;
}

export interface OfferWeightedScore {
  offer_id: string;
  company: string;
  total_score?: number;
  dimension_scores?: Record<string, number>;
}

export interface OfferHourlyRate {
  offer_id: string;
  company: string;
  weekly_hours?: number;
  hourly_rate_rmb: number | null;
}

export interface OfferMissingInfo {
  offer_id: string;
  field: string;
  impact: string;
}

export interface OfferCompareResult {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  evidence_used: unknown[];
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  comparison: OfferCompareEntry[];
  weighted_scores: OfferWeightedScore[];
  recommendation: {
    preferred_offer_id: string;
    rationale: string;
    confidence: 'high' | 'medium' | 'low' | 'uncertain';
    caveats?: string[];
  };
  hourly_rate_comparison: OfferHourlyRate[];
  missing_info: OfferMissingInfo[];
}

// ─── Networking types ─────────────────────────────────────────────────────────

export type NetworkingConfidence = 'high' | 'medium' | 'low' | 'insufficient';

export interface NetworkingFollowUpTiming {
  best_send_time: string;
  follow_up_after_days: number;
  follow_up_note?: string;
}

export interface NetworkingMessageResult {
  confidence: NetworkingConfidence;
  summary: string;
  message_draft: string | null;
  tone: 'formal' | 'semi_formal' | 'casual';
  key_points: string[];
  what_not_to_say: string[];
  recommendations: string[];
  risks: string[];
  follow_up_timing: NetworkingFollowUpTiming | null;
  cannot_determine: string[];
}

export interface ReferralPath {
  target_company: string;
  contact_description: string;
  path_type: 'direct' | 'indirect' | 'cold_contact';
  estimated_success_rate: string;
  priority: number;
  relationship_strength?: 'strong' | 'moderate' | 'weak';
  suggested_action: string;
}

export interface ColdOutreachTarget {
  target_company: string;
  target_profile_type: string;
  platform: string;
  approach: string;
}

export interface NetworkGap {
  target_company: string;
  gap_description: string;
  fill_strategy: string[];
}

export interface ReferralStrategyResult {
  confidence: NetworkingConfidence;
  summary: string;
  referral_paths: ReferralPath[];
  cold_outreach_targets: ColdOutreachTarget[];
  network_gaps: NetworkGap[];
  recommendations: string[];
  risks: string[];
  cannot_determine: string[];
}

// ─── Salary AI Analysis ───────────────────────────────────────────────────────

export interface SalaryRangeResult {
  p25: number;
  p50: number;
  p75: number;
  unit: 'monthly_rmb' | 'annual_rmb';
  year: string;
  city: string;
  role: string;
  grade: 'A' | 'B' | 'C' | 'D';
  freshness: 'fresh' | 'stale' | 'unknown';
}

export interface SalaryBreakdown {
  base_monthly?: number;
  months_per_year?: number;
  annual_bonus?: string;
  equity?: string;
  social_insurance?: string;
}

export interface SalaryDataSource {
  source_name: string;
  url?: string;
  date?: string;
  grade: 'A' | 'B' | 'C' | 'D';
}

export interface SalaryComparison {
  dimension: string;
  value: string;
  grade: 'A' | 'B' | 'C' | 'D';
}

export interface SalaryAnalysisResult {
  summary: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  salary_range: SalaryRangeResult | null;
  breakdown: SalaryBreakdown | null;
  data_sources: SalaryDataSource[];
  comparison: SalaryComparison[];
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  data_freshness: 'fresh' | 'stale' | 'unavailable';
}

// ─── Interview Prep (4合1) ──────────────────────────────────────────────────────

export type InterviewPrepConfidence = 'high' | 'medium' | 'low' | 'insufficient';

interface InterviewPrepEnvelope {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: InterviewPrepConfidence;
  evidence_used: Array<{ field: string; value: string; relevance?: string }>;
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
}

export interface CompanyPlaybookRequest {
  company_name: string;
  job_title?: string;
  interview_intelligence?: Record<string, unknown>;
}

export interface CompanyPlaybookResult extends InterviewPrepEnvelope {
  company_profile: {
    company_name: string;
    stage: string;
    culture_keywords: string[];
    hiring_volume?: string;
    reputation_summary: string;
    common_pain_points?: string[];
  };
  interview_process: Array<{
    stage: string;
    description: string;
    key_assessment_angle: string;
    format?: string;
    typical_duration?: string;
    pass_rate_estimate?: string;
  }>;
  culture_fit_tips: Array<{ tip: string; example_answer_pattern?: string; anti_pattern: string }>;
  common_pitfalls: Array<{ pitfall: string; consequence: string; avoidance_strategy: string }>;
  salary_negotiation_notes: {
    salary_range_estimate: string | null;
    negotiation_timing?: string;
    leverage_points?: string[];
    taboos?: string[];
  };
}

export type StarCompetency =
  | '问题解决'
  | '领导力'
  | '协作影响'
  | '主动创新'
  | '逆境应对'
  | '数据驱动'
  | '客户中心'
  | '自我学习';

export interface StarStoriesRequest {
  experiences: string[];
  target_competencies?: StarCompetency[];
  target_job_type?: 'tech' | 'product' | 'ops' | 'sales' | 'general';
}

export interface StarStory {
  title: string;
  competency: string[];
  situation: string;
  task: string;
  action: string;
  result: string;
  polish_level: 'ready' | 'needs_polish' | 'skeleton';
  applicable_questions?: string[];
  time_estimate?: number;
}

export interface StarStoriesResult extends InterviewPrepEnvelope {
  story_bank: StarStory[];
  coverage_map: {
    by_dimension?: Record<string, number>;
    strong_dimensions: string[];
    weak_dimensions: string[];
    missing_dimensions: string[];
  };
  gaps: Array<{ dimension: string; severity: 'critical' | 'moderate' | 'minor'; experience_hint?: string }>;
}

export interface TechCoachRequest {
  job_title: string;
  company_name?: string;
  interview_intelligence?: Record<string, unknown>;
  available_weeks?: number;
}

export interface TechCoachResult extends InterviewPrepEnvelope {
  preparation_plan: Array<{
    priority: 'critical' | 'high' | 'medium';
    area: string;
    estimated_hours: number;
    target_week?: number;
    resources_hint?: string;
  }>;
  practice_questions: Array<{
    title: string;
    type: 'algorithm' | 'system_design' | 'coding' | 'cs_fundamentals';
    difficulty: 'easy' | 'medium' | 'hard';
    target_company_relevance?: 'high' | 'medium' | 'low';
    key_concepts: string[];
  }>;
  common_patterns: Array<{ pattern_name: string; applicable_types: string[]; description: string }>;
  company_specific_focus: Array<{ focus_area: string; rationale: string; evidence_source: string }>;
}

export type CaseInterviewType =
  | 'product_design'
  | 'market_estimation'
  | 'case_consulting'
  | 'group_discussion'
  | 'business_analysis';

export interface CaseCoachRequest {
  interview_type: CaseInterviewType;
  target_company?: string;
  experience_level?: 'fresh_grad' | '1-3yr' | '3-5yr' | '5yr_plus';
  focus_area?: string;
}

export interface CaseCoachResult extends InterviewPrepEnvelope {
  framework_library: Array<{
    name: string;
    applicable_to: string[];
    structure: string;
    example_usage?: string;
    common_mistake?: string;
  }>;
  practice_cases: Array<{
    title: string;
    type: string;
    question: string;
    suggested_approach: string[];
    key_considerations?: string[];
    evaluation_criteria: string[];
    time_limit?: number;
  }>;
  common_mistakes: Array<{ mistake: string; why_bad: string; fix: string }>;
  evaluation_criteria: Array<{
    dimension: string;
    weight: 'primary' | 'secondary' | 'minor';
    good_example?: string;
    bad_example?: string;
  }>;
}

// ─── Learning Roadmap ──────────────────────────────────────────────────────────

export interface RoadmapPhase {
  phase_name: string;
  goal: string;
  estimated_weeks: number;
  activities?: string[];
  completion_criteria: string;
  output_artifact?: string;
}

export interface RoadmapItem {
  skill_name: string;
  priority?: number;
  total_weeks?: number;
  phases: RoadmapPhase[];
}

export interface RoadmapResource {
  skill_name: string;
  resource_type: 'official_docs' | 'chinese_community' | 'book' | 'video' | 'open_source' | 'practice_platform';
  description: string;
  quality_criteria: string;
  language?: 'zh' | 'en' | 'both';
  for_level?: 'beginner' | 'intermediate' | 'advanced';
}

export interface BuildRoadmapRequest {
  skill_gaps: string[];
  profile?: string;
  weekly_hours?: number;
  preferred_language?: string;
}

export interface BuildRoadmapResult {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  evidence_used: { field: string; value: string; relevance: string }[];
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  total_estimated_weeks?: number;
  roadmap: RoadmapItem[];
  resource_list: RoadmapResource[];
  backlog?: string[];
}

// ─── Question Bank ────────────────────────────────────────────────────────────

export type QuestionCategory =
  | 'behavioral'
  | 'technical_cs'
  | 'technical_domain'
  | 'case_product'
  | 'case_business'
  | 'motivation'
  | 'cultural_fit'
  | 'system_design';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionFrequency = 'very_high' | 'high' | 'medium' | 'low';

export interface QuestionItem {
  id: string;
  question: string;
  category: QuestionCategory;
  subcategory?: string;
  difficulty: QuestionDifficulty;
  frequency: QuestionFrequency;
  source: string;
  answer_hint?: string;
  time_estimate?: number;
}

// ─── Follow-up message types ──────────────────────────────────────────────────

export type FollowUpScenario =
  | 'thank_you'
  | 'status_inquiry'
  | 'rejection_reply'
  | 'offer_urge'
  | 'acceptance';

export type FollowUpConfidence = 'high' | 'medium' | 'low' | 'insufficient';

export interface FollowUpTimingAdvice {
  recommended_send_time: string;
  is_timing_appropriate: boolean;
  timing_note: string;
}

export interface FollowUpToneGuide {
  tone: 'formal' | 'semi_formal' | 'casual' | 'grateful' | 'professional';
  key_tone_points: string[];
  avoid: string[];
}

export interface FollowUpResult {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: FollowUpConfidence;
  evidence_used: Array<{ source: string; content: string }>;
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  message_draft: string;
  timing_advice: FollowUpTimingAdvice;
  tone_guide: FollowUpToneGuide;
}

// ── Industry Trend ─────────────────────────────────────────────────────────────

export type IndustryTrendConfidence = 'high' | 'medium' | 'low' | 'insufficient';
export type IndustryHiringOutlook = 'strong' | 'growing' | 'stable' | 'declining' | 'contracting' | 'unknown';
export type SignalStrength = 'strong' | 'moderate' | 'weak';
export type SignalSeverity = 'high' | 'medium' | 'low';
export type DemandLevel = 'high' | 'medium' | 'low' | 'unknown';

export interface IndustryGrowthSignal {
  signal: string;
  // 后端 OUTPUT_SCHEMA 未将这些枚举列入 required,AI 可能漏返 → 标为可选,前端必须对 undefined 兜底文案。
  strength?: SignalStrength;
  source: string;
  date: string;
}

export interface IndustryRiskSignal {
  signal: string;
  severity?: SignalSeverity;
  source: string;
  date: string;
}

export interface IndustryEntryRole {
  role_name: string;
  rationale: string;
  demand_level?: DemandLevel;
}

export interface IndustryTrendResult {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: IndustryTrendConfidence;
  evidence_used: Array<{ source: string; url?: string; date?: string }>;
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  trend_summary: string;
  growth_signals: IndustryGrowthSignal[];
  risk_signals: IndustryRiskSignal[];
  hiring_outlook: IndustryHiringOutlook;
  recommended_entry_roles: IndustryEntryRole[];
  market_radar_used: boolean;
}

// ─── Application Strategy ─────────────────────────────────────────────────────

export interface ApplicationStrategyRequest {
  user_profile: string;
  application_timeline?: string;
  current_applications?: string[];
}

export interface ApplicationCompanyTier {
  tier: 'stretch' | 'target' | 'safety';
  description: string;
  rationale: string;
  example_types: string[];
  priority?: number;
}

export interface ApplicationSequenceWeek {
  week: string;
  focus: string;
  target_count: number;
  channels: string[];
}

export interface ApplicationDailyAction {
  action: string;
  time_estimate: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ApplicationRiskAssessment {
  main_risks: string[];
  mitigation: string[];
}

export interface ApplicationStrategyResult {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  evidence_used: Array<{ source: string; content: string }>;
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  target_company_tiers: ApplicationCompanyTier[];
  application_sequence: ApplicationSequenceWeek[];
  daily_action_plan: ApplicationDailyAction[];
  risk_assessment: ApplicationRiskAssessment;
}

// ─── City × Industry Fit ─────────────────────────────────────────────────────

export interface FitBreakdown {
  skill_match: number;
  career_ceiling: number;
  cost_sustainability: number;
  constraint_satisfaction: number;
}

export interface FitMatrixItem {
  city: string;
  industry: string;
  fit_score: number;
  fit_breakdown: FitBreakdown;
  evidence_basis: string[];
}

export interface CostOfLivingItem {
  city: string;
  typical_salary_range: string;
  housing_cost_note: string;
  purchasing_power_note: string;
}

export interface IndustryHubItem {
  city: string;
  key_companies: string[];
  cluster_effect: string;
  career_ceiling: string;
}

export interface CityIndustryFitResult {
  summary: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  evidence_used: Array<{ field: string; value: string; relevance: string }>;
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  fit_matrix: FitMatrixItem[];
  cost_of_living_impact: CostOfLivingItem[];
  industry_hub_analysis: IndustryHubItem[];
  recommendation: string;
}
