/**
 * 存量字级脏数据「读取层防御性再聚合 + 幂等写回」e2e。
 *
 * 背景(线上 psql 实读 task 4a8e0091):provider 层聚句修复前落库的 segments_json 是字级
 * (一字一段,如「然」「后」…),这些历史任务停在 awaiting_confirm。用户不该被迫重传 22MB。
 *
 * 本测试直接往库里种一条 awaiting_confirm + 字级 segments_json 的任务(绕过 provider,
 * 模拟存量脏数据),验证:
 *  1. GET .../transcribe/status 返回的 segmentsJson 已被聚成句级(段数 ≪ 字数、text 为整句、
 *     idx 从 0 重编号、speaker 保留)。
 *  2. 幂等写回:GET 之后直接查库,task.segments_json 已被覆写为句级(下次读取无需再聚合)。
 *  3. confirm 路径读到的也是句级:按聚合后 idx 提交纠正 → 分析成功 → completed,
 *     且写回 Interview 的 transcript 是整句带角色前缀(非逐字)。
 *
 * AI 全 mock(label 不会被再调——存量已带 speaker;仅 confirm 的 interview_debrief 被调)。
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { SPEECH_PROVIDER } from '../src/speech/providers/speech.provider';
import type { SpeechProvider } from '../src/speech/providers/speech.provider';
import { User } from '../src/users/entities/user.entity';
import { Interview } from '../src/interviews/entities/interview.entity';
import {
  InterviewTranscribeTask,
  LabeledSegment,
} from '../src/speech/entities/transcribe-task.entity';
import { request } from './test-utils';

// provider 不会被本测试触发(直接种库);给个满足接口的空壳即可。
const noopSpeechProvider: SpeechProvider = {
  capabilities: { diarization: false, channelSplit: false, realtime: false },
  async transcribeFile() {
    throw new Error('本测试不应触发真实转写');
  },
  async synthesize() {
    throw new Error('本测试不合成语音');
  },
};

const DEBRIEF_RESULT = {
  overall_grade: 'B+',
  overall_note: '整体表现稳健。',
  summary: '面试围绕自我介绍与项目经历展开,候选人介绍了全栈项目经验。',
  scores: [{ name: '技术深度', score: 80 }],
  questions: [
    {
      question: '自我介绍',
      tone: 'good',
      coach_assessment: '清晰',
      better_answer: '更优示例',
      knowledge_gaps: [],
    },
  ],
  prediction: { next_round_topics: [{ topic: '项目深挖', likelihood: 70 }], summary: '深挖项目' },
};

const mockAiService = {
  complete: jest.fn().mockResolvedValue('是'),
  completeStructured: jest.fn().mockImplementation((params: { toolName?: string }) => {
    if (params.toolName === 'interview_debrief') return Promise.resolve(DEBRIEF_RESULT);
    return Promise.reject(new Error(`未预期的 toolName: ${params.toolName ?? '(无)'}`));
  }),
};

async function registerUser(app: INestApplication, email: string, name: string): Promise<string> {
  const codeRes = await request(app.getHttpServer())
    .post('/api/auth/request-code')
    .send({ email, terms_agreed: true });
  const devCode = codeRes.body.dev_code as string;
  const loginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, code: devCode, invite_code: 'COACH2026', name });
  return loginRes.body.access_token as string;
}

async function createInterview(app: INestApplication, token: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({ round: '技术一面', company: 'Acme', role: '全栈工程师' });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

/** 把中文串铺成字级 LabeledSegment(连续 gap 小,模拟线上字级脏数据)。 */
function charLevel(
  text: string,
  speaker: 'interviewer' | 'candidate',
  startAt: number,
  startIdx: number,
): LabeledSegment[] {
  return text.split('').map((ch, i) => ({
    idx: startIdx + i,
    text: ch,
    startMs: startAt + i * 80,
    endMs: startAt + i * 80 + 80,
    speaker,
  }));
}

