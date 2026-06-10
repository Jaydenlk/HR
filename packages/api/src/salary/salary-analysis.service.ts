import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import {
  AnalyzeSalaryDto,
  SalaryAnalysisResult,
  SalaryRange,
} from './dto/analyze-salary.dto';

// Raw shape returned by the AI tool — we validate/guard before returning.
interface RawAnalysisOutput {
  summary?: string;
  confidence?: string;
  salary_range?: {
    p25?: number;
    p50?: number;
    p75?: number;
    unit?: string;
    year?: string;
    city?: string;
    role?: string;
    grade?: string;
    freshness?: string;
  } | null;
  breakdown?: {
    base_monthly?: number;
    months_per_year?: number;
    annual_bonus?: string;
    equity?: string;
    social_insurance?: string;
  } | null;
  data_sources?: Array<{
    source_name?: string;
    url?: string;
    date?: string;
    grade?: string;
  }>;
  comparison?: Array<{
    dimension?: string;
    value?: string;
    grade?: string;
  }>;
  recommendations?: string[];
  risks?: string[];
  next_actions?: string[];
  follow_up_questions?: string[];
  cannot_determine?: string[];
  data_freshness?: string;
}

const VALID_GRADES = new Set(['A', 'B', 'C', 'D']);
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low', 'insufficient']);
const VALID_FRESHNESS_RANGE = new Set(['fresh', 'stale', 'unknown']);
const VALID_FRESHNESS_DATA = new Set(['fresh', 'stale', 'unavailable']);
const VALID_UNITS = new Set(['monthly_rmb', 'annual_rmb']);

// #42 防误标红线: unit 缺失/非法时绝不静默假定 monthly_rmb(否则把年薪当月薪,12x 误差)。
// 仅当数额量级明显是年薪(p50 >= 此阈值,中国月薪几乎不可能达到此水平)时才推断 annual_rmb;
// 否则量级模糊 → 不臆测单位,判 insufficient 置空区间。
// 阈值取 10万: 月薪 10万/月 = 年薪 120万,绝大多数岗位不可能,故 p50>=10万 几乎必为年薪。
const ANNUAL_MAGNITUDE_THRESHOLD = 100000;

@Injectable()
export class SalaryAnalysisService {
  constructor(private readonly ai: AiService) {}

  async analyze(dto: AnalyzeSalaryDto): Promise<SalaryAnalysisResult> {
    // 缺 role → insufficient，追问，不输出薪资区间
    if (!dto.role?.trim()) {
      throw new BadRequestException('请提供具体职位名称（如：后端工程师、产品经理）');
    }

    // 缺 city → 返回 insufficient 结构 + 追问，不造 range
    if (!dto.city?.trim()) {
      return {
        summary: '缺少城市信息，无法给出有参考价值的薪资区间。',
        confidence: 'insufficient',
        salary_range: null,
        breakdown: null,
        data_sources: [],
        comparison: [],
        recommendations: [],
        risks: [],
        next_actions: ['提供工作所在城市后重新查询'],
        follow_up_questions: ['请提供工作所在城市（如：北京、上海、深圳）'],
        cannot_determine: ['缺少城市信息，无法确定薪资区间'],
        data_freshness: 'unavailable',
      };
    }

    const system = buildSystemPrompt();
    const prompt = buildUserPrompt(dto);

    const raw = await this.ai.completeStructured<RawAnalysisOutput>({
      system,
      prompt,
      toolName: 'salary_analysis',
      toolDescription: '输出薪资对标分析结果，包含薪资区间、分解、来源、横向对比',
      schema: SALARY_ANALYSIS_SCHEMA,
    });

    return applyGuards(raw, dto);
  }
}

// ── Anti-fabrication guards (服务端确定性收口) ──────────────────────────────────

