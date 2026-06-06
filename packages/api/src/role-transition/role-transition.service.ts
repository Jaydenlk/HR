import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { AnalyzeRoleTransitionDto } from './dto/analyze-role-transition.dto';

// ─── Output types ──────────────────────────────────────────────────────────

export type Feasibility = 'high' | 'medium' | 'low' | 'not_feasible';
export type GapSeverity = 'critical' | 'important' | 'nice_to_have';
export type Confidence = 'high' | 'medium' | 'low' | 'insufficient';
export type UserStatus = 'has' | 'partial' | 'missing';

export interface EvidenceItem {
  field: string;
  value: string;
  relevance: string;
}

export interface SkillGapItem {
  skill_name: string;
  current_level: string;
  required_level: string;
  gap_severity: GapSeverity;
  remedy: string;
  estimated_months: number;
}

export interface TransitionPath {
  path_name: string;
  description: string;
  duration: string;
  success_rate_note?: string;
}

export interface SuccessFactor {
  factor: string;
  user_status: UserStatus;
  evidence?: string;
}

export interface RoleTransitionResult {
  feasibility: Feasibility;
  feasibility_rationale: string;
  confidence: Confidence;
  summary: string;
  skill_gap: SkillGapItem[];
  typical_transition_path: TransitionPath[];
  success_factors: SuccessFactor[];
  first_step: string;
  evidence_used: EvidenceItem[];
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
}

// ─── Raw AI output (before server-side guards) ─────────────────────────────
// Use a separate type so gap_severity can be `string` (AI may return illegal values).

interface RawSkillGapItem {
  skill_name: string;
  current_level: string;
  required_level: string;
  gap_severity: string; // validated/normalized by GUARD 4
  remedy: string;
  estimated_months?: number;
}

interface RawEvidenceItem {
  field?: string;
  value?: string;
  relevance?: string;
}

interface RawResult {
  feasibility: string;
  feasibility_rationale?: string;
  confidence: string;
  summary?: string;
  skill_gap?: RawSkillGapItem[];
  typical_transition_path?: TransitionPath[];
  success_factors?: SuccessFactor[];
  first_step?: string;
  evidence_used?: RawEvidenceItem[];
  recommendations?: string[];
  risks?: string[];
  next_actions?: string[];
  follow_up_questions?: string[];
  cannot_determine?: string[];
}

const VALID_SEVERITY = new Set<string>(['critical', 'important', 'nice_to_have']);

@Injectable()
export class RoleTransitionService {
  constructor(private readonly ai: AiService) {}