describe('存量字级脏数据读取层再聚合 (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let taskRepo: Repository<InterviewTranscribeTask>;
  let interviewRepo: Repository<Interview>;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.JWT_SECRET = 'test-secret';
    process.env.STEP_API_KEY = 'test-step-key';
    delete process.env.SMTP_HOST;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue(mockAiService)
      .overrideProvider(SPEECH_PROVIDER)
      .useValue(noopSpeechProvider)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    userRepo = moduleRef.get(getRepositoryToken(User));
    taskRepo = moduleRef.get(getRepositoryToken(InterviewTranscribeTask));
    interviewRepo = moduleRef.get(getRepositoryToken(Interview));
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  /** 种一条 awaiting_confirm + 字级 segments_json 的存量脏任务,返回 {taskId, charSegs}。 */
  async function seedCharLevelTask(
    interviewId: string,
    userId: string,
  ): Promise<{ taskId: string; charSegs: LabeledSegment[] }> {
    // 三轮问答字级流:面试官提问 → 候选人作答 → 面试官追问(各自 speaker 连续、句间大 gap)。
    const q1 = charLevel('先做个自我介绍吧', 'interviewer', 0, 0);
    const q1End = q1[q1.length - 1].endMs;
    const a1 = charLevel('我叫小明本科计算机做过两个全栈项目', 'candidate', q1End + 1000, q1.length);
    const a1End = a1[a1.length - 1].endMs;
    const q2 = charLevel('讲讲你负责的核心模块', 'interviewer', a1End + 1000, q1.length + a1.length);
    const charSegs = [...q1, ...a1, ...q2];

    const task = taskRepo.create({
      interview_id: interviewId,
      user_id: userId,
      status: 'awaiting_confirm',
      segments_json: charSegs,
      analysis_charged: false,
    });
    const saved = await taskRepo.save(task);
    return { taskId: saved.id, charSegs };
  }

  it('GET status:字级脏数据被聚成句级返回(段数≪字数、整句、idx 从 0),且幂等写回库', async () => {
    const email = `charlvl-read-${Date.now()}@coach.dev`;
    const token = await registerUser(app, email, '字级读取');
    const user = await userRepo.findOneByOrFail({ email });
    const interviewId = await createInterview(app, token);

    const { charSegs } = await seedCharLevelTask(interviewId, user.id);
    const charCount = charSegs.length; // 字级段数(数十)

    // 1) GET status:返回已聚成 3 句(三轮问答),text 为整句、idx 0/1/2、speaker 保留。
    const res = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewId}/transcribe/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const segs = res.body.segmentsJson as LabeledSegment[];
    expect(Array.isArray(segs)).toBe(true);
    expect(segs.length).toBeLessThan(charCount); // 段数远小于字数
    expect(segs).toHaveLength(3);
    expect(segs.map((s) => s.text)).toEqual([
      '先做个自我介绍吧',
      '我叫小明本科计算机做过两个全栈项目',
      '讲讲你负责的核心模块',
    ]);
    expect(segs.map((s) => s.idx)).toEqual([0, 1, 2]);
    expect(segs.map((s) => s.speaker)).toEqual(['interviewer', 'candidate', 'interviewer']);
    // 每段整句都不是单字。
    for (const s of segs) expect(s.text.length).toBeGreaterThan(2);

    // 2) 幂等写回:直接查库,segments_json 已被覆写为句级(下次读无需再聚合)。
    const inDb = await taskRepo.findOneByOrFail({ interview_id: interviewId });
    expect(inDb.segments_json).toHaveLength(3);
    expect((inDb.segments_json as LabeledSegment[])[0].text).toBe('先做个自我介绍吧');

    // 3) 再 GET 一次:已是句级,结果稳定(幂等,不再变化)。
    const res2 = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewId}/transcribe/status`)
      .set('Authorization', `Bearer ${token}`);
    expect((res2.body.segmentsJson as LabeledSegment[])).toHaveLength(3);
  }, 30000);

  it('confirm:字级脏数据经聚合后按句级 idx 确认 → completed,transcript 为整句带角色前缀(非逐字)', async () => {
    const email = `charlvl-confirm-${Date.now()}@coach.dev`;
    const token = await registerUser(app, email, '字级确认');
    const user = await userRepo.findOneByOrFail({ email });
    const interviewId = await createInterview(app, token);

    const { taskId } = await seedCharLevelTask(interviewId, user.id);

    // 先 GET 触发聚合(前端轮询路径),拿到句级 idx。
    const statusRes = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewId}/transcribe/status`)
      .set('Authorization', `Bearer ${token}`);
    const segs = statusRes.body.segmentsJson as LabeledSegment[];
    expect(segs).toHaveLength(3);

    // 按聚合后的句级 idx 原样确认(角色不改)。
    const confirm = await request(app.getHttpServer())
      .patch(`/api/interviews/${interviewId}/transcribe/${taskId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({ segments: segs.map((s) => ({ idx: s.idx, speaker: s.speaker })) });
    expect(confirm.status).toBe(200);
    expect(confirm.body.overall_grade).toBe('B+');
    // summary 落库(新 schema 字段)。
    expect(confirm.body.summary).toBe(DEBRIEF_RESULT.summary);

    // 写回 Interview 的 transcript 是整句带角色前缀,不是逐字。
    const iv = await interviewRepo.findOneByOrFail({ id: interviewId });
    expect(iv.transcript).toContain('[面试官] 先做个自我介绍吧');
    expect(iv.transcript).toContain('[用户] 我叫小明本科计算机做过两个全栈项目');
    // 反证:不应出现逐字带前缀(如「[面试官] 先」单字行)。
    expect(iv.transcript).not.toMatch(/\[面试官\] 先\n/);
  }, 30000);
});