function applyGuards(raw: RawAnalysisOutput, dto: AnalyzeSalaryDto): SalaryAnalysisResult {
  // Guard 1: confidence 只接受合法枚举，否则降为 low
  const confidence = VALID_CONFIDENCE.has(raw.confidence ?? '')
    ? (raw.confidence as SalaryAnalysisResult['confidence'])
    : 'low';

  // Guard 2: salary_range 防编造收口
  let salary_range: SalaryRange | null = null;
  if (raw.salary_range != null) {
    const r = raw.salary_range;
    // 至少要有一条带名字的来源条目(实时来源 A/B,或历史知识库 C/D)才允许给出区间。
    const hasSource = (raw.data_sources ?? []).some((s) => s.source_name?.trim());
    // 防编造红线(system prompt rule 3 / rule 6):完全无来源 → 绝不给精确分位数。
    // range 置空、confidence=insufficient,而非"只降 grade/freshness 却照样吐 p25/p50/p75"。
    if (!hasSource) {
      return buildResult(raw, 'insufficient', null);
    }
    // 信息不足,或数字缺失/非法/逆序(需非负且 p25<=p50<=p75)→ 不输出区间(有来源,保留 summary 等其余结构,confidence 至多 low)。
    // 用内联负向 guard 而非布尔 const,使 TS 在此后把 r.p25/p50/p75 收窄为 number。
    if (
      confidence === 'insufficient' ||
      typeof r.p25 !== 'number' ||
      typeof r.p50 !== 'number' ||
      typeof r.p75 !== 'number' ||
      r.p25 < 0 ||
      r.p50 < 0 ||
      r.p75 < 0 ||
      r.p25 > r.p50 ||
      r.p50 > r.p75
    ) {
      const c: SalaryAnalysisResult['confidence'] =
        confidence === 'high' || confidence === 'medium' ? 'low' : confidence;
      return buildResult(raw, c, null);
    }

    // #42 单位收口: unit 缺失/非法时不静默假定 monthly。
    //   - 合法枚举 → 直接采用;
    //   - 缺失/非法但 p50 量级明显是年薪(>=阈值) → 推断 annual_rmb,避免把年薪误标月薪;
    //   - 缺失/非法且量级模糊 → 无法判定单位,不臆测,置空区间 + confidence 至多 low。
    const resolvedUnit = resolveUnit(r.unit, r.p50);
    if (resolvedUnit === null) {
      const c: SalaryAnalysisResult['confidence'] =
        confidence === 'high' || confidence === 'medium' ? 'low' : confidence;
      return buildResult(raw, c, null);
    }

    // 有来源 + 数字合法:按 rule 1/2 做四要素与新鲜度降级(rule 2 允许历史知识库区间,但 stale + 低置信)。
    const hasAllFourFactors = !!(r.year?.trim() && r.city?.trim() && r.role?.trim());
    const grade =
      hasAllFourFactors && VALID_GRADES.has(r.grade ?? '')
        ? (r.grade as SalaryRange['grade'])
        : 'C';
    // #43: "实时/可信来源"判定与 data_sources 的等级去信任化对齐——A/B 级必须带真实域名 URL
    //   才算真实来源。否则(自报 A/B 但无可溯源 URL)等同 C,不得据此把区间标为 fresh / 高置信。
    const hasRealSource = (raw.data_sources ?? []).some(
      (s) => (s.grade === 'A' || s.grade === 'B') && hasRealDomainUrl(s.url),
    );
    const freshness: SalaryRange['freshness'] =
      hasRealSource && VALID_FRESHNESS_RANGE.has(r.freshness ?? '')
        ? (r.freshness as SalaryRange['freshness'])
        : 'stale';
    const adjustedConfidence: SalaryAnalysisResult['confidence'] =
      !hasRealSource && (confidence === 'high' || confidence === 'medium')
        ? 'low'
        : confidence;

    salary_range = {
      p25: r.p25,
      p50: r.p50,
      p75: r.p75,
      unit: resolvedUnit,
      year: r.year ?? String(new Date().getFullYear()),
      city: r.city ?? dto.city ?? '',
      role: r.role ?? dto.role,
      grade,
      freshness,
    };
    return buildResult(raw, adjustedConfidence, salary_range);
  }

  // Guard 3: confidence insufficient → salary_range 必为 null
  if (confidence === 'insufficient') {
    salary_range = null;
  }

  return buildResult(raw, confidence, salary_range);
}

