import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';
import { SYSTEM, buildAnalyzeMatchPrompt } from './prompts/analyze-match';
import { MATCH_RESULT_SCHEMA } from './schemas/match-result.schema';
import { MatchDimensions } from '../common/types';

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
}