  async analyze(dto: AnalyzeRoleTransitionDto): Promise<RoleTransitionResult> {
    const { profile, target_role, target_company_type, timeline_months } = dto;

    // ── GUARD 1: same-role detection ────────────────────────────────────────
    // 简单文本匹配:如果 profile 中明确描述了与 target_role 相同的职位,提示改用路径规划。
    // 用大小写不敏感的包含匹配:profile 含 target_role 文本且 target_role 长度≥4。
    if (
      target_role.length >= 4 &&
      profile.toLowerCase().includes(target_role.toLowerCase())
    ) {
      // 只有当 profile 中出现"现任""当前""目前""正在担任"等信号词时才判定为 same_role
      const sameRoleSignals = ['现任', '当前', '目前', '正在担任', '担任', '从事', '现职'];
      const lowerProfile = profile.toLowerCase();
      const hasSameRoleSignal = sameRoleSignals.some((s) =>
        lowerProfile.includes(s + target_role.toLowerCase().slice(0, 4)) ||
        (lowerProfile.includes(s) && lowerProfile.includes(target_role.toLowerCase())),
      );
      if (hasSameRoleSignal) {
        throw new BadRequestException(
          `当前角色与目标角色"${target_role}"相同，无需转岗分析。建议使用职业路径规划功能了解晋升路径。`,
        );
      }
    }

    const companyHint = target_company_type
      ? `目标公司类型：${this.companyTypeLabel(target_company_type)}。`
      : '';
    const timelineHint = timeline_months
      ? `期望完成转型的时间：${timeline_months} 个月。`
      : '';

    const system = `你是一位专业的职业转型顾问，深度了解中国就业市场。
请用中文分析用户从当前背景转向目标职位的可行性。

## 防编造硬性规则（必须遵守）
1. 所有分析必须严格基于用户提供的背景信息（profile）字段，禁止泛化推断
2. evidence_used 中的每条证据必须明确引用 profile 中的具体字段名（如 work_experience、skills、education 等）；无法在 profile 中找到来源的证据必须省略
3. feasibility 按技能差距数量判定：critical 差距 ≤ 2 项 → high；3-4 项 → medium；5 项以上 → low；角色对立（无技术背景转高级架构师等）→ not_feasible
4. skill_gap 中 gap_severity 只能是：critical / important / nice_to_have，不得使用其他值
5. 若背景信息不足以支撑分析，confidence 设为 insufficient，在 cannot_determine 列出缺失信息，不得编造
6. success_factors 中 evidence 字段必须来自 profile 的真实内容，否则留空字符串
7. 不得输出"经验丰富""技能扎实"等无根据的正面评价；所有评价必须有 profile 字段支撑

## 中国市场高频转型场景（优先按以下模式分析）
### 文转产品（非技术背景转产品经理）
- 可行性因素：数据分析能力、用户同理心、业务理解深度、是否掌握 SQL
- 风险：没有 SQL 能力的纯文科生较难通过大厂 PM 面试
- 突破口：从业务型 PM（运营、商务背景）或垂直行业 PM 切入

### 技术转管理（工程师转 TL / 研发经理）
- 可行性因素：现有团队管理经验、技术深度、沟通协调能力
- 风险：大厂对纯管理岗要求带大团队经历，小公司更易过渡
- 突破口：在现岗争取 Tech Lead 机会，避免直接投递纯管理岗

### 大厂转体制（互联网转国企 / 事业单位）
- 可行性因素：目标单位的技术化程度、数字化转型需求
- 风险：薪资通常折损 40-60%，升职路径与大厂逻辑完全不同
- 突破口：技术型国企（国家电网、中移动技术系统、银行科技子公司）匹配度更高

### 应届转行（毕业不久换专业方向）
- 可行性因素：学习能力证明（项目 / 竞赛）、目标方向的门槛高低
- 突破口：参加训练营获得作品集，或在现岗内部迁移

输出语言：中文（字段名保持英文）。严格按指定 JSON Schema 输出，不要添加额外内容。`;

    const prompt = `## 用户背景（profile）
${profile}

## 目标职位
${target_role}

${companyHint}
${timelineHint}

请基于上述信息分析转岗可行性，所有 evidence_used 必须引用 profile 中的真实字段，不得编造。`;

    const raw = await this.ai.completeStructured<RawResult>({
      system,
      prompt,
      toolName: 'role_transition_analysis',
      toolDescription: '输出结构化转岗可行性分析',
      schema: {
        type: 'object',
        required: [
          'feasibility', 'feasibility_rationale', 'confidence', 'summary',
          'skill_gap', 'typical_transition_path', 'success_factors', 'first_step',
          'evidence_used', 'recommendations', 'risks', 'next_actions',
          'follow_up_questions', 'cannot_determine',
        ],
        properties: {
          feasibility: { type: 'string', enum: ['high', 'medium', 'low', 'not_feasible'] },
          feasibility_rationale: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low', 'insufficient'] },
          summary: { type: 'string' },
          skill_gap: {
            type: 'array',
            items: {
              type: 'object',
              required: ['skill_name', 'current_level', 'required_level', 'gap_severity', 'remedy'],
              properties: {
                skill_name: { type: 'string' },
                current_level: { type: 'string' },
                required_level: { type: 'string' },
                gap_severity: { type: 'string', enum: ['critical', 'important', 'nice_to_have'] },
                remedy: { type: 'string' },
                estimated_months: { type: 'number', minimum: 0 },
              },
            },
          },
          typical_transition_path: {
            type: 'array',
            items: {
              type: 'object',
              required: ['path_name', 'description', 'duration'],
              properties: {
                path_name: { type: 'string' },
                description: { type: 'string' },
                duration: { type: 'string' },
                success_rate_note: { type: 'string' },
              },
            },
          },
          success_factors: {
            type: 'array',
            items: {
              type: 'object',
              required: ['factor', 'user_status'],
              properties: {
                factor: { type: 'string' },
                user_status: { type: 'string', enum: ['has', 'partial', 'missing'] },
                evidence: { type: 'string' },
              },
            },
          },
          first_step: { type: 'string' },
          evidence_used: {
            type: 'array',
            items: {
              type: 'object',
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
        },
      },
    });

    return this.applyGuards(raw, profile);
  }

  // ─── Server-side deterministic guards ─────────────────────────────────────

  /**
   * GUARD 2: feasibility 按 critical gap 数强制校正
   * ≤2 critical → high; 3-4 → medium; ≥5 → low; extreme → not_feasible
   *
   * GUARD 3: evidence_used 必须锚定 profile 字段——剔除 field 为空或 value 在 profile 中找不到的条目
   *
   * GUARD 4: gap_severity 仅接受合法枚举值;非法值降为 important
   */
  private applyGuards(raw: RawResult, profile: string): RoleTransitionResult {
    // GUARD 4: normalize gap_severity
    const normalizedGaps: SkillGapItem[] = (raw.skill_gap ?? []).map((g) => ({
      skill_name: g.skill_name,
      current_level: g.current_level,
      required_level: g.required_level,
      gap_severity: VALID_SEVERITY.has(g.gap_severity)
        ? (g.gap_severity as GapSeverity)
        : 'important',
      remedy: g.remedy,
      estimated_months: typeof g.estimated_months === 'number' && g.estimated_months >= 0
        ? Math.round(g.estimated_months)
        : 0,
    }));

    // GUARD 2: feasibility override based on critical gap count
    const criticalCount = normalizedGaps.filter((g) => g.gap_severity === 'critical').length;
    const forcedFeasibility = this.deriveFeasibility(criticalCount, raw.feasibility);

    // GUARD 3: evidence pruning — keep only items whose value appears in profile text
    const lowerProfile = profile.toLowerCase();
    const filteredEvidence: EvidenceItem[] = (raw.evidence_used ?? []).filter((e) => {
      if (!e.field || !e.value) return false;
      // Check if the evidence value appears verbatim in profile
      const val = e.value.toLowerCase();
      // Short values (≤4 chars) are too generic to anchor reliably — keep them
      if (val.length <= 4) return true;
      return lowerProfile.includes(val);
    }).map((e) => ({
      field: e.field as string,
      value: e.value as string,
      relevance: e.relevance ?? '',
    }));

    return {
      feasibility: forcedFeasibility,
      feasibility_rationale: raw.feasibility_rationale ?? '',
      confidence: this.normalizeConfidence(raw.confidence),
      summary: raw.summary ?? '',
      skill_gap: normalizedGaps,
      typical_transition_path: (raw.typical_transition_path ?? []).map((p) => ({
        path_name: p.path_name,
        description: p.description,
        duration: p.duration,
        ...(p.success_rate_note ? { success_rate_note: p.success_rate_note } : {}),
      })),
      success_factors: (raw.success_factors ?? []).map((f) => ({
        factor: f.factor,
        user_status: f.user_status,
        ...(f.evidence ? { evidence: f.evidence } : {}),
      })),
      first_step: raw.first_step ?? '',
      evidence_used: filteredEvidence,
      recommendations: raw.recommendations ?? [],
      risks: raw.risks ?? [],
      next_actions: raw.next_actions ?? [],
      follow_up_questions: raw.follow_up_questions ?? [],
      cannot_determine: raw.cannot_determine ?? [],
    };
  }

  /**
   * GUARD 2 detail:
   * - Derive feasibility from critical gap count (authoritative).
   * - Exception: if AI says not_feasible AND criticalCount === 0, the gap is structural
   *   (role opposition, e.g., "no tech background → senior architect") — preserve not_feasible.
   * - If AI overclaims not_feasible but there are measurable critical gaps, override with count.
   */
  private deriveFeasibility(criticalCount: number, aiReported: string): Feasibility {
    // Structural impossibility: no skill gaps to count, but role is fundamentally incompatible.
    if (aiReported === 'not_feasible' && criticalCount === 0) return 'not_feasible';
    // Count-based derivation (authoritative over AI's self-assessment)
    if (criticalCount <= 2) return 'high';
    if (criticalCount <= 4) return 'medium';
    return 'low';
  }

  private normalizeConfidence(value: string | undefined): Confidence {
    const valid: Confidence[] = ['high', 'medium', 'low', 'insufficient'];
    return valid.includes(value as Confidence) ? (value as Confidence) : 'low';
  }

  private companyTypeLabel(type: string): string {
    const map: Record<string, string> = {
      internet: '互联网公司',
      state_owned: '国有企业 / 体制内',
      foreign: '外资企业',
      startup: '创业公司',
      any: '不限',
    };
    return map[type] ?? type;
  }
}
