import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { AnalyzeEducationPathDto } from './dto/analyze-education-path.dto';

// ─── Output types ──────────────────────────────────────────────────────────

export type EducationPathConfidence = 'high' | 'medium' | 'low' | 'insufficient';
export type PathImpact = 'supports_grad_school' | 'supports_work' | 'neutral';

export interface EvidenceItem {
  field: string;
  value: string;
  relevance: string;
}

export interface PathAnalysis {
  path_name: string;
  pros: string[];
  cons: string[];
  feasibility_note: string;
  opportunity_cost?: string;
}

export interface CriticalFactor {
  factor: string;
  user_situation: string;
  impact: PathImpact;
}

export interface EducationPathResult {
  summary: string;
  confidence: EducationPathConfidence;
  evidence_used: EvidenceItem[];
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  analysis: PathAnalysis[];
  recommendation: string;
  critical_factors: CriticalFactor[];
}

// ─── Raw AI output (before server-side guards) ─────────────────────────────

interface RawPathAnalysis {
  path_name?: string;
  pros?: string[];
  cons?: string[];
  feasibility_note?: string;
  opportunity_cost?: string;
}

interface RawCriticalFactor {
  factor?: string;
  user_situation?: string;
  impact?: string;
}

interface RawEvidenceItem {
  field?: string;
  value?: string;
  relevance?: string;
}

interface RawResult {
  summary?: string;
  confidence?: string;
  evidence_used?: RawEvidenceItem[];
  recommendations?: string[];
  risks?: string[];
  next_actions?: string[];
  follow_up_questions?: string[];
  cannot_determine?: string[];
  analysis?: RawPathAnalysis[];
  recommendation?: string;
  critical_factors?: RawCriticalFactor[];
}

const VALID_IMPACT = new Set<string>(['supports_grad_school', 'supports_work', 'neutral']);
const VALID_CONFIDENCE = new Set<string>(['high', 'medium', 'low', 'insufficient']);

// ─── Experienced worker detection ─────────────────────────────────────────

/**
 * GUARD 1: Detect experienced workers (years_of_experience >= 3).
 * Looks for explicit year mentions in the profile text.
 * Matches patterns like "3年经验", "5 年工作经验", "工作了4年" etc.
 */
function detectExperiencedWorker(profile: string): boolean {
  // Match Chinese patterns: N年经验/工作/从业/职场
  const yearPatterns = [
    /(\d+)\s*年.{0,6}(经验|工作|从业|职场|行业)/,
    /工作.{0,4}(\d+)\s*年/,
    /从事.{0,4}(\d+)\s*年/,
    /有\s*(\d+)\s*年/,
  ];
  for (const pat of yearPatterns) {
    const m = profile.match(pat);
    if (m) {
      const years = parseInt(m[1] ?? m[m.length - 1], 10);
      if (years >= 3) return true;
    }
  }
  return false;
}

@Injectable()
export class EducationPathService {
  constructor(private readonly ai: AiService) {}

