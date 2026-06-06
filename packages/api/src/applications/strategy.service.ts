import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import {
  ApplicationStrategyDto,
  ApplicationStrategyResult,
  CompanyTier,
  ApplicationSequenceWeek,
  DailyAction,
  RiskAssessment,
  EvidenceItem,
} from './dto/application-strategy.dto';

// ── 中国求职市场时间窗口(月份 → 标签) ─────────────────────────────────────────
const WINDOWS: Array<{ months: number[]; label: string; active: boolean }> = [
  { months: [9, 10, 11], label: '秋招（9-11月）', active: true },
  { months: [3, 4, 5], label: '春招（3-5月）', active: true },
];

// Raw shape returned by AI before guards are applied
interface RawStrategyOutput {
  skill_name?: string;
  skill_version?: string;
  summary?: string;
  confidence?: string;
  evidence_used?: Array<{ source?: string; content?: string }>;
  recommendations?: string[];
  risks?: string[];
  next_actions?: string[];
  follow_up_questions?: string[];
  cannot_determine?: string[];
  target_company_tiers?: Array<{
    tier?: string;
    description?: string;
    rationale?: string;
    example_types?: unknown[];
    priority?: unknown;
  }>;
  application_sequence?: Array<{
    week?: string;
    focus?: string;
    target_count?: unknown;
    channels?: unknown[];
  }>;
  daily_action_plan?: Array<{
    action?: string;
    time_estimate?: string;
    priority?: string;
  }>;
  risk_assessment?: {
    main_risks?: string[];
    mitigation?: string[];
  };
}

const VALID_CONFIDENCE = new Set(['high', 'medium', 'low', 'insufficient']);
const VALID_TIERS = new Set(['stretch', 'target', 'safety']);
const VALID_PRIORITY = new Set(['high', 'medium', 'low']);

// ── 防编造 guard：剔除 example_types 中出现的具体公司名 ─────────────────────────
// 判定为具体公司名的条件(满足任一即剔除):
// 1. 短词（≤6字），且不含括号/描述性词（中型/大型/行业/等）
// 2. 含企业注册后缀（公司/集团/股份/有限/Corp/Inc/Ltd）且 ≤ 15 字
// 保留：含括号的描述（如"中型互联网公司（B轮及以上）"）或明显描述性词（行业/类型/规模）
const COMPANY_SUFFIXES = /(公司|集团|股份|有限|Corp\.|Inc\.|Ltd\.|LLC)/;
const DESCRIPTIVE_MARKERS = /[（(]|中型|大型|小型|头部|腰部|行业|领域|类型|规模|以上|以下|\d|初创/;

function stripCompanyNames(examples: unknown[]): string[] {
  return (examples ?? [])
    .filter((e): e is string => typeof e === 'string' && e.trim().length > 0)
    .filter((e) => {
      const s = e.trim();
      // If it has descriptive markers (parentheses, size qualifiers, numbers), it's a description — keep
      if (DESCRIPTIVE_MARKERS.test(s)) return true;
      // Short pure-noun (≤6 chars, only CJK/letters): likely a specific company brand — strip
      if (s.length <= 6 && /^[一-龥a-zA-Z·]+$/.test(s)) return false;
      // Contains formal company-suffix without descriptive context — strip
      if (COMPANY_SUFFIXES.test(s) && s.length <= 15 && !DESCRIPTIVE_MARKERS.test(s)) return false;
      return true;
    });
}

@Injectable()
export class StrategyService {
  constructor(private readonly ai: AiService) {}

  async generateStrategy(dto: ApplicationStrategyDto): Promise<ApplicationStrategyResult> {
    // Guard: 缺 user_profile → insufficient，不输出策略
    if (!dto.user_profile?.trim()) {
      throw new BadRequestException('请提供用户画像（user_profile），否则无法生成个性化投递策略');
    }

    const windowNote = detectWindowNote(dto.application_timeline);
    const system = buildSystem(windowNote);
    const prompt = buildPrompt(dto);

    const raw = await this.ai.completeStructured<RawStrategyOutput>({
      system,
      prompt,
      toolName: 'application_strategy',
      toolDescription: '输出结构化求职投递策略，包含公司分层、投递节奏、每日行动和风险评估',
      schema: STRATEGY_SCHEMA,
    });

    return applyGuards(raw, windowNote);
  }
}

// ── 时间窗口检测 ──────────────────────────────────────────────────────────────

function detectWindowNote(timeline?: string): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-based

  const active = WINDOWS.find((w) => w.months.includes(month));
  if (active) return `当前处于${active.label}窗口期，策略有效。`;

  if (timeline) return `当前非主招聘窗口期（现在是${month}月），请结合具体截止时间调整。`;
  return `当前非主招聘窗口期（现在是${month}月），请注意时间窗口，建议提前规划或切换社招策略。`;
}

