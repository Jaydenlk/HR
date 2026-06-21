import { Diagnosis } from '../entities/diagnosis.entity';
import { Resume } from '../../resumes/entities/resume.entity';
import type {
  ParsedJD,
  MatchDimensions,
  ProfessionStandardResult,
  ProfessionTier,
  RewriteSuggestion,
} from '../../common/types';

/**
 * 诊断对外响应 DTO(白名单投影)。
 *
 * 安全意图:Diagnosis 实体含两个【仅供后台排障】的内部字段 —— failure_reason(失败归类)
 * 与 pipeline_error_message(原始错误信息,可能含堆栈/内部细节)。这两个字段绝不能投影给终端用户。
 * 直接返回实体会把它们随 JSON 一并泄露,故 findOne/findAll 出口一律过本 DTO:逐字段白名单拷贝对外字段,
 * 显式省略上述两个内部字段。失败态(failed/partial)只给用户一句中性可读提示(user_message),不暴露内因。
 *
 * 字段与 Diagnosis 实体一一对应(含同名同类型,resume 关系对象原样保留——findOne/findAll 用
 * relations:{resume:true} 带出,前端依赖它);新增字段须在实体侧也评估是否对外可见后再加入白名单。
 */
export class DiagnosisResponseDto {
  id: string;
  user_id: string;
  resume_id: string;
  jd_text?: string;
  jd_parsed: ParsedJD | null;
  profession?: string;
  preset_id?: string;
  tier?: ProfessionTier;
  mode: 'jd_match' | 'profession_standard';
  jd_company: string;
  jd_role: string;
  score: number;
  dimensions?: MatchDimensions | ProfessionStandardResult;
  keywords_hit: string[];
  keywords_miss: string[];
  suggestions: RewriteSuggestion[];
  status?: 'success' | 'failed' | 'partial';
  created_at: Date;
  resume: Resume;

  // 失败/部分失败时给用户的中性提示(不暴露 failure_reason / pipeline_error_message 内因);其余态为 null。
  user_message: string | null;

  static fromEntity(d: Diagnosis): DiagnosisResponseDto {
    const dto = new DiagnosisResponseDto();
    dto.id = d.id;
    dto.user_id = d.user_id;
    dto.resume_id = d.resume_id;
    dto.jd_text = d.jd_text;
    dto.jd_parsed = d.jd_parsed;
    dto.profession = d.profession;
    dto.preset_id = d.preset_id;
    dto.tier = d.tier;
    dto.mode = d.mode;
    dto.jd_company = d.jd_company;
    dto.jd_role = d.jd_role;
    dto.score = d.score;
    dto.dimensions = d.dimensions;
    dto.keywords_hit = d.keywords_hit;
    dto.keywords_miss = d.keywords_miss;
    dto.suggestions = d.suggestions;
    dto.status = d.status;
    dto.created_at = d.created_at;
    dto.resume = d.resume;
    dto.user_message =
      d.status === 'failed' || d.status === 'partial'
        ? '诊断分析未完成,请重试'
        : null;
    return dto;
  }
}
