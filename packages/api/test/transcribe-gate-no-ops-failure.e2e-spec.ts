/**
 * FIX A 回归 e2e:转写后台 runner 的失败分类 —— 4xx 闸门拒绝不污染成功率,5xx ASR 故障仍记 AI_CALL_FAILED。
 *
 * 背景:interviews.service.runTranscribe 的 catch 块此前对【任何】错误都无条件 record AI_CALL_FAILED。
 * 但非面试闸 assertLooksLikeInterview 抛的是 BadRequestException(录音过短/不像面试),属 4xx 客户端类
 * 拒绝(用户输入问题,不是 AI 坏了)。把它记成 AI_CALL_FAILED 会污染管理面板成功率分母,并在
 * recent-failures 里冒充 AI 故障。修复后:只对「真正的 AI/ASR 失败」(5xx/超时/非 HttpException)记事件。
 *
 * 本套件用两个独立 app(各注入一种 SpeechProvider)做正反对照:
 *   (A) transcribeFile 返回【过短 segments】(单段 2 字)→ 结构闸抛 BadRequestException(4xx)
 *       → task=failed,但【不】记 AI_CALL_FAILED、success-stats.failed 不增、recent-failures 无此行。
 *   (B) transcribeFile reject(模拟真实 ASR 5xx/provider-down)→ task=failed 且【仍】记 AI_CALL_FAILED、
 *       success-stats.failed +1。
 *
 * 结构闸(段数<3 或合并正文<50 字)在主题闸(ai.complete)之前,故 (A) 根本不会调 ai.complete;
 * mockAiService.complete 给 resolved 防御即可。ASR/LLM 全 mock,sqlite in-memory(synchronize 建表)。
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { SPEECH_PROVIDER } from '../src/speech/providers/speech.provider';
import type {
  SpeechProvider,
  SynthesizedAudio,
  TranscriptSegment,
} from '../src/speech/providers/speech.provider';
import { User } from '../src/users/entities/user.entity';
import { OpsEvent } from '../src/ops/entities/ops-event.entity';
import { request } from './test-utils';

const ASR_FAILURE_MESSAGE = 'ASR 上游不可用(测试注入 5xx)';

// (A) 过短 segments:单段 2 字 → 段数 1 < MIN_INTERVIEW_SEGMENTS(3) 且正文 2 < 50 → 结构闸抛 4xx。
const tooShortSpeechProvider: SpeechProvider = {
  capabilities: { diarization: false, channelSplit: false, realtime: false },
  transcribeFile(): Promise<TranscriptSegment[]> {
    return Promise.resolve([{ text: '嗯啊', startMs: 0, endMs: 500 }]);
  },
  synthesize(): Promise<SynthesizedAudio> {
    return Promise.reject(new Error('本套件不测 TTS'));
  },
};

// (B) 真实 ASR 故障:transcribeFile 直接 reject(原生 Error,非 HttpException → 视作 5xx 类失败)。
const failingSpeechProvider: SpeechProvider = {
  capabilities: { diarization: false, channelSplit: false, realtime: false },
  transcribeFile(): Promise<TranscriptSegment[]> {
    return Promise.reject(new Error(ASR_FAILURE_MESSAGE));
  },
  synthesize(): Promise<SynthesizedAudio> {
    return Promise.reject(new Error('本套件不测 TTS'));
  },
};

// 主题闸防御:不会被走到(结构闸先拦),给个 resolved 值即可。
const mockAiService = {
  complete: jest.fn().mockResolvedValue('是'),
  completeStructured: jest.fn().mockResolvedValue({ segments: [] }),
  testConnection: jest.fn().mockResolvedValue({ ok: true, latencyMs: 10 }),
};

async function registerUser(
  app: INestApplication,
  email: string,
  name: string,
): Promise<string> {
  const codeRes = await request(app.getHttpServer())
    .post('/api/auth/request-code')
    .send({ email, terms_agreed: true });
  const devCode = codeRes.body.dev_code as string | undefined;
  if (!devCode) throw new Error(`无 dev_code:${JSON.stringify(codeRes.body)}`);
  const loginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, code: devCode, invite_code: 'COACH2026', name });
  return loginRes.body.access_token as string;
}

async function createInterview(
  app: INestApplication,
  token: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({ round: '技术一面', company: 'Acme', role: '后端开发工程师' });
  expect(res.status).toBe(201);
  await new Promise((r) => setTimeout(r, 200));
  return res.body.id as string;
}

async function uploadAndAwaitFailed(
  app: INestApplication,
  token: string,
  interviewId: string,
): Promise<void> {
  const post = await request(app.getHttpServer())
    .post(`/api/interviews/${interviewId}/transcribe`)
    .set('Authorization', `Bearer ${token}`)
    .field('consent', 'true')
    .attach('file', Buffer.from('fake-audio-gate'), {
      filename: 'rec.m4a',
      contentType: 'audio/mp4',
    });
  expect(post.status).toBe(202);

  const deadline = Date.now() + 8000;
  let lastStatus = '';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const st = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewId}/transcribe/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(st.status).toBe(200);
    lastStatus = st.body.status as string;
    if (lastStatus === 'failed') break;
    if (Date.now() > deadline) throw new Error(`转写未在预期内失败,最后状态=${lastStatus}`);
    await new Promise((r) => setTimeout(r, 50));
  }
  expect(lastStatus).toBe('failed');
}

async function todayFailed(
  app: INestApplication,
  adminToken: string,
): Promise<number> {
  const res = await request(app.getHttpServer())
    .get('/api/admin/success-stats?days=1')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  return res.body[res.body.length - 1].failed as number;
}

function baseEnv(): void {
  process.env.DB_TYPE = 'sqlite';
  process.env.DB_PATH = ':memory:';
  process.env.CLOUDDREAM_API_KEY = 'test-key';
  process.env.CLOUDDREAM_MODEL = 'auto-v2';
  process.env.JWT_SECRET = 'test-secret';
  process.env.STEP_API_KEY = 'test-step-key';
  delete process.env.SMTP_HOST;
}

async function bootApp(provider: SpeechProvider): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AiService)
    .useValue(mockAiService)
    .overrideProvider(SPEECH_PROVIDER)
    .useValue(provider)
    .compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

describe('FIX A 转写失败分类:4xx 闸门不记 AI_CALL_FAILED,5xx 仍记 (e2e)', () => {
  // ── (A) 过短/非面试 → failed 但不污染成功率 ──────────────────────────────────
  describe('(A) 非面试/过短闸门拒绝(4xx)', () => {
    let app: INestApplication;
    let opsRepo: Repository<OpsEvent>;
    let userRepo: Repository<User>;

    beforeAll(async () => {
      baseEnv();
      process.env.ADMIN_EMAILS = 'gate-a-admin@coach.dev';
      app = await bootApp(tooShortSpeechProvider);
      opsRepo = app.get<Repository<OpsEvent>>(getRepositoryToken(OpsEvent));
      userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    }, 120000);

    afterAll(async () => {
      await app.close();
      delete process.env.ADMIN_EMAILS;
    });

    it('过短录音 → task=failed,但不记 AI_CALL_FAILED、success-stats.failed 不增、recent-failures 无此行', async () => {
      const user = await registerUser(app, 'gate-a-user@coach.dev', '闸门用户');
      const adminToken = await registerUser(app, 'gate-a-admin@coach.dev', '闸门超管');
      expect((await userRepo.findOneBy({ email: 'gate-a-admin@coach.dev' }))!.role).toBe('admin');

      const callFailedBefore = await opsRepo.count({ where: { type: 'AI_CALL_FAILED' } });
      const failedBefore = await todayFailed(app, adminToken);

      const interviewId = await createInterview(app, user);
      await uploadAndAwaitFailed(app, user, interviewId);

      // 失败原因应是非面试闸的友好提示(确认确实走了 4xx 闸门,而非别处的真故障)。
      const st = await request(app.getHttpServer())
        .get(`/api/interviews/${interviewId}/transcribe/status`)
        .set('Authorization', `Bearer ${user}`);
      expect(st.body.status).toBe('failed');
      expect(st.body.errorMessage as string).toContain('录音内容过短或无人声');

      // fire-and-forget 写库让出一拍(若有误写,确保已落定再断言"没有")。
      await new Promise((resolve) => setImmediate(resolve));

      // 核心断言 1:AI_CALL_FAILED 计数纹丝不动(4xx 闸门拒绝绝不发此事件)。
      const callFailedAfter = await opsRepo.count({ where: { type: 'AI_CALL_FAILED' } });
      expect(callFailedAfter).toBe(callFailedBefore);

      // 核心断言 2:成功率分母不增(failed 不动)。
      const failedAfter = await todayFailed(app, adminToken);
      expect(failedAfter).toBe(failedBefore);

      // 核心断言 3:recent-failures 里没有这条转写失败(不在排障流水冒充 AI 故障)。
      const failures = await request(app.getHttpServer())
        .get('/api/admin/recent-failures?limit=50')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(failures.status).toBe(200);
      const transcribeRow = (
        failures.body as Array<{ stage: string | null }>
      ).find((r) => r.stage === 'transcribe');
      expect(transcribeRow).toBeUndefined();
    }, 30000);
  });

  // ── (B) 对照:真实 ASR 5xx → failed 且仍记 AI_CALL_FAILED、failed +1 ───────────
  describe('(B) 真实 ASR 故障(5xx)对照', () => {
    let app: INestApplication;
    let opsRepo: Repository<OpsEvent>;
    let userRepo: Repository<User>;

    beforeAll(async () => {
      baseEnv();
      process.env.ADMIN_EMAILS = 'gate-b-admin@coach.dev';
      app = await bootApp(failingSpeechProvider);
      opsRepo = app.get<Repository<OpsEvent>>(getRepositoryToken(OpsEvent));
      userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    }, 120000);

    afterAll(async () => {
      await app.close();
      delete process.env.ADMIN_EMAILS;
    });

    it('ASR 上游 reject(5xx 类)→ task=failed 且仍记 AI_CALL_FAILED、success-stats.failed +1', async () => {
      const user = await registerUser(app, 'gate-b-user@coach.dev', '故障用户');
      const adminToken = await registerUser(app, 'gate-b-admin@coach.dev', '故障超管');
      expect((await userRepo.findOneBy({ email: 'gate-b-admin@coach.dev' }))!.role).toBe('admin');

      const callFailedBefore = await opsRepo.count({ where: { type: 'AI_CALL_FAILED' } });
      const failedBefore = await todayFailed(app, adminToken);

      const interviewId = await createInterview(app, user);
      await uploadAndAwaitFailed(app, user, interviewId);

      await new Promise((resolve) => setImmediate(resolve));

      // 真实 ASR 故障:AI_CALL_FAILED +1。
      const callFailedAfter = await opsRepo.count({ where: { type: 'AI_CALL_FAILED' } });
      expect(callFailedAfter).toBe(callFailedBefore + 1);

      // 成功率分母 +1。
      const failedAfter = await todayFailed(app, adminToken);
      expect(failedAfter).toBe(failedBefore + 1);

      // recent-failures 里能看到这条转写失败,且原因/端点齐全。
      const failures = await request(app.getHttpServer())
        .get('/api/admin/recent-failures?limit=50')
        .set('Authorization', `Bearer ${adminToken}`);
      const transcribeRow = (
        failures.body as Array<{ stage: string | null; reason: string | null; endpoint: string | null }>
      ).find((r) => r.stage === 'transcribe');
      expect(transcribeRow).toBeDefined();
      expect(transcribeRow!.reason).toBe(ASR_FAILURE_MESSAGE);
      expect(transcribeRow!.endpoint).toBe('/api/interviews/:id/transcribe');
    }, 30000);
  });
});
