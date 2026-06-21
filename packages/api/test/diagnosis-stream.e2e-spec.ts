import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';

import { DiagnosesService, DiagnosisStreamEvent } from '../src/diagnoses/diagnoses.service';
import { AnalyzerService } from '../src/ai/analyzer.service';
import { RewriterService } from '../src/ai/rewriter.service';
import { ParserService } from '../src/ai/parser.service';
import { ProfessionPresetsService } from '../src/profession-presets/profession-presets.service';
import { ConcurrencyLimiter } from '../src/ai/concurrency-limiter';
import { CreditService } from '../src/credit/credit.service';
import { ResumesService } from '../src/resumes/resumes.service';
import { AiService } from '../src/ai/ai.service';

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
import { SalaryEntry } from '../src/salary/entities/salary-entry.entity';
import { Conversation } from '../src/conversations/entities/conversation.entity';
import { Message } from '../src/conversations/entities/message.entity';
import { Interview } from '../src/interviews/entities/interview.entity';
import { MockSession } from '../src/mock/entities/mock-session.entity';
import { CoverLetter } from '../src/cover-letters/entities/cover-letter.entity';
import { CreditTransaction } from '../src/credit/entities/credit-transaction.entity';
import { CareerAnalysisRecord } from '../src/career/entities/career-analysis.entity';
import { CoachHandoff } from '../src/coach-handoffs/entities/coach-handoff.entity';
import { AiUsage } from '../src/quota/entities/ai-usage.entity';

import type { MatchDimensions } from '../src/common/types';

const ALL_ENTITIES = [
  User, Resume, ResumeVersion, Diagnosis, Application, ApplicationEvent, DailyTask,
  Opportunity, OpportunityEvaluation, OpportunityEvidence, OpportunityAction,
  FeedSource, Company, Department, RoleCategory, CoverageMetric, DigestRun, FeedItem,
  SalaryEntry, Conversation, Message, Interview, MockSession, CoverLetter,
  CreditTransaction, CoachHandoff, CareerAnalysisRecord, AiUsage,
];

// ── AiService 是唯一被 mock 的依赖(逐字对齐 chat-stream.e2e-spec 的「只 mock AiService」做法)。
// completeStructured 按 toolName 路由返回各阶段的「AI 原始产物」;analyzer/rewriter/parser 的
// 归一与防编造护栏全部用真实实现处理这些原始产物——证明流式没有绕过任何护栏。
//
// 关键:返回的原始产物必须是「能通过护栏的合法形态」(每维 why 非空、suggested/reason 非空且
// original 是简历原文真实子串、无简历外数字),否则 analyzer 会因退化重试 3 次后抛 503、rewriter
// 会把建议降级。我们要测的是「成功路径下护栏被调用且结果正确落库」,故喂干净数据。
const RESUME_TEXT = [
  '李雷 应届毕业生 互联网产品经理求职意向',
  '教育背景:某重点大学 信息管理与信息系统 本科 2022-2026 GPA 3.8/4.0',
  '实习经历:2025.06-2025.09 某互联网公司 产品实习生',
  '- 负责商家工具方向,从用户调研出发梳理商家发券链路痛点',
  '- 主导一次需求评审,协调研发与设计推动优惠券模板功能上线',
  '- 通过数据分析将商家发券转化率从一成八提升到两成七',
  '项目经历:校园二手交易平台(担任产品负责人,团队五人)',
  '- 完成竞品分析与用户访谈,输出 PRD 与需求优先级排序',
  '技能:SQL、Axure、墨刀、数据分析;获全国大学生市场调研大赛二等奖',
].join('\n');

const JD_TEXT =
  '招聘互联网产品经理(校招):负责需求调研与产品设计,撰写 PRD,推动跨职能协作落地,' +
  '用数据分析(SQL)定义与衡量产品成功。要求:本科及以上,熟悉用户调研与竞品分析,具备数据驱动思维。';

// suggested 的内容必须是简历原句的真实子串(original 命中 resumeText)且不引入简历外的具体数字,
// 才能通过 rewriter 的确定性防编造护栏(original 必须在简历中存在 + hasUnsupportedNumber)。
const REAL_ORIGINAL = '负责商家工具方向,从用户调研出发梳理商家发券链路痛点';

interface CompleteStructuredParams {
  toolName: string;
}

