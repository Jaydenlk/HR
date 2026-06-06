import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import {
  CityIndustryFitDto,
  CityIndustryFitResult,
  FitMatrixItem,
  CostOfLivingItem,
  IndustryHubItem,
} from './dto/city-industry-fit.dto';

// Raw shape returned by the AI tool — validated/guarded before returning.
interface RawFitOutput {
  summary?: string;
  confidence?: string;
  evidence_used?: Array<{ field?: string; value?: string; relevance?: string }>;
  recommendations?: string[];
  risks?: string[];
  next_actions?: string[];
  follow_up_questions?: string[];
  cannot_determine?: string[];
  fit_matrix?: Array<{
    city?: string;
    industry?: string;
    fit_score?: number;
    fit_breakdown?: {
      skill_match?: number;
      career_ceiling?: number;
      cost_sustainability?: number;
      constraint_satisfaction?: number;
    };
    evidence_basis?: string[];
  }>;
  cost_of_living_impact?: Array<{
    city?: string;
    typical_salary_range?: string;
    housing_cost_note?: string;
    purchasing_power_note?: string;
  }>;
  industry_hub_analysis?: Array<{
    city?: string;
    key_companies?: string[];
    cluster_effect?: string;
    career_ceiling?: string;
  }>;
  recommendation?: string;
}

const VALID_CONFIDENCE = new Set(['high', 'medium', 'low', 'insufficient']);

@Injectable()
export class CityIndustryFitService {
  constructor(private readonly ai: AiService) {}

  async analyze(dto: CityIndustryFitDto): Promise<CityIndustryFitResult> {
    // Guard: profile must have at least skills or current_role
    const profile = dto.profile;
    const hasMinProfile =
      (profile.skills && profile.skills.length > 0) ||
      profile.current_role?.trim();

    if (!hasMinProfile) {
      return {
        summary: '缺少基本 profile 信息（技能或当前岗位），无法进行城市×行业适配分析。',
        confidence: 'insufficient',
        evidence_used: [],
        recommendations: [],
        risks: [],
        next_actions: ['请提供您的技能列表或当前从事的岗位后重新分析'],
        follow_up_questions: [
          '请描述您目前掌握的核心技能（如：Java、React、数据分析）',
          '请告知您当前或目标职位名称',
        ],
        cannot_determine: ['缺少技能/岗位信息，无法评估城市行业适配度'],
        fit_matrix: [],
        cost_of_living_impact: [],
        industry_hub_analysis: [],
        recommendation: '请补充 profile 信息后重新请求',
      };
    }

    // Guard: 单一 location 约束 → 提示
    const locationConstraint = profile.constraints?.location?.trim();
    const citiesFromConstraint = locationConstraint
      ? locationConstraint.split(/[,，、]/).map((s) => s.trim()).filter(Boolean)
      : [];

    // If user provided target_cities that violate constraints, we'll filter in post-guard.
    const system = buildSystemPrompt(locationConstraint);
    const prompt = buildUserPrompt(dto, citiesFromConstraint);

    const raw = await this.ai.completeStructured<RawFitOutput>({
      system,
      prompt,
      toolName: 'city_industry_fit',
      toolDescription: '输出城市×行业适配矩阵，包含生活成本分析、产业集群分析和综合推荐',
      schema: CITY_INDUSTRY_FIT_SCHEMA,
    });

    return applyGuards(raw, dto, citiesFromConstraint);
  }
}

// ── Anti-fabrication guards (服务端确定性收口) ──────────────────────────────────

