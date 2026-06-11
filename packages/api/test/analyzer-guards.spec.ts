import { Test } from '@nestjs/testing';
import { AnalyzerService } from '../src/ai/analyzer.service';
import { AiService } from '../src/ai/ai.service';
import { productManagerCampus } from '../src/profession-presets/presets/product-manager-campus';
import { ParsedResume } from '../src/common/types';

// 确定性守卫并入诊断的单测(mock AI):时间线硬伤 + 可疑数字注入 conventionChecks,
// 且可疑数字命中时"数据/量化"维度被压制不进高分区间。自拟数据,不取材外部 testset。

function rawResult() {
  return {
    total_score: 100,
    conventionChecks: [{ key: 'GPA展示', status: 'ok', note: 'GPA 已展示' }],
    interviewHooks: [],
    // 5 维全给满分(模拟 AI 给"数据驱动"满分的自相矛盾场景)
    dimensions: productManagerCampus.dimensions.map((pd, i) => ({
      score: pd.weight,
      why: `第${i + 1}维评估理由,落到简历事实。`,
      evidenceFound: ['证据'],
      gap: '',
    })),
  };
}

function parsedResumeWithTimelineConflict(): ParsedResume {
  return {
    basic_info: { name: '候选人' },
    summary: undefined,
    work_experience: [
      { company: '某公司', title: '实习生', start_date: '2021-06', end_date: '2021-09', description: '', achievements: [] },
    ],
    education: [{ school: 'A大学', degree: '本科', major: '计算机', graduation_date: '2022-2026' }],
    skills: { technical: [], soft: [], languages: [], certifications: [] },
    projects: [],
    links: [],
    awards_honors: [],
  };
}

const RESUME_JSON_SUSPICIOUS =
  '产品实习生:上线 2 个月内将销售额增长 200%,把转化率做到 45%,推动复购率提升至 60%。负责需求调研与PRD撰写。';

describe('AnalyzerService 确定性守卫并入诊断', () => {
  let svc: AnalyzerService;
  let ai: { completeStructured: jest.Mock };

  beforeEach(async () => {
    ai = { completeStructured: jest.fn() };
    const mod = await Test.createTestingModule({
      providers: [AnalyzerService, { provide: AiService, useValue: ai }],
    }).compile();
    svc = mod.get(AnalyzerService);
  });

  it('时间线硬伤被注入 conventionChecks 显著位置(排在 AI 产物之前)', async () => {
    ai.completeStructured.mockResolvedValueOnce(rawResult());
    const out = await svc.analyzeAgainstPreset(
      RESUME_JSON_SUSPICIOUS,
      productManagerCampus,
      null,
      parsedResumeWithTimelineConflict(),
    );
    expect(out.conventionChecks[0].key).toContain('时间线矛盾');
    expect(out.conventionChecks[0].status).toBe('missing');
  });

  it('可疑数字 → 注入 conventionChecks 且不给"数字可信"背书', async () => {
    ai.completeStructured.mockResolvedValueOnce(rawResult());
    const out = await svc.analyzeAgainstPreset(RESUME_JSON_SUSPICIOUS, productManagerCampus);
    const suspectCheck = out.conventionChecks.find((c) => c.key.includes('可疑量化'));
    expect(suspectCheck).toBeDefined();
    expect(suspectCheck!.status).toBe('missing');
    // 全部 conventionChecks note 不得出现"数字可信"类背书话术
    expect(out.conventionChecks.every((c) => !/数字.{0,4}可信|数据.{0,2}扎实/.test(c.note))).toBe(true);
  });

  it('可疑数字命中 → 数据驱动维度被压制(不进高分区间),总分随之下降', async () => {
    ai.completeStructured.mockResolvedValueOnce(rawResult());
    const out = await svc.analyzeAgainstPreset(RESUME_JSON_SUSPICIOUS, productManagerCampus);
    const dataDim = out.dimensions.find((d) => d.key === 'data_driven');
    expect(dataDim).toBeDefined();
    // 满分 25,压制到 60% = 15,原 AI 给的 25 应被压回 ≤15
    expect(dataDim!.score).toBeLessThanOrEqual(Math.floor(dataDim!.max * 0.6));
    expect(dataDim!.why).toContain('压制');
    // 总分应低于 100(被压制)
    expect(out.total_score).toBeLessThan(100);
  });

  it('无可疑数字 + 无时间矛盾 → 不误伤(维度满分保留、无确定性核查注入)', async () => {
    ai.completeStructured.mockResolvedValueOnce(rawResult());
    const out = await svc.analyzeAgainstPreset(
      '产品实习生:推动功能上线,次日留存提升 15%,转化率从 18% 提升到 27%。',
      productManagerCampus,
    );
    const dataDim = out.dimensions.find((d) => d.key === 'data_driven');
    expect(dataDim!.score).toBe(dataDim!.max); // 未压制
    expect(out.conventionChecks.some((c) => c.key.includes('可疑量化') || c.key.includes('时间线'))).toBe(false);
    expect(out.total_score).toBe(100);
  });
});
