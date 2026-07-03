/**
 * MockService 单元测试
 *
 * Step 4 验证：
 * - create 注入 confirmed_company_info 时，出题 prompt 含搜索来源标注
 * - 出题 prompt 含"不得在此之外编造"约束
 *
 * Step 5（D1 收口）验证：
 * - generateEvaluation 调用 ai.completeStructured 时带 tier:'pro'
 *
 * T6 博查统一搜索重设计验证：
 * - checkCompany() 返回 candidates 数组(破坏性 API 变更)
 * - create() 按 company_research_id 查库构造 confirmed(防伪造 M3)，无效 id → 400
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

function makeCompanyResearch({
  candidates = [] as unknown[],
  reason,
  byId = null as unknown,
} = {}) {
  return {
    search: jest.fn().mockResolvedValue(reason ? { candidates, reason } : { candidates }),
    findById: jest.fn().mockResolvedValue(byId),
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

function makeSpeechService() {
  return {
    synthesize: jest.fn().mockResolvedValue({ audio: Buffer.from(''), mimeType: 'audio/mpeg' }),
  };
}

function makeService({
  ai = makeAiService(),
  speech = makeSpeechService(),
  registry = makeCompanyRegistry(),
  research = makeCompanyResearch(),
  repo = makeRepo(),
} = {}) {
  return new MockService(
    repo as any,
    ai as any,
    speech as any,
    registry as any,
    research as any,
  );
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

describe('MockService — checkCompany() 返回候选数组', () => {
  it('库内命中：candidates 为空数组，不调用 companyResearch.search', async () => {
    const registry = makeCompanyRegistry({ id: 'c1', name: '字节跳动' });
    const research = makeCompanyResearch();
    const svc = makeService({ registry, research });

    const result = await svc.checkCompany('字节跳动');

    expect(result).toEqual({ company_known: true, candidates: [] });
    expect(research.search).not.toHaveBeenCalled();
  });

  it('库外命中：透传 companyResearch.search 返回的候选数组', async () => {
    const candidates = [
      { id: 'cr-1', name: '候选甲', summary: 'S1', source_url: 'https://a.com', source_domain: 'a.com' },
      { id: 'cr-2', name: '候选乙', summary: 'S2', source_url: 'https://b.com', source_domain: 'b.com' },
    ];
    const research = makeCompanyResearch({ candidates });
    const svc = makeService({ research });

    const result = await svc.checkCompany('某冷门公司');

    expect(result.company_known).toBe(false);
    expect(result.candidates).toEqual(candidates);
  });

  it('库外且搜索服务不可用：透传 reason(m6 校准，不吞掉降级原因)', async () => {
    const research = makeCompanyResearch({ candidates: [], reason: 'timeout' });
    const svc = makeService({ research });

    const result = await svc.checkCompany('某公司');

    expect(result).toEqual({ company_known: false, candidates: [], reason: 'timeout' });
  });
});

describe('MockService — create() 按 company_research_id 查库(防伪造 M3)', () => {
  it('company_research_id 有效 → 按库内真实字段构造 confirmed，不信任任何前端文本', async () => {
    const ai = makeAiService();
    const research = makeCompanyResearch({
      byId: {
        id: 'cr-1',
        display_name: '某地区性有限公司',
        summary: '专注于区域物流服务的中小企业',
        source_url: 'https://example-regional.com',
        retrieved_at: new Date('2026-06-13T00:00:00.000Z'),
      },
    });
    const repo = makeRepo();
    const svc = makeService({ ai, research, repo });

    await svc.create('user-1', {
      company: '某地区性有限公司',
      role: '运营专员',
      company_research_id: 'cr-1',
    } as any);

    expect(research.findById).toHaveBeenCalledWith('cr-1');
    const call = (ai.completeStructured as jest.Mock).mock.calls[0][0] as { system: string; prompt: string };
    expect(call.system).toContain('https://example-regional.com');
    expect(call.system).toContain('2026-06-13');
    expect(call.prompt).toContain('专注于区域物流服务的中小企业');
  });

  it('company_research_id 无效/不存在 → 抛 400，不静默降级为通用模式', async () => {
    const research = makeCompanyResearch({ byId: null });
    const svc = makeService({ research });

    await expect(
      svc.create('user-1', {
        company: '某公司',
        role: '运营专员',
        company_research_id: 'not-exist-id',
      } as any),
    ).rejects.toMatchObject({ status: 400 });
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

describe('MockService — synthesizeQuestion(voice 读题)', () => {
  const voiceSession = {
    id: 's1',
    user_id: 'u1',
    mode: 'voice',
    questions: [
      { n: 1, type: '行为', topic: '自我介绍', difficulty: '简单', question: '请做个自我介绍。', hint: '' },
      { n: 2, type: '技术', topic: '算法', difficulty: '中等', question: '解释一下快速排序。', hint: '' },
    ],
  };

  function repoReturning(session: unknown) {
    return { ...makeRepo(), findOne: jest.fn().mockResolvedValue(session) };
  }

  it('voice 模式 → 用该题题面调 speech.synthesize,回传音频', async () => {
    const speech = makeSpeechService();
    const svc = makeService({ speech, repo: repoReturning(voiceSession) });

    const result = await svc.synthesizeQuestion('s1', 'u1', 1);

    expect(speech.synthesize).toHaveBeenCalledWith('解释一下快速排序。');
    expect(result.mimeType).toBe('audio/mpeg');
  });

  it('非本人会话(findOne 返回 null)→ 404,不调 speech', async () => {
    const speech = makeSpeechService();
    const svc = makeService({ speech, repo: repoReturning(null) });

    await expect(svc.synthesizeQuestion('s1', 'other', 0)).rejects.toMatchObject({ status: 404 });
    expect(speech.synthesize).not.toHaveBeenCalled();
  });

  it('text 模式会话 → 400,不调 speech', async () => {
    const speech = makeSpeechService();
    const svc = makeService({
      speech,
      repo: repoReturning({ ...voiceSession, mode: 'text' }),
    });

    await expect(svc.synthesizeQuestion('s1', 'u1', 0)).rejects.toMatchObject({ status: 400 });
    expect(speech.synthesize).not.toHaveBeenCalled();
  });

  it('题号越界 → 400,不调 speech', async () => {
    const speech = makeSpeechService();
    const svc = makeService({ speech, repo: repoReturning(voiceSession) });

    await expect(svc.synthesizeQuestion('s1', 'u1', 9)).rejects.toMatchObject({ status: 400 });
    expect(speech.synthesize).not.toHaveBeenCalled();
  });
});
