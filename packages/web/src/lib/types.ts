export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  locale: string;
  // /api/auth/me 一直返回完整实体,role/status 始终存在;此前类型未声明,补齐(向后兼容只增不改)。
  role: 'user' | 'admin';
  status: 'active' | 'banned';
}

// ─── Auth (两步式登录:邮箱验证码 + 邀请制) ──────────────────────────────
// 与认证 API 契约一致:
// POST /api/auth/request-code  body {email, terms_agreed}
//   → { registered, dev_code? }  registered 表示该邮箱是否已注册;
//     dev_code 仅在 SMTP 未配置且非 production 时返回(开发态自动填充)。
// terms_agreed 必填:不为 true 时后端返回 400 且不发送邮件(用户条款门)。
export interface RequestCodeRequest {
  email: string;
  terms_agreed: boolean;
}

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

// ─── 诊断流式事件(SSE) ─────────────────────────────────────────────────────
// 与后端固定契约逐字一致:POST /diagnoses/campus/stream 与 POST /diagnoses/stream。
// 每帧 data:{json}\n\n,json 为下列之一。关键不变量:analysis 事件发出前诊断行已落库
// (suggestions 暂空),故 diagnosisId 一到即可在断流时跳到已存结果。
// stage 取值与后端三步串行 AI 对应:parsing/analyzing/suggesting。
export type DiagnosisStreamStage = 'parsing' | 'analyzing' | 'suggesting';

// analysis 事件的 payload(与后端逐字一致):校招模式为 ProfessionStandardResult
// (带 total_score + dimensions[] + conventionChecks[] + interviewHooks[]);
// JD 匹配模式为 MatchDimensions(无顶层 total_score,总分体现在 overall.score)。
// 两形态结构不同,消费方按页面已知 mode 各自取数,不做跨形态强转。
export type DiagnosisAnalysisPayload = ProfessionStandardResult | MatchDimensions;

export type DiagnosisStreamEvent =
  | { type: 'queue'; position: number }
  | { type: 'step'; stage: DiagnosisStreamStage; label: string }
  | { type: 'analysis'; diagnosisId: string; payload: DiagnosisAnalysisPayload }
  | { type: 'done'; diagnosisId: string; diagnosis: Diagnosis }
  | { type: 'error'; message: string };

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
  from_stage: string | null;
  to_stage: string;
  note: string | null;
  created_at: string;
}

// 后端 interview.entity.ts 的 ScoreItem/QuestionItem/InterviewPrediction 权威形状。
export interface InterviewScore {
  name: string;
  score: number;
}

export interface InterviewQuestion {
  question: string;
  tone: 'good' | 'warn' | 'bad';
  coach_assessment: string;
  better_answer: string;
  knowledge_gaps: string[];
}

export interface InterviewPrediction {
  next_round_topics: Array<{ topic: string; likelihood: number }>;
  summary: string;
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
  // 最近一次录音转写任务的状态(无任务则缺省);前端据此决定是否展示转写进度/标注区。
  transcript_status?: TranscribeStatus;
}

// ─── 录音转写(StepFun ASR + LLM 角色打标)──────────────────────────────────────
// 与后端 transcribe-task.entity.ts 的 TranscribeStatus / LabeledSegment 权威形状一致。
export type TranscribeStatus =
  | 'submitted'
  | 'transcribing'
  | 'labeling'
  | 'awaiting_confirm'
  | 'analyzing'
  | 'completed'
  | 'failed';

export type SpeakerRole = 'interviewer' | 'candidate';

// 带角色标的转写句段;idx 为 0-based 序号,confirm 端点按 idx 覆盖 speaker(只改 speaker 不改 text)。
export interface LabeledSegment {
  idx: number;
  text: string;
  startMs: number;
  endMs: number;
  speaker: SpeakerRole;
}

// POST /interviews/:id/upload-token 响应:扫码上传的 scoped 一次性令牌 + 手机端直传相对路径。
// 与后端 QrUploadTokenResponse 形状一致。前端把 uploadPath 拼上站点 origin 编成二维码;
// 令牌 10 分钟过期且一次性;前端按固定节奏(约 2 分钟)轮换二维码,旧码在有效期内仍可用。
export interface QrUploadTokenResponse {
  token: string;
  uploadPath: string;
  expiresInSec: number;
}

