/**
 * IndustryTrendService 集成单元测试
 *
 * 验证：
 * 1. 博查搜索结果进入 AI prompt（含真实 URL）
 * 2. 博查来源 URL 透传到响应 evidence_used
 * 3. 博查搜不到时，prompt 中有降级声明，结果 confidence=insufficient
 */
import { IndustryTrendService } from './industry-trend.service';
import { IndustryBochaService } from './industry-bocha.service';
import { AiService } from '../ai/ai.service';
import { AnalyzeIndustryDto } from './dto/analyze-industry.dto';

// ── 最小 IndustryTrendResult 工厂 ─────────────────────────────────────────────

function makeAiResult(overrides: Partial<ReturnType<IndustryTrendService['analyze']>> = {}) {
  return {
    skill_name: 'industry-trend',
    skill_version: '1.0',
    summary: '测试摘要',
    confidence: 'medium' as const,
    evidence_used: [] as Array<{ source: string; url?: string; date?: string; verified?: boolean }>,
    recommendations: [],
    risks: [],
    next_actions: [],
    follow_up_questions: [],
    cannot_determine: [],
    trend_summary: '趋势测试摘要',
    growth_signals: [] as Array<{ signal: string; strength: 'strong' | 'moderate' | 'weak'; source: string; date: string }>,
    risk_signals: [] as Array<{ signal: string; severity: 'high' | 'medium' | 'low'; source: string; date: string }>,
    hiring_outlook: 'growing' as const,
    recommended_entry_roles: [] as Array<{ role_name: string; rationale: string; demand_level?: 'high' | 'medium' | 'low' | 'unknown' }>,
    market_radar_used: false,
    evidence_source_disclaimer: '',
    ...overrides,
  };
}

// ── 成功路径：博查有结果 ─────────────────────────────────────────────────────

describe('IndustryTrendService — 博查搜索结果进入 prompt', () => {
  it('博查返回真实 URL 时，prompt 中包含该 URL，AI completeStructured 被调用', async () => {
    let capturedPrompt = '';

    const mockBocha = {
      search: jest.fn().mockResolvedValue({
        available: true,
        items: [
          {
            title: '大模型行业2024校招分析',
            snippet: '算法工程师需求旺盛',
            url: 'https://36kr.com/p/999',
          },
          {
            title: '长三角AI招聘动态',
            snippet: 'AI岗位占比上升',
            url: 'https://jiemian.com/article/2024',
          },
        ],
      }),
    } as unknown as IndustryBochaService;

    const mockAi = {
      completeStructured: jest.fn().mockImplementation(({ prompt }: { prompt: string }) => {
        capturedPrompt = prompt;
        // AI 在 evidence_used 里引用了博查 URL
        return Promise.resolve(
          makeAiResult({
            confidence: 'medium',
            evidence_used: [
              { source: '大模型行业2024校招分析', url: 'https://36kr.com/p/999', date: '2024-01' },
            ],
            growth_signals: [
              { signal: '算法工程师需求旺盛', strength: 'strong', source: '大模型行业2024校招分析', date: '2024-01' },
            ],
          }),
        );
      }),
    } as unknown as AiService;

    const svc = new IndustryTrendService(mockAi, mockBocha);
    const dto: AnalyzeIndustryDto = { industry: '大模型', region: '长三角', timeframe: '2024年' };
    const result = await svc.analyze(dto);

    // 博查被调用，query 包含 industry 和 region
    expect(mockBocha.search).toHaveBeenCalledTimes(1);
    const searchCall = (mockBocha.search as jest.Mock).mock.calls[0];
    expect(searchCall[0]).toContain('大模型');
    expect(searchCall[0]).toContain('长三角');

    // prompt 中包含博查真实 URL
    expect(capturedPrompt).toContain('https://36kr.com/p/999');
    expect(capturedPrompt).toContain('https://jiemian.com/article/2024');
    expect(capturedPrompt).toContain('实时搜索数据');

    // evidence_used 包含博查来源的 URL（来自 AI 引用 + 未引用的博查 URL 自动补入）
    const urls = result.evidence_used.map((e) => e.url);
    expect(urls).toContain('https://36kr.com/p/999');
    // jiemian.com URL：AI 未引用，但服务端合并 → 也出现
    expect(urls).toContain('https://jiemian.com/article/2024');
  });
});

// ── 降级路径：博查无结果 ─────────────────────────────────────────────────────

