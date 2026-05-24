import { Injectable } from '@nestjs/common';
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
    const result = await this.ai.completeStructured<{ suggestions: RewriteSuggestion[] }>({
      provider: 'clouddream',
      system: SYSTEM,
      prompt: buildSuggestRewritesPrompt(resumeText, jdText, matchResult),
      toolName: 'suggest_rewrites',
      toolDescription: '根据简历、JD 和匹配分析生成具体的简历改写建议',
      schema: REWRITE_SUGGESTIONS_SCHEMA,
    });

    return result.suggestions;
  }
}
