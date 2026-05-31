import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RewriterService } from '../src/ai/rewriter.service';
import { AiService } from '../src/ai/ai.service';
import { ProfessionStandardResult } from '../src/common/types';
import { productManagerCampus } from '../src/profession-presets/presets/product-manager-campus';

const RESUME_TEXT =
  '张三,某大学计算机本科,GPA 3.8。产品实习生:参与某APP需求调研,撰写PRD,推动一个功能上线,次日留存提升15%。';
const ANALYSIS: ProfessionStandardResult = { total_score: 70, dimensions: [], conventionChecks: [], interviewHooks: [] };

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

// 防编造兜底(纯单测,mock AI):original 为空或不在原文 ⇒ 归类 gap_advice,不得当现成简历句
describe('RewriterService.suggestAgainstPreset 防编造兜底', () => {
  let svc: RewriterService;
  let mockAiService: { completeStructured: jest.Mock };

  beforeEach(async () => {
    mockAiService = { completeStructured: jest.fn() };
    const mod = await Test.createTestingModule({
      providers: [RewriterService, { provide: AiService, useValue: mockAiService }],
    }).compile();
    svc = mod.get(RewriterService);
  });

  it('original 为空的建议被归类为 gap_advice', async () => {
    mockAiService.completeStructured.mockResolvedValue({
      suggestions: [
        { section: '技能', type: 'quantify', priority: 'high', original: '',
          suggested: '参与 Code Review 累计 [具体数字] 次', reason: '简历无此经历' },
      ],
    });
    const out = await svc.suggestAgainstPreset(RESUME_TEXT, productManagerCampus, ANALYSIS);
    expect(out[0].original).toBe('');
    expect(out[0].type).toBe('gap_advice');
  });

  it('original 不在简历原文中的建议被归零并归类为 gap_advice', async () => {
    mockAiService.completeStructured.mockResolvedValue({
      suggestions: [
        { section: '项目', type: 'rewrite', priority: 'high', original: '我搭建了高并发分布式秒杀系统',
          suggested: '...', reason: '...' },
      ],
    });
    const out = await svc.suggestAgainstPreset(RESUME_TEXT, productManagerCampus, ANALYSIS);
    expect(out[0].original).toBe('');
    expect(out[0].type).toBe('gap_advice');
  });

  it('original 为简历原文的建议保持原类型', async () => {
    mockAiService.completeStructured.mockResolvedValue({
      suggestions: [
        { section: '实习', type: 'quantify', priority: 'high', original: '撰写PRD',
          suggested: '独立撰写 [具体数字] 篇 PRD,推动 1 个功能上线', reason: '量化产出' },
      ],
    });
    const out = await svc.suggestAgainstPreset(RESUME_TEXT, productManagerCampus, ANALYSIS);
    expect(out[0].original).toBe('撰写PRD');
    expect(out[0].type).toBe('quantify');
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
      if (s.original && s.original.trim().length > 0) {
        expect(RESUME_TEXT).toContain(s.original);
      }
    }
  }, 120000);
});