// ── 服务端确定性 guard ────────────────────────────────────────────────────────

function applyGuards(raw: RawStrategyOutput, windowNote: string): ApplicationStrategyResult {
  const confidence = VALID_CONFIDENCE.has(raw.confidence ?? '')
    ? (raw.confidence as ApplicationStrategyResult['confidence'])
    : 'low';

  // Guard 1: insufficient → 清空所有策略字段，只保留 summary + cannot_determine
  if (confidence === 'insufficient') {
    return buildInsufficient(raw);
  }

  // Guard 2: target_company_tiers — 剔除具体公司名，强制 tier 合法枚举
  const tiers: CompanyTier[] = (raw.target_company_tiers ?? [])
    .filter((t) => VALID_TIERS.has(t.tier ?? ''))
    .map((t) => ({
      tier: t.tier as CompanyTier['tier'],
      description: t.description ?? '',
      rationale: t.rationale ?? '',
      // 防编造 guard：example_types 只允许描述性文字，剔除具体公司名
      example_types: stripCompanyNames(t.example_types ?? []),
      priority: typeof t.priority === 'number' ? t.priority : undefined,
    }));

  // Guard 3: application_sequence — target_count 必须是正整数
  const sequence: ApplicationSequenceWeek[] = (raw.application_sequence ?? []).map((w) => ({
    week: w.week ?? '',
    focus: w.focus ?? '',
    target_count: typeof w.target_count === 'number' && w.target_count > 0
      ? Math.round(w.target_count)
      : 3,
    channels: (w.channels ?? []).filter((c): c is string => typeof c === 'string'),
  }));

  // Guard 4: daily_action_plan — priority 合法枚举
  const dailyPlan: DailyAction[] = (raw.daily_action_plan ?? []).map((a) => ({
    action: a.action ?? '',
    time_estimate: a.time_estimate ?? '',
    priority: VALID_PRIORITY.has(a.priority ?? '') ? (a.priority as DailyAction['priority']) : 'medium',
  }));

  // Guard 5: risk_assessment
  const riskAssessment: RiskAssessment = {
    main_risks: (raw.risk_assessment?.main_risks ?? []).filter((r): r is string => typeof r === 'string'),
    mitigation: (raw.risk_assessment?.mitigation ?? []).filter((m): m is string => typeof m === 'string'),
  };

  const evidenceUsed: EvidenceItem[] = (raw.evidence_used ?? []).map((e) => ({
    source: e.source ?? '',
    content: e.content ?? '',
  }));

  return {
    skill_name: 'application-strategist',
    skill_version: raw.skill_version ?? '1.0.0',
    summary: raw.summary ? `${raw.summary}\n\n${windowNote}` : windowNote,
    confidence,
    evidence_used: evidenceUsed,
    recommendations: (raw.recommendations ?? []).filter((r): r is string => typeof r === 'string'),
    risks: (raw.risks ?? []).filter((r): r is string => typeof r === 'string'),
    next_actions: (raw.next_actions ?? []).filter((a): a is string => typeof a === 'string'),
    follow_up_questions: (raw.follow_up_questions ?? []).filter((q): q is string => typeof q === 'string'),
    cannot_determine: (raw.cannot_determine ?? []).filter((c): c is string => typeof c === 'string'),
    target_company_tiers: tiers,
    application_sequence: sequence,
    daily_action_plan: dailyPlan,
    risk_assessment: riskAssessment,
  };
}

