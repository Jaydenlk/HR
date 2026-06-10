import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { CompareOffersDto, OfferItemDto, OfferWeightsDto } from './dto/compare-offers.dto';

// ── Output shape ──────────────────────────────────────────────────────────────

interface AiDimensions {
  annual_total_compensation?: number;
  effective_monthly?: number;
  social_insurance_annual?: number;
  probation_loss?: number;
  stability_score?: number;
  growth_potential?: string;
}

interface AiComparison {
  offer_id: string;
  company: string;
  dimensions: AiDimensions;
}

interface AiWeightedScore {
  offer_id: string;
  company: string;
  total_score?: number;
  dimension_scores?: Record<string, number>;
}

interface AiRecommendation {
  preferred_offer_id: string;
  rationale: string;
  confidence: 'high' | 'medium' | 'low' | 'uncertain';
  caveats?: string[];
}

interface AiHourlyRate {
  offer_id: string;
  company: string;
  weekly_hours?: number;
  hourly_rate_rmb: number | null;
}

interface AiMissingInfo {
  offer_id: string;
  field: string;
  impact: string;
}

export interface CompareOffersResult {
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
  comparison: AiComparison[];
  weighted_scores: AiWeightedScore[];
  recommendation: AiRecommendation;
  hourly_rate_comparison: AiHourlyRate[];
  missing_info: AiMissingInfo[];
}

