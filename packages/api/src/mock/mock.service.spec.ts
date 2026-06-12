/**
 * MockService 单元测试
 *
 * Step 4 验证：
 * - create 注入 confirmed_company_info 时，出题 prompt 含搜索来源标注
 * - 出题 prompt 含"不得在此之外编造"约束
 *
 * Step 5（D1 收口）验证：
 * - generateEvaluation 调用 ai.completeStructured 时带 tier:'pro'
 */
import { MockService } from './mock.service';
import type { ConfirmedCompanyInfo } from './mock.service';

// ─── 辅助：构造最小依赖 ────────────────────────────────────────────────────

function makeAiService() {
  return {
    completeStructured: jest.fn().mockResolvedValue({
      questions: [
        { n: 1, type: '行为', topic: '团队协作', difficulty: '简单', question: '请自我介绍', hint: '突出优势' },
      ],
    }),
  };
}

function makeCompanyRegistry(matched: unknown = null) {
  return {
    matchCompany: jest.fn().mockResolvedValue(matched),
  };
}

function makeCompanySearch(candidate: unknown = null) {
  return {
    search: jest.fn().mockResolvedValue({ available: true, candidate }),
  };
}

function makeRepo() {
  return {
    create: jest.fn().mockImplementation((v) => v),
    save: jest.fn().mockImplementation((v) => ({ ...v, id: 'session-1' })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    remove: jest.fn().mockResolvedValue(undefined),
  };
}

function makeService({
  ai = makeAiService(),
  registry = makeCompanyRegistry(),
  search = makeCompanySearch(),
  repo = makeRepo(),
} = {}) {
  return new MockService(repo as any, ai as any, registry as any, search as any);
}

// ─── 核心测试 ─────────────────────────────────────────────────────────────

describe('MockService — confirmed_company_info prompt 注入', () => {
  const confirmed: ConfirmedCompanyInfo = {
    name: '某地区性有限公司',
    summary: '专注于区域物流服务的中小企业',
    source_url: 'https://example-regional.com',
    searched_at: '2026-06-13',
  };

  it('prompt 含 source_url（搜索来源标注）', async () => {
    const ai = makeAiService();
    const svc = makeService({ ai });

    await svc.generateQuestions('', '某地区性有限公司', '运营专员', 3, { company_known: false, matched: null }, confirmed);

    expect(ai.completeStructured).toHaveBeenCalledTimes(1);
    const call = (ai.completeStructured as jest.Mock).mock.calls[0][0] as { system: string; prompt: string };

    expect(call.system).toContain(confirmed.source_url);
  });

  it('prompt 含检索日期（searched_at）', async () => {
    const ai = makeAiService();
    const svc = makeService({ ai });

    await svc.generateQuestions('', '某地区性有限公司', '运营专员', 3, { company_known: false, matched: null }, confirmed);

    const call = (ai.completeStructured as jest.Mock).mock.calls[0][0] as { system: string; prompt: string };
    expect(call.system).toContain('2026-06-13');
  });

  it('system + user prompt 整体含"不得...编造"约束', async () => {
    const ai = makeAiService();
    const svc = makeService({ ai });

    await svc.generateQuestions('', '某地区性有限公司', '运营专员', 3, { company_known: false, matched: null }, confirmed);

    const call = (ai.completeStructured as jest.Mock).mock.calls[0][0] as { system: string; prompt: string };
    // system 中有联网确认路径的防编造规则
    expect(call.system).toContain('不得在简介之外编造');
    // user prompt 通过 buildCompanyContext 插入"不得在此之外编造"
    expect(call.prompt).toContain('不得在此之外编造该公司的任何细节');
  });

  it('user prompt 含公司简介（summary）', async () => {
    const ai = makeAiService();
    const svc = makeService({ ai });

    await svc.generateQuestions('', '某地区性有限公司', '运营专员', 3, { company_known: false, matched: null }, confirmed);

    const call = (ai.completeStructured as jest.Mock).mock.calls[0][0] as { system: string; prompt: string };
    expect(call.prompt).toContain(confirmed.summary);
  });
});

describe('MockService — 无 confirmed_company_info 时不暴露搜索来源', () => {
  it('纯通用模式：prompt 无 source_url', async () => {
    const ai = makeAiService();
    const svc = makeService({ ai });

    await svc.generateQuestions('', '未知公司ABC', '产品经理', 3, { company_known: false, matched: null });

    const call = (ai.completeStructured as jest.Mock).mock.calls[0][0] as { system: string; prompt: string };
    expect(call.prompt).not.toContain('https://');
    expect(call.system).not.toContain('联网搜索');
  });
});

describe('MockService — generateEvaluation tier:pro', () => {
  it('调用 ai.completeStructured 时带 tier:"pro"', async () => {
    const ai = {
      completeStructured: jest.fn().mockResolvedValue({
        overall_score: 80,
        overall_grade: 'B+',
        strengths: ['表达清晰'],
        weaknesses: ['缺少例证'],
        summary: '整体表现良好',
      }),
    };

    const svc = makeService({ ai });

    const fakeSession = {
      id: 's1',
      company: '未知公司',
      role: '产品经理',
      questions: [{ n: 1, type: '行为', topic: '自我介绍', difficulty: '简单', question: '请介绍自己', hint: '' }],
      answers: [{ n: 1, answer: '我叫测试', score: 70, feedback: '尚可', filler_count: 0 }],
    };

    await svc.generateEvaluation(fakeSession as any);

    expect(ai.completeStructured).toHaveBeenCalledTimes(1);
    const callArg = (ai.completeStructured as jest.Mock).mock.calls[0][0];
    expect(callArg.tier).toBe('pro');
  });
});
