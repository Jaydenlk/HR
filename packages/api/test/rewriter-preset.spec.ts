import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from '../src/ai/ai.module';
import { RewriterService } from '../src/ai/rewriter.service';
import { AiService } from '../src/ai/ai.service';
import { ProfessionStandardResult } from '../src/common/types';
import { productManagerCampus } from '../src/profession-presets/presets/product-manager-campus';
import { aiConfig } from '../src/config/ai.config';

const LIVE = process.env.RUN_AI_LIVE === '1';

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

  // 进阶兜底:original 是真原句,但 suggested 注入简历里没有的"具体数字"(伪造量化指标)⇒ 降级 gap_advice
  it('original 真实但 suggested 注入简历没有的具体数字 ⇒ 降级 gap_advice', async () => {
    mockAiService.completeStructured.mockResolvedValue({
      suggestions: [
        { section: '实习', type: 'rewrite', priority: 'high', original: '参与某APP需求调研',
          suggested: '主导某APP需求调研,发放问卷350份,回收率86%', reason: '量化' },
      ],
    });
    const out = await svc.suggestAgainstPreset(RESUME_TEXT, productManagerCampus, ANALYSIS);
    expect(out[0].type).toBe('gap_advice'); // 350、86 简历都没有 = 伪造数字
    expect(out[0].original).toBe('');
  });

  it('suggested 仅含简历已有数字或 [具体数字] 占位符 ⇒ 保持改进型', async () => {
    mockAiService.completeStructured.mockResolvedValue({
      suggestions: [
        { section: '实习', type: 'quantify', priority: 'medium', original: '次日留存提升15%',
          suggested: '推动功能上线,次日留存提升15%,覆盖 [具体数字] 名用户', reason: '补充规模' },
      ],
    });
    const out = await svc.suggestAgainstPreset(RESUME_TEXT, productManagerCampus, ANALYSIS);
    expect(out[0].type).toBe('quantify'); // 15 在简历、[具体数字] 是占位符 ⇒ 不算编造
    expect(out[0].original).toBe('次日留存提升15%');
  });
});

// 自检修复层(女娲式,纯单测 mock AI):主调用产出后,再过一次 AI 防编造复核;
// 被复核打回的"改进型"建议(suggested 注入简历没有的方法/能力,确定性数字规则抓不到的)降级 gap_advice。
describe('RewriterService.suggestAgainstPreset 自检修复层', () => {
  let svc: RewriterService;
  let mockAiService: { completeStructured: jest.Mock };

  beforeEach(async () => {
    mockAiService = { completeStructured: jest.fn() };
    const mod = await Test.createTestingModule({
      providers: [RewriterService, { provide: AiService, useValue: mockAiService }],
    }).compile();
    svc = mod.get(RewriterService);
  });

  it('suggested 注入简历没有的方法(无数字、确定性规则抓不到)→ 被复核打回降级 gap_advice', async () => {
    mockAiService.completeStructured
      .mockResolvedValueOnce({
        suggestions: [
          { section: '实习', type: 'rewrite', priority: 'high', original: '撰写PRD',
            suggested: '撰写PRD,并按周拆解WBS、跟踪待办事项闭环', reason: '细化' },
        ],
      }) // 主调用:original 真实、无伪造数字 → 确定性兜底放行
      .mockResolvedValueOnce({ indices: [0] }); // 自检复核:第0条 suggested 注入简历没有的 WBS/待办闭环 → 打回
    const out = await svc.suggestAgainstPreset(RESUME_TEXT, productManagerCampus, ANALYSIS);
    expect(out[0].type).toBe('gap_advice');
    expect(out[0].original).toBe('');
  });

  it('结构损坏的建议(reason 缺失 / suggested 混入 reason= 脚手架)被丢弃', async () => {
    mockAiService.completeStructured
      .mockResolvedValueOnce({
        suggestions: [
          { section: '自我评价', type: 'rewrite', priority: 'low', original: '撰写PRD',
            suggested: "致力于长期深耕产品领域。', reason='原文空洞表白'" }, // reason 缺失 + suggested 混入脚手架
          { section: '实习', type: 'quantify', priority: 'high', original: '撰写PRD',
            suggested: '独立撰写 [具体数字] 篇 PRD', reason: '量化产出' }, // 正常
        ],
      })
      .mockResolvedValueOnce({ indices: [] });
    const out = await svc.suggestAgainstPreset(RESUME_TEXT, productManagerCampus, ANALYSIS);
    expect(out).toHaveLength(1);
    expect(out[0].section).toBe('实习');
  });

  it('改写无编造 → 复核不打回,保持原类型', async () => {
    mockAiService.completeStructured
      .mockResolvedValueOnce({
        suggestions: [
          { section: '实习', type: 'rewrite', priority: 'medium', original: '撰写PRD',
            suggested: '独立撰写PRD并推动功能上线', reason: '措辞收紧' },
        ],
      })
      .mockResolvedValueOnce({ indices: [] }); // 自检:无编造
    const out = await svc.suggestAgainstPreset(RESUME_TEXT, productManagerCampus, ANALYSIS);
    expect(out[0].type).toBe('rewrite');
    expect(out[0].original).toBe('撰写PRD');
  });
});

// AI live:遵循项目惯例,ConfigModule.forRoot 加载 .env 的 key 后真跑;校验禁止编造(original 必在原文)
(LIVE ? describe : describe.skip)('RewriterService.suggestAgainstPreset (AI live)', () => {
  let svc: RewriterService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [aiConfig] }), AiModule],
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
