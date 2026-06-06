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
  demand_level: 'high' | 'medium' | 'low' | 'unknown';
}

export interface IndustryTrendResult {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  evidence_used: Array<{ source: string; url?: string; date?: string }>;
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
    // Guard 1: 无 web 来源时，强制降为 insufficient + 清空所有信号数组
    // 判断是否有真实 web 来源（URL 或可追溯的外部来源）
    const hasWebSources = (result.evidence_used ?? []).some(
      (e) => e.url && e.url.startsWith('http'),
    );

    if (!hasWebSources) {
      return {
        ...result,
        confidence: 'insufficient',
        growth_signals: [],
        risk_signals: [],
        hiring_outlook: 'unknown',
        recommended_entry_roles: [],
        trend_summary:
          '本服务无内置实时检索能力，无法获取实时行业数据。以下为框架说明，非结论性判断。' +
          (result.trend_summary ? ` 原始摘要仅供参考：${result.trend_summary}` : ''),
      };
    }

    // Guard 2: recommended_entry_roles 无 growth_signals 支撑时，demand_level 强制为 unknown
    if (!hasWebSources || result.growth_signals.length === 0) {
      const roles = (result.recommended_entry_roles ?? []).map((role) => ({
        ...role,
        demand_level: 'unknown' as const,
      }));
      return { ...result, recommended_entry_roles: roles };
    }

    return result;
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
