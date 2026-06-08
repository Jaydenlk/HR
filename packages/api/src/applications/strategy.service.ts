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

// ── 防编造 guard：检测 example_types 中疑似具体实体公司名 ───────────────────────
//
// 反转策略(修复 #38 子串绕过)：不再做"事后子串删"，而是逐条判定"是否疑似具体品牌/实体"，
// 命中即剔整条。即使带类型/规模描述词(TYPE_QUALIFIERS)，只要仍夹带具体品牌锚点，
// 同样剔除——杜绝"品牌名+知名/头部/互联网平台"句式绕过。
//
// 已知头部品牌(锚词)：命中即为具体公司名，无论是否包裹描述词。
const KNOWN_BRANDS = /腾讯|阿里巴巴|阿里|蚂蚁|字节跳动|字节|抖音|百度|京东|美团|拼多多|网易|华为|小米|滴滴|快手|携程|微博|小红书|哔哩哔哩|B站|谷歌|Google|微软|Microsoft|苹果|Apple|亚马逊|Amazon|Meta|Facebook|麦肯锡|McKinsey|波士顿咨询|BCG|贝恩|Bain|德勤|普华永道|安永|毕马威|高盛|摩根/i;
// 企业注册后缀：带这些后缀通常指向一家具体注册主体。
const COMPANY_SUFFIXES = /(公司|集团|股份|有限|事务所|Corp\.?|Inc\.?|Ltd\.?|LLC|Co\.)/;
// 类型/规模描述词：合法的"公司类型"描述应当至少含其一。
const TYPE_QUALIFIERS = /中型|大型|小型|头部|腰部|初创|外资|国内|传统|金融行业|互联网平台|科技子|数字化|顶级|知名|行业龙头|民营|国有|上市|制造业|咨询公司|科技公司|创业公司|平台|厂商|企业/;

// 判定单条 example 是否疑似具体实体公司名(应剔除)。
function looksLikeConcreteCompany(raw: string): boolean {
  const s = raw.trim();
  if (s.length === 0) return true;
  // 1. 命中已知头部品牌锚词 → 一律视为具体公司名(即使包裹"头部/知名/互联网平台"等描述词)。
  if (KNOWN_BRANDS.test(s)) return true;
  // 2. 短纯名词(≤6 字，纯汉字/字母/·)且无任何类型描述词 → 疑似裸品牌词。
  if (s.length <= 6 && /^[一-龥a-zA-Z·]+$/.test(s) && !TYPE_QUALIFIERS.test(s)) return true;
  // 去掉括号补充后的主干，用于后缀+描述词的组合判断。
  const base = s.replace(/[（(][^）)]*[）)]/g, '').trim();
  // 3. 含企业注册后缀但缺少类型描述词 → 指向具体注册主体(如"某某科技有限公司")。
  if (COMPANY_SUFFIXES.test(s) && !TYPE_QUALIFIERS.test(base)) return true;
  // 4. 括号前主干是短裸品牌词(如"阿里巴巴（集团）") → 剔除。
  if (base.length <= 8 && /^[一-龥a-zA-Z·]+$/.test(base) && !TYPE_QUALIFIERS.test(base)) return true;
  return false;
}