// internal alias for clarity
type AiResult = CompareOffersResult;

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class OfferComparatorService {
  constructor(private readonly ai: AiService) {}

  async compare(dto: CompareOffersDto): Promise<AiResult> {
    // Guard 1: minimum offer count (belt-and-suspenders, DTO already validates)
    if (!dto.offers || dto.offers.length < 2) {
      throw new BadRequestException('Offer 比对至少需要 2 个 offer');
    }

    // Guard 1b (#92): offer id 必须唯一，重复会导致映射覆盖与张冠李戴
    const ids = dto.offers.map((o) => o.id);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('每个 offer 的 id 必须唯一，存在重复 id');
    }

    const result = await this.ai.completeStructured<AiResult>({
      system: this.buildSystem(dto),
      prompt: this.buildPrompt(dto),
      toolName: 'offer_compare',
      toolDescription: '输出多 offer 多维度比较结果，包含加权评分、推荐、时薪对比和缺失信息',
      schema: OUTPUT_SCHEMA,
    });

    return this.applyGuards(result, dto.offers, dto.weights);
  }

  // ── 服务端确定性 guard ──────────────────────────────────────────────────────

  private applyGuards(result: AiResult, offers: OfferItemDto[], weights?: OfferWeightsDto): AiResult {
    // 服务端权威映射：id → company / 周工时（用于覆盖与防张冠李戴）
    const companyMap = new Map(offers.map((o) => [o.id, o.company]));
    const validIds = new Set(offers.map((o) => o.id));

    const lowConfidence =
      result.confidence === 'low' || result.confidence === 'insufficient';
    const insufficient = result.confidence === 'insufficient';

    // Guard #17 + #39: 以输入 offers 为基准，补齐 AI 漏掉的行（不静默丢失）；
    // company 一律用服务端映射覆盖（#17 幻觉覆盖）；
    // Guard #15: comparison 中可确定计算的字段服务端复算覆盖模型值；
    // Guard #56: 低置信时剥离 comparison[].dimensions 中所有 AI 精确数字
    const aiCmpMap = new Map(
      (result.comparison ?? [])
        .filter((c) => validIds.has(c.offer_id))
        .map((c) => [c.offer_id, c]),
    );
    const comparison: AiComparison[] = offers.map((offer) => {
      const c = aiCmpMap.get(offer.id);
      // #39: AI 漏掉此 offer 时用空 dimensions 占位，标注 growth_potential 说明
      const baseDimensions: AiDimensions = c
        ? { ...c.dimensions }
        : { growth_potential: 'AI 未给出/信息不足' };

      const dimensions: AiDimensions = {
        ...baseDimensions,
        annual_total_compensation: this.calcAnnualTotal(offer),
        probation_loss: this.calcProbationLoss(offer),
      };

      // #15/#56: social_insurance_annual 输入可得时服务端复算覆盖模型值（= 月缴 × 12）；
      // 输入不可得时一律剥离模型伪精确值(与 effective_monthly 同策略,与置信度无关 —— 服务端无法
      // 复算的精确金额绝不采信模型,否则 high/medium 置信下编造的五险一金年缴会作为权威值泄漏)。
      const socialInsuranceAnnual = this.calcSocialInsuranceAnnual(offer);
      if (socialInsuranceAnnual != null) {
        dimensions.social_insurance_annual = socialInsuranceAnnual;
      } else {
        delete dimensions.social_insurance_annual;
      }

      // effective_monthly 无法由输入确定计算（依赖个人所得税档位与实际缴费基数）
      // 与置信度无关，一律剥离，防止模型杜撰精确到手数字作为权威值返回
      delete dimensions.effective_monthly;

      if (lowConfidence) {
        // 低置信：剥离所有主观/伪精确分值，保留定性字段（growth_potential）
        delete dimensions.stability_score;
      }
      return { offer_id: offer.id, company: companyMap.get(offer.id) as string, dimensions };
    });

    // Guard #17 + #41 + #56: weighted_scores 以输入 offers 为基准补齐缺失行；
    // 低置信时剥离 total_score 与 dimension_scores（伪精确分值）；
    // high/medium 时服务端按权重复算 total_score（#41，纯数学确定性，不采信模型值）
    const aiWsMap = new Map(
      (result.weighted_scores ?? [])
        .filter((ws) => validIds.has(ws.offer_id))
        .map((ws) => [ws.offer_id, ws]),
    );
    const weighted_scores: AiWeightedScore[] = offers.map((offer) => {
      const ws = aiWsMap.get(offer.id);
      const base: AiWeightedScore = {
        offer_id: offer.id,
        // #39: AI 未给出该 offer 时用输入的 company（兜底已覆盖 #17 幻觉覆盖需求）
        company: companyMap.get(offer.id) as string,
      };
      if (lowConfidence) return base;
      if (!ws) {
        // #39: AI 漏掉此 offer，标注信息不足，不静默丢失
        base.dimension_scores = { _note: 'AI 未给出/信息不足' } as unknown as Record<string, number>;
        return base;
      }
      if (ws.dimension_scores != null) base.dimension_scores = ws.dimension_scores;
      // #41: 服务端按权重归一化复算 total_score，覆盖模型值
      if (ws.dimension_scores != null) {
        base.total_score = this.recomputeTotalScore(ws.dimension_scores, weights);
      } else if (ws.total_score != null) {
        // dimension_scores 缺失时无法复算，保留模型值（信息不足时已在 lowConfidence 分支被剥离）
        base.total_score = ws.total_score;
      }
      return base;
    });

    // Guard #16 + #17 + #39 + #91: 以输入 offers 为基准补齐缺失行（#39，不静默丢失）；
    // 幻觉行已被 offers 基准遍历排除（#17）；
    // 工时未知（== null）→ 强制 null；工时已知 → 服务端复算覆盖模型时薪，从不采信模型值
    const hourly_rate_comparison: AiHourlyRate[] = offers.map((offer) => {
      const company = companyMap.get(offer.id) as string;
      const hours = offer.weekly_hours;
      if (hours == null) {
        return { offer_id: offer.id, company, weekly_hours: undefined, hourly_rate_rmb: null };
      }
      return {
        offer_id: offer.id,
        company,
        weekly_hours: hours,
        hourly_rate_rmb: this.calcHourlyRate(offer, hours),
      };
    });

    // Guard #17: missing_info 过滤幻觉 offer_id
    const missing_info: AiMissingInfo[] = (result.missing_info ?? []).filter((m) =>
      validIds.has(m.offer_id),
    );

    // Guard #17 + #35: 校正 recommendation
    const recommendation = this.guardRecommendation(
      result.recommendation,
      validIds,
      insufficient,
    );

    // #35: insufficient 时把"无法确定推荐"记入 cannot_determine
    const cannot_determine = [...(result.cannot_determine ?? [])];
    if (insufficient && !cannot_determine.includes('信息不足，无法给出可靠的 offer 推荐')) {
      cannot_determine.push('信息不足，无法给出可靠的 offer 推荐');
    }

    return {
      ...result,
      comparison,
      weighted_scores,
      hourly_rate_comparison,
      missing_info,
      recommendation,
      cannot_determine,
    };
  }

  // ── 服务端确定性复算（#15/#16）──────────────────────────────────────────────

  /** 年总包 = 月薪 × 年薪月数(默认12) + 年终奖(默认0)。RSU/期权不纳入。 */
  private calcAnnualTotal(offer: OfferItemDto): number {
    const months = offer.months_per_year ?? 12;
    const bonus = offer.annual_bonus ?? 0;
    return offer.base_monthly * months + bonus;
  }

  /** 时薪 = 年总包 / (周工时 × 52)。调用方传入已校验的 weeklyHours。 */
  private calcHourlyRate(offer: OfferItemDto, weeklyHours: number): number {
    const annual = this.calcAnnualTotal(offer);
    return Number((annual / (weeklyHours * 52)).toFixed(2));
  }

  /**
   * #15: 五险一金年缴 = 公司月缴 × 12（输入可确定计算）。
   * 月缴缺失 → 无法确定，返回 undefined（不编造，交由低置信剥离逻辑处理模型值）。
   */
  private calcSocialInsuranceAnnual(offer: OfferItemDto): number | undefined {
    if (offer.social_insurance_monthly == null) {
      return undefined;
    }
    return Number((offer.social_insurance_monthly * 12).toFixed(2));
  }

  /**
   * 试用期损失 = 月薪 × (1 - 折扣比例) × 试用月数。
   * 折扣或月数缺失 → 无法确定，返回 undefined（不编造为 0）。
   */
  private calcProbationLoss(offer: OfferItemDto): number | undefined {
    if (offer.probation_discount == null || offer.probation_months == null) {
      return undefined;
    }
    const loss =
      offer.base_monthly * (1 - offer.probation_discount) * offer.probation_months;
    return Number(loss.toFixed(2));
  }

  /**
   * #17 + #35: 校验 preferred_offer_id 合法性；
   * insufficient 或非法 id → 收口为空推荐，绝不编造赢家。
   */
  private guardRecommendation(
    rec: AiRecommendation | undefined,
    validIds: Set<string>,
    insufficient: boolean,
  ): AiRecommendation {
    if (insufficient || !rec || !validIds.has(rec.preferred_offer_id)) {
      return {
        preferred_offer_id: '',
        rationale: '信息不足，无法给出可靠推荐',
        confidence: 'uncertain',
        caveats: rec?.caveats ?? [],
      };
    }
    return rec;
  }

  /**
   * #41: 按声明权重归一化后对各维度分做加权复算 total_score，覆盖模型值。
   * 维度分 key 枚举：compensation / growth / stability / work_life_balance。
   * 缺失维度分时用 0 替代（已在 missing_info 标注），确保复算结果有界 [0, 100]。
   */
  private recomputeTotalScore(
    dimensionScores: Record<string, number>,
    weights: OfferWeightsDto | undefined,
  ): number {
    const comp = weights?.compensation ?? 0.4;
    const growth = weights?.growth ?? 0.3;
    const stability = weights?.stability ?? 0.2;
    const wlb = weights?.work_life_balance ?? 0.1;
    const sum = comp + growth + stability + wlb;
    const factor = sum > 0 ? 1 / sum : 1;

    const score =
      (dimensionScores['compensation'] ?? 0) * comp * factor +
      (dimensionScores['growth'] ?? 0) * growth * factor +
      (dimensionScores['stability'] ?? 0) * stability * factor +
      (dimensionScores['work_life_balance'] ?? 0) * wlb * factor;

    return Number(score.toFixed(2));
  }

  /**
   * #55: 权重和≠1 时归一化（按比例缩放使其和为 1），再生成描述文案。
   * 全为 0 时退回默认权重，避免除零。
   */
  private describeWeights(w: OfferWeightsDto): string {
    const comp = w.compensation ?? 0.4;
    const growth = w.growth ?? 0.3;
    const stability = w.stability ?? 0.2;
    const wlb = w.work_life_balance ?? 0.1;
    const sum = comp + growth + stability + wlb;
    const factor = sum > 0 ? 1 / sum : 1;
    const pct = (x: number): string => (x * factor * 100).toFixed(0);
    return `用户自定义权重（已归一化为和=1）：薪酬 ${pct(comp)}%，成长 ${pct(growth)}%，稳定性 ${pct(stability)}%，工作生活平衡 ${pct(wlb)}%`;
  }

  // ── Prompt builders ────────────────────────────────────────────────────────

  private buildSystem(dto: CompareOffersDto): string {
    const weightsDesc = dto.weights
      ? this.describeWeights(dto.weights)
      : '使用默认权重：薪酬 40%、成长 30%、稳定性 20%、工作生活平衡 10%';

    return `你是一位专注中国职场的职业发展教练，帮助求职者科学比较多个 offer。

## 中国市场五大要素（必须逐一处理，不得遗漏）

| 要素 | 说明 | 缺失时处理 |
|------|------|-----------|
| 五险一金比例 | 影响实际到手约 20-30% | 标注 uncertain，在 missing_info 列出 |
| 年终奖月数 | 通常 1-3 月，差异大 | 使用保守估计（base × 月数），标注 uncertain |
| RSU/期权 | 行权条件差异极大 | 不纳入确定性计算，单独说明 |
| 试用期折扣 | 80% 折扣常见，计算损失金额 | 标注 uncertain |
| 虚拟股 | 非真实股票，仅分红权，区别于真实股权 | 在 comparison 特别说明 |

## 计算规则（硬性，不得变通）

- 年总包 = 月薪 × 年薪月数 + 年终奖（RSU/期权不纳入确定性计算）
- 时薪 = 年总包 / (周工时 × 52)，**周工时未知时 hourly_rate_rmb 必须为 null，不得估算**
- 试用期损失 = 月薪 × (1 - 折扣比例) × 试用月数

## 防编造规则（硬性，违反即为错误输出）

1. 所有数据来自用户提供的 offers 输入，严禁凭空推断
2. 缺失字段必须在 missing_info[] 中列出，不得给出该字段的确定性结论
3. **confidence 为 low 或 insufficient 时，weighted_scores 中不得有 total_score 字段**（返回时省略该字段）
4. evidence_used 中的每条证据必须能在输入的 offers 数据中定位，否则省略
5. recommendation.confidence 必须诚实反映信息完整度，不得高估
6. 时薪计算：若用户未提供 weekly_hours，该 offer 的 hourly_rate_rmb = null

## 维度权重
${weightsDesc}

## 输出要求

- 语言：全部中文（简体）
- summary：2-3 句话概括比较结论
- 不得在未提供数据的维度给出精确分数
- missing_info 务必完整列出所有缺失的关键字段及其影响`;
  }

  private buildPrompt(dto: CompareOffersDto): string {
    const offersText = dto.offers
      .map((o) => {
        const lines = [
          `### Offer ID: ${o.id}（${o.company}）`,
          `- 月薪：${o.base_monthly.toLocaleString()} 元`,
          `- 年薪月数：${o.months_per_year ?? '未知'}`,
          `- 年终奖：${o.annual_bonus != null ? `${o.annual_bonus.toLocaleString()} 元` : '未知'}`,
          `- 城市：${o.city ?? '未知'}`,
          `- 职级：${o.level ?? '未知'}`,
          `- 周工时：${o.weekly_hours != null ? `${o.weekly_hours} 小时` : '未知'}`,
          `- 试用期折扣：${o.probation_discount != null ? `${(o.probation_discount * 100).toFixed(0)}%` : '未知'}`,
          `- 试用期时长：${o.probation_months != null ? `${o.probation_months} 个月` : '未知'}`,
          `- 五险一金（公司部分月缴）：${o.social_insurance_monthly != null ? `${o.social_insurance_monthly.toLocaleString()} 元` : '未知'}`,
          `- 股权/期权年均：${o.equity_annual != null ? `${o.equity_annual.toLocaleString()} 元` : '未知'}`,
          `- 股票类型：${o.equity_type ?? '未知'}`,
        ];
        if (o.notes) lines.push(`- 备注：${o.notes}`);
        return lines.join('\n');
      })
      .join('\n\n');

    const prioritiesText =
      dto.user_priorities && dto.user_priorities.length > 0
        ? `\n## 用户优先级说明\n${dto.user_priorities.join('\n')}`
        : '';

    return `请对以下 ${dto.offers.length} 个 offer 进行多维度比较分析：

${offersText}
${prioritiesText}

请严格按照系统提示的规则和中国市场五大要素进行分析，输出完整的比较结果。`;
  }
}

