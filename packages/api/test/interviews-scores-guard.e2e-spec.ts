import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { Interview } from '../src/interviews/entities/interview.entity';
import { loginUser, request } from './test-utils';

/* ------------------------------------------------------------------ */
/*  P0-6: interviews.service update() reads interview.scores.length to */
/*  decide whether to (re)run debrief on a newly-added transcript.     */
/*  scores is nullable (`ScoreItem[] | null`), so accessing `.length`  */
/*  on a null/undefined value would throw. These tests drive a row     */
/*  whose scores is explicitly null AND one whose scores is undefined  */
/*  through the transcript-add path and assert no crash (no 500): the  */
/*  guard `!interview.scores || interview.scores.length === 0` must     */
/*  short-circuit safely. AI is mocked so the analyze call is          */
/*  deterministic.                                                     */
/* ------------------------------------------------------------------ */

const AI_RESULT = {
  overall_grade: 'B',
  overall_note: '稳健。',
  scores: [{ name: '技术深度', score: 70 }],
  questions: [
    {
      question: 'q',
      tone: 'good',
      coach_assessment: 'a',
      better_answer: 'b',
      knowledge_gaps: [],
    },
  ],
  prediction: { next_round_topics: [{ topic: 't', likelihood: 50 }], summary: 's' },
};

const VALID_TRANSCRIPT =
  '面试官：先做个自我介绍。候选人：我是应届生，主修计算机，目标后端工程师，做过订单与支付模块。';

describe('Interviews scores guard (e2e) — null/undefined .length safety (P0-6)', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;
  let repo: Repository<Interview>;
  const completeStructured = jest.fn(() => Promise.resolve(AI_RESULT));

  async function seedRow(scores: Interview['scores'] | undefined): Promise<string> {
    const iv = repo.create({
      user_id: userId,
      round: '技术一面',
      company: 'GuardCo',
      role: '后端工程师',
    });
    // Explicitly set the nullable scores column to the value under test.
    iv.scores = scores as Interview['scores'];
    const saved = await repo.save(iv);
    return saved.id;
  }

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue({ complete: jest.fn(), completeStructured })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    repo = moduleRef.get<Repository<Interview>>(getRepositoryToken(Interview));

    token = await loginUser(app, 'interviews-guard@coach.dev', 'Interview Guard User');
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    userId = me.body.id as string;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('PATCH adds transcript to a row with scores === null → no crash, analysis runs', async () => {
    const id = await seedRow(null);
    completeStructured.mockClear();

    const res = await request(app.getHttpServer())
      .patch(`/api/interviews/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ transcript: VALID_TRANSCRIPT });

    // The guard must NOT throw on null.length — request succeeds and debrief runs.
    expect(res.status).toBe(200);
    expect(completeStructured).toHaveBeenCalledTimes(1);
    expect(res.body.overall_grade).toBe('B');
    expect(Array.isArray(res.body.scores)).toBe(true);
    expect(res.body.scores.length).toBeGreaterThan(0);
  });

  it('PATCH adds transcript to a row with scores === undefined → no crash, analysis runs', async () => {
    const id = await seedRow(undefined);
    completeStructured.mockClear();

    const res = await request(app.getHttpServer())
      .patch(`/api/interviews/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ transcript: VALID_TRANSCRIPT });

    expect(res.status).toBe(200);
    expect(completeStructured).toHaveBeenCalledTimes(1);
    expect(res.body.overall_grade).toBe('B');
  });

  it('PATCH transcript on a row that ALREADY has scores → does NOT re-run analysis', async () => {
    const id = await seedRow([{ name: '已有维度', score: 88 }]);
    completeStructured.mockClear();

    const res = await request(app.getHttpServer())
      .patch(`/api/interviews/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ transcript: VALID_TRANSCRIPT });

    // noScores === false (length 1) → guard correctly skips re-analysis.
    expect(res.status).toBe(200);
    expect(completeStructured).not.toHaveBeenCalled();
  });
});
