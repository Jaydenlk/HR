/**
 * 模拟面试 voice 读题(TTS)e2e —— SPEECH_PROVIDER 用 mock,不调真 StepFun、不需 key。
 *
 * 验收点(对齐任务要求 ③:synthesize 被调、模拟面试 voice 读题路径通):
 *  1. voice 模式会话 → GET :id/question-audio/:n 返回 200 + 固定音频字节 + 正确 Content-Type;
 *     且 mock provider.synthesize 被调、入参为该题题面。
 *  2. text 模式会话调读题 → 400(service 校验 mode),且 synthesize 未被调。
 *  3. 题号越界 → 400,synthesize 未被调。
 *  4. 非本人会话读题 → 404(不泄露存在性),synthesize 未被调。
 *
 * AI(出题/评估)与 ASR/TTS 全部 mock:
 *  - AiService.completeStructured:generate_questions → 固定两题。
 *  - SPEECH_PROVIDER:synthesize 回固定音频 buffer(可观测被调次数与入参);transcribeFile 不涉及。
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { SPEECH_PROVIDER } from '../src/speech/providers/speech.provider';
import type { SpeechProvider, SynthesizedAudio } from '../src/speech/providers/speech.provider';
import { request } from './test-utils';

// 固定合成音频字节('ID3' mp3 头样本 + 一个字节),用于断言端点原样回传。
const FAKE_AUDIO_BYTES = Buffer.from([0x49, 0x44, 0x33, 0x04]);

// 记录 synthesize 调用(次数 + 入参),供越权/边界用例断言「未被调」。
const synthesizeSpy = jest.fn(
  async (): Promise<SynthesizedAudio> => ({
    audio: Buffer.from(FAKE_AUDIO_BYTES),
    mimeType: 'audio/mpeg',
  }),
);

const fakeSpeechProvider: SpeechProvider = {
  capabilities: { diarization: false, channelSplit: false, realtime: false },
  transcribeFile: jest.fn(),
  synthesize: synthesizeSpy as unknown as SpeechProvider['synthesize'],
};

const QUESTIONS = [
  { n: 1, type: '行为', topic: '自我介绍', difficulty: '简单', question: '请做一个自我介绍。', hint: '突出优势' },
  { n: 2, type: '技术', topic: '算法', difficulty: '中等', question: '请解释快速排序的原理。', hint: '分治' },
];

const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock'),
  completeStructured: jest.fn().mockImplementation((params: { toolName?: string }) => {
    if (params.toolName === 'generate_questions') {
      return Promise.resolve({ questions: QUESTIONS });
    }
    return Promise.reject(new Error(`未预期的 toolName: ${params.toolName ?? '(无)'}`));
  }),
};

async function registerUser(app: INestApplication, email: string, name: string): Promise<string> {
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

async function createSession(
  app: INestApplication,
  token: string,
  mode: 'text' | 'voice',
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/mock-sessions')
    .set('Authorization', `Bearer ${token}`)
    .send({ company: 'Acme', role: '后端开发工程师', mode, question_count: 2 });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

describe('模拟面试 voice 读题 TTS (e2e, mock provider)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.JWT_SECRET = 'test-secret';
    delete process.env.SMTP_HOST;
    delete process.env.STEP_API_KEY; // 证明 mock provider 下不需要真实 key。

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

  beforeEach(() => {
    synthesizeSpy.mockClear();
  });

  it('voice 模式 → 读题返回 200 + 固定音频字节,provider.synthesize 以该题题面被调', async () => {
    const token = await registerUser(app, `voice-ok-${Date.now()}@coach.dev`, '语音读题');
    const sessionId = await createSession(app, token, 'voice');

    // 读第 2 题(0-based n=1)→ '请解释快速排序的原理。'
    const res = await request(app.getHttpServer())
      .get(`/api/mock-sessions/${sessionId}/question-audio/1`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((response, cb) => {
        const chunks: Buffer[] = [];
        response.on('data', (c: Buffer) => chunks.push(c));
        response.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('audio/mpeg');
    // 端点原样回传 mock 音频字节。
    expect(Buffer.from(res.body).equals(FAKE_AUDIO_BYTES)).toBe(true);

    // synthesize 被调一次,入参为第 2 题题面。
    expect(synthesizeSpy).toHaveBeenCalledTimes(1);
    expect(synthesizeSpy.mock.calls[0][0]).toBe('请解释快速排序的原理。');
  }, 30000);

  it('text 模式会话读题 → 400,synthesize 未被调', async () => {
    const token = await registerUser(app, `voice-text-${Date.now()}@coach.dev`, '文本模式');
    const sessionId = await createSession(app, token, 'text');

    const res = await request(app.getHttpServer())
      .get(`/api/mock-sessions/${sessionId}/question-audio/0`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(synthesizeSpy).not.toHaveBeenCalled();
  }, 30000);

  it('题号越界 → 400,synthesize 未被调', async () => {
    const token = await registerUser(app, `voice-oob-${Date.now()}@coach.dev`, '越界');
    const sessionId = await createSession(app, token, 'voice');

    const res = await request(app.getHttpServer())
      .get(`/api/mock-sessions/${sessionId}/question-audio/9`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(synthesizeSpy).not.toHaveBeenCalled();
  }, 30000);

  it('非本人会话读题 → 404,synthesize 未被调', async () => {
    const ownerToken = await registerUser(app, `voice-owner-${Date.now()}@coach.dev`, '物主');
    const otherToken = await registerUser(app, `voice-other-${Date.now()}@coach.dev`, '他人');
    const sessionId = await createSession(app, ownerToken, 'voice');

    const res = await request(app.getHttpServer())
      .get(`/api/mock-sessions/${sessionId}/question-audio/0`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
    expect(synthesizeSpy).not.toHaveBeenCalled();
  }, 30000);
});