// ── Output JSON Schema ─────────────────────────────────────────────────────────

const OUTPUT_SCHEMA = {
  type: 'object',
  required: [
    'skill_name', 'skill_version', 'summary', 'confidence',
    'evidence_used', 'recommendations', 'risks', 'next_actions',
    'follow_up_questions', 'cannot_determine',
    'comparison', 'weighted_scores', 'recommendation',
    'hourly_rate_comparison', 'missing_info',
  ],
  properties: {
    skill_name: { type: 'string' },
    skill_version: { type: 'string' },
    summary: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low', 'insufficient'] },
    evidence_used: { type: 'array', items: { type: 'object' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    next_actions: { type: 'array', items: { type: 'string' } },
    follow_up_questions: { type: 'array', items: { type: 'string' } },
    cannot_determine: { type: 'array', items: { type: 'string' } },
    comparison: {
      type: 'array',
      items: {
        type: 'object',
        required: ['offer_id', 'company', 'dimensions'],
        properties: {
          offer_id: { type: 'string' },
          company: { type: 'string' },
          dimensions: {
            type: 'object',
            properties: {
              annual_total_compensation: { type: 'number' },
              effective_monthly: { type: 'number' },
              social_insurance_annual: { type: 'number' },
              probation_loss: { type: 'number' },
              stability_score: { type: 'number', minimum: 1, maximum: 10 },
              growth_potential: { type: 'string' },
            },
          },
        },
      },
    },
    weighted_scores: {
      type: 'array',
      items: {
        type: 'object',
        required: ['offer_id', 'company'],
        properties: {
          offer_id: { type: 'string' },
          company: { type: 'string' },
          total_score: { type: 'number', minimum: 0, maximum: 100 },
          dimension_scores: { type: 'object' },
        },
      },
    },
    recommendation: {
      type: 'object',
      required: ['preferred_offer_id', 'rationale', 'confidence'],
      properties: {
        preferred_offer_id: { type: 'string' },
        rationale: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low', 'uncertain'] },
        caveats: { type: 'array', items: { type: 'string' } },
      },
    },
    hourly_rate_comparison: {
      type: 'array',
      items: {
        type: 'object',
        required: ['offer_id', 'company'],
        properties: {
          offer_id: { type: 'string' },
          company: { type: 'string' },
          weekly_hours: { type: 'number' },
          hourly_rate_rmb: { oneOf: [{ type: 'number' }, { type: 'null' }] },
        },
      },
    },
    missing_info: {
      type: 'array',
      items: {
        type: 'object',
        required: ['offer_id', 'field', 'impact'],
        properties: {
          offer_id: { type: 'string' },
          field: { type: 'string' },
          impact: { type: 'string' },
        },
      },
    },
  },
} as const;
