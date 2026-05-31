import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';
import { SYSTEM, buildSuggestRewritesPrompt } from './prompts/suggest-rewrites';
import { REWRITE_SUGGESTIONS_SCHEMA } from './schemas/rewrite-suggestion.schema';
import { ProfessionPreset, ProfessionStandardResult, RewriteSuggestion } from '../common/types';
import {
  buildRewriteSystem,
  buildRewritePrompt,
  buildFaithfulnessSystem,
  buildFaithfulnessPrompt,
} from './prompts/rewrite-profession-standard';

const FAITHFULNESS_SCHEMA = {
  type: 'object',
  properties: {
    indices: {
      type: 'array',
      items: { type: 'number' },
      description: 'suggested 含简历未支撑实质内容、需降级为"建议补充"的建议 index 列表',
    },
  },
  required: ['indices'],
};

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

  async suggestAgainstPreset(
    resumeText: string,
    preset: ProfessionPreset,
    analysis: ProfessionStandardResult,
  ): Promise<RewriteSuggestion[]> {
    if (resumeText.trim().length < 30) {
      throw new BadRequestException('简历内容过短，无法改写。');
    }
    const result = await this.ai.completeStructured<{ suggestions: RewriteSuggestion[] }>({
      system: buildRewriteSystem(preset),
      prompt: buildRewritePrompt(resumeText, analysis),
      toolName: 'suggest_rewrites',
      toolDescription: '基于简历原文与诊断给职业特化改写建议',
      schema: REWRITE_SUGGESTIONS_SCHEMA,
    });
    // 禁编造兜底(两层),不满足者归类 gap_advice 并清空 original,防止被当成可直接粘贴的现成简历句:
    // 1) original 必须是简历原文中真实存在的原句,否则不是"改进已有句子"而是"建议补充";
    // 2) 改进型建议的 suggested 不得引入简历里没有的"具体数字"(占位符 [具体数字] 除外)——
    //    否则属伪造量化指标(如把"回收约300份"改成"发放350份、回收率86%"),降级为 gap_advice。
    // 第〇层:丢弃结构损坏的建议(reason 缺失 / suggested 混入 reason=、original= 等模板脚手架 / suggested 为空),
    // 防止内部脚手架碎片泄漏进用户可见交付物。
    const wellFormed = result.suggestions.filter((s) => this.isWellFormed(s));
    const guarded = wellFormed.map((s) => {
      if (!s.original || !resumeText.includes(s.original)) {
        return { ...s, original: '', type: 'gap_advice' as const };
      }
      if (s.type !== 'gap_advice' && this.hasUnsupportedNumber(s.suggested, resumeText)) {
        return { ...s, original: '', type: 'gap_advice' as const };
      }
      return s;
    });
    // 第三层(女娲式自检):确定性规则只能拦数字;再过一次 AI 复核(带上诊断缺口),把 suggested 注入
    // 简历没有的方法/能力/分析变量(尤其诊断已判定缺失/没真用过的能力)的改进型建议降级为 gap_advice。
    return this.auditFaithfulness(resumeText, analysis, guarded);
  }

  /** 结构完整性:suggested、reason 均为非空字符串,且 suggested 未混入 reason=/original=/suggested= 模板脚手架。 */
  private isWellFormed(s: RewriteSuggestion): boolean {
    if (!s || typeof s.suggested !== 'string' || s.suggested.trim().length === 0) return false;
    if (typeof s.reason !== 'string' || s.reason.trim().length === 0) return false;
    if (/\b(reason|original|suggested)\s*=/.test(s.suggested)) return false;
    return true;
  }

  /** AI 防编造复核:打回 suggested 含简历未支撑实质内容的改进型建议(降级 gap_advice)。复核属增强项,失败不阻断。 */
  private async auditFaithfulness(
    resumeText: string,
    analysis: ProfessionStandardResult,
    suggestions: RewriteSuggestion[],
  ): Promise<RewriteSuggestion[]> {
    const candidates = suggestions
      .map((s, index) => ({ index, original: s.original, suggested: s.suggested, type: s.type }))
      .filter((c) => c.type !== 'gap_advice')
      .map(({ index, original, suggested }) => ({ index, original, suggested }));
    if (candidates.length === 0) return suggestions;
    // 把诊断缺口喂给复核:凡 suggested 断言了缺口里指明候选人缺失/没真用过的能力,即"补造诊断刚指出的缺失",必打回。
    const gaps = analysis.dimensions
      .filter((d) => d.gap && d.gap.trim().length > 0)
      .map((d) => `${d.name}:${d.gap}`);
    try {
      const res = await this.ai.completeStructured<{ indices: number[] }>({
        system: buildFaithfulnessSystem(),
        prompt: buildFaithfulnessPrompt(resumeText, gaps, candidates),
        toolName: 'flag_fabrication',
        toolDescription: '返回 suggested 含简历未支撑实质内容、需降级为建议补充的建议 index 列表',
        schema: FAITHFULNESS_SCHEMA,
      });
      const flagged = new Set(Array.isArray(res?.indices) ? res.indices : []);
      if (flagged.size === 0) return suggestions;
      return suggestions.map((s, index) =>
        flagged.has(index) ? { ...s, original: '', type: 'gap_advice' as const } : s,
      );
    } catch {
      // 已有确定性兜底,复核失败时返回兜底结果,不阻断整次诊断。
      return suggestions;
    }
  }

  /**
   * suggested 中是否出现简历原文里没有的"具体数字"。长度≥2 的数字串才计(避免误伤序号/单位小数字),
   * 占位符 [具体数字] 先剔除。命中即视为伪造量化指标。
   */
  private hasUnsupportedNumber(suggested: string, resumeText: string): boolean {
    const nums = suggested.replace(/\[具体数字\]/g, '').match(/\d{2,}/g) ?? [];
    return nums.some((n) => !resumeText.includes(n));
  }
}