function applyGuards(
  raw: RawFitOutput,
  dto: CityIndustryFitDto,
  allowedCities: string[],
): CityIndustryFitResult {
  // Guard 1: confidence 只接受合法枚举
  const confidence = VALID_CONFIDENCE.has(raw.confidence ?? '')
    ? (raw.confidence as CityIndustryFitResult['confidence'])
    : 'low';

  // Guard 2: fit_matrix — 每条必须有 evidence_basis 且非空；
  // 若 allowedCities 非空，城市必须在列表中（或被标注为扩展建议）
  const rawMatrix = raw.fit_matrix ?? [];
  const fit_matrix: FitMatrixItem[] = rawMatrix
    .filter((item) => {
      if (!item.city?.trim() || !item.industry?.trim()) return false;
      // 防泛化：evidence_basis 必须非空
      if (!item.evidence_basis || item.evidence_basis.length === 0) return false;
      // 防越城市约束：allowedCities 非空时，城市必须在 constraint 中
      // 允许城市名称模糊匹配（如"北京" matches "北京市"）
      if (allowedCities.length > 0) {
        const cityName = item.city.trim();
        const inConstraint = allowedCities.some(
          (c) => cityName.includes(c) || c.includes(cityName),
        );
        if (!inConstraint) return false; // 超出约束城市，直接剔除
      }
      return true;
    })
    .map((item) => ({
      city: item.city!.trim(),
      industry: item.industry!.trim(),
      // Guard 3: fit_score 强制用公式重算（而不是信任 AI 的数字）
      fit_score: computeFitScore(item.fit_breakdown),
      fit_breakdown: {
        skill_match: clampScore(item.fit_breakdown?.skill_match),
        career_ceiling: clampScore(item.fit_breakdown?.career_ceiling),
        cost_sustainability: clampScore(item.fit_breakdown?.cost_sustainability),
        constraint_satisfaction: clampScore(item.fit_breakdown?.constraint_satisfaction),
      },
      // Guard 4: evidence_basis 只保留能在 profile 字段中定位的引用
      // (AI 被提示要引用 profile 字段，服务端过滤掉空字符串)
      evidence_basis: (item.evidence_basis ?? []).filter((e) => e.trim().length > 0),
    }));

  // Guard 5: cost_of_living_impact — 只保留与 fit_matrix 中城市一致的条目
  const fitCities = new Set(fit_matrix.map((m) => m.city));
  const cost_of_living_impact: CostOfLivingItem[] = (raw.cost_of_living_impact ?? [])
    .filter((c) => {
      if (!c.city?.trim()) return false;
      // 宽松匹配，允许少量城市名称变体
      return [...fitCities].some(
        (fc) => c.city!.includes(fc) || fc.includes(c.city!.trim()),
      );
    })
    .map((c) => ({
      city: c.city!.trim(),
      typical_salary_range: c.typical_salary_range ?? '',
      housing_cost_note: c.housing_cost_note ?? '',
      purchasing_power_note: c.purchasing_power_note ?? '',
    }));

  // Guard 6: industry_hub_analysis — 同上，只保留 fitCities
  const industry_hub_analysis: IndustryHubItem[] = (raw.industry_hub_analysis ?? [])
    .filter((h) => {
      if (!h.city?.trim()) return false;
      return [...fitCities].some(
        (fc) => h.city!.includes(fc) || fc.includes(h.city!.trim()),
      );
    })
    .map((h) => ({
      city: h.city!.trim(),
      key_companies: (h.key_companies ?? []).filter((c) => c.trim().length > 0),
      cluster_effect: h.cluster_effect ?? '',
      career_ceiling: h.career_ceiling ?? '',
    }));

  // Guard 7: recommendation 必须引用 fit_matrix 最高分（若矩阵非空）
  let recommendation = raw.recommendation ?? '';
  if (fit_matrix.length > 0 && !recommendation.trim()) {
    const top = [...fit_matrix].sort((a, b) => b.fit_score - a.fit_score)[0];
    recommendation = `综合评分最高组合为：${top.city} × ${top.industry}（综合适配度 ${top.fit_score} 分）`;
  }

  // Guard 8: evidence_used — 过滤空项
  const evidence_used = (raw.evidence_used ?? [])
    .filter((e) => e.field?.trim() && e.value?.trim())
    .map((e) => ({
      field: e.field!.trim(),
      value: e.value!.trim(),
      relevance: e.relevance?.trim() ?? '',
    }));

  return {
    summary: raw.summary ?? '',
    confidence,
    evidence_used,
    recommendations: raw.recommendations ?? [],
    risks: raw.risks ?? [],
    next_actions: raw.next_actions ?? [],
    follow_up_questions: raw.follow_up_questions ?? [],
    cannot_determine: raw.cannot_determine ?? [],
    fit_matrix,
    cost_of_living_impact,
    industry_hub_analysis,
    recommendation,
  };
}