// GET /interviews/:id/transcribe/status 响应。
export interface TranscribeStatusResponse {
  taskId: string;
  status: TranscribeStatus;
  errorMessage?: string | null;
  // awaiting_confirm 及之后非空;之前为 null。
  segmentsJson?: LabeledSegment[] | null;
  // 上传元数据回执(收到上传即非空;无元数据的旧任务为 null)。仅文件元数据,非音频内容。
  originalFilename?: string | null;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
  uploadedAt?: string | null; // ISO 字符串
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

export type SkillScoreSource = 'ai' | 'self' | 'suppressed';
export type SkillCategory = 'general' | 'ai';
// 证据相关性(FG-1):grounded 可信 / unrelated 张冠李戴(已清空压分) / none 本无证据。
export type EvidenceRelevance = 'grounded' | 'unrelated' | 'none';

export interface SkillAuditItem {
  name: string;
  current: number;
  needed: number;
  ok: boolean;
  category: SkillCategory;
  // 该技能在简历中的证据原文片段;无证据则空字符串。
  evidenceFound: string;
  // current 分的来源:ai 评估 / 用户自评覆盖 / 退化压分(高分无证据)。
  scoreSource: SkillScoreSource;
  // 被自评覆盖或退化压分时保留的 AI 原始分(参考);否则 null。
  aiScore: number | null;
  // 缺口/达标判定专用的保守分(自评覆盖时 = min(自评,AI原分));展示用 current,缺口用 gapScore。
  gapScore: number;
  // FG-1 证据相关性:旧落库历史可能无此字段,前端需容忍 undefined。
  evidenceRelevance?: EvidenceRelevance;
}

export interface CareerAnalysis {
  paths: CareerPath[];
  skill_audit: SkillAuditItem[];
}

export interface CareerHistoryItem {
  id: string;
  created_at: string;
  top_path: string | null;
  path_count: number;
  skill_count: number;
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
  // 后端 opportunity-evaluation.entity.ts 全部存 simple-json string[](权威契约):
  //   risk_flags 为 'type:severity' 字符串数组;strengths/gaps/next_actions 为纯字符串数组。
  risk_flags: string[];
  strengths: string[];
  gaps: string[];
  next_actions: string[];
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
  evidence_used: Array<{ source: string; url?: string; date?: string; verified?: boolean }>;
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
  // 来源声明：说明是否含博查联网实时搜索来源
  evidence_source_disclaimer?: string;
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

// ─── Credit 系统 ──────────────────────────────────────────────────────────────

export type CreditType = 'signup_grant' | 'admin_grant' | 'consume';

export interface CreditLedgerItem {
  id: string;
  delta: number;
  type: CreditType;
  balance_after: number;
  note: string | null;
  endpoint: string | null;
  created_at: string;
}

export interface CreditLedgerPage {
  items: CreditLedgerItem[];
  total: number;
}

export interface MeProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  invite_code: string | null;
  created_at: string;
  credit_balance: number;
}

// ─── 管理后台(/admin) ────────────────────────────────────────────────────────
// GET /api/admin/users:全量用户 + 今日/累计 AI 调用次数 + 最近登录信息。
// last_login_* 四字段可为 null(从未登录或旧数据);内网/localhost 登录时
// 后端将归属记为「内网」。
export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  status: 'active' | 'banned';
  created_at: string;
  usage_today: number;
  usage_total: number;
  last_login_ip: string | null;
  last_login_province: string | null;
  last_login_city: string | null;
  last_login_at: string | null;
  credit_balance: number;
}

// GET /api/admin/invites:邀请码全集。
export interface AdminInvite {
  id: string;
  code: string;
  max_uses: number;
  used_count: number;
  disabled: boolean;
  note: string | null;
  created_at: string;
}

// GET /api/admin/usage:近 7 日每日总数 + 今日 per-user 明细。
export interface AdminUsageOverview {
  daily: { date: string; count: number }[];
  today_by_user: { user_id: string; email: string; name: string; count: number }[];
}

// ─── 管理后台 Phase2 类型(波3前端使用)────────────────────────────────────────

