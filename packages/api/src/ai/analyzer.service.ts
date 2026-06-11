import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { AiService } from './ai.service';
import { SYSTEM, buildAnalyzeMatchPrompt } from './prompts/analyze-match';
import { MATCH_RESULT_SCHEMA } from './schemas/match-result.schema';
import {
  ConventionCheck,
  InterviewHook,
  MatchDimensions,
  ProfessionPreset,
  ProfessionStandardResult,
} from '../common/types';
import {
  buildProfessionStandardSystem,
  buildProfessionStandardPrompt,
} from './prompts/analyze-profession-standard';
import { PROFESSION_STANDARD_SCHEMA } from './schemas/profession-standard.schema';

// AI 原始产物形态:主通道走 deepseek-chat 时内层字段可能缺省/残缺(schema 已放宽内层 required),
// 故 Raw 类型全部可选,由 service 端归一为权威 ProfessionStandardResult。无 any。
interface RawProfessionDimension {
  score?: number;
  why?: string;
  evidenceFound?: string[];
  gap?: string;
}
interface RawConventionCheck {
  key?: string;
  status?: ConventionCheck['status'];
  note?: string;
}
interface RawInterviewHook {
  resumeHit?: string;
  interviewQuestion?: string;
  prepDirection?: string;
}
interface RawProfessionStandard {
  total_score?: number;
  dimensions?: RawProfessionDimension[];
  conventionChecks?: RawConventionCheck[];
  interviewHooks?: RawInterviewHook[];
}

@Injectable()
export class AnalyzerService {
  constructor(private readonly ai: AiService) {}

  analyze(
    resumeJson: string,
    jdJson: string,
  ): Promise<{ total_score: number; dimensions: MatchDimensions }> {
    if (!resumeJson || resumeJson.trim().length < 30) {
      throw new BadRequestException(
        '简历内容不足，无法进行匹配分析。请先上传包含完整信息的简历。',
      );
    }
    if (!jdJson || jdJson.trim().length < 50) {
      throw new BadRequestException(
        'JD 内容不足，无法进行匹配分析。JD 需包含岗位职责和要求（至少 50 字）。',
      );
    }

    return this.ai.completeStructured<{ total_score: number; dimensions: MatchDimensions }>({
      system: SYSTEM,
      prompt: buildAnalyzeMatchPrompt(resumeJson, jdJson),
      toolName: 'analyze_match',
      toolDescription: '对简历与 JD 进行多维度匹配评分分析',
      schema: MATCH_RESULT_SCHEMA,
    });
  }

  async analyzeAgainstPreset(
    resumeJson: string,
    preset: ProfessionPreset,
    jdJson: string | null = null,
  ): Promise<ProfessionStandardResult> {
    if (resumeJson.trim().length < 30) {
      throw new BadRequestException('简历内容过短，无法分析。');
    }
    const system = buildProfessionStandardSystem(preset);
    const prompt = buildProfessionStandardPrompt(resumeJson, jdJson);

    // 可靠性:AI 偶发"结构合法但语义为空"的退化产物(某维 why 全空 / 满分零理由 / 整段空评分),
    // 会让付费用户收到残缺诊断。完整对齐后校验,退化则重试;耗尽仍退化抛 503,绝不服务空评分。
    const MAX_ATTEMPTS = 3;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const result = await this.ai.completeStructured<RawProfessionStandard>({
        system,
        prompt,
        toolName: 'profession_standard_review',
        toolDescription: '按职业胜任力标尺输出分维度诊断(含 why)',
        schema: PROFESSION_STANDARD_SCHEMA,
      });
      // 预设为权威:按顺序对齐 AI 维度,key/name/max 取自预设(消除英文 key 泄漏与结构漂移),
      // AI 只贡献 score/why/evidenceFound/gap;score 收敛到 [0, 满分]、total 重算。
      // 内层 required 已放宽,故 score/why 等可能缺失:score 非数字 → 0,why/gap → '',
      // evidenceFound 非数组 → []。退化(why 空)仍由 isDegenerate 拦下重试,内容红线不放宽。
      const rawDims = Array.isArray(result.dimensions) ? result.dimensions : [];
      const dimensions = preset.dimensions.map((pd, i) => {
        const d = rawDims[i];
        const score = typeof d?.score === 'number' && Number.isFinite(d.score) ? d.score : 0;
        return {
          key: pd.key,
          name: pd.name,
          score: Math.min(Math.max(score, 0), pd.weight),
          max: pd.weight,
          why: d?.why ?? '',
          evidenceFound: Array.isArray(d?.evidenceFound) ? d.evidenceFound : [],
          gap: d?.gap ?? '',
        };
      });
      if (this.isDegenerate(dimensions)) continue;
      const total_score = dimensions.reduce((sum, d) => sum + d.score, 0);
      return {
        total_score,
        dimensions,
        conventionChecks: this.normalizeConventionChecks(result.conventionChecks),
        interviewHooks: this.normalizeInterviewHooks(result.interviewHooks),
      };
    }
    throw new ServiceUnavailableException(
      'AI 诊断结果不完整(存在维度评估为空),已重试多次仍未通过,请稍后再试。',
    );
  }

  /** 退化产物判定:任一维度 why 为空即视为残缺诊断(含"满分零理由"式自相矛盾),不可服务。 */
  private isDegenerate(dimensions: ProfessionStandardResult['dimensions']): boolean {
    return dimensions.length === 0 || dimensions.some((d) => !d.why || d.why.trim().length === 0);
  }

  // 本土惯例核查归一:内层 required 已放宽,故丢弃缺 key/note 的残缺条目(无键无说明的核查无意义),
  // status 非法/缺失 → 'warn'(中性,不臆断为 ok 掩盖问题、也不臆断为 missing 编造缺失)。
  private normalizeConventionChecks(raw: RawConventionCheck[] | undefined): ConventionCheck[] {
    if (!Array.isArray(raw)) return [];
    const valid = new Set<ConventionCheck['status']>(['ok', 'warn', 'missing']);
    return raw
      .filter((c) => typeof c.key === 'string' && c.key.length > 0 && typeof c.note === 'string')
      .map((c) => ({
        key: c.key as string,
        status: c.status && valid.has(c.status) ? c.status : 'warn',
        note: c.note as string,
      }));
  }

  // 面试追问预演归一:三字段缺任一即丢弃该条(残缺 hook 无展示价值),绝不用占位文案编造追问点。
  private normalizeInterviewHooks(raw: RawInterviewHook[] | undefined): InterviewHook[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (h): h is Required<RawInterviewHook> =>
          typeof h.resumeHit === 'string' &&
          h.resumeHit.length > 0 &&
          typeof h.interviewQuestion === 'string' &&
          h.interviewQuestion.length > 0 &&
          typeof h.prepDirection === 'string' &&
          h.prepDirection.length > 0,
      )
      .map((h) => ({
        resumeHit: h.resumeHit,
        interviewQuestion: h.interviewQuestion,
        prepDirection: h.prepDirection,
      }));
  }
}
