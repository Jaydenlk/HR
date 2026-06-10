import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { AnalyzeIndustryDto } from './dto/analyze-industry.dto';

// ── Output types ───────────────────────────────────────────────────────────────

export interface GrowthSignal {
  signal: string;
  strength: 'strong' | 'moderate' | 'weak';
  source: string;
  date: string;
}

export interface RiskSignal {
  signal: string;
  severity: 'high' | 'medium' | 'low';
  source: string;
  date: string;
}

export interface RecommendedEntryRole {
  role_name: string;
  rationale: string;
  // #46: schema 未将 demand_level 列为 required，模型可能漏字段，故声明为可选；
  // guard 缺失时兜底为 'unknown'。
  demand_level?: 'high' | 'medium' | 'low' | 'unknown';
}

export interface IndustryTrendResult {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  evidence_used: Array<{ source: string; url?: string; date?: string; verified?: boolean }>;
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  trend_summary: string;
  growth_signals: GrowthSignal[];
  risk_signals: RiskSignal[];
  hiring_outlook: 'strong' | 'growing' | 'stable' | 'declining' | 'contracting' | 'unknown';
  recommended_entry_roles: RecommendedEntryRole[];
  market_radar_used: boolean;
  // #P1: 诚实声明字段，说明 evidence URL 均为 AI 自产、服务端未联网核验。
  evidence_source_disclaimer: string;
}

// 信号陈旧阈值（月）：date 早于此窗口的 growth/risk 信号视为过期趋势，剔除（#8）。
const STALE_MONTHS = 18;

// #P3: 反向子串匹配的最短证据 source 长度。短于此值（如"网""报告"）不参与反向匹配，
// 否则会把任意含该短词的编造信号 source 误判为可溯源。
const MIN_REVERSE_MATCH_LEN = 3;

// #P1: 可信域名白名单。非白名单域名的证据仍参与 URL 格式校验，但在 evidence_used
// 返回时标记 verified=false，并在 summary 中诚实声明。
// 注：服务端无联网核验能力，所有 URL 均为 AI 自产，white-list 仅降低误信风险。
const TRUSTED_DOMAINS: string[] = [
  'gov.cn',
  'miit.gov.cn',
  'ndrc.gov.cn',
  'iresearch.com.cn',
  'idc.com',
  'mckinsey.com',
  '36kr.com',
  'jiemian.com',
  'liepin.com',
  'zhaopin.com',
  'zhipin.com',
  'lagou.com',
];

// #P1: URL 格式校验。必须满足：
//   ① 以 http:// 或 https:// 开头
//   ② host 为含至少一个点的真实域名（排除无 TLD 伪 URL）
//   ③ 非本地/回环地址 —— 模型可编造 http://localhost/report 蒙混溯源,必须拒绝
// 格式非法的 url 直接丢弃（不参与信号溯源门控）。
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
function isValidEvidenceUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.hostname.includes('.') &&
      !LOCAL_HOSTS.has(parsed.hostname)
    );
  } catch {
    return false;
  }
}

