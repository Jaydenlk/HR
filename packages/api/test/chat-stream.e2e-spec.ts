import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { ConversationsService, ChatStreamEvent } from '../src/conversations/conversations.service';
import { CoachContextService } from '../src/conversations/coach-context.service';
import { ChatService } from '../src/conversations/chat.service';
import { ConcurrencyLimiter } from '../src/ai/concurrency-limiter';
import { CreditService } from '../src/credit/credit.service';
import { CoachHandoffsService } from '../src/coach-handoffs/coach-handoffs.service';
import { CoachHandoff } from '../src/coach-handoffs/entities/coach-handoff.entity';
import { AiService } from '../src/ai/ai.service';
import { IntelligenceModule } from '../src/intelligence/intelligence.module';

// Entities (full graph — TypeORM needs all referenced entities present)
import { User } from '../src/users/entities/user.entity';
import { Resume } from '../src/resumes/entities/resume.entity';
import { ResumeVersion } from '../src/resumes/entities/resume-version.entity';
import { Diagnosis } from '../src/diagnoses/entities/diagnosis.entity';
import { Application } from '../src/applications/entities/application.entity';
import { ApplicationEvent } from '../src/applications/entities/application-event.entity';
import { DailyTask } from '../src/tasks/entities/daily-task.entity';
import { Opportunity } from '../src/opportunity/entities/opportunity.entity';
import { OpportunityEvaluation } from '../src/opportunity/entities/opportunity-evaluation.entity';
import { OpportunityEvidence } from '../src/opportunity/entities/opportunity-evidence.entity';
import { OpportunityAction } from '../src/opportunity/entities/opportunity-action.entity';
import { FeedItem } from '../src/feed/entities/feed-item.entity';
import { FeedSource } from '../src/feed/entities/feed-source.entity';
import { Company } from '../src/feed/entities/company.entity';
import { Department } from '../src/feed/entities/department.entity';
import { RoleCategory } from '../src/feed/entities/role-category.entity';
import { CoverageMetric } from '../src/feed/entities/coverage-metric.entity';
import { DigestRun } from '../src/feed/entities/digest-run.entity';
import { Conversation } from '../src/conversations/entities/conversation.entity';
import { Message } from '../src/conversations/entities/message.entity';
import { Interview } from '../src/interviews/entities/interview.entity';
import { MockSession } from '../src/mock/entities/mock-session.entity';
import { CoverLetter } from '../src/cover-letters/entities/cover-letter.entity';
import { CreditTransaction } from '../src/credit/entities/credit-transaction.entity';
import { CareerAnalysisRecord } from '../src/career/entities/career-analysis.entity';

const ALL_ENTITIES = [
  User, Resume, ResumeVersion, Diagnosis, Application, ApplicationEvent, DailyTask,
  Opportunity, OpportunityEvaluation, OpportunityEvidence, OpportunityAction,
  FeedSource, Company, Department, RoleCategory, CoverageMetric, DigestRun, FeedItem,
  Conversation, Message, Interview, MockSession, CoverLetter,
  CreditTransaction, CoachHandoff, CareerAnalysisRecord,
];

// Async generator helper: yields a fixed sequence of text chunks (a "stream").
async function* streamOf(chunks: string[]): AsyncGenerator<string, void, void> {
  for (const c of chunks) yield c;
}
// Async generator that yields some chunks then throws (mid-stream failure).
async function* streamThenThrow(
  chunks: string[],
  msg: string,
): AsyncGenerator<string, void, void> {
  for (const c of chunks) yield c;
  throw new Error(msg);
}

