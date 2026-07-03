import type { TranscribeStatus } from '../../speech/entities/transcribe-task.entity';
import type { LinkTargetType } from './link-application.dto';

/**
 * GET /applications/:id/related 的响应形状(精确到字段名,前端按此对接)。
 * 三个聚合集合(interviews/mock_sessions/cover_letters)均已做过双重过滤:
 * application_id = 本 application 且 user_id = 当前用户,不会泄露他人数据。
 */
export interface InterviewSummary {
  id: string;
  company: string | null;
  role: string | null;
  round: string;
  interview_at: string | null;
  duration_min: number | null;
  overall_grade: string | null;
  created_at: Date;
  /** 最近一次录音转写任务的状态;无任务则为 null。 */
  transcript_status: TranscribeStatus | null;
}

export interface MockSessionSummary {
  id: string;
  company: string | null;
  role: string | null;
  mode: string;
  status: string;
  overall_grade: string | null;
  created_at: Date;
}

export interface CoverLetterSummary {
  id: string;
  company: string | null;
  role: string | null;
  tone: string;
  version: number;
  created_at: Date;
}

export interface ResumeSummary {
  id: string;
  title: string;
  is_primary: boolean;
}

export interface ResumeVersionSummary {
  id: string;
  version_num: number;
  change_note: string | null;
  created_at: Date;
}

export interface ResumeLinkSummary {
  resume: ResumeSummary;
  version: ResumeVersionSummary | null;
}

export interface CompanyResearchSummary {
  id: string;
  display_name: string;
  summary: string;
  source_url: string;
  source_domain: string;
  retrieved_at: Date;
}

export interface ApplicationRelatedResponse {
  interviews: InterviewSummary[];
  mock_sessions: MockSessionSummary[];
  cover_letters: CoverLetterSummary[];
  resume: ResumeLinkSummary | null;
  company_research: CompanyResearchSummary | null;
}

export interface LinkSuggestion {
  type: Extract<LinkTargetType, 'interview' | 'mock' | 'cover_letter'>;
  target_id: string;
  label: string;
  reason: string;
}

export interface LinkSuggestionsResponse {
  suggestions: LinkSuggestion[];
}