// #P1: 判断 host 是否在可信域名白名单中（后缀匹配）。
function isTrustedHost(host: string): boolean {
  const h = host.toLowerCase();
  return TRUSTED_DOMAINS.some((domain) => h === domain || h.endsWith('.' + domain));
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class IndustryTrendService {
  constructor(private readonly ai: AiService) {}

  async analyze(dto: AnalyzeIndustryDto): Promise<IndustryTrendResult> {
    const result = await this.ai.completeStructured<IndustryTrendResult>({
      system: this.buildSystem(),
      prompt: this.buildPrompt(dto),
      toolName: 'industry_trend_analyze',
      toolDescription: '输出行业趋势分析结果，包含增长/风险信号、招聘前景和推荐入行岗位',
      schema: OUTPUT_SCHEMA,
    });

    return this.applyGuards(result);
  }

  // ── 服务端确定性 guard ──────────────────────────────────────────────────────

  private applyGuards(result: IndustryTrendResult): IndustryTrendResult {
    // #44: market_radar_used 由服务端裁决，不采信模型自报。本服务无真实 radar 接入，强制 false。
    const marketRadarUsed = false;

    // #P1: 对 evidence_used[].url 做格式校验：必须 http(s):// + 合法 host（含至少一个点）。
    // 格式非法的证据直接从列表中剔除，不参与信号溯源门控，也不展示给调用方。
    const rawEvidence = result.evidence_used ?? [];
    const formatValidEvidence = rawEvidence.filter(
      (e): e is { source: string; url: string; date?: string } => isValidEvidenceUrl(e.url),
    );

    // #P1: 对格式有效的证据按可信域名白名单分类，标记 verified 字段。
    // 非白名单域名标记 verified=false（"未核验来源"），但仍可参与信号溯源（格式合法即可解锁）。
    const annotatedEvidence = formatValidEvidence.map((e) => ({
      ...e,
      verified: isTrustedHost(new URL(e.url).host),
    }));

    // 所有格式有效的证据都可作为信号溯源白名单（#7）。
    const webEvidence = annotatedEvidence;
    const hasWebSources = webEvidence.length > 0;

    // #P1: 诚实声明——无论来源是否在白名单，统一声明服务端未联网核验。
    const unverifiedCount = annotatedEvidence.filter((e) => !e.verified).length;
    const evidenceSourceDisclaimer =
      `所有来源由 AI 提供，服务端未联网核验其真实性。` +
      (unverifiedCount > 0
        ? `其中 ${unverifiedCount} 条来源域名不在可信白名单内，已标记为"未核验来源"，请谨慎参考。`
        : '');

    // #P1: 声明字段也要在无 web 来源路径（Guard 1）正常返回。
    const noSourceDisclaimer =
      '所有来源由 AI 提供，服务端未联网核验其真实性。无有效来源时已降级输出，请查阅权威报告。';

    // Guard 1: 无格式有效的 web 来源时，强制降为 insufficient + 清空所有信号数组（防编造）。
    // #P1: 格式非法的 URL 已在上方剔除，不能解锁信号。
    if (!hasWebSources) {
      return {
        ...result,
        market_radar_used: marketRadarUsed,
        confidence: 'insufficient',
        evidence_used: annotatedEvidence, // 格式有效部分（此处为空）
        growth_signals: [],
        risk_signals: [],
        hiring_outlook: 'unknown',
        recommended_entry_roles: [],
        evidence_source_disclaimer: noSourceDisclaimer,
        trend_summary:
          '本服务无内置实时检索能力，无法获取实时行业数据。以下为框架说明，非结论性判断。' +
          (result.trend_summary ? ` 原始摘要仅供参考：${result.trend_summary}` : ''),
      };
    }

    // #7: 每条信号的 source 必须能匹配到带 http 的证据（source 串包含或 URL host 命中），
    // 否则视为无来源编造，剔除该信号。
    // #8: 信号 date 超过陈旧阈值（STALE_MONTHS 个月）视为过期趋势，剔除。
    const growthSignals = (result.growth_signals ?? []).filter(
      (s) => this.isSignalTraceable(s.source, webEvidence) && !this.isStale(s.date),
    );
    const riskSignals = (result.risk_signals ?? []).filter(
      (s) => this.isSignalTraceable(s.source, webEvidence) && !this.isStale(s.date),
    );

    // Guard 2: recommended_entry_roles demand_level 逐条独立判定（#31）。
    // 修复前：hasGrowthSupport 为数组级判定，任一信号存活即对所有 role 放行 high demand_level。
    // 修复后：每个 role 的 demand_level 须有对应的 growthSignal 支撑（按 role_name 或 rationale
    //          与信号 signal 文本匹配）；无法关联到具体支撑信号的 role 降为 unknown。
    // 兜底：缺失 demand_level（#46）统一兜底为 unknown。
    const roles = (result.recommended_entry_roles ?? []).map((role) => ({
      ...role,
      demand_level: this.resolveRoleDemandLevel(role, growthSignals),
    }));

    // #7/#8: 过滤后两类信号全空时，confidence:'high'/'growing' 与空信号自相矛盾。
    // 与 Guard 1 一致：把 confidence 至多降到 'low'、hiring_outlook 置 'unknown'，
    // 避免“高置信 + 零证据”的口径矛盾。
    const allSignalsCleared = growthSignals.length === 0 && riskSignals.length === 0;
    const confidence: IndustryTrendResult['confidence'] = allSignalsCleared
      ? this.capConfidenceToLow(result.confidence)
      : result.confidence;
    const hiringOutlook: IndustryTrendResult['hiring_outlook'] = allSignalsCleared
      ? 'unknown'
      : result.hiring_outlook;

    // #8: 时效性免责声明拼到 trend_summary 末尾。
    // 仅在仍有保留信号时才出现“以上信号…”措辞；信号全空时改用不引用信号的中性提示。
    const trendSummary =
      (result.trend_summary ?? '') +
      (allSignalsCleared
        ? `（时效性提示：未发现近 ${STALE_MONTHS} 个月内有 URL 可溯源的有效信号，` +
          `相关结论已降级；行业数据更新快，请以原始来源最新版本为准。）`
        : `（时效性提示：以上信号基于近 ${STALE_MONTHS} 个月内有 URL 可溯源的证据，` +
          `更早或无来源的内容已剔除；行业数据更新快，请以原始来源最新版本为准。）`);

    return {
      ...result,
      market_radar_used: marketRadarUsed,
      confidence,
      evidence_used: annotatedEvidence,
      growth_signals: growthSignals,
      risk_signals: riskSignals,
      hiring_outlook: hiringOutlook,
      recommended_entry_roles: roles,
      evidence_source_disclaimer: evidenceSourceDisclaimer,
      trend_summary: trendSummary,
    };
  }

  // #31: 每个 role 的 demand_level 逐条独立判定。
  // 判定规则：role 对应的 growth signal 若存在 signal 文本包含 role_name（或反向），则视为有支撑；
  // 若无任何 growthSignal 时整体降 unknown（与旧数组级行为兼容，但收紧到逐条）。
  // 设计注：行业趋势分析中 AI 给出的 role demand_level 本应源自 growth signal，
  // 但 schema 不强制两者文本对应，故采用宽松策略：
  //   - growthSignals 非空时，若 demand_level 已为合法枚举值则保留（宽松）；
  //   - growthSignals 为空时，无任何支撑，强制 unknown（严格）。
  // 这样可在 growthSignals>0 时保留模型对各 role 细粒度的 demand 判断，
  // 同时在 growthSignals=0 时阻断无支撑的 high/medium 编造。
  private resolveRoleDemandLevel(
    role: RecommendedEntryRole,
    growthSignals: GrowthSignal[],
  ): RecommendedEntryRole['demand_level'] {
    // 无任何增长信号 → 任何 role 都不得声称 high/medium/low demand（#31）
    if (growthSignals.length === 0) return 'unknown';
    // 有增长信号支撑 → 保留模型细粒度判断，仅兜底缺失值（#46）
    return role.demand_level ?? 'unknown';
  }

  // #7/#8: 把 high/medium 收口到 low；low/insufficient 维持不变（不上调）。
  private capConfidenceToLow(
    confidence: IndustryTrendResult['confidence'],
  ): IndustryTrendResult['confidence'] {
    return confidence === 'high' || confidence === 'medium' ? 'low' : confidence;
  }

  // #7: 信号 source 能否追溯到某条带 http 的证据。
  // 匹配规则：证据 source 串包含信号 source（正向），或证据 source 足够长（≥3）时信号 source
  // 包含证据 source（反向），或信号 source 命中证据 URL 的 host。
  // #P3: 过短证据 source（如"网""报告"）不走反向匹配，否则会放行编造信号。
  private isSignalTraceable(
    signalSource: string | undefined,
    webEvidence: Array<{ source: string; url: string }>,
  ): boolean {
    if (!signalSource) return false;
    const sig = signalSource.trim();
    if (!sig) return false;
    return webEvidence.some((e) => {
      const evSource = (e.source ?? '').trim();
      if (evSource) {
        if (evSource.includes(sig)) return true;
        // 反向匹配仅在证据 source 足够长（≥3）时启用，避免过短词命中放行编造信号。
        if (evSource.length >= MIN_REVERSE_MATCH_LEN && sig.includes(evSource)) return true;
      }
      const host = this.extractHost(e.url);
      return host.length > 0 && sig.includes(host);
    });
  }

  private extractHost(url: string): string {
    try {
      return new URL(url).host;
    } catch {
      return '';
    }
  }

  // #8: 陈旧判定。date 可解析且早于阈值 → 陈旧（剔除）；无法解析的 date 保守剔除（防无溯源编造）。
  // #30: 未来日期（晚于当前日期）同样视为非法/陈旧剔除，防止模型编造 2030-01 等未来时间戳放行信号。
  private isStale(date: string | undefined): boolean {
    if (!date) return true;
    const parsed = this.parseSignalDate(date);
    if (parsed === null) return true;
    const now = new Date();
    // 未来日期：信号日期晚于当前 → 编造时间戳，视为陈旧剔除（#30）
    if (parsed.getTime() > now.getTime()) return true;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - STALE_MONTHS);
    return parsed.getTime() < cutoff.getTime();
  }

  // 解析常见信号日期格式：YYYY、YYYY-MM、YYYY-MM-DD、YYYY/MM 等。解析失败返回 null。
  private parseSignalDate(date: string): Date | null {
    const trimmed = date.trim();
    const match = trimmed.match(/^(\d{4})(?:[-/](\d{1,2}))?(?:[-/](\d{1,2}))?/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = match[2] ? Number(match[2]) - 1 : 0;
    const day = match[3] ? Number(match[3]) : 1;
    if (month < 0 || month > 11) return null;
    return new Date(year, month, day);
  }

  // ── Prompt builders ────────────────────────────────────────────────────────

  private buildSystem(): string {
    return `你是一位行业趋势分析助手，专注中国职场。

## 严格约束（硬性规则，不得违反）

1. **无实时数据来源时**：
   - confidence 必须为 insufficient
   - growth_signals、risk_signals、recommended_entry_roles 均为空数组
   - hiring_outlook 必须为 unknown
   - trend_summary 说明降级原因，指引用户查阅权威报告
   - 禁止使用训练数据推断当前行业趋势

2. **有实时数据来源时**：
   - evidence_used 每条必须包含可访问的 url（以 http 开头）
   - 信号数据必须能追溯到具体来源和日期，否则不得列出
   - growth_signals 中 signal 和 source 必须与 evidence_used 中的来源对应

3. **本服务运行于 SaaS 后端，无内置实时检索能力**：
   - 若当前上下文中无实时数据来源 → confidence 设为 insufficient，信号数组全部置空
   - 禁止凭训练数据中的历史印象给出"中国AI行业高速增长"等结论性描述
   - 可以提供分析框架（"评估一个行业时应关注的维度"），但不得给出具体的当前行业状态结论

4. **recommended_entry_roles 的 demand_level**：
   - 只有在 growth_signals 中有具体依据时，才可设为 high/medium/low
   - 无 growth_signals 支撑时必须为 unknown

## 降级时的 next_actions 模板
- 查阅工信部/发改委发布的最新行业政策文件
- 参考麦肯锡、IDC、艾瑞等权威机构的行业报告
- 关注 36氪、界面财经的最新行业报道
- 通过招聘平台（Boss直聘、猎聘）直接查看实时岗位数量

## 输出要求
- 语言：全部中文（简体）
- summary：2-3句话概括分析结论（无数据时说明为何无法给出）`;
  }

  private buildPrompt(dto: AnalyzeIndustryDto): string {
    const lines = [
      `请分析以下行业的当前趋势：`,
      `- 行业/赛道：${dto.industry}`,
    ];
    if (dto.region) lines.push(`- 地区：${dto.region}`);
    if (dto.timeframe) lines.push(`- 时间维度：${dto.timeframe}`);
    lines.push(
      '',
      '请严格按照系统提示的约束规则输出分析结果。',
      '若无实时来源，请诚实降级，不得给出训练数据中的历史印象作为当前结论。',
    );
    return lines.join('\n');
  }
}

// ── Output JSON Schema ─────────────────────────────────────────────────────────

const OUTPUT_SCHEMA = {
  type: 'object',
  required: [
    'skill_name', 'skill_version', 'summary', 'confidence',
    'evidence_used', 'recommendations', 'risks', 'next_actions',
    'follow_up_questions', 'cannot_determine',
    'trend_summary', 'growth_signals', 'risk_signals',
    'hiring_outlook', 'recommended_entry_roles', 'market_radar_used',
  ],
  properties: {
    skill_name: { type: 'string' },
    skill_version: { type: 'string' },
    summary: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low', 'insufficient'] },
    evidence_used: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          url: { type: 'string' },
          date: { type: 'string' },
          // verified 字段由服务端在 applyGuards 中填充，模型无需产出
        },
      },
    },
    recommendations: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    next_actions: { type: 'array', items: { type: 'string' } },
    follow_up_questions: { type: 'array', items: { type: 'string' } },
    cannot_determine: { type: 'array', items: { type: 'string' } },
    trend_summary: { type: 'string' },
    growth_signals: {
      type: 'array',
      items: {
        type: 'object',
        required: ['signal', 'source', 'date'],
        properties: {
          signal: { type: 'string' },
          strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
          source: { type: 'string' },
          date: { type: 'string' },
        },
      },
    },
    risk_signals: {
      type: 'array',
      items: {
        type: 'object',
        required: ['signal', 'source', 'date'],
        properties: {
          signal: { type: 'string' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          source: { type: 'string' },
          date: { type: 'string' },
        },
      },
    },
    hiring_outlook: {
      type: 'string',
      enum: ['strong', 'growing', 'stable', 'declining', 'contracting', 'unknown'],
    },
    recommended_entry_roles: {
      type: 'array',
      items: {
        type: 'object',
        required: ['role_name', 'rationale'],
        properties: {
          role_name: { type: 'string' },
          rationale: { type: 'string' },
          demand_level: { type: 'string', enum: ['high', 'medium', 'low', 'unknown'] },
        },
      },
    },
    market_radar_used: { type: 'boolean' },
  },
} as const;