// GET /api/admin/user-activity:单用户活动明细(仅计数,无任何正文)。
// 与后端 AdminActivityResponseDto 字段一一对应。
export interface AdminUserActivity {
  // 被查询用户 ID(与入参 userId 一致)。
  userId: string;
  // 查询时间窗口(ISO 8601 或 null)。
  from: string | null;
  to: string | null;
  // AI 调用次数按端点分组(来源:ai_usage 表,成功调用)。
  aiCallsByEndpoint: Array<{ endpoint: string; count: number }>;
  // AI 调用总次数。
  aiCallsTotal: number;
  // credit 消耗次数按端点分组(来源:credit_transactions where type='consume')。
  creditConsumeByEndpoint: Array<{ endpoint: string | null; count: number }>;
  // credit 消耗总次数。
  creditConsumeTotal: number;
}

// ops_events.type 全集(与后端 OpsEventType 一致)。
export type OpsEventType =
  | 'AI_FAILOVER'
  | 'AI_BOTH_DOWN'
  | 'QUEUE_FULL'
  | 'AI_CALL_FAILED'
  | 'CREDIT_CONSUME_FAILED'
  | 'ADMIN_ACTION';

// GET /api/admin/ops-events 与 GET /api/admin/error-stream 单条响应。
// 与后端 AdminErrorEventResponseDto 字段一一对应(detail 已经白名单过滤)。
export interface AdminOpsEvent {
  id: string;
  type: OpsEventType;
  // detail 白名单投影(后端已剔除 token/正文):只含 endpoint/error/model/provider/
  // active/maxConcurrent/maxQueue/user_id/actor/target/op/patch/delta/note。
  detail: Record<string, unknown> | null;
  created_at: string; // ISO 8601
}

// GET /api/admin/health-snapshot 响应。
// 与后端 AdminHealthResponseDto 字段一一对应。
export interface AdminHealthSnapshot {
  // 整体健康状态:DB ping 通过为 'ok',否则 'error'。
  status: 'ok' | 'error';
  // 数据库连通性。
  db: 'ok' | 'error';
  // 进程运行时长(秒,取整)。
  uptime: number;
  // 应用版本号。
  version: string;
  // 快照时间戳 ISO 8601。
  timestamp: string;
  // 并发护栏状态。
  concurrency: {
    active: number;
    queued: number;
    // queued > 0 即视为有压力,供前端高亮展示。
    under_pressure: boolean;
  };
}

// GET /api/admin/success-stats 单日行(后端返回数组)。
// 与后端 AdminSuccessStatsRow 字段一一对应。
export interface AdminSuccessStats {
  // UTC 日期键 YYYY-MM-DD。
  date: string;
  // 当日 AI 调用成功次数(来源:ai_usage 表)。
  success: number;
  // 当日 AI 调用失败次数(来源:ops_events AI 失败类:AI_FAILOVER/AI_BOTH_DOWN/AI_CALL_FAILED)。
  failed: number;
  // 成功率 = success/(success+failed);当日无任何 AI 活动时为 null。
  success_rate: number | null;
}

// GET /api/admin/recent-failures 单条。
// 与后端 AdminRecentFailureResponseDto 字段一一对应:只含 AI_CALL_FAILED 类失败。
// 隐私铁律:user 为打码后的标识(如 ab***@x.com),绝不含完整邮箱;无法解析则 null。
export interface AdminRecentFailure {
  id: string;
  // 失败时间 ISO 8601。
  created_at: string;
  // 失败原因;无则 null。
  reason: string | null;
  // 触发失败的端点;无则 null。
  endpoint: string | null;
  // 失败阶段(如 transcribe);拦截器路径无此字段则 null。
  stage: string | null;
  // 打码用户标识;无法解析则 null。
  user: string | null;
}

// GET /api/admin/ops-stats 单日行(后端返回数组,稀疏:仅含有事件的日期)。
// 与后端 DailyStats(OpsEventsService)字段一一对应:按日各类 ops_events 计数。
export interface AdminOpsDailyStats {
  // 日期键 YYYY-MM-DD(UTC,与 success-stats 同口径)。
  date: string;
  AI_FAILOVER: number;
  AI_BOTH_DOWN: number;
  QUEUE_FULL: number;
  AI_CALL_FAILED: number;
  CREDIT_CONSUME_FAILED: number;
  ADMIN_ACTION: number;
}