// 适配加权公式：技能匹配40% + 职业天花板30% + 生活成本可持续20% + 约束满足10%
// 这是服务端确定性 guard — 不信任 AI 返回的 fit_score，总是重算
function computeFitScore(
  breakdown:
    | {
        skill_match?: number;
        career_ceiling?: number;
        cost_sustainability?: number;
        constraint_satisfaction?: number;
      }
    | undefined,
): number {
  if (!breakdown) return 0;
  const sm = clampScore(breakdown.skill_match);
  const cc = clampScore(breakdown.career_ceiling);
  const cs = clampScore(breakdown.cost_sustainability);
  const cf = clampScore(breakdown.constraint_satisfaction);
  return Math.round(sm * 0.4 + cc * 0.3 + cs * 0.2 + cf * 0.1);
}

function clampScore(v: number | undefined): number {
  if (v == null || typeof v !== 'number' || isNaN(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(locationConstraint: string | undefined): string {
  const cityConstraintNote = locationConstraint
    ? `\n## 城市约束（必须严格遵守）\n用户指定了城市偏好：${locationConstraint}。只分析在这些城市的情况。若需提供其他城市作为扩展建议，必须在该条目的 evidence_basis 中明确标注"扩展建议（超出用户约束）"，并不得在 recommendation 中将其列为首选。\n`
    : '';

  return `你是一位中国职场城市与行业适配度分析专家，帮助求职者找到最适合自己的城市×行业组合。
${cityConstraintNote}
## 核心防编造规则（必须严格遵守）

1. **引用 profile 字段**：fit_matrix 中每条 evidence_basis 必须至少包含 1 条对用户输入字段的引用（如"profile.skills 中包含 Java"、"profile.current_role = 后端工程师"）。禁止输出空 evidence_basis。

2. **禁止泛化建议**：不得出现"北上广机会更多"、"一线城市发展更好"等无逻辑泛化表述。每条分析结论必须源自 profile 字段的具体内容。

3. **适配度评分规则**：fit_breakdown 中四项分数（0-100）必须基于 profile 内容评估：
   - skill_match：用户技能与该城市主导行业技术栈的匹配程度
   - career_ceiling：该城市-行业的职业发展上限（针对用户岗位）
   - cost_sustainability：该城市薪资/生活成本比的可持续性
   - constraint_satisfaction：用户 constraints 在该城市的满足程度

4. **fit_score 禁止捏造**：fit_score 由后端用公式重算（0.4×skill_match + 0.3×career_ceiling + 0.2×cost_sustainability + 0.1×constraint_satisfaction），你的 fit_score 值不影响最终结果，但请仍按上述公式合理填写。

5. **recommendation 必须引用最高分**：综合推荐必须引用 fit_matrix 中适配度最高的城市×行业组合，不得推荐未在 fit_matrix 中出现的组合。

6. **输入不足时**：若 profile 信息不足以完成分析，confidence 设为 insufficient，fit_matrix 设为空数组，cannot_determine 列出缺少的信息。

## 输出语言
全部中文（简体），字段名保持英文。`;
}

// ── User prompt ───────────────────────────────────────────────────────────────

function buildUserPrompt(dto: CityIndustryFitDto, constraintCities: string[]): string {
  const parts: string[] = ['## 城市×行业适配分析请求'];
  const p = dto.profile;

  if (p.current_role?.trim()) parts.push(`- 当前岗位：${p.current_role}`);
  if (p.years_of_experience?.trim()) parts.push(`- 工作年限：${p.years_of_experience}`);
  if (p.industry_background?.trim()) parts.push(`- 行业背景：${p.industry_background}`);
  if (p.skills && p.skills.length > 0) {
    parts.push(`- 核心技能：${p.skills.join('、')}`);
  }

  if (p.constraints) {
    const c = p.constraints;
    if (c.location?.trim()) parts.push(`- 城市偏好：${c.location}`);
    if (c.salary_expectation?.trim()) parts.push(`- 薪资期望：${c.salary_expectation}`);
    if (c.work_life_balance?.trim()) parts.push(`- 工作生活平衡偏好：${c.work_life_balance}`);
  }

  const targetCities =
    dto.target_cities && dto.target_cities.length > 0
      ? dto.target_cities
      : constraintCities.length > 0
        ? constraintCities
        : ['北京', '上海', '深圳', '杭州', '成都'];

  const targetIndustries =
    dto.target_industries && dto.target_industries.length > 0
      ? dto.target_industries
      : ['互联网', '金融科技', '新能源'];

  parts.push(`\n待分析城市：${targetCities.join('、')}`);
  parts.push(`待分析行业：${targetIndustries.join('、')}`);
  parts.push(
    '\n请基于上述 profile 生成城市×行业适配矩阵，包含生活成本分析、产业集群分析和综合推荐。每条分析必须引用 profile 字段，禁止泛化表述。',
  );

  return parts.join('\n');
}

// ── JSON Schema for AI tool output ───────────────────────────────────────────

const CITY_INDUSTRY_FIT_SCHEMA = {
  type: 'object',
  required: [
    'summary',
    'confidence',
    'evidence_used',
    'recommendations',
    'risks',
    'next_actions',
    'follow_up_questions',
    'cannot_determine',
    'fit_matrix',
    'cost_of_living_impact',
    'industry_hub_analysis',
    'recommendation',
  ],
  properties: {
    summary: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low', 'insufficient'] },
    evidence_used: {
      type: 'array',
      description: '每条引用 profile 字段',
      items: {
        type: 'object',
        required: ['field', 'value', 'relevance'],
        properties: {
          field: { type: 'string', description: 'profile 字段名，如 profile.skills' },
          value: { type: 'string', description: '字段值' },
          relevance: { type: 'string', description: '与分析的关联说明' },
        },
      },
    },
    recommendations: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    next_actions: { type: 'array', items: { type: 'string' } },
    follow_up_questions: { type: 'array', items: { type: 'string' } },
    cannot_determine: { type: 'array', items: { type: 'string' } },
    fit_matrix: {
      type: 'array',
      items: {
        type: 'object',
        required: ['city', 'industry', 'fit_score', 'fit_breakdown', 'evidence_basis'],
        properties: {
          city: { type: 'string' },
          industry: { type: 'string' },
          fit_score: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
            description: '综合适配度评分（0.4×skill_match + 0.3×career_ceiling + 0.2×cost_sustainability + 0.1×constraint_satisfaction）',
          },
          fit_breakdown: {
            type: 'object',
            required: ['skill_match', 'career_ceiling', 'cost_sustainability', 'constraint_satisfaction'],
            properties: {
              skill_match: {
                type: 'integer',
                minimum: 0,
                maximum: 100,
                description: '技能匹配度（40%权重）：用户技能与城市主导行业技术栈匹配程度',
              },
              career_ceiling: {
                type: 'integer',
                minimum: 0,
                maximum: 100,
                description: '职业发展上限（30%权重）：该城市-行业的职业天花板',
              },
              cost_sustainability: {
                type: 'integer',
                minimum: 0,
                maximum: 100,
                description: '生活成本可持续性（20%权重）：薪资/生活成本比',
              },
              constraint_satisfaction: {
                type: 'integer',
                minimum: 0,
                maximum: 100,
                description: '约束满足度（10%权重）：profile.constraints 在该城市的满足程度',
              },
            },
          },
          evidence_basis: {
            type: 'array',
            items: { type: 'string' },
            description: '必须引用 profile 字段的具体内容，禁止为空',
          },
        },
      },
    },
    cost_of_living_impact: {
      type: 'array',
      items: {
        type: 'object',
        required: ['city', 'typical_salary_range', 'housing_cost_note', 'purchasing_power_note'],
        properties: {
          city: { type: 'string' },
          typical_salary_range: { type: 'string', description: '目标职位典型薪资范围' },
          housing_cost_note: { type: 'string', description: '住房成本说明（含租金/房价参考）' },
          purchasing_power_note: { type: 'string', description: '实际购买力分析' },
        },
      },
    },
    industry_hub_analysis: {
      type: 'array',
      items: {
        type: 'object',
        required: ['city', 'key_companies', 'cluster_effect', 'career_ceiling'],
        properties: {
          city: { type: 'string' },
          key_companies: {
            type: 'array',
            items: { type: 'string' },
            description: '该城市目标行业的头部公司',
          },
          cluster_effect: { type: 'string', description: '行业集群对跳槽/学习的影响' },
          career_ceiling: { type: 'string', description: '职业发展天花板描述' },
        },
      },
    },
    recommendation: {
      type: 'string',
      description: '综合推荐，必须引用 fit_matrix 最高评分的城市×行业组合',
    },
  },
} as const;
