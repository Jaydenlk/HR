import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { AiService } from './ai.service';
import { SYSTEM, buildAnalyzeMatchPrompt } from './prompts/analyze-match';
import { MATCH_RESULT_SCHEMA } from './schemas/match-result.schema';
import { MatchDimensions, ProfessionPreset, ProfessionStandardResult } from '../common/types';
import {
  buildProfessionStandardSystem,
  buildProfessionStandardPrompt,
} from './prompts/analyze-profession-standard';
import { PROFESSION_STANDARD_SCHEMA } from './schemas/profession-standard.schema';

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
      const result = await this.ai.completeStructured<ProfessionStandardResult>({
        system,
        prompt,
        toolName: 'profession_standard_review',
        toolDescription: '按职业胜任力标尺输出分维度诊断(含 why)',
        schema: PROFESSION_STANDARD_SCHEMA,
      });
      // 预设为权威:按顺序对齐 AI 维度,key/name/max 取自预设(消除英文 key 泄漏与结构漂移),
      // AI 只贡献 score/why/evidenceFound/gap;score 收敛到 [0, 满分]、total 重算。
      const dimensions = preset.dimensions.map((pd, i) => {
        const d = result.dimensions[i];
        return {
          key: pd.key,
          name: pd.name,
          score: d ? Math.min(Math.max(d.score, 0), pd.weight) : 0,
          max: pd.weight,
          why: d?.why ?? '',
          evidenceFound: d?.evidenceFound ?? [],
          gap: d?.gap ?? '',
        };
      });
      if (this.isDegenerate(dimensions)) continue;
      const total_score = dimensions.reduce((sum, d) => sum + d.score, 0);
      return { ...result, dimensions, total_score };
    }
    throw new ServiceUnavailableException(
      'AI 诊断结果不完整(存在维度评估为空),已重试多次仍未通过,请稍后再试。',
    );
  }

  /** 退化产物判定:任一维度 why 为空即视为残缺诊断(含"满分零理由"式自相矛盾),不可服务。 */
  private isDegenerate(dimensions: ProfessionStandardResult['dimensions']): boolean {
    return dimensions.length === 0 || dimensions.some((d) => !d.why || d.why.trim().length === 0);
  }
}