  async analyze(dto: AnalyzeEducationPathDto): Promise<EducationPathResult> {
    const { profile, gpa, gpa_percentile, target_school_tier, economic_pressure, has_internship } =
      dto;

    // ── GUARD 1: education field required ─────────────────────────────────
    // Profile must contain education-related keywords to proceed.
    const educationKeywords = [
      '大学', '本科', '研究生', '硕士', '博士', '专科', '学历', '院校',
      '学校', '专业', '毕业', '在读', 'GPA', 'gpa', '绩点', '学生',
    ];
    const hasEducation = educationKeywords.some((kw) =>
      profile.toLowerCase().includes(kw.toLowerCase()),
    );
    if (!hasEducation) {
      throw new BadRequestException(
        '背景信息中缺少教育经历（学历、院校、专业等），无法进行读研 vs 就业分析。请补充教育背景后重试。',
      );
    }

    // ── GUARD 2: experienced worker detection — switch to in-service framework
    const isExperiencedWorker = detectExperiencedWorker(profile);

    // ── Build context hints ────────────────────────────────────────────────
    const gpaHint =
      gpa !== undefined
        ? `GPA：${gpa.toFixed(2)}${gpa_percentile !== undefined ? `（绩点排名 top ${gpa_percentile}%）` : ''}`
        : '';
    const tierHint = target_school_tier
      ? `意向院校层次：${this.schoolTierLabel(target_school_tier)}`
      : '';
    const economicHint =
      economic_pressure !== undefined ? `经济压力：${economic_pressure ? '较大（家庭难以承担读研成本）' : '不大'}` : '';
    const internshipHint =
      has_internship !== undefined ? `实习经历：${has_internship ? '有' : '无'}` : '';

    const contextLines = [gpaHint, tierHint, economicHint, internshipHint]
      .filter(Boolean)
      .join('\n');

    // ── Framework selection based on worker status ─────────────────────────
    const frameworkInstruction = isExperiencedWorker
      ? `
## 用户情况：在职人员（工作经验 ≥ 3 年）
请使用「在职读研 vs 脱产读研 vs 继续工作」框架，而非应届生框架。
分析路径应包括：
- 在职读专业硕士（非全日制 MBA/专硕）
- 脱产考研（全日制，放弃工作机会）
- 继续工作（不读研，专注晋升/跳槽）
不要分析保研路径（在职人员不适用）。`
      : `
## 用户情况：应届生或毕业未久
分析路径应包括（根据 GPA 和 profile 选取适合的路径）：
- 保研（仅当 GPA ≥ 3.7 或 gpa_percentile ≤ 20% 时才分析此路径）
- 考研（参加全国统一考试，需评估竞争难度）
- 出国读研（申请海外硕士，评估 GPA、经济承受力）
- 直接工作校招（应届生特有优势，评估放弃校招的机会成本）`;

    const system = `你是一位专业的升学与职业规划顾问，深度了解中国就业市场和读研现状。
请用中文分析用户的读研与就业选择，给出客观的路径对比分析。
${frameworkInstruction}

## 防编造硬性规则（必须遵守）
1. 所有分析必须基于用户提供的 profile 字段，禁止泛化推断
2. evidence_used 中每条证据必须明确引用 profile 中的具体字段，无法在 profile 中找到来源的证据必须省略
3. 不得给出情绪化建议，如"读研总是有价值的""学历镀金有用"等无数据支撑的泛化表述
4. 不得推荐超出用户 GPA 的保研目标：若用户 GPA < 3.7 且未提供 gpa_percentile ≤ 20%，禁止推荐保研路径
5. 机会成本必须计算：选择读研路径时，必须在 opportunity_cost 字段中估算（对口岗位薪资 × 读研年数 + 学费），不得遗漏
6. 若背景信息不足以支撑分析，confidence 设为 insufficient，在 cannot_determine 列出缺失信息，不得编造
7. 不得使用"我相信""我认为""读研一定会…"等主观表述
8. analysis 中每条 pros/cons 必须引用 profile 或用户提供的具体数据，不得空泛

## 中国市场特有路径（必须在分析中涵盖适用路径）
- 保研：GPA ≥ 3.7 或 top 10-20%，无需全国统考，直接与导师联系
- 考研：参加全国统一考试，2024 年报考 438 万人，整体上岸率约 20-25%
- 出国读研：申请海外硕士/博士，需 GPA、语言成绩、经济支撑
- 直接工作校招：应届生身份只用一次，大厂 SP/SSP 只开放给应届生
- 在职读专业硕士（MBA/非全）：在职人员路径，不影响收入但时间压力大
- 先就业再考研：工作 1-3 年后脱产考研，有行业经验但付出机会成本

## 经济成本分析要求
读研总成本 = 学费（1-4万/年）× 年数 + 机会成本（对口工作月薪 × 12 × 年数）
在 opportunity_cost 字段中列出估算公式，数字需基于用户 profile 中的薪资预期或实习收入

输出语言：中文（字段名保持英文）。严格按指定 JSON Schema 输出，不要添加额外内容。`;

    const prompt = `## 用户背景（profile）
${profile}
${contextLines ? `\n## 补充信息\n${contextLines}` : ''}

请基于上述信息分析读研 vs 就业路径，所有 evidence_used 必须引用 profile 中的真实字段，不得编造。`;

    const raw = await this.ai.completeStructured<RawResult>({
      system,
      prompt,
      toolName: 'education_path_analysis',
      toolDescription: '输出结构化读研 vs 就业路径分析',
      schema: {
        type: 'object',
        required: [
          'summary', 'confidence', 'evidence_used', 'recommendations', 'risks',
          'next_actions', 'follow_up_questions', 'cannot_determine',
          'analysis', 'recommendation', 'critical_factors',
        ],
        properties: {
          summary: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low', 'insufficient'] },
          evidence_used: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'value', 'relevance'],
              properties: {
                field: { type: 'string' },
                value: { type: 'string' },
                relevance: { type: 'string' },
              },
            },
          },
          recommendations: { type: 'array', items: { type: 'string' } },
          risks: { type: 'array', items: { type: 'string' } },
          next_actions: { type: 'array', items: { type: 'string' } },
          follow_up_questions: { type: 'array', items: { type: 'string' } },
          cannot_determine: { type: 'array', items: { type: 'string' } },
          analysis: {
            type: 'array',
            items: {
              type: 'object',
              required: ['path_name', 'pros', 'cons', 'feasibility_note'],
              properties: {
                path_name: { type: 'string' },
                pros: { type: 'array', items: { type: 'string' } },
                cons: { type: 'array', items: { type: 'string' } },
                feasibility_note: { type: 'string' },
                opportunity_cost: { type: 'string' },
              },
            },
          },
          recommendation: { type: 'string' },
          critical_factors: {
            type: 'array',
            items: {
              type: 'object',
              required: ['factor', 'user_situation', 'impact'],
              properties: {
                factor: { type: 'string' },
                user_situation: { type: 'string' },
                impact: {
                  type: 'string',
                  enum: ['supports_grad_school', 'supports_work', 'neutral'],
                },
              },
            },
          },
        },
      },
    });

    return this.applyGuards(raw, profile, gpa, gpa_percentile);
  }

  // ─── Server-side deterministic guards ─────────────────────────────────────

  /**
   * GUARD 3: evidence_used must anchor to profile — prune fabricated items.
   * GUARD 4: critical_factors.impact must be valid enum; default to 'neutral'.
   * GUARD 5: No grad school path with GPA < 3.5 and no percentile data —
   *          remove baoyuan (保研) path if GPA too low.
   * GUARD 6: opportunity_cost must be present for grad school paths;
   *          if missing, inject a note to prompt user for more data.
   */
  private applyGuards(
    raw: RawResult,
    profile: string,
    gpa?: number,
    gpa_percentile?: number,
  ): EducationPathResult {
    const lowerProfile = profile.toLowerCase();

    // GUARD 3: prune evidence not anchored to profile
    const filteredEvidence: EvidenceItem[] = (raw.evidence_used ?? []).filter((e) => {
      if (!e.field || !e.value) return false;
      const val = e.value.toLowerCase();
      if (val.length <= 4) return true;
      return (
        lowerProfile.includes(val) ||
        lowerProfile.includes(val.slice(0, Math.min(val.length, 10)))
      );
    }).map((e) => ({
      field: e.field as string,
      value: e.value as string,
      relevance: e.relevance ?? '',
    }));

    // GUARD 4: normalize impact enum
    const normalizedFactors: CriticalFactor[] = (raw.critical_factors ?? []).map((f) => ({
      factor: f.factor ?? '',
      user_situation: f.user_situation ?? '',
      impact: VALID_IMPACT.has(f.impact ?? '') ? (f.impact as PathImpact) : 'neutral',
    }));

    // GUARD 5: remove 保研 path if GPA clearly insufficient
    // 保研 requires GPA >= 3.7 or top 20%. If user explicitly provides low GPA, strip it.
    const gpaTooLow =
      gpa !== undefined && gpa < 3.5 && (gpa_percentile === undefined || gpa_percentile > 25);
    const normalizedAnalysis: PathAnalysis[] = (raw.analysis ?? []).filter((p) => {
      if (!gpaTooLow) return true;
      const name = (p.path_name ?? '').toLowerCase();
      // Remove 保研 path when GPA is clearly too low
      return !name.includes('保研');
    }).map((p) => ({
      path_name: p.path_name ?? '',
      pros: p.pros ?? [],
      cons: p.cons ?? [],
      feasibility_note: p.feasibility_note ?? '',
      ...(p.opportunity_cost !== undefined ? { opportunity_cost: p.opportunity_cost } : {}),
    }));

    // GUARD 6: grad school paths without opportunity_cost get a placeholder note
    for (const path of normalizedAnalysis) {
      const isGradPath =
        path.path_name.includes('考研') ||
        path.path_name.includes('保研') ||
        path.path_name.includes('出国') ||
        path.path_name.includes('脱产') ||
        path.path_name.includes('读研');
      if (isGradPath && !path.opportunity_cost) {
        path.opportunity_cost =
          '机会成本需结合对口薪资估算，请补充「期望月薪」或「当前实习收入」以获得精确计算';
      }
    }

    return {
      summary: raw.summary ?? '',
      confidence: VALID_CONFIDENCE.has(raw.confidence ?? '')
        ? (raw.confidence as EducationPathConfidence)
        : 'low',
      evidence_used: filteredEvidence,
      recommendations: raw.recommendations ?? [],
      risks: raw.risks ?? [],
      next_actions: raw.next_actions ?? [],
      follow_up_questions: raw.follow_up_questions ?? [],
      cannot_determine: raw.cannot_determine ?? [],
      analysis: normalizedAnalysis,
      recommendation: raw.recommendation ?? '',
      critical_factors: normalizedFactors,
    };
  }

  private schoolTierLabel(tier: string): string {
    const map: Record<string, string> = {
      '985': '985 院校',
      '211': '211 院校',
      double_first_class: '双一流院校',
      regular: '普通本科',
      any: '不限',
    };
    return map[tier] ?? tier;
  }
}
