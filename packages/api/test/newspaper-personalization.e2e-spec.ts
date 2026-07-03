import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewspaperService } from '../src/feed/newspaper.service';
import { CompanyRegistryService } from '../src/feed/company-registry.service';
import { RecruitIntelService } from '../src/feed/recruit-intel.service';
import { EvidenceService } from '../src/intelligence/evidence.service';
import { IntelligenceModule } from '../src/intelligence/intelligence.module';

// All entities (TypeORM needs the full graph for FK constraints)
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
  Conversation,
  Message,
  Interview,
  MockSession,
  CoverLetter,
];

describe('NewspaperService personalization (standalone)', () => {
  let moduleRef: TestingModule;
  let newspaperService: NewspaperService;
  let evidenceService: EvidenceService;
  let userRepo: Repository<User>;
  let feedRepo: Repository<FeedItem>;
  let appRepo: Repository<Application>;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          synchronize: true,
          entities: ALL_ENTITIES,
        }),
        TypeOrmModule.forFeature([
          FeedItem,
          FeedSource,
          DigestRun,
          Company,
          Department,
          RoleCategory,
          CoverageMetric,
          User,
          Application,
        ]),
        IntelligenceModule,
      ],
      providers: [
        NewspaperService,
        CompanyRegistryService,
        // T2:本套件测的是月刊个性化排序逻辑,与校招情报板块无关,给个空板块桩即可,
        // 不必把 recruit_events 全套依赖(GLM 解析/去重)拉进这个 standalone 模块。
        {
          provide: RecruitIntelService,
          useValue: { getBoardData: jest.fn(async () => ({ upcoming: [], unscheduled: [] })) },
        },
      ],
    }).compile();

    newspaperService = moduleRef.get(NewspaperService);
    evidenceService = moduleRef.get(EvidenceService);
    userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    feedRepo = moduleRef.get<Repository<FeedItem>>(getRepositoryToken(FeedItem));
    appRepo = moduleRef.get<Repository<Application>>(getRepositoryToken(Application));
  }, 30_000);

  afterAll(async () => {
    await moduleRef.close();
  });

  // Helper: create a feed item that passes getNewspaper filters:
  // - published_at within current quarter
  // - date_confidence 'high' or 'medium'
  // - content >= 200 chars (isUsable requirement)
  // - quality_score normalizes to >= 50 (isUsable requirement)
  const LONG_CONTENT = '这是一段足够长的面试经验内容，用于满足isUsable要求的200字符最小长度。包含详细的面试流程描述、技术问题解析、以及面试官的反馈和建议。希望这段内容对后续准备面试的同学有所帮助，建议大家多多练习算法题和系统设计题，同时注意沟通表达能力的提升。面试前一定要对目标公司和岗位有充分的了解和准备。此外还有一些关于简历优化的建议和项目经验的总结，希望能帮助大家更好地准备面试，提高通过率。最后祝大家面试顺利，拿到心仪的offer。加油！这段文字必须超过两百个字符才能满足测试需求。';

  async function createFeedItem(
    overrides: Partial<FeedItem> & { title: string; source_url: string } & { content?: string },
  ): Promise<FeedItem> {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 1); // yesterday — within current quarter

    return feedRepo.save(
      feedRepo.create({
        source: 'ugc',
        source_kind: 'xhs',
        category: 'interview_exp',
        confidence: 'high',
        quality_score: 8,
        question_types: [],
        created_at: recentDate,
        published_at: recentDate,
        date_confidence: 'high',
        content: LONG_CONTENT,
        ...overrides,
      } as unknown as FeedItem),
    );
  }

  // ── 1. Empty user, no feed: structure + "上传简历" coach action ──────────

  it('getNewspaper: empty user with no feed items returns valid structure and 上传简历 coach action', async () => {
    const user = await userRepo.save(
      userRepo.create({
        email: 'empty-no-feed@test.dev',
        name: 'Empty No Feed',
        invite_code: 'ENF001',
      }),
    );

    const result = await newspaperService.getNewspaper(user.id);

    // Valid top-level structure
    expect(result).toHaveProperty('headline_observations');
    expect(result).toHaveProperty('insight_cards');
    expect(result).toHaveProperty('user_voice');
    expect(result).toHaveProperty('tech_radar');
    expect(result).toHaveProperty('role_trends');
    expect(result).toHaveProperty('coach_actions');
    expect(result).toHaveProperty('trending_tags');
    expect(result).toHaveProperty('total_count');
    expect(result).toHaveProperty('categories');

    expect(Array.isArray(result.user_voice)).toBe(true);
    expect(Array.isArray(result.tech_radar)).toBe(true);
    expect(Array.isArray(result.coach_actions)).toBe(true);

    // No feed data => total_count is 0
    expect(result.total_count).toBe(0);

    // "上传简历" must appear because user has no resume
    const uploadAction = result.coach_actions.find((a) => a.action === '上传简历');
    expect(uploadAction).toBeDefined();
    expect(uploadAction!.reason).toContain('简历');
  });

  // ── 2. Empty user with feed items: items show, default quality sort applies ──

  it('getNewspaper: empty user with feed items shows items without personalization boost', async () => {
    const user = await userRepo.save(
      userRepo.create({
        email: 'empty-with-feed@test.dev',
        name: 'Empty With Feed',
        invite_code: 'EWF001',
      }),
    );

    // Create two xhs items with different quality scores (no company match possible)
    await createFeedItem({
      title: '高质量面经',
      source_url: 'https://xhs.com/item-high',
      source_kind: 'xhs',
      company: '阿里巴巴',
      quality_score: 9,
    });

    await createFeedItem({
      title: '低质量面经',
      source_url: 'https://xhs.com/item-low',
      source_kind: 'xhs',
      company: '阿里巴巴',
      quality_score: 6,
    });

    const result = await newspaperService.getNewspaper(user.id);

    // user_voice (xhs) should contain items
    expect(result.user_voice.length).toBeGreaterThanOrEqual(2);
    expect(result.total_count).toBeGreaterThanOrEqual(2);

    // Without user company match, items should be sorted by quality_score descending
    const scores = result.user_voice.map((i) => i.quality_score ?? 0);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });

  // ── 3. User with application: matching company items rank higher ────────

  it('getNewspaper: user with 字节跳动 application gets 字节跳动 items ranked first', async () => {
    const user = await userRepo.save(
      userRepo.create({
        email: 'bytedance-user@test.dev',
        name: 'ByteDance Applicant',
        invite_code: 'BDA001',
      }),
    );

    // User applied to 字节跳动
    await appRepo.save(
      appRepo.create({
        user_id: user.id,
        company: '字节跳动',
        role: '后端',
        stage: 'applied',
      }),
    );

    // 字节跳动 item with lower quality score
    const bytedanceItem = await createFeedItem({
      title: '字节跳动后端面经',
      source_url: 'https://xhs.com/byte-item',
      source_kind: 'xhs',
      company: '字节跳动',
      quality_score: 6,
    });

    // 腾讯 item with higher quality score
    await createFeedItem({
      title: '腾讯高分面经',
      source_url: 'https://xhs.com/tencent-item',
      source_kind: 'xhs',
      company: '腾讯',
      quality_score: 9,
    });

    const result = await newspaperService.getNewspaper(user.id);

    // user_voice should have items
    expect(result.user_voice.length).toBeGreaterThanOrEqual(2);

    // 字节跳动 item should appear before 腾讯 item because it matches user's company of interest
    const byteIndex = result.user_voice.findIndex((i) => i.id === bytedanceItem.id);
    expect(byteIndex).not.toBe(-1);

    const tencentIndex = result.user_voice.findIndex((i) => i.company === '腾讯');
    // ByteDance item (company match) should rank before Tencent item (no match)
    if (tencentIndex !== -1) {
      expect(byteIndex).toBeLessThan(tencentIndex);
    }
  });

  // ── 4. Low confidence items excluded from user_voice/tech_radar ──────────

  it('getNewspaper: low confidence items are excluded from user_voice and tech_radar', async () => {
    const user = await userRepo.save(
      userRepo.create({
        email: 'low-conf@test.dev',
        name: 'Low Conf User',
        invite_code: 'LC001',
      }),
    );

    // Low confidence xhs item
    const lowConfItem = await createFeedItem({
      title: '低置信度面经',
      source_url: 'https://xhs.com/low-conf',
      source_kind: 'xhs',
      company: '华为',
      confidence: 'low',
      quality_score: 8,
    });

    // Low confidence nowcoder item
    const lowConfNowcoder = await createFeedItem({
      title: '低置信度帖子',
      source_url: 'https://nowcoder.com/low-conf',
      source_kind: 'nowcoder',
      company: '百度',
      confidence: 'low',
      quality_score: 8,
    });

    // High confidence item to confirm non-low items still appear
    await createFeedItem({
      title: '高置信度面经',
      source_url: 'https://xhs.com/high-conf',
      source_kind: 'xhs',
      company: '美团',
      confidence: 'high',
      quality_score: 8,
    });

    const result = await newspaperService.getNewspaper(user.id);

    // Low confidence items must NOT appear in user_voice
    const lowInUserVoice = result.user_voice.find((i) => i.id === lowConfItem.id);
    expect(lowInUserVoice).toBeUndefined();

    // Low confidence items must NOT appear in tech_radar
    const lowInTechRadar = result.tech_radar.find((i) => i.id === lowConfNowcoder.id);
    expect(lowInTechRadar).toBeUndefined();

    // High confidence item should be present
    const highInUserVoice = result.user_voice.find((i) => i.company === '美团');
    expect(highInUserVoice).toBeDefined();
  });

  // ── 5. EvidenceService.getCompaniesOfInterest is called during getNewspaper ──

  it('getNewspaper: calls EvidenceService.getCompaniesOfInterest to drive personalization', async () => {
    const user = await userRepo.save(
      userRepo.create({
        email: 'spy-test@test.dev',
        name: 'Spy Test User',
        invite_code: 'SPY001',
      }),
    );

    // Spy on the real method — getCompaniesOfInterest is called by NewspaperService
    // directly AND internally by EvidenceService.gather(), so we expect >= 1 call
    const spy = jest.spyOn(evidenceService, 'getCompaniesOfInterest');

    const callsBefore = spy.mock.calls.length;
    await newspaperService.getNewspaper(user.id);
    const newCalls = spy.mock.calls.slice(callsBefore);

    // At least one call happened during this getNewspaper invocation
    expect(newCalls.length).toBeGreaterThanOrEqual(1);
    // Every new call used the correct userId
    for (const call of newCalls) {
      expect(call[0]).toBe(user.id);
    }

    spy.mockRestore();
  });

  it('user_voice: relevant company survives past top-10 quality cutoff', async () => {
    await feedRepo.clear();
    const user = await userRepo.save(userRepo.create({ email: 'trunc-xhs@test.com', name: 'TruncXhs', invite_code: 'TEST' }));
    await appRepo.save(appRepo.create({ user_id: user.id, company: '字节跳动', role: '后端', stage: 'applied' }));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // 11 high-score non-字节 xhs items
    for (let i = 0; i < 11; i++) {
      await feedRepo.save(feedRepo.create({
        title: `腾讯面经${i}`, content: LONG_CONTENT, source_kind: 'xhs',
        source_url: `https://xhs.com/tencent${i}`, confidence: 'high',
        quality_score: 9, company: '腾讯', created_at: yesterday,
        published_at: yesterday, date_confidence: 'high',
      }));
    }
    // 1 low-score 字节 xhs item (quality_score 6 normalizes to 60, still >= 50 threshold)
    await feedRepo.save(feedRepo.create({
      title: '字节后端一面', content: LONG_CONTENT, source_kind: 'xhs',
      source_url: 'https://xhs.com/bytedance1', confidence: 'high',
      quality_score: 6, company: '字节跳动', created_at: yesterday,
      published_at: yesterday, date_confidence: 'high',
    }));

    const edition = await newspaperService.getNewspaper(user.id);
    const titles = edition.user_voice.map((i) => i.title);
    expect(titles).toContain('字节后端一面');
    expect(titles[0]).toBe('字节后端一面');
  });

  it('tech_radar: relevant company survives past top-10 quality cutoff', async () => {
    await feedRepo.clear();
    const user = await userRepo.save(userRepo.create({ email: 'trunc-nc@test.com', name: 'TruncNc', invite_code: 'TEST' }));
    await appRepo.save(appRepo.create({ user_id: user.id, company: '美团', role: '算法', stage: 'interview' }));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    for (let i = 0; i < 11; i++) {
      await feedRepo.save(feedRepo.create({
        title: `阿里算法题${i}`, content: LONG_CONTENT, source_kind: 'nowcoder',
        source_url: `https://nowcoder.com/ali${i}`, confidence: 'high',
        quality_score: 9, company: '阿里巴巴', created_at: yesterday,
        published_at: yesterday, date_confidence: 'high',
      }));
    }
    // quality_score 6 normalizes to 60, still >= 50 threshold
    await feedRepo.save(feedRepo.create({
      title: '美团外卖算法面', content: LONG_CONTENT, source_kind: 'nowcoder',
      source_url: 'https://nowcoder.com/meituan1', confidence: 'high',
      quality_score: 6, company: '美团', created_at: yesterday,
      published_at: yesterday, date_confidence: 'high',
    }));

    const edition = await newspaperService.getNewspaper(user.id);
    const titles = edition.tech_radar.map((i) => i.title);
    expect(titles).toContain('美团外卖算法面');
    expect(titles[0]).toBe('美团外卖算法面');
  });

  it('E7 source: interview-only company boosts newspaper personalization', async () => {
    await feedRepo.clear();
    const interviewRepo = moduleRef.get<Repository<Interview>>(getRepositoryToken(Interview));
    const user = await userRepo.save(userRepo.create({ email: 'e7-interview@test.com', name: 'E7Int', invite_code: 'TEST' }));

    // User has NO applications/opportunities/diagnoses — only an interview
    await interviewRepo.save(interviewRepo.create({
      user_id: user.id,
      company: '腾讯',
      role: '后端开发',
      round: 1,
    }));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // 11 high-score non-腾讯 items
    for (let i = 0; i < 11; i++) {
      await feedRepo.save(feedRepo.create({
        title: `阿里面经${i}`, content: LONG_CONTENT, source_kind: 'xhs',
        source_url: `https://xhs.com/ali-e7-${i}`, confidence: 'high',
        quality_score: 9, company: '阿里巴巴', created_at: yesterday,
        published_at: yesterday, date_confidence: 'high',
      }));
    }
    // 1 low-score 腾讯 item (quality_score 6 normalizes to 60, still >= 50 threshold)
    await feedRepo.save(feedRepo.create({
      title: '腾讯后端一面复盘', content: LONG_CONTENT, source_kind: 'xhs',
      source_url: 'https://xhs.com/tencent-e7', confidence: 'high',
      quality_score: 6, company: '腾讯', created_at: yesterday,
      published_at: yesterday, date_confidence: 'high',
    }));

    const edition = await newspaperService.getNewspaper(user.id);
    const titles = edition.user_voice.map((i) => i.title);
    expect(titles).toContain('腾讯后端一面复盘');
    expect(titles[0]).toBe('腾讯后端一面复盘');
  });
});
