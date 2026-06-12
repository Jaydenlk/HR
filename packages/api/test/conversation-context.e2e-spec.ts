import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ConversationsService } from '../src/conversations/conversations.service';
import { CoachContextService } from '../src/conversations/coach-context.service';
import { ChatService } from '../src/conversations/chat.service';
import { ConcurrencyLimiter } from '../src/ai/concurrency-limiter';
import { CreditService } from '../src/credit/credit.service';
import { AiService } from '../src/ai/ai.service';
import { IntelligenceModule } from '../src/intelligence/intelligence.module';

// All entities (copied from evidence.e2e-spec.ts — TypeORM needs the full graph)
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

const ALL_ENTITIES = [
  User,
  Resume,
  ResumeVersion,
  Diagnosis,
  Application,
  ApplicationEvent,
  DailyTask,
  Opportunity,
  OpportunityEvaluation,
  OpportunityEvidence,
  OpportunityAction,
  FeedSource,
  Company,
  Department,
  RoleCategory,
  CoverageMetric,
  DigestRun,
  FeedItem,
  SalaryEntry,
  Conversation,
  Message,
  Interview,
  MockSession,
  CoverLetter,
  CreditTransaction,
];

describe('ConversationsService context integration', () => {
  let moduleRef: TestingModule;
  let conversationsService: ConversationsService;
  let chatReplyMock: jest.Mock;
  let userRepo: Repository<User>;
  let resumeRepo: Repository<Resume>;
  let appRepo: Repository<Application>;

  beforeAll(async () => {
    chatReplyMock = jest.fn().mockResolvedValue('AI response');

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          synchronize: true,
          entities: ALL_ENTITIES,
        }),
        TypeOrmModule.forFeature([
          User,
          Conversation,
          Message,
          Diagnosis,
          Opportunity,
          OpportunityEvaluation,
          Resume,
          Application,
          CoverLetter,
          CreditTransaction,
        ]),
        IntelligenceModule,
      ],
      providers: [
        ConversationsService,
        CoachContextService,
        CreditService,
        ConcurrencyLimiter,
        { provide: ChatService, useValue: { reply: chatReplyMock } },
        // CoachContextService 注入 AiService(按需取数选择器);本套件无产物,选择器不会被调到。
        {
          provide: AiService,
          useValue: { completeStructured: jest.fn().mockResolvedValue({ need: [] }) },
        },
        // ConcurrencyLimiter 注入 ConfigService('ai.concurrency')。
        {
          provide: ConfigService,
          useValue: { get: () => ({ max: 2, queue: 8 }) },
        },
      ],
    }).compile();

    conversationsService = moduleRef.get(ConversationsService);
    userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    resumeRepo = moduleRef.get<Repository<Resume>>(getRepositoryToken(Resume));
    appRepo = moduleRef.get<Repository<Application>>(
      getRepositoryToken(Application),
    );
  }, 30_000);

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(() => {
    chatReplyMock.mockClear();
  });

  // ── 1. sendMessage passes userContext to chat.reply ───────────────────

  it('sendMessage passes userContext as 4th argument to chat.reply', async () => {
    const user = await userRepo.save(
      userRepo.create({
        email: 'ctx@test.dev',
        name: 'Ctx Test',
        invite_code: 'CTX001',
      }),
    );

    const conv = await conversationsService.create(user.id, {});
    await conversationsService.sendMessage(conv.id, user.id, 'hello');

    expect(chatReplyMock).toHaveBeenCalledTimes(1);

    // chat.reply(history, content, context, userContext)
    const callArgs = chatReplyMock.mock.calls[0];
    expect(callArgs).toHaveLength(4);

    const [history, content, context, userContext] = callArgs;
    expect(Array.isArray(history)).toBe(true);
    expect(content).toBe('hello');
    // free conversation has no context_type binding
    expect(context).toBeUndefined();
    expect(typeof userContext).toBe('string');
  });

  // ── 2. User with resume + application => context includes their data ──

  it('sendMessage with user data includes evidence in context', async () => {
    const user = await userRepo.save(
      userRepo.create({
        email: 'rich@test.dev',
        name: 'Rich User',
        invite_code: 'RICH001',
      }),
    );

    await resumeRepo.save(
      resumeRepo.create({
        user_id: user.id,
        title: '5年Java简历',
        raw_text: '5年Java开发经验，熟悉Spring Boot、MySQL、Redis',
        is_primary: true,
        parsed_json: {
          basic_info: { name: 'Rich', email: 'rich@test.dev' },
          summary: 'Java developer',
          work_experience: [],
          education: [],
          skills: {
            technical: ['Java', 'Spring Boot', 'MySQL'],
            soft: [],
            languages: ['中文'],
            certifications: [],
          },
          projects: [],
        },
      }),
    );

    await appRepo.save(
      appRepo.create({
        user_id: user.id,
        company: '字节跳动',
        role: '后端开发',
        stage: 'applied',
      }),
    );

    const conv = await conversationsService.create(user.id, {});
    await conversationsService.sendMessage(conv.id, user.id, '帮我准备面试');

    expect(chatReplyMock).toHaveBeenCalledTimes(1);

    const userContext: string = chatReplyMock.mock.calls[0][3];
    expect(typeof userContext).toBe('string');
    expect(userContext).toContain('简历');
    expect(userContext).toContain('字节跳动');
  });

  // ── 3. Empty user still gets a context string (not an error) ──────────

  it('sendMessage with empty user still passes context string', async () => {
    const user = await userRepo.save(
      userRepo.create({
        email: 'empty@test.dev',
        name: 'Empty User',
        invite_code: 'EMPTY01',
      }),
    );

    const conv = await conversationsService.create(user.id, {});
    await conversationsService.sendMessage(conv.id, user.id, 'hi');

    expect(chatReplyMock).toHaveBeenCalledTimes(1);

    const userContext: string = chatReplyMock.mock.calls[0][3];
    expect(typeof userContext).toBe('string');
    // Empty user has no data, so context mentions "暂无简历数据"
    expect(userContext).toContain('暂无简历数据');
  });

  // ── 4. Context is rebuilt per message (not cached) ────────────────────

  it('rebuilds context for every sendMessage call', async () => {
    const user = await userRepo.save(
      userRepo.create({
        email: 'rebuild@test.dev',
        name: 'Rebuild User',
        invite_code: 'RBLD001',
      }),
    );

    const conv = await conversationsService.create(user.id, {});

    // First message — no resume
    await conversationsService.sendMessage(conv.id, user.id, 'msg1');
    const ctx1: string = chatReplyMock.mock.calls[0][3];
    expect(ctx1).toContain('暂无简历数据');

    // Add resume between messages
    await resumeRepo.save(
      resumeRepo.create({
        user_id: user.id,
        title: '新简历',
        raw_text: '前端开发',
        is_primary: true,
        parsed_json: {
          basic_info: { name: 'Rebuild', email: 'rebuild@test.dev' },
          summary: 'Frontend dev',
          work_experience: [],
          education: [],
          skills: {
            technical: ['React', 'TypeScript'],
            soft: [],
            languages: [],
            certifications: [],
          },
          projects: [],
        },
      }),
    );

    // Second message — should now include resume data
    await conversationsService.sendMessage(conv.id, user.id, 'msg2');
    const ctx2: string = chatReplyMock.mock.calls[1][3];
    expect(ctx2).toContain('新简历');
  });

  // ── 5. Multiple users get independent contexts ────────────────────────

  it('different users get independent contexts', async () => {
    const userA = await userRepo.save(
      userRepo.create({
        email: 'usera@test.dev',
        name: 'User A',
        invite_code: 'USERA01',
      }),
    );
    const userB = await userRepo.save(
      userRepo.create({
        email: 'userb@test.dev',
        name: 'User B',
        invite_code: 'USERB01',
      }),
    );

    // Only user A has an application
    await appRepo.save(
      appRepo.create({
        user_id: userA.id,
        company: '腾讯',
        role: '产品经理',
        stage: 'interview',
      }),
    );

    const convA = await conversationsService.create(userA.id, {});
    const convB = await conversationsService.create(userB.id, {});

    await conversationsService.sendMessage(convA.id, userA.id, 'hello');
    await conversationsService.sendMessage(convB.id, userB.id, 'hello');

    const ctxA: string = chatReplyMock.mock.calls[0][3];
    const ctxB: string = chatReplyMock.mock.calls[1][3];

    expect(ctxA).toContain('腾讯');
    expect(ctxB).not.toContain('腾讯');
  });
});