// #42: 解析薪资单位。返回 null 表示"无法判定单位,应置空区间不臆测"。
//   - 合法枚举 → 原样返回;
//   - 缺失/非法 + 量级明显年薪(p50>=阈值) → 'annual_rmb';
//   - 缺失/非法 + 量级模糊 → null(不静默默认 monthly)。
function resolveUnit(
  unit: string | undefined,
  p50: number,
): SalaryRange['unit'] | null {
  if (VALID_UNITS.has(unit ?? '')) {
    return unit as SalaryRange['unit'];
  }
  if (p50 >= ANNUAL_MAGNITUDE_THRESHOLD) {
    return 'annual_rmb';
  }
  return null;
}

// #43: 判断 url 是否为"真实域名的 http(s) 地址"。
// 服务端无法联网验真来源内容,但能确定性识别"无 URL/伪 URL"——它们无从溯源,
// 不应支撑 A/B 级。要求: 可被 URL 解析、协议为 http(s)、host 含点(形似真实域名,排除 localhost
// 等无 TLD 主机)、且 host 不是纯 IP 文本由解析器自然处理。
function hasRealDomainUrl(url: string | undefined): boolean {
  const u = url?.trim();
  if (!u) return false;
  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const host = parsed.hostname;
  // host 必须含点且点两侧均有字符(排除 "a." / ".com" / "localhost" 这类无效/无 TLD 主机)。
  const dot = host.indexOf('.');
  return dot > 0 && dot < host.length - 1;
}

// #43: 来源等级去信任化。A/B 级声称实时/官方来源,但无真实可溯源 URL 时降为 C(无法验证)。
// C/D 本就是低可信档,保持原样(经枚举校验)。
function gradeDataSource(
  rawGrade: string | undefined,
  url: string | undefined,
): 'A' | 'B' | 'C' | 'D' {
  const grade = VALID_GRADES.has(rawGrade ?? '')
    ? (rawGrade as 'A' | 'B' | 'C' | 'D')
    : 'C';
  if ((grade === 'A' || grade === 'B') && !hasRealDomainUrl(url)) {
    return 'C';
  }
  return grade;
}

function buildResult(
  raw: RawAnalysisOutput,
  confidence: SalaryAnalysisResult['confidence'],
  salary_range: SalaryRange | null,
): SalaryAnalysisResult {
  const data_freshness = VALID_FRESHNESS_DATA.has(raw.data_freshness ?? '')
    ? (raw.data_freshness as SalaryAnalysisResult['data_freshness'])
    : 'unavailable';

  // 防编造红线:无法给出薪资区间(无来源 → salary_range=null,或 confidence=insufficient)时,
  // breakdown 的精确薪资数字(base_monthly 等)与 comparison 的对比数值同属"无来源编造通道",
  // 必须一并抑制,否则等于把 salary_range 堵死的编造从旁路漏出。
  const suppressNumbers = salary_range === null || confidence === 'insufficient';

  return {
    summary: raw.summary ?? '',
    confidence,
    salary_range,
    breakdown: suppressNumbers ? null : (raw.breakdown ?? null),
    data_sources: (raw.data_sources ?? []).map((s) => ({
      source_name: s.source_name ?? '',
      url: s.url,
      date: s.date,
      // #43 来源可信度收口: 服务端无联网无法验真来源,但可对"自报高等级却无真实 URL"的
      // 来源去信任化——A/B 级来源若 url 缺失或非真实 http(s)+有效域名,降级为 C(口碑/无法验证)。
      grade: gradeDataSource(s.grade, s.url),
    })),
    comparison: suppressNumbers
      ? []
      : (raw.comparison ?? []).map((c) => ({
          dimension: c.dimension ?? '',
          value: c.value ?? '',
          grade: VALID_GRADES.has(c.grade ?? '') ? (c.grade as 'A' | 'B' | 'C' | 'D') : 'C',
        })),
    recommendations: raw.recommendations ?? [],
    risks: raw.risks ?? [],
    next_actions: raw.next_actions ?? [],
    follow_up_questions: raw.follow_up_questions ?? [],
    cannot_determine: raw.cannot_determine ?? [],
    data_freshness,
  };
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `你是一位中国职场薪资数据分析专家，帮助求职者了解市场薪资水平。

## 核心防编造规则（必须严格遵守）

1. **四要素完整性**：薪资数据必须同时包含 year（数据年份）、city（城市）、role（岗位）、source（来源）四个要素，缺任一要素时 grade 必须为 C，绝不升级。

2. **无实时来源时降级**：
   - 无法获取实时数据时，freshness 必须标注为 stale，confidence 降为 low
   - 在 summary 中明确写明"数据来自历史知识库，非实时数据，仅供参考"
   - 禁止将历史数据标注为 fresh

3. **完全无数据时**：salary_range 必须为 null，confidence 为 insufficient，禁止凭空给出精确薪资数字

4. **来源说明**：每条数据来源必须在 data_sources 字段中列出，说明来源平台、数据年份、样本说明

5. **分位数区间**：p25/p50/p75 为月薪（元/月），单位 monthly_rmb；若为年薪则标注 annual_rmb

6. **禁止行为**：
   - 禁止在无来源时给出精确薪资数字
   - 禁止把训练数据中的模糊印象标注为高置信度
   - 禁止捏造公司名称或具体 offer 数字

## 数据来源等级参考
- A级：官方薪资调查报告（如 BOSS直聘年报）
- B级：主流招聘平台的 JD 薪资范围（BOSS直聘、猎聘、脉脉、牛客）
- C级：口碑/传言/无法验证的来源

## 输出语言
全部中文（简体）。`;
}