// 过滤 example_types，剔除疑似具体公司名，返回 { kept, hadConcrete }。
function sanitizeExampleTypes(examples: unknown[]): { kept: string[]; hadConcrete: boolean } {
  const strings = (examples ?? []).filter(
    (e): e is string => typeof e === 'string' && e.trim().length > 0,
  );
  const kept: string[] = [];
  let hadConcrete = false;
  for (const e of strings) {
    if (looksLikeConcreteCompany(e)) {
      hadConcrete = true;
      continue;
    }
    kept.push(e.trim());
  }
  return { kept, hadConcrete };
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
  // 显式使用 Asia/Shanghai 时区取月份，避免服务器本地时区干扰
  // toLocaleDateString 仅取 month:'numeric' 在 zh-CN 下返回如"6月"，parseInt 可安全解析前缀数字
  const month = parseInt(
    new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric' }),
    10,
  );
  // 备用保障：若 parseInt 得到 NaN（极罕见环境问题），回退到 UTC 月份
  const safeMonth = Number.isFinite(month) ? month : new Date().getUTCMonth() + 1;

  const active = WINDOWS.find((w) => w.months.includes(safeMonth));
  if (active) return `当前处于${active.label}窗口期，策略有效。`;

  if (timeline) return `当前非主招聘窗口期（现在是${safeMonth}月），请结合具体截止时间调整。`;
  return `当前非主招聘窗口期（现在是${safeMonth}月），请注意时间窗口，建议提前规划或切换社招策略。`;
}

// ── 服务端确定性 guard ────────────────────────────────────────────────────────

function applyGuards(raw: RawStrategyOutput, windowNote: string): ApplicationStrategyResult {
  let confidence = VALID_CONFIDENCE.has(raw.confidence ?? '')
    ? (raw.confidence as ApplicationStrategyResult['confidence'])
    : 'low';

  // Guard 1: insufficient → 清空所有策略字段，只保留 summary + cannot_determine
  if (confidence === 'insufficient') {
    return buildInsufficient(raw);
  }

  // Guard 2: target_company_tiers — 剔除疑似具体公司名，强制 tier 合法枚举。
  // 反编造：若任一 tier 命中具体品牌/实体，剔除该条并降 confidence(high→medium，其余→low)。
  let strippedConcrete = false;
  const tiers: CompanyTier[] = (raw.target_company_tiers ?? [])
    .filter((t) => VALID_TIERS.has(t.tier ?? ''))
    .map((t) => {
      const { kept, hadConcrete } = sanitizeExampleTypes(t.example_types ?? []);
      if (hadConcrete) strippedConcrete = true;
      return {
        tier: t.tier as CompanyTier['tier'],
        description: t.description ?? '',
        rationale: t.rationale ?? '',
        example_types: kept,
        priority: typeof t.priority === 'number' ? t.priority : undefined,
      };
    });
  if (strippedConcrete) {
    confidence = confidence === 'high' ? 'medium' : 'low';
  }

  // Guard 3: application_sequence — target_count 缺失/非法则省略该 week(不杜撰默认值)，
  // 合法值在 1-15 区间内确定性 clamp。被省略的 week 记入 cannot_determine。
  const sequence: ApplicationSequenceWeek[] = [];
  const droppedWeeks: string[] = [];
  for (const w of raw.application_sequence ?? []) {
    const count = clampTargetCount(w.target_count);
    if (count === undefined) {
      const label = typeof w.week === 'string' && w.week.trim().length > 0 ? w.week.trim() : '某周';
      droppedWeeks.push(label);
      continue;
    }
    sequence.push({
      week: w.week ?? '',
      focus: w.focus ?? '',
      target_count: count,
      channels: (w.channels ?? []).filter((c): c is string => typeof c === 'string'),
    });
  }

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
    cannot_determine: [
      ...(raw.cannot_determine ?? []).filter((c): c is string => typeof c === 'string'),
      ...droppedWeeks.map((w) => `${w}：投递目标数量缺失或非法，已省略该周建议`),
    ],
    target_company_tiers: tiers,
    application_sequence: sequence,
    daily_action_plan: dailyPlan,
    risk_assessment: riskAssessment,
  };
}

// target_count 区间：日均合理上限按周(约 15 份/周)封顶，缺失/非法返回 undefined(交由调用方省略该周)。
const TARGET_COUNT_MIN = 1;
const TARGET_COUNT_MAX = 15;

function clampTargetCount(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
  const rounded = Math.round(value);
  if (rounded < TARGET_COUNT_MIN) return undefined;
  return Math.min(rounded, TARGET_COUNT_MAX);
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