function buildInsufficient(raw: RawStrategyOutput): ApplicationStrategyResult {
  return {
    skill_name: 'application-strategist',
    skill_version: '1.0.0',
    summary: raw.summary ?? '用户画像信息不足，无法生成个性化投递策略。',
    confidence: 'insufficient',
    evidence_used: [],
    recommendations: [],
    risks: [],
    next_actions: (raw.next_actions ?? []).filter((a): a is string => typeof a === 'string'),
    follow_up_questions: (raw.follow_up_questions ?? []).filter((q): q is string => typeof q === 'string'),
    cannot_determine: (raw.cannot_determine ?? []).filter((c): c is string => typeof c === 'string'),
    target_company_tiers: [],
    application_sequence: [],
    daily_action_plan: [],
    risk_assessment: { main_risks: [], mitigation: [] },
  };
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystem(windowNote: string): string {
  return `你是一位中国求职策略顾问，基于候选人画像制定结构化的投递策略。

## 核心防编造规则（必须严格遵守）

1. **禁止输出具体公司名称**：target_company_tiers 中的 example_types 只能描述公司类型、规模、行业特征（如"中型互联网公司"、"外资咨询公司"），禁止写出具体公司名（如"腾讯"、"阿里巴巴"、"麦肯锡"）。

2. **画像缺失时降级**：若用户画像（user_profile）为空或无法提取有效信息，输出 confidence: "insufficient"，并在 follow_up_questions 中追问缺失信息，禁止编造策略。

3. **时间窗口说明**：${windowNote} 策略建议须与时间窗口匹配，若当前非招聘旺季须在 summary 中明确说明。

4. **证据锚定**：evidence_used 中每条 content 必须能在用户提供的 user_profile 中找到对应依据，禁止凭空推断。

5. **投递数量范围**：每日/每周投递量须在合理区间（日均 3-8 份），禁止建议每日投递超过 15 份或少于 1 份。

## 公司分层逻辑
- stretch（冲刺）：匹配度 50-70%，有挑战但值得投
- target（核心）：匹配度 70-85%，最优先投递
- safety（保底）：匹配度 85%+，作为底线保障

## 输出语言
全部中文（简体），字段名保持英文。`;
}

// ── User prompt ───────────────────────────────────────────────────────────────

function buildPrompt(dto: ApplicationStrategyDto): string {
  const parts: string[] = ['## 求职策略制定请求'];
  parts.push(`### 用户画像\n${dto.user_profile}`);
  if (dto.application_timeline) {
    parts.push(`### 投递时间安排\n${dto.application_timeline}`);
  }
  if (dto.current_applications && dto.current_applications.length > 0) {
    parts.push(`### 当前在投公司（供参考）\n${dto.current_applications.join('、')}`);
  }
  parts.push('\n请基于以上信息制定完整的投递策略，包含公司分层、投递节奏、每日行动计划和风险评估。');
  return parts.join('\n\n');
}

// ── JSON Schema for AI tool output ───────────────────────────────────────────

const STRATEGY_SCHEMA = {
  type: 'object',
  required: [
    'summary', 'confidence', 'evidence_used', 'recommendations', 'risks',
    'next_actions', 'follow_up_questions', 'cannot_determine',
    'target_company_tiers', 'application_sequence', 'daily_action_plan', 'risk_assessment',
  ],
  properties: {
    summary: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low', 'insufficient'] },
    evidence_used: {
      type: 'array',
      items: {
        type: 'object',
        required: ['source', 'content'],
        properties: {
          source: { type: 'string' },
          content: { type: 'string' },
        },
      },
    },
    recommendations: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    next_actions: { type: 'array', items: { type: 'string' } },
    follow_up_questions: { type: 'array', items: { type: 'string' } },
    cannot_determine: { type: 'array', items: { type: 'string' } },
    target_company_tiers: {
      type: 'array',
      items: {
        type: 'object',
        required: ['tier', 'description', 'rationale', 'example_types'],
        properties: {
          tier: { type: 'string', enum: ['stretch', 'target', 'safety'] },
          description: { type: 'string' },
          rationale: { type: 'string' },
          example_types: { type: 'array', items: { type: 'string' } },
          priority: { type: 'integer', minimum: 1 },
        },
      },
    },
    application_sequence: {
      type: 'array',
      items: {
        type: 'object',
        required: ['week', 'focus', 'target_count', 'channels'],
        properties: {
          week: { type: 'string' },
          focus: { type: 'string' },
          target_count: { type: 'integer', minimum: 1 },
          channels: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    daily_action_plan: {
      type: 'array',
      items: {
        type: 'object',
        required: ['action', 'time_estimate', 'priority'],
        properties: {
          action: { type: 'string' },
          time_estimate: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    risk_assessment: {
      type: 'object',
      required: ['main_risks', 'mitigation'],
      properties: {
        main_risks: { type: 'array', items: { type: 'string' } },
        mitigation: { type: 'array', items: { type: 'string' } },
      },
    },
  },
} as const;
