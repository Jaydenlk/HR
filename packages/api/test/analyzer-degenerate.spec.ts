import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { AnalyzerService } from '../src/ai/analyzer.service';
import { AiService } from '../src/ai/ai.service';
import { productManagerCampus } from '../src/profession-presets/presets/product-manager-campus';

// 5 维原始结果(模拟 AI 产物);whyEmptyAt 指定某维 why 为空 → 退化产物
function rawResult(whyEmptyAt: number | null) {
  return {
    total_score: 50,
    conventionChecks: [],
    interviewHooks: [],
    dimensions: productManagerCampus.dimensions.map((_, i) => ({
      score: 5,
      why: whyEmptyAt === i ? '' : `第${i + 1}维的评估理由,落到简历事实。`,
      evidenceFound: ['某条证据'],
      gap: '某缺口',
    })),
  };
}

const RESUME = '张三,某大学计算机本科,GPA 3.8。产品实习生:参与某APP需求调研,撰写PRD,推动一个功能上线。';

describe('AnalyzerService.analyzeAgainstPreset 退化产物校验(可靠性)', () => {
  let svc: AnalyzerService;
  let ai: { completeStructured: jest.Mock };

  beforeEach(async () => {
    ai = { completeStructured: jest.fn() };
    const mod = await Test.createTestingModule({
      providers: [AnalyzerService, { provide: AiService, useValue: ai }],
    }).compile();
    svc = mod.get(AnalyzerService);
  });

  it('首次产出某维 why 为空(残缺诊断)→ 自动重试拿到完整产物', async () => {
    ai.completeStructured
      .mockResolvedValueOnce(rawResult(2)) // 第3维 why 空
      .mockResolvedValueOnce(rawResult(null)); // 重试:全维有 why
    const out = await svc.analyzeAgainstPreset(RESUME, productManagerCampus);
    expect(out.dimensions).toHaveLength(5);
    expect(out.dimensions.every((d) => d.why.trim().length > 0)).toBe(true);
    expect(ai.completeStructured).toHaveBeenCalledTimes(2);
  });

  it('连续产出残缺诊断(why 恒空)→ 重试耗尽后抛 503,绝不返回空评分', async () => {
    ai.completeStructured.mockResolvedValue(rawResult(0));
    await expect(svc.analyzeAgainstPreset(RESUME, productManagerCampus)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(ai.completeStructured).toHaveBeenCalledTimes(3);
  });

  it('首次即完整 → 只调用一次、原样返回', async () => {
    ai.completeStructured.mockResolvedValueOnce(rawResult(null));
    const out = await svc.analyzeAgainstPreset(RESUME, productManagerCampus);
    expect(out.dimensions.every((d) => d.why.trim().length > 0)).toBe(true);
    expect(ai.completeStructured).toHaveBeenCalledTimes(1);
  });
});
