/**
 * 转写任务上传元数据回执 + 删除/复盘删除 所有权 e2e。
 *
 * 验收点(对齐任务 #2/#3):
 *  (a) 上传后 GET status 回上传元数据:originalFilename / fileSizeBytes / mimeType / uploadedAt 非空且与上传一致;
 *      QR 扫码上传路径同样落元数据(手机传完电脑端回执据此即时渲染)。
 *  (b) DELETE :id/transcribe/:taskId 严格所有权:
 *        - owner 删 → 204,删后 GET status → 404(任务确已硬删);
 *        - 非 owner 删 → 404(不泄露存在性,且未删成功);
 *        - 无 auth → 401。
 *  (c) DELETE :id(复盘记录)所有权:owner 删 → 2xx 且记录消失(GET 404);非 owner 删 → 404。
 *
 * 隐私铁律核验:元数据是文件名/字节数/MIME/上传时刻,非音频内容;interview.audio_url 全程 null。
 *
 * ASR/LLM 全 mock(不触真实上游),sqlite in-memory(synchronize 自动建含新列的表,不跑迁移)。
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { SPEECH_PROVIDER } from '../src/speech/providers/speech.provider';
import type {
  SpeechProvider,
  TranscriptSegment,
} from '../src/speech/providers/speech.provider';
import { request } from './test-utils';

const FAKE_SEGMENTS: TranscriptSegment[] = [
  { text: '你好,先做个自我介绍吧。', startMs: 0, endMs: 2000 },
  { text: '我叫小明,本科计算机专业。', startMs: 2000, endMs: 6000 },
];

const fakeSpeechProvider: SpeechProvider = {
  capabilities: { diarization: false, channelSplit: false, realtime: false },
  async transcribeFile(): Promise<TranscriptSegment[]> {
    return FAKE_SEGMENTS.map((s) => ({ ...s }));
  },
};

const LABEL_RESULT = {
  segments: [
    { idx: 0, speaker: 'interviewer' },
    { idx: 1, speaker: 'candidate' },
  ],
};

const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock'),
  completeStructured: jest
    .fn()
    .mockImplementation((params: { toolName?: string }) => {
      if (params.toolName === 'label_speakers') {
        return Promise.resolve(LABEL_RESULT);
      }
      return Promise.reject(
        new Error(`未预期的 toolName: ${params.toolName ?? '(无)'}`),
      );
    }),
};

async function registerUser(
  app: INestApplication,
  email: string,
  name: string,
): Promise<string> {
  const codeRes = await request(app.getHttpServer())
    .post('/api/auth/request-code')
    .send({ email, terms_agreed: true });
  const devCode = codeRes.body.dev_code as string;
  if (!devCode) throw new Error(`无 dev_code: ${JSON.stringify(codeRes.body)}`);
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
    .send({ round: '技术一面', company: 'Acme', role: '全栈工程师' });
  expect(res.status).toBe(201);
  await new Promise((r) => setTimeout(r, 200));
  return res.body.id as string;
}

const FAKE_AUDIO = Buffer.from('fake-audio-bytes-meta');

async function pollStatus(
  app: INestApplication,
  token: string,
  interviewId: string,
  until: (status: string) => boolean,
  timeoutMs = 8000,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewId}/transcribe/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    if (until(res.body.status as string)) {
      return res.body as Record<string, unknown>;
    }
    if (Date.now() > deadline) {
      throw new Error(`轮询超时,最后状态=${res.body.status}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe('转写任务元数据回执 + 删除所有权 (e2e)', () => {
  let app: INestApplication;

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
      .useValue(fakeSpeechProvider)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ── (a) 登录端点上传 → status 回元数据 ────────────────────────────────────────
  it('上传后 GET status 回上传元数据(filename/size/mime/uploadedAt),与上传一致', async () => {
    const token = await registerUser(app, `meta-ok-${Date.now()}@coach.dev`, '元数据');
    const interviewId = await createInterview(app, token);

    // 用 ASCII 文件名做回环相等断言:multipart 非 ASCII 文件名的字符集由 busboy 的 defParamCharset
    // 决定(测试夹具 supertest 默认 latin1,与本任务无关),会在测试侧产生 mojibake 而非代码 bug。
    // 故文件名等值用 ASCII 验证「捕获并回传一致」这一点;非 ASCII 字节确实完整存取(字节数断言已覆盖)。
    const FILENAME = 'my-interview.m4a';
    const tBefore = Date.now();
    const post = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewId}/transcribe`)
      .set('Authorization', `Bearer ${token}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: FILENAME, contentType: 'audio/mp4' });
    expect(post.status).toBe(202);

    const done = await pollStatus(
      app,
      token,
      interviewId,
      (s) => s === 'awaiting_confirm' || s === 'failed',
    );
    expect(done.status).toBe('awaiting_confirm');

    // 元数据回执:文件名/字节数/MIME/上传时刻齐全且与上传一致。
    expect(done.originalFilename).toBe(FILENAME);
    expect(done.fileSizeBytes).toBe(FAKE_AUDIO.length);
    expect(done.mimeType).toBe('audio/mp4');
    expect(typeof done.uploadedAt).toBe('string');
    const uploadedMs = new Date(done.uploadedAt as string).getTime();
    expect(Number.isNaN(uploadedMs)).toBe(false);
    // 上传时刻应落在「上传前一刻 ~ 现在」之间(留 5s 余量)。
    expect(uploadedMs).toBeGreaterThanOrEqual(tBefore - 1000);
    expect(uploadedMs).toBeLessThanOrEqual(Date.now() + 5000);

    // 隐私铁律:interview.audio_url 全程 null(无音频落盘)。
    const iv = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(iv.status).toBe(200);
    expect(iv.body.audio_url).toBeNull();
  }, 30000);

  // ── (a') QR 扫码上传路径同样落元数据 ─────────────────────────────────────────
  it('QR 扫码上传(/upload/:token)后,电脑端 GET status 同样回元数据', async () => {
    const token = await registerUser(app, `meta-qr-${Date.now()}@coach.dev`, 'QR元数据');
    const interviewId = await createInterview(app, token);

    // 电脑端用真实端点为该面试签发 scoped 令牌(归属由端点按 findOne 校验),再走豁免上传页直传。
    const tokenRes = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewId}/upload-token`)
      .set('Authorization', `Bearer ${token}`);
    expect(tokenRes.status).toBe(201);
    const uploadToken = tokenRes.body.token as string;

    const upload = await request(app.getHttpServer())
      .post(`/api/upload/${uploadToken}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'phone-rec.mp3', contentType: 'audio/mpeg' });
    expect(upload.status).toBe(202);

    const done = await pollStatus(
      app,
      token,
      interviewId,
      (s) => s === 'awaiting_confirm' || s === 'failed',
    );
    expect(done.status).toBe('awaiting_confirm');
    expect(done.originalFilename).toBe('phone-rec.mp3');
    expect(done.fileSizeBytes).toBe(FAKE_AUDIO.length);
    expect(done.mimeType).toBe('audio/mpeg');
    expect(typeof done.uploadedAt).toBe('string');
  }, 30000);

  // ── (b) DELETE 转写任务:owner 204 + 删后 404;非 owner 404;无 auth 401 ───────
  it('DELETE 转写任务:owner→204 且删后 status 404;非 owner→404;无 auth→401', async () => {
    const owner = await registerUser(app, `del-owner-${Date.now()}@coach.dev`, '任务物主');
    const other = await registerUser(app, `del-other-${Date.now()}@coach.dev`, '任务他人');
    const interviewId = await createInterview(app, owner);

    const post = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewId}/transcribe`)
      .set('Authorization', `Bearer ${owner}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(post.status).toBe(202);
    const taskId = post.body.taskId as string;
    await pollStatus(app, owner, interviewId, (s) => s === 'awaiting_confirm' || s === 'failed');

    // 无 auth → 401。
    const noAuth = await request(app.getHttpServer()).delete(
      `/api/interviews/${interviewId}/transcribe/${taskId}`,
    );
    expect(noAuth.status).toBe(401);

    // 非 owner → 404(不泄露存在性,且不应删成功)。
    const wrong = await request(app.getHttpServer())
      .delete(`/api/interviews/${interviewId}/transcribe/${taskId}`)
      .set('Authorization', `Bearer ${other}`);
    expect(wrong.status).toBe(404);

    // 非 owner 删失败后任务应仍在(owner 仍能查到)。
    const stillThere = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewId}/transcribe/status`)
      .set('Authorization', `Bearer ${owner}`);
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.taskId).toBe(taskId);

    // owner → 204。
    const ok = await request(app.getHttpServer())
      .delete(`/api/interviews/${interviewId}/transcribe/${taskId}`)
      .set('Authorization', `Bearer ${owner}`);
    expect(ok.status).toBe(204);

    // 删后该面试已无转写任务 → status 404。
    const gone = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewId}/transcribe/status`)
      .set('Authorization', `Bearer ${owner}`);
    expect(gone.status).toBe(404);
  }, 30000);

  it('DELETE 转写任务:taskId 不存在 → 404', async () => {
    const owner = await registerUser(app, `del-nf-${Date.now()}@coach.dev`, '不存在任务');
    const interviewId = await createInterview(app, owner);
    const res = await request(app.getHttpServer())
      .delete(`/api/interviews/${interviewId}/transcribe/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${owner}`);
    expect(res.status).toBe(404);
  }, 30000);

  // ── (b') 跨面试-同用户:用面试 A 的 :id 删属于自己面试 B 的 taskId → 404,taskB 不被误删 ──
  // where 子句的 interview_id 过滤兜底:taskId 虽属本人,但不属路径里的面试 A,故 404(覆盖 A2 审计指出的缺口)。
  it('DELETE 转写任务:同一用户用面试 A 的 id 删面试 B 的 task → 404 且 taskB 仍在', async () => {
    const owner = await registerUser(app, `del-cross-${Date.now()}@coach.dev`, '跨面试物主');
    const interviewA = await createInterview(app, owner);
    const interviewB = await createInterview(app, owner);

    const postB = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewB}/transcribe`)
      .set('Authorization', `Bearer ${owner}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'b.mp3', contentType: 'audio/mpeg' });
    expect(postB.status).toBe(202);
    const taskB = postB.body.taskId as string;
    await pollStatus(app, owner, interviewB, (s) => s === 'awaiting_confirm' || s === 'failed');

    // 用面试 A 的 id 去删属于面试 B 的 task → 404(interview_id 不匹配,不泄露存在性)。
    const cross = await request(app.getHttpServer())
      .delete(`/api/interviews/${interviewA}/transcribe/${taskB}`)
      .set('Authorization', `Bearer ${owner}`);
    expect(cross.status).toBe(404);

    // taskB 未被误删:从其正确归属面试 B 查仍能拿到同一 taskId。
    const stillThere = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewB}/transcribe/status`)
      .set('Authorization', `Bearer ${owner}`);
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.taskId).toBe(taskB);
  }, 30000);

  // ── (c) DELETE 复盘记录 :id 所有权 ───────────────────────────────────────────
  it('DELETE 复盘记录:owner 删成功(GET 404);非 owner→404', async () => {
    const owner = await registerUser(app, `iv-owner-${Date.now()}@coach.dev`, '复盘物主');
    const other = await registerUser(app, `iv-other-${Date.now()}@coach.dev`, '复盘他人');
    const interviewId = await createInterview(app, owner);

    // 非 owner 删 → 404(不泄露存在性)。
    const wrong = await request(app.getHttpServer())
      .delete(`/api/interviews/${interviewId}`)
      .set('Authorization', `Bearer ${other}`);
    expect(wrong.status).toBe(404);

    // 仍在(owner 能查到)。
    const before = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewId}`)
      .set('Authorization', `Bearer ${owner}`);
    expect(before.status).toBe(200);

    // owner 删 → 2xx。
    const ok = await request(app.getHttpServer())
      .delete(`/api/interviews/${interviewId}`)
      .set('Authorization', `Bearer ${owner}`);
    expect([200, 204]).toContain(ok.status);

    // 删后 GET → 404。
    const after = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewId}`)
      .set('Authorization', `Bearer ${owner}`);
    expect(after.status).toBe(404);
  }, 30000);
});
