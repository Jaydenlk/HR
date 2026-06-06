import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { CompareOffersDto, OfferItemDto } from './dto/compare-offers.dto';

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

    const result = await this.ai.completeStructured<AiResult>({
      system: this.buildSystem(dto),
      prompt: this.buildPrompt(dto),
      toolName: 'offer_compare',
      toolDescription: '输出多 offer 多维度比较结果，包含加权评分、推荐、时薪对比和缺失信息',
      schema: OUTPUT_SCHEMA,
    });

    return this.applyGuards(result, dto.offers);
  }

  // ── 服务端确定性 guard ──────────────────────────────────────────────────────

  private applyGuards(result: AiResult, offers: OfferItemDto[]): AiResult {
    const weeklyHoursMap = new Map(offers.map((o) => [o.id, o.weekly_hours]));

    // Guard 2: confidence < medium → 删除 weighted_scores 中的 total_score 伪分
    // (low/insufficient 时评分可靠性不足，不得呈现精确分值误导决策)
    const shouldStrip =
      result.confidence === 'low' || result.confidence === 'insufficient';

    const weighted_scores = (result.weighted_scores ?? []).map((ws) => {
      if (shouldStrip) {
        const { total_score: _stripped, ...rest } = ws;
        void _stripped;
        return rest as AiWeightedScore;
      }
      return ws;
    });

    // Guard 3: 工时未知时强制 hourly_rate_rmb = null（不得估算）
    const hourly_rate_comparison = (result.hourly_rate_comparison ?? []).map((hr) => {
      const inputHours = weeklyHoursMap.get(hr.offer_id);
      if (!inputHours) {
        return { ...hr, weekly_hours: undefined, hourly_rate_rmb: null };
      }
      return hr;
    });

    return { ...result, weighted_scores, hourly_rate_comparison };
  }

  // ── Prompt builders ────────────────────────────────────────────────────────

  private buildSystem(dto: CompareOffersDto): string {
    const weightsDesc = dto.weights
      ? `用户自定义权重：薪酬 ${(dto.weights.compensation ?? 0.4) * 100}%，成长 ${(dto.weights.growth ?? 0.3) * 100}%，稳定性 ${(dto.weights.stability ?? 0.2) * 100}%，工作生活平衡 ${(dto.weights.work_life_balance ?? 0.1) * 100}%`
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
