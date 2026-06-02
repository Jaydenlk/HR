import { Resume } from '../entities/resume.entity';
import { ResumeVersion } from '../entities/resume-version.entity';
import { Diagnosis } from '../../diagnoses/entities/diagnosis.entity';
import type { ParsedResume } from '../../common/types';

// 列表项:不含 raw_text 全文、不含 user_id。仅暴露前端列表页/诊断选择页实际消费的字段
// (id/title/is_primary/file_type/created_at/updated_at)。
export interface ResumeListItem {
  id: string;
  title: string;
  file_type: string | null;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
}

// 历史版本:详情页 version-list 消费 id/version_num/raw_text/change_note/created_at,不含 user_id 类敏感字段。
export interface ResumeVersionResponse {
  id: string;
  version_num: number;
  raw_text: string;
  change_note: string | null;
  created_at: Date;
}

// 诊断摘要:详情页诊断记录列表仅消费 id/jd_role/jd_company/score/created_at,
// 不外泄 jd_text 全文、suggestions(完整 AI 改写)、dimensions、user_id 等。
export interface DiagnosisSummary {
  id: string;
  jd_role: string | null;
  jd_company: string | null;
  score: number | null;
  created_at: Date;
}

// 详情:可含 raw_text(详情页原始文本 tab 需要),但不含 user_id。
export interface ResumeDetailResponse {
  id: string;
  title: string;
  raw_text: string;
  parsed_json: ParsedResume | null;
  file_url: string | null;
  file_type: string | null;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
  versions: ResumeVersionResponse[];
  diagnoses: DiagnosisSummary[];
}

export function toResumeListItem(resume: Resume): ResumeListItem {
  return {
    id: resume.id,
    title: resume.title,
    file_type: resume.file_type ?? null,
    is_primary: resume.is_primary,
    created_at: resume.created_at,
    updated_at: resume.updated_at,
  };
}

export function toResumeVersionResponse(version: ResumeVersion): ResumeVersionResponse {
  return {
    id: version.id,
    version_num: version.version_num,
    raw_text: version.raw_text,
    change_note: version.change_note ?? null,
    created_at: version.created_at,
  };
}

export function toDiagnosisSummary(diagnosis: Diagnosis): DiagnosisSummary {
  return {
    id: diagnosis.id,
    jd_role: diagnosis.jd_role ?? null,
    jd_company: diagnosis.jd_company ?? null,
    score: diagnosis.score ?? null,
    created_at: diagnosis.created_at,
  };
}

export function toResumeDetailResponse(resume: Resume): ResumeDetailResponse {
  return {
    id: resume.id,
    title: resume.title,
    raw_text: resume.raw_text,
    parsed_json: resume.parsed_json,
    file_url: resume.file_url ?? null,
    file_type: resume.file_type ?? null,
    is_primary: resume.is_primary,
    created_at: resume.created_at,
    updated_at: resume.updated_at,
    versions: (resume.versions ?? []).map(toResumeVersionResponse),
    diagnoses: (resume.diagnoses ?? []).map(toDiagnosisSummary),
  };
}
