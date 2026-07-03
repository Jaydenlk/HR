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
import { Conversation } from '../src/conversations/entities/conversation.entity';
import { Message } from '../src/conversations/entities/message.entity';
import { Interview } from '../src/interviews/entities/interview.entity';
import { MockSession } from '../src/mock/entities/mock-session.entity';
import { CoverLetter } from '../src/cover-letters/entities/cover-letter.entity';
import { CreditTransaction } from '../src/credit/entities/credit-transaction.entity';
import { CareerAnalysisRecord } from '../src/career/entities/career-analysis.entity';
import { CoachHandoff } from '../src/coach-handoffs/entities/coach-handoff.entity';
import { AiUsage } from '../src/quota/entities/ai-usage.entity';

const ALL_ENTITIES = [
  User, Resume, ResumeVersion, Diagnosis, Application, ApplicationEvent, DailyTask,
  Opportunity, OpportunityEvaluation, OpportunityEvidence, OpportunityAction,
  FeedSource, Company, Department, RoleCategory, CoverageMetric, DigestRun, FeedItem,
  Conversation, Message, Interview, MockSession, CoverLetter,
  CreditTransaction, CoachHandoff, CareerAnalysisRecord, AiUsage,
];

// 有效简历正文(与 diagnosis-stream.e2e-spec 同口径:能通过 parser/analyzer/rewriter 真实护栏)。
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

const REAL_ORIGINAL = '负责商家工具方向,从用户调研出发梳理商家发券链路痛点';

// AiService.completeStructured 的最小入参形状(与 diagnosis-stream.e2e-spec 同款局部声明)。
// 追加 skipLimiter:本 spec 的 mock【经真实 limiter 路由】,才能让 D1 嵌套自锁在无 skip 透传时真实复现。
interface CompleteStructuredParams {
  toolName: string;
  skipLimiter?: boolean;
}

// 校招/JD 两形态各阶段的「AI 原始产物」(干净、可过护栏);与 diagnosis-stream.e2e-spec 对齐。
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
      return {
        total_score: 78,
        dimensions: {
          skills: { score: 20, max: 25, matched: ['SQL'], missing: ['数据分析平台'], partial: [] },
          experience: { score: 18, max: 25, analysis: '有相关产品实习' },
          education: { score: 15, max: 15, analysis: '本科对口' },
          keywords: { score: 12, max: 15, coverage_rate: 0.8, missing_keywords: ['增长'] },
          overall: { score: 78, max: 100, analysis: '整体匹配度较好' },
        },
      };
    case 'profession_standard_review':
      return {
        total_score: 0,
        dimensions: [
          { score: 18, why: '有需求调研与竞品分析,产品思维清晰', evidenceFound: ['用户访谈'], gap: '' },
          { score: 17, why: '有转化率提升等量化表达', evidenceFound: ['转化率提升'], gap: '缺基数口径' },
          { score: 15, why: '担任产品负责人体现主导权', evidenceFound: ['产品负责人'], gap: '' },
          { score: 11, why: '有跨职能协作场景', evidenceFound: ['协调研发与设计'], gap: '' },
          { score: 12, why: '专业与实习对口,掌握基础工具', evidenceFound: ['SQL'], gap: '' },
        ],
        conventionChecks: [{ key: 'GPA', status: 'ok', note: 'GPA 已展示' }],
        interviewHooks: [],
      };
    case 'suggest_rewrites':
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
      return { indices: [] };
    default:
      throw new Error(`unexpected toolName: ${toolName}`);
  }
}

const ORPHAN_MS = 15 * 60 * 1000;