// ── Announcements(站内公告)──────────────────────────────────────────────────
// 公告种类:功能上新 / 修复 / 维护。与后端 AnnouncementKind 一致。
export type AnnouncementKind = 'feature' | 'fix' | 'maintenance';

// 公告展示形态:横幅 / 弹窗。与后端 AnnouncementDisplayType 一致。
export type AnnouncementDisplayType = 'banner' | 'modal';

// 公告审核状态:草稿(公开端不可见) / 已发布。与后端 AnnouncementStatus 一致。
export type AnnouncementStatus = 'draft' | 'published';

// 公告记录,镜像后端 AnnouncementResponseDto(/api/admin/announcements 与 /api/announcements)。
// created_at/published_at 经 JSON 序列化为 ISO 字符串。
export interface Announcement {
  id: string;
  title: string;
  body: string;
  kind: AnnouncementKind;
  display_type: AnnouncementDisplayType;
  active: boolean;
  created_at: string;
  published_at: string | null;
  // 审核状态:草稿/已发布。仅管理端(/api/admin/announcements)返回;公开端(/api/announcements)不返回,故可选。
  status?: AnnouncementStatus;
  // 引导按钮(CTA):cta_label + cta_href 同时非空才渲染。cta_href 为站内路径(/ 开头)。
  cta_label: string | null;
  cta_href: string | null;
  // 点击 CTA 后由目标页启动的功能导览 ID(配 'coach:launch-feature-tour' 事件)。
  cta_tour_id: string | null;
  // 关联功能键(feature-updates 注册表),用于「新」徽章/导览映射。
  feature_key: string | null;
}

// AI 通道协议:Anthropic 兼容 / OpenAI 兼容。
export type AdminAiProviderProtocol = 'anthropic-compat' | 'openai-compat';

// AI 通道角色:主力 / 备用 / 停用。
export type AdminAiProviderRole = 'primary' | 'backup' | 'disabled';

// GET /api/admin/ai-providers 列表元素 + POST/PATCH 响应。
// 与后端 AdminAiProviderResponseDto 字段一一对应。
// 安全红线:apiKeyMasked 只回打码末 4 位,绝不含明文/密文 key。
export interface AdminAiProvider {
  id: string;
  name: string;
  protocol: AdminAiProviderProtocol;
  baseURL: string;
  // 密钥打码(如 "****abcd");从不回明文。
  apiKeyMasked: string;
  modelPro: string;
  modelFlash: string;
  role: AdminAiProviderRole;
  sortOrder: number;
  timeoutMs: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

// POST /api/admin/ai-providers 入参(apiKey write-only)。
export interface CreateAiProviderPayload {
  name: string;
  protocol: AdminAiProviderProtocol;
  baseURL: string;
  apiKey: string;
  modelPro: string;
  modelFlash: string;
  role: AdminAiProviderRole;
  sortOrder?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

// PATCH /api/admin/ai-providers/:id 入参(全可选;apiKey 不传则不改)。
export type UpdateAiProviderPayload = Partial<CreateAiProviderPayload>;

// POST /api/admin/ai-providers/:id/test 与 /test 草稿 的响应。
export interface AdminAiProviderTestResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

// ─── 管理后台 波3 用户管理类型 ─────────────────────────────────────────────────

// GET /api/admin/users/:id:单用户详情。
// 与后端 AdminUserDetailResponseDto 字段一一对应(白名单投影,无 PII 无关字段)。
export interface AdminUserDetail {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  status: 'active' | 'banned';
  credit_balance: number;
  created_at: string;
  last_login_ip: string | null;
  last_login_province: string | null;
  last_login_city: string | null;
  last_login_at: string | null;
  usage_today: number;
  usage_total: number;
  // 近 7 日按日 UTC 调用数。
  daily_usage: { date: string; count: number }[];
}

// GET /api/admin/users/:id/credit-history 单条积分流水。
// 与后端 AdminCreditTxResponseDto 字段一一对应(仅账务字段,无正文)。
export interface AdminCreditTransaction {
  id: string;
  delta: number;
  type: string;
  balance_after: number;
  note: string | null;
  created_by: string | null;
  endpoint: string | null;
  created_at: string; // ISO 8601
}

// GET /api/admin/users/:id/credit-history 分页响应。
export interface AdminCreditHistory {
  items: AdminCreditTransaction[];
  total: number;
}