async function drain(
  gen: AsyncGenerator<ChatStreamEvent, void, void>,
): Promise<ChatStreamEvent[]> {
  const out: ChatStreamEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

describe('Chat SSE stream + accounting + on-demand context', () => {
  let moduleRef: TestingModule;
  let service: ConversationsService;
  let chatService: ChatService;
  let userRepo: Repository<User>;
  let resumeRepo: Repository<Resume>;
  let diagnosisRepo: Repository<Diagnosis>;
  let coverRepo: Repository<CoverLetter>;
  let limiter: ConcurrencyLimiter;

  // chat.stream / completeStructured mocks (AiService is fully mocked).
  let chatStreamImpl: () => AsyncGenerator<string, void, void>;
  let selectorImpl: () => Promise<unknown>;

  beforeAll(async () => {
    const aiMock: Partial<AiService> = {
      chat: () => chatStreamImpl(),
      completeStructured: <T>() => selectorImpl() as Promise<T>,
    };

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          synchronize: true,
          entities: ALL_ENTITIES,
        }),
        TypeOrmModule.forFeature([
          User, Conversation, Message, Diagnosis, Opportunity, OpportunityEvaluation,
          Resume, CoverLetter, CreditTransaction, CoachHandoff,
          Interview, MockSession, Application, ApplicationEvent, CareerAnalysisRecord,
        ]),
        IntelligenceModule,
      ],
      providers: [
        ConversationsService,
        CoachContextService,
        ChatService,
        CreditService,
        ConcurrencyLimiter,
        CoachHandoffsService,
        { provide: AiService, useValue: aiMock },
        {
          // ConcurrencyLimiter injects ConfigService('ai.concurrency').
          provide: ConfigService,
          useValue: { get: () => ({ max: 2, queue: 8 }) },
        },
      ],
    }).compile();

    service = moduleRef.get(ConversationsService);
    chatService = moduleRef.get(ChatService);
    limiter = moduleRef.get(ConcurrencyLimiter);
    userRepo = moduleRef.get(getRepositoryToken(User));
    resumeRepo = moduleRef.get(getRepositoryToken(Resume));
    diagnosisRepo = moduleRef.get(getRepositoryToken(Diagnosis));
    coverRepo = moduleRef.get(getRepositoryToken(CoverLetter));
  }, 30_000);

  afterAll(async () => {
    await moduleRef.close();
  });

  // Default: selector returns nothing; stream yields a short reply.
  beforeEach(() => {
    selectorImpl = () => Promise.resolve({ need: [] });
    chatStreamImpl = () => streamOf(['你好', '，', '我来帮你']);
  });

  async function newUser(email: string, balance = 10): Promise<User> {
    return userRepo.save(
      userRepo.create({
        email,
        name: email.split('@')[0],
        invite_code: email.slice(0, 7),
        credit_balance: balance,
      }),
    );
  }

  // ── SSE event sequence ────────────────────────────────────────────────────

  it('streamMessage 产出 token 增量序列,最后 done(含落库消息)', async () => {
    const user = await newUser('stream-ok@test.dev', 5);
    const conv = await service.create(user.id, {});
    // NOTE: StreamHandoffSplitter 使用 PREFIX_LEN-1=7 字符的 pending 窗口检测跨 chunk 标记。
    // 短 chunk（<7字符）会被积压在 pending 中,在 finish().extra 统一补发。
    // 因此用 8+ 字符的长 chunk 才能保证逐 chunk 推送(Bug #001:短 chunk 无法实时 emit,见 handoff-parser.ts:121)。
    // 关键不变量:所有 token 文本拼合 == 落库 content。
    chatStreamImpl = () => streamOf(['这是第一段回复文字', '这是第二段回复文字', '第三段结尾']);

    const events = await drain(
      service.streamMessage(conv.id, user.id, '帮我看简历', '/api/test'),
    );

    const tokens = events.filter((e) => e.type === 'token');
    const allText = tokens.map((t) => (t as { text: string }).text).join('');
    const done = events.find((e) => e.type === 'done');
    expect(done).toBeDefined();
    const d = done as Extract<ChatStreamEvent, { type: 'done' }>;
    expect(d.user_message.content).toBe('帮我看简历');
    // 所有 token 文本拼合 == 落库 content(核心不变量)
    expect(allText).toBe(d.assistant_message.content);
    expect(allText).toContain('这是第一段回复文字');
    // 落库:assistant 消息真写进 DB。
    const persisted = await service.findOne(conv.id, user.id);
    const roles = persisted.messages.map((m) => m.role);
    expect(roles).toEqual(['user', 'assistant']);
  });

  it('流正常完成 → 扣 1 点;done 携带新余额', async () => {
    const user = await newUser('stream-credit@test.dev', 7);
    const conv = await service.create(user.id, {});

    const events = await drain(
      service.streamMessage(conv.id, user.id, 'hi', '/api/test'),
    );
    const done = events.find((e) => e.type === 'done') as
      | Extract<ChatStreamEvent, { type: 'done' }>
      | undefined;
    expect(done?.credit_balance).toBe(6); // 7 - 1

    const after = await userRepo.findOneByOrFail({ id: user.id });
    expect(after.credit_balance).toBe(6);
  });

  it('流中途失败 → error 事件 + 不扣点 + 不落 assistant 消息', async () => {
    const user = await newUser('stream-fail@test.dev', 4);
    const conv = await service.create(user.id, {});
    // NOTE: Bug #002 — 若 chunk 长度 < pending 窗口(7字符),pending 内容在 error 时丢失(见 handoff-parser.ts:121 + conversations.service.ts:221)。
    // 用 8+ 字符的 chunk 保证 pending 前段已 emit,error 发生时有可见 token,核心不变量"不扣点+不落库"不受影响。
    chatStreamImpl = () => streamThenThrow(['这是中途失败前的内容'], 'mid-stream reset');

    const events = await drain(
      service.streamMessage(conv.id, user.id, 'boom', '/api/test'),
    );

    // 已交付的 token(pending 窗口外已 emit 部分)+ 末尾 error;无 done。
    expect(events.some((e) => e.type === 'token')).toBe(true);
    const err = events.find((e) => e.type === 'error');
    expect(err).toBeDefined();
    expect(events.some((e) => e.type === 'done')).toBe(false);

    // 不扣点。
    const after = await userRepo.findOneByOrFail({ id: user.id });
    expect(after.credit_balance).toBe(4);

    // 不落 assistant 消息(user 消息已落,用户能看到自己发了什么)。
    const persisted = await service.findOne(conv.id, user.id);
    expect(persisted.messages.map((m) => m.role)).toEqual(['user']);
  });

  it('排队积压时先推 queue 事件(前面还有 N 个)', async () => {
    const user = await newUser('stream-queue@test.dev', 5);
    const conv = await service.create(user.id, {});

    // 人为占满并发槽,制造队列积压:max=2,先占 2 个不释放 → 再让 3 个排队。
    const blockers: Array<() => void> = [];
    const hold = () =>
      limiter.run(
        () => new Promise<void>((resolve) => blockers.push(resolve)),
      );
    void hold();
    void hold();
    // 让两个 acquire 落定。
    await new Promise((r) => setImmediate(r));
    void limiter.run(() => new Promise<void>((resolve) => blockers.push(resolve)));
    await new Promise((r) => setImmediate(r));

    expect(limiter.status().queued).toBeGreaterThan(0);

    const events = await drain(
      service.streamMessage(conv.id, user.id, '排队中', '/api/test'),
    );
    const queueEvt = events.find((e) => e.type === 'queue') as
      | Extract<ChatStreamEvent, { type: 'queue' }>
      | undefined;
    expect(queueEvt).toBeDefined();
    expect(queueEvt!.position).toBeGreaterThan(0);

    // 放行 blockers,清理。
    blockers.forEach((r) => r());
  });

  // ── R4 解耦:客户端断开只停转发,后台完整消费上游流并落库/扣费(回复永不丢)──────────
  it('[R4][解耦] 消费方提前 break(客户端断开)→ 后台仍把完整回复落库并扣费', async () => {
    const user = await newUser('chat-disconnect@test.dev', 5);
    const conv = await service.create(user.id, {});

    // 可控 gate:先 yield 一段(触发 token),卡住收尾段,模拟「断开时上游尚未流完」。
    let releaseTail!: () => void;
    const tailGate = new Promise<void>((resolve) => {
      releaseTail = resolve;
    });
    chatStreamImpl = async function* (): AsyncGenerator<string, void, void> {
      yield '断开前已经生成好的第一段完整回复内容文字';
      await tailGate; // 断开时后台卡在这里(上游还没流完)
      yield '断开后后台继续消费到自然结束的第二段收尾文字';
    };

    // 消费到第一个 token 即 break(等同控制器 res.on('close') 后停止转发)。
    const gen = service.streamMessage(conv.id, user.id, '帮我看简历', '/api/test');
    let gotToken = false;
    for await (const e of gen) {
      if (e.type === 'token') {
        gotToken = true;
        break; // 断开:停止转发。后台任务(独立)应继续把上游流完整消费并落库。
      }
    }
    expect(gotToken).toBe(true);

    // 放行上游收尾 → 后台任务完整消费到自然结束并落 assistant + 扣费。
    releaseTail();

    // 轮询直到 assistant 消息落库(后台异步推进)。
    let assistant: Message | undefined;
    for (let i = 0; i < 200; i++) {
      const persisted = await service.findOne(conv.id, user.id);
      assistant = persisted.messages.find((m) => m.role === 'assistant');
      if (assistant) break;
      await new Promise((r) => setImmediate(r));
    }
    expect(assistant).toBeDefined();
    // 完整回复(两段都在)落库——断开只停转发,上游流完整消费到结束,绝不落半截。
    expect(assistant!.content).toContain('第一段');
    expect(assistant!.content).toContain('第二段收尾');

    // 扣费照常发生(1 点),与「跑完落库」同生共死。
    const after = await userRepo.findOneByOrFail({ id: user.id });
    expect(after.credit_balance).toBe(4); // 5 - 1
  });

  // ── 非流式旧端点回归(降级路径) ──────────────────────────────────────────

  it('非流式 sendMessage 仍可用(降级路径):返回 user/assistant 消息', async () => {
    const user = await newUser('nonstream@test.dev', 5);
    const conv = await service.create(user.id, {});

    const res = await service.sendMessage(conv.id, user.id, '老端点还在吗');
    expect(res.user_message.content).toBe('老端点还在吗');
    expect(res.assistant_message.content).toBe('你好，我来帮你');
  });

  // ── 行为骨架七要素 system prompt ──────────────────────────────────────────

  it('system prompt 含行为骨架七要素关键句', () => {
    const prompt = chatService.buildSystemPrompt(undefined, '画像数据');
    // ① 追问纪律
    expect(prompt).toContain('最多追问 3 轮');
    expect(prompt).toMatch(/每个问题都附一句「为什么需要/);
    // ② 主动盘点
    expect(prompt).toContain('主动盘点');
    expect(prompt).toContain('不看会损失什么');
    // ③ 续接提议
    expect(prompt).toContain('续接');
    expect(prompt).toContain('用户确认才执行');
    // ④ 句句标源(五种标签)
    expect(prompt).toContain('[据简历]');
    expect(prompt).toContain('[据诊断]');
    expect(prompt).toContain('[据平台记录]');
    expect(prompt).toContain('[推断]');
    expect(prompt).toContain('[通用经验]');
    // ⑤ 防编造红线
    expect(prompt).toContain('防编造红线');
    expect(prompt).toContain('未经核实的口头主张');
    // ⑥ 身份与语气
    expect(prompt).toContain('求职主理人');
    expect(prompt).toContain('结论先行');
    // ⑦ 模块地图
    expect(prompt).toContain('站内能力地图');
    expect(prompt).toContain('/diagnoses');
    expect(prompt).toContain('/mock');
    // 上下文注入。
    expect(prompt).toContain('画像数据');
  });

  it('buildMessages 构造真多轮 user/assistant 数组(首条为 user)', () => {
    const history = [
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
    ] as Message[];
    const msgs = chatService.buildMessages(history, 'q2');
    expect(msgs).toEqual([
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'q2' },
    ]);
  });

  // ── 按需取数:选择器命中 → 上下文含对应全文;抛错 → 静默降级 ─────────────

  it('选择器返回 need[cover_letter] → 上下文并入该求职信全文', async () => {
    const user = await newUser('ondemand@test.dev', 5);
    const cover = await coverRepo.save(
      coverRepo.create({
        user_id: user.id,
        company: '字节跳动',
        role: '后端开发',
        tone: 'warm',
        content: '尊敬的招聘官，这是一封独一无二的求职信正文XYZ。',
      }),
    );

    selectorImpl = () =>
      Promise.resolve({ need: [{ kind: 'cover_letter', id: cover.id }] });

    const ctx = await moduleRef
      .get(CoachContextService)
      .loadReferencedProducts(user.id, '帮我改改我给字节的求职信');
    expect(ctx).toContain('求职信全文');
    expect(ctx).toContain('独一无二的求职信正文XYZ');
  });

  it('选择器幻觉 id(不在目录)→ 被过滤,不并入', async () => {
    const user = await newUser('ondemand-hallucinate@test.dev', 5);
    await coverRepo.save(
      coverRepo.create({
        user_id: user.id,
        company: 'A',
        role: 'B',
        tone: 'warm',
        content: '真实求职信',
      }),
    );
    selectorImpl = () =>
      Promise.resolve({
        need: [{ kind: 'cover_letter', id: '00000000-0000-0000-0000-000000000000' }],
      });

    const ctx = await moduleRef
      .get(CoachContextService)
      .loadReferencedProducts(user.id, '随便问问');
    expect(ctx).toBe('');
  });

  it('选择器抛错 → 静默降级返回空串(不抛错)', async () => {
    const user = await newUser('ondemand-err@test.dev', 5);
    const resume = await resumeRepo.save(
      resumeRepo.create({
        user_id: user.id,
        title: 'r',
        raw_text: 'x',
        is_primary: true,
      }),
    );
    await diagnosisRepo.save(
      diagnosisRepo.create({
        user_id: user.id,
        resume_id: resume.id,
        mode: 'jd_match',
        jd_company: 'C',
        jd_role: 'D',
        score: 70,
        keywords_hit: [],
        keywords_miss: [],
        suggestions: [],
      }),
    );
    selectorImpl = () => Promise.reject(new Error('selector down'));

    await expect(
      moduleRef.get(CoachContextService).loadReferencedProducts(user.id, '问诊断'),
    ).resolves.toBe('');
  });

  it('开场上下文含主简历全文 + 最新诊断要点 + 产物目录', async () => {
    const user = await newUser('opening@test.dev', 5);
    const resume = await resumeRepo.save(
      resumeRepo.create({
        user_id: user.id,
        title: '我的简历',
        raw_text: '简历正文里有一句独特口令ABC123',
        is_primary: true,
      }),
    );
    await diagnosisRepo.save(
      diagnosisRepo.create({
        user_id: user.id,
        resume_id: resume.id,
        mode: 'jd_match',
        jd_company: '腾讯',
        jd_role: '产品经理',
        score: 82,
        keywords_hit: ['用户增长'],
        keywords_miss: ['数据分析'],
        suggestions: [],
      }),
    );

    const ctx = await moduleRef.get(CoachContextService).buildContext(user.id);
    expect(ctx).toContain('主简历全文');
    expect(ctx).toContain('独特口令ABC123');
    expect(ctx).toContain('最新诊断要点');
    expect(ctx).toContain('腾讯');
    expect(ctx).toContain('产物目录');
  });

  // ── handoff 标记流式剥离端到端 ───────────────────────────────────────────────

  it('[E2E] 合法 handoff 标记: token 事件无 JSON 泄漏,card 事件到达,落库 content 已剥离', async () => {
    const user = await newUser('handoff-strip@test.dev', 5);
    const conv = await service.create(user.id, {});

    const handoffPayload = { company: '字节跳动', role: '后端开发', jd_text: 'Go/分布式' };
    const handoffTag = `<handoff>${JSON.stringify({ target: 'mock', payload: handoffPayload })}</handoff>`;
    // AI 流:正文 + 末尾合法 handoff 标记(分跨两个 chunk 以模拟真实流)
    // 确保前置正文 > 7字符使其实时 emit
    chatStreamImpl = () =>
      streamOf(['好的,我来帮你配置字节跳动后端开发模拟面试。\n\n', handoffTag]);

    const events = await drain(
      service.streamMessage(conv.id, user.id, '帮我配模拟面试', '/api/test'),
    );

    // 1. 所有 token 文本均不含 <handoff 或 JSON 字符串(无标记泄漏)
    const tokenTexts = events
      .filter((e) => e.type === 'token')
      .map((e) => (e as { text: string }).text)
      .join('');
    expect(tokenTexts).not.toContain('<handoff>');
    expect(tokenTexts).not.toContain('"target"');

    // 2. 有 card 事件且携带正确 target + payload
    const cardEvt = events.find((e) => e.type === 'card') as
      | Extract<ChatStreamEvent, { type: 'card' }>
      | undefined;
    expect(cardEvt).toBeDefined();
    expect(cardEvt!.target).toBe('mock');
    expect(cardEvt!.payload).toMatchObject(handoffPayload);
    expect(cardEvt!.handoff_id).toBeTruthy();

    // 3. done.assistant_message.content 已剥离标记
    const done = events.find((e) => e.type === 'done') as
      | Extract<ChatStreamEvent, { type: 'done' }>
      | undefined;
    expect(done).toBeDefined();
    expect(done!.assistant_message.content).not.toContain('<handoff>');
    expect(done!.assistant_message.content).not.toContain('"target"');
    expect(done!.assistant_message.content).toContain('配置字节跳动后端开发模拟面试');
  });

  it('[E2E][FC7] 流中途出错时,splitter pending/缓冲内容 flush 给客户端再发 error 事件', async () => {
    // Bug #002 修复验证:中途出错时不丢 pending 内容。
    const user = await newUser('stream-error-flush@test.dev', 5);
    const conv = await service.create(user.id, {});

    // 用足够长的 chunk 确保部分内容已通过 pending 窗口 emit,后续再抛错
    chatStreamImpl = () => streamThenThrow(['前置正文足够长以突破窗口。', '第二段内容'], '中途断流');

    const events = await drain(
      service.streamMessage(conv.id, user.id, '测试', '/api/test'),
    );

    // 有 token 事件(已 emit 的内容)
    const tokens = events.filter((e) => e.type === 'token');
    expect(tokens.length).toBeGreaterThan(0);
    const allTokenText = tokens.map((e) => (e as { text: string }).text).join('');
    // pending flush 后文本完整(前置正文可见)
    expect(allTokenText).toContain('前置正文');

    // 有 error 事件
    const errEvt = events.find((e) => e.type === 'error');
    expect(errEvt).toBeDefined();
    expect((errEvt as { message: string }).message).toContain('中途断流');

    // 无 done 事件(出错路径不落库不扣点)
    expect(events.some((e) => e.type === 'done')).toBe(false);
  });

  it('[E2E][FC6] payload 超过 4000 字符时:正文无损但不建 handoff 记录(正文完整,无 card 事件)', async () => {
    const user = await newUser('handoff-oversize@test.dev', 5);
    const conv = await service.create(user.id, {});

    // 构造超限 payload:jd_text 超过 4000 字符
    const oversizePayload = { company: '字节跳动', role: 'PM', jd_text: 'x'.repeat(4100) };
    const handoffTag = `<handoff>${JSON.stringify({ target: 'mock', payload: oversizePayload })}</handoff>`;
    chatStreamImpl = () => streamOf(['正文内容足够长以突破窗口。\n\n', handoffTag]);

    const events = await drain(
      service.streamMessage(conv.id, user.id, '帮我配置面试', '/api/test'),
    );

    // 无 card 事件(payload 超限,不建记录)
    expect(events.some((e) => e.type === 'card')).toBe(false);

    // 有 done 事件(流正常完成)
    const done = events.find((e) => e.type === 'done');
    expect(done).toBeDefined();
  });

  it('[E2E][压力] 正文中出现字面 <handoff 但 JSON 非合法: 降级补发,无 card 事件,无 JSON 泄漏到分离正文', async () => {
    // 规格红线:流式剥离宁可误缓冲不可漏出 JSON;解析失败必须正文无损。
    // 本测试验证:非合法标记(缺闭合/JSON 非法/target 非法)不产生 card 事件,
    // 缓冲区内容通过 extra 补发,正文无损(两段文本均可被用户看到)。
    const user = await newUser('handoff-fallback@test.dev', 5);
    const conv = await service.create(user.id, {});

    // 非法标记:target 不在白名单内
    const illegalTag = '<handoff>{"target":"unknown_module","payload":{}}</handoff>';
    chatStreamImpl = () =>
      streamOf(['以下是分析报告正文内容足够长以突破窗口。\n\n', illegalTag]);

    const events = await drain(
      service.streamMessage(conv.id, user.id, '随便问', '/api/test'),
    );

    // 1. 无 card 事件(非合法标记不建卡片)
    expect(events.some((e) => e.type === 'card')).toBe(false);

    // 2. 有 done 事件(流正常结束)
    const done = events.find((e) => e.type === 'done') as
      | Extract<ChatStreamEvent, { type: 'done' }>
      | undefined;
    expect(done).toBeDefined();

    // 3. 所有用户侧可见文本(token events)拼合后包含原文正文(无损降级)
    const tokenTexts = events
      .filter((e) => e.type === 'token')
      .map((e) => (e as { text: string }).text)
      .join('');
    expect(tokenTexts).toContain('以下是分析报告正文内容足够长以突破窗口');

    // 4. 非合法标记内容通过 extra(token 事件)补发 —— 缓冲区原文还原(正文无损)
    // done.assistant_message.content = tokenTexts(实现中 cleanText 包含 extra)
    expect(done!.assistant_message.content).toContain('以下是分析报告正文内容足够长以突破窗口');

    // 5. 缓冲区原文(含非法标记)通过 token 事件可见 —— 用户看到完整正文(无损)
    // 关键:虽然 <handoff 被缓冲,但解析失败后通过 extra 补发,用户能看到完整正文
    expect(tokenTexts + done!.assistant_message.content).toContain('<handoff>');
  });
});
