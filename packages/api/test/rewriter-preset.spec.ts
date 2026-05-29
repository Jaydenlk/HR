import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RewriterService } from '../src/ai/rewriter.service';
import { AiService } from '../src/ai/ai.service';
import { ProfessionStandardResult } from '../src/common/types';
import { productManagerCampus } from '../src/profession-presets/presets/product-manager-campus';

const RESUME_TEXT =
  '张三,某大学计算机本科,GPA 3.8。产品实习生:参与某APP需求调研,撰写PRD,推动一个功能上线,次日留存提升15%。';
const ANALYSIS: ProfessionStandardResult = { total_score: 70, dimensions: [], conventionChecks: [] };

describe('RewriterService.suggestAgainstPreset', () => {
  let svc: RewriterService;

  beforeAll(async () => {
    const mockAiService = { completeStructured: jest.fn() };
    const mod = await Test.createTestingModule({
      providers: [RewriterService, { provide: AiService, useValue: mockAiService }],
    }).compile();
    svc = mod.get(RewriterService);
  });

  it('rejects too-short resume', async () => {
    await expect(
      svc.suggestAgainstPreset('短', productManagerCampus, ANALYSIS),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

// AI live:遵循项目惯例,ConfigModule.forRoot 加载 .env 的 key 后真跑;校验禁止编造(original 必在原文)
describe('RewriterService.suggestAgainstPreset (AI live)', () => {
  let svc: RewriterService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [RewriterService, AiService],
    }).compile();
    svc = mod.get(RewriterService);
  });

  it('each rewrite original appears verbatim in resume (no fabrication)', async () => {
    const out = await svc.suggestAgainstPreset(RESUME_TEXT, productManagerCampus, ANALYSIS);
    expect(out.length).toBeGreaterThan(0);
    for (const s of out) {
      expect(s.reason.trim().length).toBeGreaterThan(0);
      if (s.type === 'rewrite') expect(RESUME_TEXT).toContain(s.original);
    }
  }, 120000);
});
