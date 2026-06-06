import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from '../src/ai/ai.module';
import { AnalyzerService } from '../src/ai/analyzer.service';
import { AiService } from '../src/ai/ai.service';
import { productManagerCampus } from '../src/profession-presets/presets/product-manager-campus';
import { aiConfig } from '../src/config/ai.config';

const LIVE = process.env.RUN_AI_LIVE === '1';

const RESUME = JSON.stringify({
  basic_info: { name: '张三' },
  education: [{ school: '某大学', degree: '本科', major: '计算机', gpa: '3.8/4.0' }],
  work_experience: [
    {
      company: 'X公司',
      title: '产品实习生',
      start_date: '2025-06',
      description: '参与某APP需求调研,撰写PRD,推动一个功能上线,使次日留存提升15%',
      achievements: ['留存+15%'],
    },
  ],
  skills: { technical: ['SQL', 'Axure'], soft: [], languages: [], certifications: [] },
  projects: [],
});

describe('AnalyzerService.analyzeAgainstPreset', () => {
  let svc: AnalyzerService;

  beforeAll(async () => {
    const mockAiService = { completeStructured: jest.fn() };
    const mod = await Test.createTestingModule({
      providers: [AnalyzerService, { provide: AiService, useValue: mockAiService }],
    }).compile();
    svc = mod.get(AnalyzerService);
  });

  it('rejects too-short resume', async () => {
    await expect(svc.analyzeAgainstPreset('短', productManagerCampus)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

// AI live:遵循项目惯例(见 opportunity-ai-probe.spec.ts),ConfigModule.forRoot 加载 .env 的 key 后真跑
(LIVE ? describe : describe.skip)('AnalyzerService.analyzeAgainstPreset (AI live)', () => {
  let svc: AnalyzerService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [aiConfig] }), AiModule],
    }).compile();
    svc = mod.get(AnalyzerService);
  });

  it('returns all preset dimensions with non-empty why each', async () => {
    const res = await svc.analyzeAgainstPreset(RESUME, productManagerCampus);
    expect(res.dimensions.length).toBe(productManagerCampus.dimensions.length);
    for (const d of res.dimensions) {
      expect(d.why.trim().length).toBeGreaterThan(0);
      expect(typeof d.score).toBe('number');
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(d.max);
    }
    expect(res.total_score).toBeGreaterThanOrEqual(0);
    expect(res.total_score).toBeLessThanOrEqual(100);
  }, 200000);
});