// ── User prompt ───────────────────────────────────────────────────────────────

function buildUserPrompt(dto: AnalyzeSalaryDto): string {
  const parts: string[] = ['## 薪资对标分析请求'];
  parts.push(`- 岗位：${dto.role}`);
  if (dto.city) parts.push(`- 城市：${dto.city}`);
  if (dto.company) parts.push(`- 公司：${dto.company}`);
  if (dto.years_of_experience != null)
    parts.push(`- 工作年限：${dto.years_of_experience} 年`);
  if (dto.industry) parts.push(`- 行业：${dto.industry}`);
  parts.push(
    '\n请基于已知数据源聚合该岗位/城市的薪资区间，并输出结构化分析结果。若无实时数据，降级使用历史知识库并明确标注。',
  );
  return parts.join('\n');
}

// ── JSON Schema for AI tool output ───────────────────────────────────────────

const SALARY_ANALYSIS_SCHEMA = {
  type: 'object',
  required: [
    'summary',
    'confidence',
    'salary_range',
    'data_sources',
    'comparison',
    'recommendations',
    'risks',
    'next_actions',
    'follow_up_questions',
    'cannot_determine',
    'data_freshness',
  ],
  properties: {
    summary: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low', 'insufficient'] },
    salary_range: {
      oneOf: [
        {
          type: 'object',
          required: ['p25', 'p50', 'p75', 'unit', 'grade'],
          properties: {
            p25: { type: 'number' },
            p50: { type: 'number' },
            p75: { type: 'number' },
            unit: { type: 'string', enum: ['monthly_rmb', 'annual_rmb'] },
            year: { type: 'string' },
            city: { type: 'string' },
            role: { type: 'string' },
            grade: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
            freshness: { type: 'string', enum: ['fresh', 'stale', 'unknown'] },
          },
        },
        { type: 'null' },
      ],
    },
    breakdown: {
      oneOf: [
        {
          type: 'object',
          properties: {
            base_monthly: { type: 'number' },
            months_per_year: { type: 'number' },
            annual_bonus: { type: 'string' },
            equity: { type: 'string' },
            social_insurance: { type: 'string' },
          },
        },
        { type: 'null' },
      ],
    },
    data_sources: {
      type: 'array',
      items: {
        type: 'object',
        required: ['source_name', 'grade'],
        properties: {
          source_name: { type: 'string' },
          url: { type: 'string' },
          date: { type: 'string' },
          grade: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
        },
      },
    },
    comparison: {
      type: 'array',
      items: {
        type: 'object',
        required: ['dimension', 'value', 'grade'],
        properties: {
          dimension: { type: 'string' },
          value: { type: 'string' },
          grade: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
        },
      },
    },
    recommendations: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    next_actions: { type: 'array', items: { type: 'string' } },
    follow_up_questions: { type: 'array', items: { type: 'string' } },
    cannot_determine: { type: 'array', items: { type: 'string' } },
    data_freshness: { type: 'string', enum: ['fresh', 'stale', 'unavailable'] },
  },
} as const;