describe('S0 running 状态机 / 防重复(409)/ 防僵尸(惰性判死)/ D1 嵌套自锁(service-level, limiter-routed mock + sqlite)', () => {
  let moduleRef: TestingModule;
  let service: DiagnosesService;
  let limiter: ConcurrencyLimiter;
  let userRepo: Repository<User>;
  let resumeRepo: Repository<Resume>;
  let diagnosisRepo: Repository<Diagnosis>;

  // 各 completeStructured(toolName) 的返回值可被单测覆盖(注入 gate/错误)。
  let structuredImpl: (toolName: string) => unknown;

  beforeAll(async () => {
    // 关键:mock 的 completeStructured【经真实 limiter 路由】(与生产 AiService.attemptStructured 一致),
    // 令内层 AI 调用真正走 limiter.run(fn, {skipLimiter})。唯有如此,D1 嵌套自锁才会在「skipLimiter 未透传」
    // 时真实复现(fully-mock 的 AiService 完全绕过 limiter,无法暴露该回归)。
    const aiFactory = (lim: ConcurrencyLimiter): Partial<AiService> => ({
      completeStructured: <T>(params: CompleteStructuredParams) =>
        lim.run(
          () => Promise.resolve(structuredImpl(params.toolName) as T),
          { skipLimiter: params.skipLimiter },
        ),
    });

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
        { provide: AiService, useFactory: aiFactory, inject: [ConcurrencyLimiter] },
        {
          // max=2:D1 场景「两个并发诊断各占 1 外层槽 → 满」的复现前提。
          provide: ConfigService,
          useValue: { get: () => ({ max: 2, queue: 8 }) },
        },
      ],
    }).compile();

    service = moduleRef.get(DiagnosesService);
    limiter = moduleRef.get(ConcurrencyLimiter);
    userRepo = moduleRef.get(getRepositoryToken(User));
    resumeRepo = moduleRef.get(getRepositoryToken(Resume));
    diagnosisRepo = moduleRef.get(getRepositoryToken(Diagnosis));
  }, 30_000);

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(() => {
    structuredImpl = defaultStructured;
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
      resumeRepo.create({ user_id: userId, title: '校招简历', raw_text: RESUME_TEXT, is_primary: true }),
    );
  }

  // 直接落一条 running 行(模拟「已有诊断在跑」);ageMs>0 时把 created_at 回拨,制造孤儿。
  async function seedRunning(
    userId: string,
    resumeId: string,
    mode: 'jd_match' | 'profession_standard',
    ageMs = 0,
  ): Promise<Diagnosis> {
    const row = await diagnosisRepo.save(
      diagnosisRepo.create({ user_id: userId, resume_id: resumeId, mode, status: 'running' }),
    );
    if (ageMs > 0) {
      // CreateDateColumn 仅在 insert 自动赋值;用 QueryBuilder 显式回拨 created_at(update 不会自动改它)。
      await diagnosisRepo
        .createQueryBuilder()
        .update(Diagnosis)
        .set({ created_at: new Date(Date.now() - ageMs) })
        .where('id = :id', { id: row.id })
        .execute();
    }
    return row;
  }

  function find<TType extends DiagnosisStreamEvent['type']>(
    events: DiagnosisStreamEvent[],
    type: TType,
  ): Extract<DiagnosisStreamEvent, { type: TType }> | undefined {
    return events.find((e) => e.type === type) as
      | Extract<DiagnosisStreamEvent, { type: TType }>
      | undefined;
  }

  async function drain(
    stream: AsyncIterable<DiagnosisStreamEvent>,
  ): Promise<DiagnosisStreamEvent[]> {
    const out: DiagnosisStreamEvent[] = [];
    for await (const e of stream) out.push(e);
    return out;
  }

  // ── R8①:发起即有 running 行(流水线进行中即在 DB 可见)───────────────────────
  it('[S0-running][campus] 发起后、分析落终态前,DB 已有一行 status=running;done 后翻 success', async () => {
    const user = await newUser('s0-running@diag.dev', 5);
    const resume = await newResume(user.id);

    // gate 住分析阶段:令流水线停在 running,便于观测「进行中即可见」。
    let releaseAnalyzer!: () => void;
    const analyzerGate = new Promise<void>((r) => {
      releaseAnalyzer = r;
    });
    structuredImpl = (toolName) => {
      if (toolName === 'profession_standard_review') {
        return analyzerGate.then(() => defaultStructured(toolName));
      }
      return defaultStructured(toolName);
    };

    const it = service
      .streamCreateProfessionStandard(
        user.id,
        { resume_id: resume.id, profession: '互联网产品经理' },
        '/api/diagnoses/campus/stream',
      )
      [Symbol.asyncIterator]();

    // 消费到 analyzing step(此后管线卡在 gate 住的分析阶段)。
    let ev = await it.next();
    while (!ev.done && !(ev.value.type === 'step' && ev.value.stage === 'analyzing')) {
      ev = await it.next();
    }
    expect(ev.done).toBe(false);

    // 此刻:running 行已插入且尚未落终态。
    const running = await diagnosisRepo.findOne({
      where: { user_id: user.id, mode: 'profession_standard' },
    });
    expect(running).toBeTruthy();
    expect(running!.status).toBe('running');
    // 最小行:分析未落库,score 仍空。
    expect(running!.score ?? null).toBeNull();

    // 放行 → 排干 → done。
    releaseAnalyzer();
    const rest: DiagnosisStreamEvent[] = [];
    for (;;) {
      const n = await it.next();
      if (n.done) break;
      rest.push(n.value);
    }
    expect(find(rest, 'done')).toBeDefined();
    expect(find(rest, 'error')).toBeUndefined();

    // 同一行被翻 success(未新增行)。
    const after = await diagnosisRepo.find({ where: { user_id: user.id } });
    expect(after.length).toBe(1);
    expect(after[0].id).toBe(running!.id);
    expect(after[0].status).toBe('success');
  }, 15_000);

  // ── R8②:并发第二次 → 冲突(控制器据此回 409)────────────────────────────────
  it('[S0-conflict] 同用户同 mode 已有进行中诊断 → findRunningConflict 返回它(→ 控制器 409)', async () => {
    const user = await newUser('s0-conflict@diag.dev', 5);
    const resume = await newResume(user.id);

    // 无进行中 → 无冲突。
    expect(await service.findRunningConflict(user.id, 'profession_standard')).toBeNull();

    const inflight = await seedRunning(user.id, resume.id, 'profession_standard');

    // 第二次发起时的冲突查重:命中同 mode 的进行中诊断,携带其 id(控制器据此回 409)。
    const conflict = await service.findRunningConflict(user.id, 'profession_standard');
    expect(conflict).toBeTruthy();
    expect(conflict!.id).toBe(inflight.id);

    // mode 隔离:另一形态无进行中 → 不误挡。
    expect(await service.findRunningConflict(user.id, 'jd_match')).toBeNull();
  });

  // ── R8④:惰性 failed 先于 409(blocking 级正确性)—— 僵尸行不得永久卡死用户 ───
  it('[S0-order] 仅一条【超时孤儿】running → findRunningConflict 先判死再判冲突 → 返回 null(不误当冲突)', async () => {
    const user = await newUser('s0-order-orphan@diag.dev', 5);
    const resume = await newResume(user.id);

    // 一条 16 分钟前的 running(僵尸):>15 分钟阈值。
    const orphan = await seedRunning(user.id, resume.id, 'profession_standard', ORPHAN_MS + 60_000);

    // 关键顺序:必须先把孤儿惰性判 failed,再看是否仍有真 running。仅此一条僵尸 → 判死后无真 running → null。
    // 若顺序反了(先判 409),僵尸会让用户永远拿到 409、永久卡在「进行中」。
    const conflict = await service.findRunningConflict(user.id, 'profession_standard');
    expect(conflict).toBeNull();

    // 僵尸已被就地判 failed(reason=orphaned)。
    const flipped = await diagnosisRepo.findOneByOrFail({ id: orphan.id });
    expect(flipped.status).toBe('failed');
    expect(flipped.failure_reason).toBe('orphaned');
  });

  it('[S0-order] 孤儿 + 新鲜 running 并存 → 只返回新鲜那条为冲突,孤儿被判死', async () => {
    const user = await newUser('s0-order-mixed@diag.dev', 5);
    const resume = await newResume(user.id);

    const orphan = await seedRunning(user.id, resume.id, 'profession_standard', ORPHAN_MS + 60_000);
    const fresh = await seedRunning(user.id, resume.id, 'profession_standard', 0);

    const conflict = await service.findRunningConflict(user.id, 'profession_standard');
    expect(conflict).toBeTruthy();
    expect(conflict!.id).toBe(fresh.id); // 新鲜(未超时)才是真冲突

    // 孤儿被判死,不参与 409。
    const flipped = await diagnosisRepo.findOneByOrFail({ id: orphan.id });
    expect(flipped.status).toBe('failed');
    expect(flipped.failure_reason).toBe('orphaned');
    // 新鲜行仍 running。
    const still = await diagnosisRepo.findOneByOrFail({ id: fresh.id });
    expect(still.status).toBe('running');
  });

  // ── R5 防僵尸:读取时惰性判死(findOne / findAllByUser)──────────────────────
  it('[S0-orphan-read] findOne 命中超时孤儿 → 惰性判 failed(orphaned);未超时的 running 不误判', async () => {
    const user = await newUser('s0-orphan-read@diag.dev', 5);
    const resume = await newResume(user.id);

    const orphan = await seedRunning(user.id, resume.id, 'jd_match', ORPHAN_MS + 60_000);
    const readOrphan = await service.findOne(orphan.id, user.id);
    expect(readOrphan.status).toBe('failed');
    expect(readOrphan.failure_reason).toBe('orphaned');

    const fresh = await seedRunning(user.id, resume.id, 'jd_match', 0);
    const readFresh = await service.findOne(fresh.id, user.id);
    expect(readFresh.status).toBe('running'); // 未超时 → 不误判
  });

  it('[S0-orphan-read] findAllByUser 列表中的超时孤儿被就地判 failed', async () => {
    const user = await newUser('s0-orphan-list@diag.dev', 5);
    const resume = await newResume(user.id);

    const orphan = await seedRunning(user.id, resume.id, 'profession_standard', ORPHAN_MS + 60_000);
    const list = await service.findAllByUser(user.id);
    const row = list.find((d) => d.id === orphan.id);
    expect(row).toBeDefined();
    expect(row!.status).toBe('failed');
    expect(row!.failure_reason).toBe('orphaned');
  });

  // ── R8⑥ / D1:两个并发诊断不再自锁(内层 skipLimiter 精确透传)──────────────────
  it('[D1] 两个并发诊断均跑到 done(max=2 两外层槽占满,内层 skipLimiter 透传避免嵌套自锁)', async () => {
    const u1 = await newUser('d1-a@diag.dev', 5);
    const r1 = await newResume(u1.id);
    const u2 = await newUser('d1-b@diag.dev', 5);
    const r2 = await newResume(u2.id);

    // 两诊断并发:各自外层 runObservable 占 1 槽(2/2 满)。内层 parse/analyze/rewrite/flag_fabrication
    // 若不透传 skipLimiter 会再对同一 limiter acquire → 排队在满槽之后 → 外层永不释放 → 100% 自锁。
    // 修复(D1):内层 skipLimiter=true 精确透传 → 内层不 acquire → 两诊断都跑完。
    const [e1, e2] = await Promise.all([
      drain(
        service.streamCreateProfessionStandard(
          u1.id,
          { resume_id: r1.id, profession: '互联网产品经理' },
          '/api/diagnoses/campus/stream',
        ),
      ),
      drain(
        service.streamCreateProfessionStandard(
          u2.id,
          { resume_id: r2.id, profession: '互联网产品经理' },
          '/api/diagnoses/campus/stream',
        ),
      ),
    ]);

    expect(find(e1, 'done')).toBeDefined();
    expect(find(e2, 'done')).toBeDefined();
    expect(find(e1, 'error')).toBeUndefined();
    expect(find(e2, 'error')).toBeUndefined();

    // 收尾无僵尸槽/waiter(外层槽全部释放,队列清空)。
    expect(limiter.status()).toEqual({ active: 0, queued: 0 });
  }, 15_000);
});