describe('Diagnosis SSE stream — invariants (service-level, mocked AiService + sqlite)', () => {
  let moduleRef: TestingModule;
  let service: DiagnosesService;
  let analyzer: AnalyzerService;
  let rewriter: RewriterService;
  let limiter: ConcurrencyLimiter;
  let userRepo: Repository<User>;
  let resumeRepo: Repository<Resume>;
  let diagnosisRepo: Repository<Diagnosis>;
  let usageRepo: Repository<AiUsage>;
  let txRepo: Repository<CreditTransaction>;

  // 每个 completeStructured(toolName) 的返回值可被单测覆盖,以模拟「某阶段抛错」。
  let structuredImpl: (toolName: string) => unknown;

  function defaultStructured(toolName: string): unknown {
    switch (toolName) {
      case 'parse_resume':
        return {
          basic_info: { name: '李雷' },
          work_experience: [
            {
              company: '某互联网公司',
              title: '产品实习生',
              start_date: '2025-06',
              end_date: '2025-09',
              description: '负责商家工具方向',
              achievements: ['推动优惠券模板功能上线'],
            },
          ],
          education: [
            { school: '某重点大学', degree: '本科', major: '信息管理与信息系统', graduation_date: '2026-06' },
          ],
          skills: { technical: ['SQL', 'Axure'] },
          projects: [{ name: '校园二手交易平台', description: '产品负责人' }],
        };
      case 'parse_jd':
        return {
          job_title: '互联网产品经理',
          company: '某互联网公司',
          required_skills: [{ skill: 'SQL', level: 'required' }],
          responsibilities: ['需求调研', '产品设计'],
          qualifications: { education: '本科', must_have: ['用户调研'] },
          keywords: ['数据驱动', 'PRD'],
        };
      case 'analyze_match':
        // { total_score, dimensions: MatchDimensions } —— JD 形态:综合分在 overall.score。
        return {
          total_score: 78,
          dimensions: {
            skills: { score: 20, max: 25, matched: ['SQL'], missing: ['数据分析平台'], partial: [] },
            experience: { score: 18, max: 25, analysis: '有相关产品实习' },
            education: { score: 15, max: 15, analysis: '本科对口' },
            keywords: { score: 12, max: 15, coverage_rate: 0.8, missing_keywords: ['增长'] },
            overall: { score: 78, max: 100, analysis: '整体匹配度较好' },
          } as MatchDimensions,
        };
      case 'profession_standard_review':
        // RawProfessionStandard —— 每维 why 非空(否则 analyzer.isDegenerate 退化重试)。
        // 维度按预设顺序对齐(product-manager-campus 共 5 维)。
        return {
          total_score: 0, // analyzer 会按维度重算,忽略此值
          dimensions: [
            { score: 18, why: '有需求调研与竞品分析,产品思维清晰', evidenceFound: ['用户访谈'], gap: '' },
            { score: 17, why: '有转化率提升等量化表达', evidenceFound: ['转化率提升'], gap: '缺基数口径' },
            { score: 15, why: '担任产品负责人体现主导权', evidenceFound: ['产品负责人'], gap: '' },
            { score: 11, why: '有跨职能协作场景', evidenceFound: ['协调研发与设计'], gap: '' },
            { score: 12, why: '专业与实习对口,掌握基础工具', evidenceFound: ['SQL'], gap: '' },
          ],
          conventionChecks: [{ key: 'GPA', status: 'ok', note: 'GPA 已展示' }],
          interviewHooks: [
            {
              resumeHit: '将转化率从一成八提升到两成七',
              interviewQuestion: '这个转化率的计算口径与样本量是多少?',
              prepDirection: '准备清楚指标定义与数据来源',
            },
          ],
        };
      case 'suggest_rewrites':
        // { suggestions: RawRewriteSuggestion[] } —— original 必须是简历原句真实子串,
        // suggested 不得引入简历外具体数字,否则被降级为 gap_advice(护栏生效但破坏断言意图)。
        return {
          suggestions: [
            {
              section: '实习经历',
              type: 'rewrite',
              priority: 'high',
              original: REAL_ORIGINAL,
              suggested: '主导商家工具方向,基于用户调研定位发券链路核心痛点并推动优化',
              reason: '突出主导动作与问题定位,增强产品思维可信度',
            },
          ],
        };
      case 'flag_fabrication':
        // auditFaithfulness 复核:不打回任何建议。
        return { indices: [] };
      default:
        throw new Error(`unexpected toolName: ${toolName}`);
    }
  }

  beforeAll(async () => {
    const aiMock: Partial<AiService> = {
      completeStructured: <T>(params: CompleteStructuredParams) =>
        Promise.resolve(structuredImpl(params.toolName) as T),
    };

    // ResumesService 仅作数据查询(非被测逻辑):用真实 repo 落库,findOne/updateParsedJson 走真实实现。
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          synchronize: true,
          entities: ALL_ENTITIES,
        }),
        TypeOrmModule.forFeature([
          User, Resume, ResumeVersion, Diagnosis, AiUsage, CreditTransaction,
        ]),
      ],
      providers: [
        DiagnosesService,
        AnalyzerService,
        RewriterService,
        ParserService,
        ProfessionPresetsService,
        ConcurrencyLimiter,
        CreditService,
        ResumesService,
        { provide: AiService, useValue: aiMock },
        {
          // ConcurrencyLimiter 注入 ConfigService('ai.concurrency')。
          provide: ConfigService,
          useValue: { get: () => ({ max: 2, queue: 8 }) },
        },
      ],
    }).compile();

    service = moduleRef.get(DiagnosesService);
    analyzer = moduleRef.get(AnalyzerService);
    rewriter = moduleRef.get(RewriterService);
    limiter = moduleRef.get(ConcurrencyLimiter);
    userRepo = moduleRef.get(getRepositoryToken(User));
    resumeRepo = moduleRef.get(getRepositoryToken(Resume));
    diagnosisRepo = moduleRef.get(getRepositoryToken(Diagnosis));
    usageRepo = moduleRef.get(getRepositoryToken(AiUsage));
    txRepo = moduleRef.get(getRepositoryToken(CreditTransaction));
  }, 30_000);

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(() => {
    structuredImpl = defaultStructured;
    jest.restoreAllMocks();
  });

  // ── 夹具 ───────────────────────────────────────────────────────────────────
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

  async function newResume(userId: string): Promise<Resume> {
    return resumeRepo.save(
      resumeRepo.create({
        user_id: userId,
        title: '校招简历',
        raw_text: RESUME_TEXT,
        is_primary: true,
      }),
    );
  }

  async function drain(
    stream: AsyncIterable<DiagnosisStreamEvent>,
  ): Promise<DiagnosisStreamEvent[]> {
    const out: DiagnosisStreamEvent[] = [];
    for await (const e of stream) out.push(e);
    return out;
  }

  function find<TType extends DiagnosisStreamEvent['type']>(
    events: DiagnosisStreamEvent[],
    type: TType,
  ): Extract<DiagnosisStreamEvent, { type: TType }> | undefined {
    return events.find((e) => e.type === type) as
      | Extract<DiagnosisStreamEvent, { type: TType }>
      | undefined;
  }

  // 等待后台流水线跑完(消费 done 即代表落库完成;done 后还有 bill 也已在生成器内 await 完)。
  async function usageCount(userId: string): Promise<number> {
    return usageRepo.count({ where: { user_id: userId } });
  }

  // ── 不变量 1:analysis 事件发出时,DB 已有该行(suggestions 为空)——「结果永不丢」前置。
  it('[INV-1][campus] analysis 帧到达时,DB 中该 diagnosis 行已存在且 suggestions 为空', async () => {
    const user = await newUser('inv1-campus@diag.dev', 5);
    const resume = await newResume(user.id);

    const events: DiagnosisStreamEvent[] = [];
    let suggestionsAtAnalysis: unknown = 'UNSET';
    let rowExistsAtAnalysis = false;
    for await (const e of service.streamCreateProfessionStandard(
      user.id,
      { resume_id: resume.id, profession: '互联网产品经理' },
      '/api/diagnoses/campus/stream',
    )) {
      events.push(e);
      if (e.type === 'analysis') {
        // 在继续消费(从而不会推进到 suggesting/done)之前,立刻查 DB。
        const row = await diagnosisRepo.findOne({ where: { id: e.diagnosisId } });
        rowExistsAtAnalysis = !!row;
        suggestionsAtAnalysis = row?.suggestions;
      }
    }

    const analysis = find(events, 'analysis');
    expect(analysis).toBeDefined();
    expect(rowExistsAtAnalysis).toBe(true);
    // 落库时 suggestions=[](analyzer 帧前 repo.save 的就是空 suggestions)。
    expect(suggestionsAtAnalysis).toEqual([]);

    // 流跑完后,该行已被 update 补上 suggestions(最终非空)——闭环。
    const done = find(events, 'done');
    expect(done).toBeDefined();
    const final = await diagnosisRepo.findOneByOrFail({ id: analysis!.diagnosisId });
    expect(final.suggestions.length).toBeGreaterThan(0);
  });

  // ── 不变量 2:全流程成功 → credit 扣 1 + ai_usage +1。
  it('[INV-2a][campus] 成功收到 done → credit 恰扣 1 + 新增 1 条 ai_usage', async () => {
    const user = await newUser('inv2-ok@diag.dev', 7);
    const resume = await newResume(user.id);

    const before = await usageCount(user.id);
    const events = await drain(
      service.streamCreateProfessionStandard(
        user.id,
        { resume_id: resume.id, profession: '互联网产品经理' },
        '/api/diagnoses/campus/stream',
      ),
    );

    expect(find(events, 'done')).toBeDefined();
    expect(find(events, 'error')).toBeUndefined();

    const after = await userRepo.findOneByOrFail({ id: user.id });
    expect(after.credit_balance).toBe(6); // 7 - 1
    expect(await usageCount(user.id)).toBe(before + 1);

    // consume 流水恰好一条(delta=-1,type=consume,endpoint 对齐)。
    const txs = await txRepo.find({ where: { user_id: user.id, type: 'consume' } });
    expect(txs.length).toBe(1);
    expect(txs[0].delta).toBe(-1);
    expect(txs[0].endpoint).toBe('/api/diagnoses/campus/stream');
  });

  // ── 不变量 2:中途 error → credit 不变、ai_usage 不新增。
  it('[INV-2b][campus] 分析阶段抛错 → error 事件 + credit 不变 + ai_usage 不新增 + 无 done', async () => {
    const user = await newUser('inv2-err@diag.dev', 7);
    const resume = await newResume(user.id);

    // 让 profession_standard_review 阶段抛错(模拟 AI 不可用),analyzer 真实实现会上抛。
    structuredImpl = (toolName) => {
      if (toolName === 'profession_standard_review') {
        throw new Error('AI 服务暂时不可用,模拟分析阶段失败');
      }
      return defaultStructured(toolName);
    };

    const before = await usageCount(user.id);
    const events = await drain(
      service.streamCreateProfessionStandard(
        user.id,
        { resume_id: resume.id, profession: '互联网产品经理' },
        '/api/diagnoses/campus/stream',
      ),
    );

    expect(find(events, 'error')).toBeDefined();
    expect(find(events, 'done')).toBeUndefined();

    const after = await userRepo.findOneByOrFail({ id: user.id });
    expect(after.credit_balance).toBe(7); // 不扣
    expect(await usageCount(user.id)).toBe(before); // 不记
  });

  // ── 不变量 3:客户端断开(只消费到 analysis 即停止迭代)→ 后台流水线仍把 suggestions 落库。
  it('[INV-3][campus] 客户端在 analysis 后断开(停止消费)→ 后台仍 update suggestions 落库', async () => {
    const user = await newUser('inv3-abort@diag.dev', 5);
    const resume = await newResume(user.id);

    let diagnosisId = '';
    // 模拟「客户端断开」:消费到 analysis 帧就 break,不再迭代(等同控制器 res.on('close') 后停止转发)。
    for await (const e of service.streamCreateProfessionStandard(
      user.id,
      { resume_id: resume.id, profession: '互联网产品经理' },
      '/api/diagnoses/campus/stream',
    )) {
      if (e.type === 'analysis') {
        diagnosisId = e.diagnosisId;
        break; // 断开:停止消费。后台流水线(独立任务)应继续跑完 suggesting + update。
      }
    }
    expect(diagnosisId).not.toBe('');

    // 断开时 suggestions 尚为空。
    const atBreak = await diagnosisRepo.findOneByOrFail({ id: diagnosisId });
    expect(atBreak.suggestions).toEqual([]);

    // 后台流水线异步推进:轮询直到 suggestions 落库(永不丢)。
    let finalSuggestions: unknown[] = [];
    for (let i = 0; i < 100; i++) {
      const row = await diagnosisRepo.findOneByOrFail({ id: diagnosisId });
      if (row.suggestions && row.suggestions.length > 0) {
        finalSuggestions = row.suggestions;
        break;
      }
      await new Promise((r) => setImmediate(r));
    }
    expect(finalSuggestions.length).toBeGreaterThan(0);

    // 断开后台仍跑完:计费也照常发生(扣 1 + ai_usage +1)。
    for (let i = 0; i < 100; i++) {
      if ((await usageCount(user.id)) >= 1) break;
      await new Promise((r) => setImmediate(r));
    }
    expect(await usageCount(user.id)).toBe(1);
    const after = await userRepo.findOneByOrFail({ id: user.id });
    expect(after.credit_balance).toBe(4); // 5 - 1
  });

  // ── 不变量 4:被并发限流时 emit queue 事件(position>0)。
  it('[INV-4][campus] 并发槽占满 → 首帧为 queue(position>0)', async () => {
    const user = await newUser('inv4-queue@diag.dev', 5);
    const resume = await newResume(user.id);

    // 人为占满并发槽(max=2),让本次诊断进队列。
    const blockers: Array<() => void> = [];
    const hold = () =>
      limiter.run(() => new Promise<void>((resolve) => blockers.push(resolve)));
    void hold();
    void hold();
    await new Promise((r) => setImmediate(r)); // 两个 acquire 落定

    expect(limiter.status().active).toBe(2);

    const events = await drainUntilQueueThenRelease(
      service.streamCreateProfessionStandard(
        user.id,
        { resume_id: resume.id, profession: '互联网产品经理' },
        '/api/diagnoses/campus/stream',
      ),
      blockers,
    );

    const queueEvt = find(events, 'queue');
    expect(queueEvt).toBeDefined();
    expect(queueEvt!.position).toBeGreaterThan(0);
    // 放行后整条仍应跑完。
    expect(find(events, 'done')).toBeDefined();
  });

  // 先收集事件直到看到 queue 帧,然后放行 blockers 让流水线继续,最后排干。
  async function drainUntilQueueThenRelease(
    stream: AsyncIterable<DiagnosisStreamEvent>,
    blockers: Array<() => void>,
  ): Promise<DiagnosisStreamEvent[]> {
    const out: DiagnosisStreamEvent[] = [];
    let released = false;
    for await (const e of stream) {
      out.push(e);
      if (e.type === 'queue' && !released) {
        released = true;
        blockers.forEach((r) => r()); // 放行占位者 → 本次诊断获得槽位继续。
      }
    }
    if (!released) blockers.forEach((r) => r());
    return out;
  }

  // ── 不变量 4b:step 事件按真实阶段顺序发出(parsing → analyzing → suggesting)。
  it('[INV-4b][campus] step 事件按序发出:parsing → analyzing → suggesting(且均在 done 之前)', async () => {
    const user = await newUser('inv4b-steps@diag.dev', 5);
    const resume = await newResume(user.id);

    const events = await drain(
      service.streamCreateProfessionStandard(
        user.id,
        { resume_id: resume.id, profession: '互联网产品经理' },
        '/api/diagnoses/campus/stream',
      ),
    );

    // 取出全部 step 事件的 stage,验证恰好是 [parsing, analyzing, suggesting] 这一严格顺序。
    const stages = events
      .filter((e) => e.type === 'step')
      .map((e) => (e as Extract<DiagnosisStreamEvent, { type: 'step' }>).stage);
    expect(stages).toEqual(['parsing', 'analyzing', 'suggesting']);

    // 每个 step 都带中文文案(label 非空)。
    const stepEvents = events.filter(
      (e) => e.type === 'step',
    ) as Array<Extract<DiagnosisStreamEvent, { type: 'step' }>>;
    expect(stepEvents.every((s) => typeof s.label === 'string' && s.label.length > 0)).toBe(true);

    // 顺序铁律:最后一个 step(suggesting)的下标必须早于 done 的下标。
    const lastStepIdx = events.map((e) => e.type).lastIndexOf('step');
    const doneIdx = events.findIndex((e) => e.type === 'done');
    expect(doneIdx).toBeGreaterThan(lastStepIdx);
    // analysis 帧夹在 analyzing 与 suggesting 之间(分析落库后、改写开始前)。
    const analyzingIdx = events.findIndex(
      (e) => e.type === 'step' && (e as Extract<DiagnosisStreamEvent, { type: 'step' }>).stage === 'analyzing',
    );
    const analysisIdx = events.findIndex((e) => e.type === 'analysis');
    const suggestingIdx = events.findIndex(
      (e) => e.type === 'step' && (e as Extract<DiagnosisStreamEvent, { type: 'step' }>).stage === 'suggesting',
    );
    expect(analyzingIdx).toBeLessThan(analysisIdx);
    expect(analysisIdx).toBeLessThan(suggestingIdx);
  });

  // ── 不变量 5:analyzer/rewriter 护栏方法确实被调用(未被流式绕过)。
  it('[INV-5][campus] 真实 analyzer.analyzeAgainstPreset + rewriter.suggestAgainstPreset 均被调用(护栏未被绕过)', async () => {
    const user = await newUser('inv5-campus@diag.dev', 5);
    const resume = await newResume(user.id);

    const analyzeSpy = jest.spyOn(analyzer, 'analyzeAgainstPreset');
    const rewriteSpy = jest.spyOn(rewriter, 'suggestAgainstPreset');
    // auditFaithfulness 是 rewriter 内部 AI 防编造复核护栏:经 completeStructured('flag_fabrication') 触发。
    // 用一个 spy 记录 flag_fabrication 是否真被调用,证明复核护栏在流式路径里也跑了。
    let faithfulnessAudited = false;
    structuredImpl = (toolName) => {
      if (toolName === 'flag_fabrication') faithfulnessAudited = true;
      return defaultStructured(toolName);
    };

    const events = await drain(
      service.streamCreateProfessionStandard(
        user.id,
        { resume_id: resume.id, profession: '互联网产品经理' },
        '/api/diagnoses/campus/stream',
      ),
    );

    expect(find(events, 'done')).toBeDefined();
    expect(analyzeSpy).toHaveBeenCalledTimes(1);
    expect(rewriteSpy).toHaveBeenCalledTimes(1);
    expect(faithfulnessAudited).toBe(true);

    // 护栏真实作用证据:rewriter 的确定性防编造护栏把 original 命中简历原文的建议保留为可改写型,
    // 而非被绕过。done 落库的 suggestions 里至少一条 original 是简历真实子串。
    const done = find(events, 'done');
    const supported = done!.diagnosis.suggestions.filter(
      (s) => s.original && RESUME_TEXT.includes(s.original),
    );
    expect(supported.length).toBeGreaterThan(0);
  });

  it('[INV-5b][campus] rewriter 防编造护栏生效:original 非简历原文的建议被降级为 gap_advice(清空 original)', async () => {
    const user = await newUser('inv5b-guard@diag.dev', 5);
    const resume = await newResume(user.id);

    // 喂一条「original 不在简历里」的改写建议 → 真实护栏应把它降级 gap_advice + 清空 original。
    structuredImpl = (toolName) => {
      if (toolName === 'suggest_rewrites') {
        return {
          suggestions: [
            {
              section: '实习经历',
              type: 'rewrite',
              priority: 'high',
              original: '这句话简历里根本不存在的编造原文',
              suggested: '把不存在的经历改写成漂亮的句子',
              reason: '测试防编造护栏',
            },
          ],
        };
      }
      return defaultStructured(toolName);
    };

    const events = await drain(
      service.streamCreateProfessionStandard(
        user.id,
        { resume_id: resume.id, profession: '互联网产品经理' },
        '/api/diagnoses/campus/stream',
      ),
    );

    const done = find(events, 'done');
    expect(done).toBeDefined();
    const sugg = done!.diagnosis.suggestions;
    expect(sugg.length).toBe(1);
    // 护栏把它降级:type→gap_advice、original 清空(不冒充可直接粘贴的现成改写)。
    expect(sugg[0].type).toBe('gap_advice');
    expect(sugg[0].original).toBe('');
  });

  // ── 不变量 6:两种形态 payload 的断言。
  it('[INV-6a][campus] payload=ProfessionStandardResult(有 total_score)', async () => {
    const user = await newUser('inv6-campus@diag.dev', 5);
    const resume = await newResume(user.id);

    const events = await drain(
      service.streamCreateProfessionStandard(
        user.id,
        { resume_id: resume.id, profession: '互联网产品经理' },
        '/api/diagnoses/campus/stream',
      ),
    );

    const analysis = find(events, 'analysis');
    expect(analysis).toBeDefined();
    const payload = analysis!.payload as {
      total_score: number;
      dimensions: unknown[];
      conventionChecks: unknown[];
    };
    // 校招形态:ProfessionStandardResult — 顶层 total_score 为数字,且按维度重算 = 各维分之和。
    expect(typeof payload.total_score).toBe('number');
    expect(Array.isArray(payload.dimensions)).toBe(true);
    expect(payload.dimensions.length).toBe(5); // product-manager-campus 5 维
    expect(payload.total_score).toBe(18 + 17 + 15 + 11 + 12); // analyzer 按维度重算
    // 落库的 score 与 payload.total_score 一致。
    const done = find(events, 'done');
    expect(done!.diagnosis.score).toBe(payload.total_score);
    expect(done!.diagnosis.mode).toBe('profession_standard');
  });

  it('[INV-6b][jd] payload=MatchDimensions(综合分在 overall.score)', async () => {
    const user = await newUser('inv6-jd@diag.dev', 5);
    const resume = await newResume(user.id);

    const events = await drain(
      service.streamCreate(
        user.id,
        { resume_id: resume.id, jd_text: JD_TEXT },
        '/api/diagnoses/stream',
      ),
    );

    const analysis = find(events, 'analysis');
    expect(analysis).toBeDefined();
    // JD 形态:payload 是 MatchDimensions,综合分在 overall.score(不是顶层 total_score)。
    const payload = analysis!.payload as MatchDimensions;
    expect((payload as unknown as { total_score?: number }).total_score).toBeUndefined();
    expect(payload.overall).toBeDefined();
    expect(payload.overall.score).toBe(78);
    expect(payload.skills).toBeDefined();

    const done = find(events, 'done');
    expect(done).toBeDefined();
    expect(done!.diagnosis.mode).toBe('jd_match');
    expect(done!.diagnosis.score).toBe(78); // total_score 落 score 列
  });

  it('[INV-5c][jd] JD 形态 analyzer.analyze + rewriter.suggest 护栏方法被调用', async () => {
    const user = await newUser('inv5c-jd@diag.dev', 5);
    const resume = await newResume(user.id);

    const analyzeSpy = jest.spyOn(analyzer, 'analyze');
    const rewriteSpy = jest.spyOn(rewriter, 'suggest');

    const events = await drain(
      service.streamCreate(
        user.id,
        { resume_id: resume.id, jd_text: JD_TEXT },
        '/api/diagnoses/stream',
      ),
    );

    expect(find(events, 'done')).toBeDefined();
    expect(analyzeSpy).toHaveBeenCalledTimes(1);
    expect(rewriteSpy).toHaveBeenCalledTimes(1);
  });

  // ── 不变量 7:整体墙钟超时护栏。某阶段永久挂起 → 超时后推 error(中文)、无 done,且事件流关闭
  // (消费循环正常结束,不永挂)。证明单 AI 超时之外还有总上限,防后台任务永挂占住并发槽/连接。
  it('[INV-7][timeout] 分析阶段永久挂起 → 墙钟超时:error 事件(指定中文) + 无 done + 流已关闭', async () => {
    const user = await newUser('inv7-timeout@diag.dev', 7);
    const resume = await newResume(user.id);

    // 让 profession_standard_review 阶段返回永不 resolve 的 promise → analyzer 永久 await → 流水线挂起。
    structuredImpl = (toolName) => {
      if (toolName === 'profession_standard_review') {
        return new Promise(() => {
          /* 永不 resolve:模拟某 AI 调用彻底卡死 */
        });
      }
      return defaultStructured(toolName);
    };

    // 把墙钟超时调到极小值(150ms),让用例无需真等 10 分钟即可触发。finally 复原原值。
    const saved = process.env.DIAGNOSIS_PIPELINE_TIMEOUT_MS;
    process.env.DIAGNOSIS_PIPELINE_TIMEOUT_MS = '150';

    const before = await usageCount(user.id);
    let events: DiagnosisStreamEvent[];
    let streamClosed = false;
    try {
      // drain 会一直迭代到流 close 才返回;能返回本身即证明流已关闭(否则此处永挂、用例超时失败)。
      events = await drain(
        service.streamCreateProfessionStandard(
          user.id,
          { resume_id: resume.id, profession: '互联网产品经理' },
          '/api/diagnoses/campus/stream',
        ),
      );
      streamClosed = true;
    } finally {
      if (saved === undefined) delete process.env.DIAGNOSIS_PIPELINE_TIMEOUT_MS;
      else process.env.DIAGNOSIS_PIPELINE_TIMEOUT_MS = saved;
    }

    // 流已关闭(drain 返回)。
    expect(streamClosed).toBe(true);
    // 推了 error 事件,且文案正是超时护栏的中文。
    const err = find(events, 'error');
    expect(err).toBeDefined();
    expect(err!.message).toBe('诊断流水线超时,已中止以保护服务器资源');
    // 没有 done(流水线未成功)。
    expect(find(events, 'done')).toBeUndefined();
    // 失败路径不计费、不记 ai_usage(与 INV-2b 同构)。
    expect(await usageCount(user.id)).toBe(before);
    const after = await userRepo.findOneByOrFail({ id: user.id });
    expect(after.credit_balance).toBe(7);
  }, 15_000);

  // ════════════════════════════════════════════════════════════════════════════
  // 单次诊断成败记账(diagnoses.status / failure_reason / pipeline_error_message)
  //   设计:成功 → status='success';分析阶段失败 → status='failed' + 归类;
  //         分析已落库但改写阶段失败 → status='partial' + 归类。记账在 catch 内 await(out.close 前),
  //         故 drain 返回时状态已落库,无需轮询。这是与全局 AI 成功率【不同口径】的独立指标。
  // ════════════════════════════════════════════════════════════════════════════
  describe('诊断成败记账 — status/failure_reason 落库', () => {
    // (a) happy path → status='success',无 failure_reason/error_message。
    it('[STATUS-success][campus] 全流程成功 → 落库行 status=success,failure_reason 为空', async () => {
      const user = await newUser('status-ok@diag.dev', 5);
      const resume = await newResume(user.id);

      const events = await drain(
        service.streamCreateProfessionStandard(
          user.id,
          { resume_id: resume.id, profession: '互联网产品经理' },
          '/api/diagnoses/campus/stream',
        ),
      );
      const done = find(events, 'done');
      expect(done).toBeDefined();
      // done 事件携带的实体也带上 success 状态(供前端即时反映)。
      expect(done!.diagnosis.status).toBe('success');

      const row = await diagnosisRepo.findOneByOrFail({ id: done!.diagnosisId });
      expect(row.status).toBe('success');
      expect(row.failure_reason ?? null).toBeNull();
      expect(row.pipeline_error_message ?? null).toBeNull();
    });

    // (b) 注入分析阶段错误 → status='failed' + failure_reason 已分类(analyzer_error),且记了一行。
    it('[STATUS-failed][campus] 分析阶段抛错 → 补记一行 status=failed + failure_reason=analyzer_error + error_message 存档', async () => {
      const user = await newUser('status-failed@diag.dev', 5);
      const resume = await newResume(user.id);

      const ERR = 'AI 服务暂时不可用,模拟分析阶段失败(STATUS-failed)';
      structuredImpl = (toolName) => {
        if (toolName === 'profession_standard_review') throw new Error(ERR);
        return defaultStructured(toolName);
      };

      const before = await diagnosisRepo.count({ where: { user_id: user.id } });
      const events = await drain(
        service.streamCreateProfessionStandard(
          user.id,
          { resume_id: resume.id, profession: '互联网产品经理' },
          '/api/diagnoses/campus/stream',
        ),
      );
      expect(find(events, 'error')).toBeDefined();
      expect(find(events, 'done')).toBeUndefined();

      // 分析阶段失败(落库前)→ 补记恰一行 failed(分母完整)。
      const rows = await diagnosisRepo.find({ where: { user_id: user.id } });
      expect(rows.length).toBe(before + 1);
      const failedRow = rows.find((r) => r.status === 'failed');
      expect(failedRow).toBeDefined();
      expect(failedRow!.failure_reason).toBe('analyzer_error');
      expect(failedRow!.pipeline_error_message).toContain('模拟分析阶段失败');
      // 失败行带 resume_id/mode(可归因);suggestions 未产出。
      expect(failedRow!.resume_id).toBe(resume.id);
      expect(failedRow!.mode).toBe('profession_standard');
    });

    // (c) 注入改写阶段错误(分析已落库)→ 同一行被标 status='partial' + failure_reason=rewriter_error。
    it('[STATUS-partial][campus] 分析成功落库、改写阶段抛错 → 该行 status=partial + failure_reason=rewriter_error(不新增行)', async () => {
      const user = await newUser('status-partial@diag.dev', 5);
      const resume = await newResume(user.id);

      const ERR = '改写阶段模拟失败(STATUS-partial)';
      structuredImpl = (toolName) => {
        if (toolName === 'suggest_rewrites') throw new Error(ERR);
        return defaultStructured(toolName);
      };

      const before = await diagnosisRepo.count({ where: { user_id: user.id } });
      let analysisId = '';
      const events: DiagnosisStreamEvent[] = [];
      for await (const e of service.streamCreateProfessionStandard(
        user.id,
        { resume_id: resume.id, profession: '互联网产品经理' },
        '/api/diagnoses/campus/stream',
      )) {
        events.push(e);
        if (e.type === 'analysis') analysisId = e.diagnosisId;
      }
      // 分析帧到达过(行已落库),最终改写失败 → error,无 done。
      expect(analysisId).not.toBe('');
      expect(find(events, 'error')).toBeDefined();
      expect(find(events, 'done')).toBeUndefined();

      // 不新增行:就是分析阶段落的那一行被升级为 partial。
      const after = await diagnosisRepo.count({ where: { user_id: user.id } });
      expect(after).toBe(before + 1); // 仅分析阶段那一行
      const row = await diagnosisRepo.findOneByOrFail({ id: analysisId });
      expect(row.status).toBe('partial');
      expect(row.failure_reason).toBe('rewriter_error');
      expect(row.pipeline_error_message).toContain('改写阶段模拟失败');
      // partial:分析结果已落库(score 有值),仅 suggestions 为空。
      expect(row.score).toBeGreaterThan(0);
      expect(row.suggestions).toEqual([]);
    });

    // (d) 入参校验失败(JD 过短)→ failed + failure_reason=input_validation(落库前失败也补记一行)。
    it('[STATUS-validation][jd] 输入校验失败(JD 过短)→ status=failed + failure_reason=input_validation', async () => {
      const user = await newUser('status-validation@diag.dev', 5);
      const resume = await newResume(user.id);

      const events = await drain(
        service.streamCreate(
          user.id,
          { resume_id: resume.id, jd_text: '太短' },
          '/api/diagnoses/stream',
        ),
      );
      expect(find(events, 'error')).toBeDefined();
      expect(find(events, 'done')).toBeUndefined();

      const row = await diagnosisRepo.findOne({ where: { user_id: user.id } });
      expect(row).not.toBeNull();
      expect(row!.status).toBe('failed');
      expect(row!.failure_reason).toBe('input_validation');
      // 校验阶段失败:resume_id 据 dto 预填,行可归因。
      expect(row!.resume_id).toBe(resume.id);
    });

    // (e) 墙钟超时 → failure_reason=analyzer_timeout(区别于普通阶段错误)。
    // 置于本块末尾:超时用例的底层 AI 调用永不 resolve,会持续占用一个并发槽(与既有 INV-7 同理),
    // 故其后不能再排其它会争用并发槽的诊断用例,否则会被排队饿死(限流 max=2)。
    it('[STATUS-timeout][campus] 墙钟超时 → 补记 status=failed + failure_reason=analyzer_timeout', async () => {
      const user = await newUser('status-timeout@diag.dev', 5);
      const resume = await newResume(user.id);

      structuredImpl = (toolName) => {
        if (toolName === 'profession_standard_review') {
          return new Promise(() => {
            /* 永不 resolve */
          });
        }
        return defaultStructured(toolName);
      };
      const saved = process.env.DIAGNOSIS_PIPELINE_TIMEOUT_MS;
      process.env.DIAGNOSIS_PIPELINE_TIMEOUT_MS = '150';
      try {
        await drain(
          service.streamCreateProfessionStandard(
            user.id,
            { resume_id: resume.id, profession: '互联网产品经理' },
            '/api/diagnoses/campus/stream',
          ),
        );
      } finally {
        if (saved === undefined) delete process.env.DIAGNOSIS_PIPELINE_TIMEOUT_MS;
        else process.env.DIAGNOSIS_PIPELINE_TIMEOUT_MS = saved;
      }

      const row = await diagnosisRepo.findOneByOrFail({ user_id: user.id });
      expect(row.status).toBe('failed');
      expect(row.failure_reason).toBe('analyzer_timeout');
    }, 15_000);
  });
});
