import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';
import { SYSTEM, buildSuggestRewritesPrompt } from './prompts/suggest-rewrites';
import { REWRITE_SUGGESTIONS_SCHEMA } from './schemas/rewrite-suggestion.schema';
import { RewriteSuggestion } from '../common/types';

@Injectable()
export class RewriterService {
  constructor(private readonly ai: AiService) {}

  async suggest(
    resumeText: string,
    jdText: string,
    matchResult: string,
  ): Promise<RewriteSuggestion[]> {
    if (!resumeText || resumeText.trim().length < 30) {
      throw new BadRequestException(
        '简历文本不足，无法生成改写建议。请先上传包含完整信息的简历。',
      );
    }
    if (!jdText || jdText.trim().length < 50) {
      throw new BadRequestException(
        'JD 文本不足，无法生成改写建议。JD 需包含岗位职责和要求（至少 50 字）。',
      );
    }

    const result = await this.ai.completeStructured<{ suggestions: RewriteSuggestion[] }>({
      system: SYSTEM,
      prompt: buildSuggestRewritesPrompt(resumeText, jdText, matchResult),
      toolName: 'suggest_rewrites',
      toolDescription: '根据简历、JD 和匹配分析生成具体的简历改写建议',
      schema: REWRITE_SUGGESTIONS_SCHEMA,
    });

    return result.suggestions;
  }
}