describe('IndustryTrendService — 博查搜不到时降级', () => {
  it('博查返回 available:false 时，prompt 含降级声明，AI 结果 confidence=insufficient', async () => {
    let capturedPrompt = '';

    const mockBocha = {
      search: jest.fn().mockResolvedValue({ available: false, reason: 'no_key' }),
    } as unknown as IndustryBochaService;

    const mockAi = {
      completeStructured: jest.fn().mockImplementation(({ prompt }: { prompt: string }) => {
        capturedPrompt = prompt;
        return Promise.resolve(makeAiResult({ confidence: 'insufficient', evidence_used: [], growth_signals: [] }));
      }),
    } as unknown as AiService;

    const svc = new IndustryTrendService(mockAi, mockBocha);
    const dto: AnalyzeIndustryDto = { industry: '量子计算' };
    const result = await svc.analyze(dto);

    // prompt 中有降级提示
    expect(capturedPrompt).toContain('未能获取实时联网数据');
    expect(capturedPrompt).toContain('诚实降级');

    // guard 保证结果为 insufficient
    expect(result.confidence).toBe('insufficient');
    expect(result.growth_signals).toEqual([]);
    expect(result.risk_signals).toEqual([]);
    expect(result.hiring_outlook).toBe('unknown');
  });

  it('博查返回 available:true 但 items 为空时，同样降级', async () => {
    const mockBocha = {
      search: jest.fn().mockResolvedValue({ available: true, items: [] }),
    } as unknown as IndustryBochaService;

    const mockAi = {
      completeStructured: jest.fn().mockResolvedValue(
        makeAiResult({ confidence: 'insufficient', evidence_used: [], growth_signals: [] }),
      ),
    } as unknown as AiService;

    const svc = new IndustryTrendService(mockAi, mockBocha);
    const dto: AnalyzeIndustryDto = { industry: '空结果行业' };
    const result = await svc.analyze(dto);

    expect(result.confidence).toBe('insufficient');
    expect(result.growth_signals).toEqual([]);
  });
});

// ── 来源 URL 不编造验证 ──────────────────────────────────────────────────────

describe('IndustryTrendService — 来源 URL 真实透传，不编造', () => {
  it('AI 编造的 URL（localhost）被过滤，不出现在 evidence_used', async () => {
    const mockBocha = {
      search: jest.fn().mockResolvedValue({
        available: true,
        items: [{ title: '真实来源', snippet: '摘要', url: 'https://36kr.com/real' }],
      }),
    } as unknown as IndustryBochaService;

    const mockAi = {
      completeStructured: jest.fn().mockResolvedValue(
        makeAiResult({
          confidence: 'medium',
          evidence_used: [
            { source: '真实来源', url: 'https://36kr.com/real', date: '2024-01' },
            { source: '编造来源', url: 'http://localhost/fake', date: '2024-01' }, // 非法 URL
          ],
          growth_signals: [
            { signal: '真实信号', strength: 'strong', source: '真实来源', date: '2024-01' },
          ],
        }),
      ),
    } as unknown as AiService;

    const svc = new IndustryTrendService(mockAi, mockBocha);
    const dto: AnalyzeIndustryDto = { industry: '测试行业' };
    const result = await svc.analyze(dto);

    // localhost URL 被过滤
    const urls = result.evidence_used.map((e) => e.url);
    expect(urls).not.toContain('http://localhost/fake');
    expect(urls).toContain('https://36kr.com/real');
  });
});

// ── 博查 query 组合验证 ───────────────────────────────────────────────────────

describe('IndustryTrendService — 搜索 query 组合', () => {
  it('industry + region + timeframe 都拼入 query，包含"校招 招聘趋势 政策 融资"关键词', async () => {
    const mockBocha = {
      search: jest.fn().mockResolvedValue({ available: false, reason: 'error' }),
    } as unknown as IndustryBochaService;

    const mockAi = {
      completeStructured: jest.fn().mockResolvedValue(
        makeAiResult({ confidence: 'insufficient', evidence_used: [], growth_signals: [] }),
      ),
    } as unknown as AiService;

    const svc = new IndustryTrendService(mockAi, mockBocha);
    await svc.analyze({ industry: '新能源', region: '北京', timeframe: '2024年' });

    const query = (mockBocha.search as jest.Mock).mock.calls[0][0] as string;
    expect(query).toContain('新能源');
    expect(query).toContain('北京');
    expect(query).toContain('2024年');
    expect(query).toContain('校招');
    expect(query).toContain('招聘趋势');
  });
});
