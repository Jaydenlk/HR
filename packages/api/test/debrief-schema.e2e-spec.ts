import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { loginUser, request } from './test-utils';

/* ------------------------------------------------------------------ */
/*  P0-3: debrief `color` was a half-baked schema field — the AI was   */
/*  asked to fill scores[].color (green/yellow/red) but the service    */
/*  never used it and the frontend (ScoreRadar) derives the bar color  */
/*  locally from `score`. The field is removed. These tests capture    */
/*  the exact schema handed to the AI and assert color is gone, and    */
/*  that the returned scores carry only name+score.                    */
/* ------------------------------------------------------------------ */

interface ToolSchema {
  type: string;
  properties: {
    scores: {
      type: string;
      items: {
        type: string;
        properties: Record<string, unknown>;
        required: string[];
      };
    };
  };
}

interface StructuredCallArgs {
  schema: ToolSchema;
}

const DEBRIEF_AI_RESULT = {
  overall_grade: 'B+',
  overall_note: '整体表现稳健，技术深度尚可，结构化表达需加强。',
  scores: [
    { name: '技术深度', score: 82 },
    { name: '清晰表达', score: 60 },
    { name: '结构化思考', score: 45 },
  ],
  questions: [
    {
      question: '介绍一下你的项目',
      tone: 'good',
      coach_assessment: '陈述清晰',
      better_answer: '可补充量化指标',
      knowledge_gaps: [],
    },
  ],
  prediction: {
    next_round_topics: [{ topic: '系统设计', likelihood: 70 }],
    summary: '下一轮侧重系统设计准备。',
  },
};

const VALID_TRANSCRIPT =
  '面试官：先做个自我介绍。候选人：我是应届生，主修计算机，目标后端工程师，做过订单与支付模块。';

describe('Debrief schema (e2e) — color field removed (P0-3)', () => {
  let app: INestApplication;
  let token: string;
  const completeStructured = jest.fn(() => Promise.resolve(DEBRIEF_AI_RESULT));

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

    token = await loginUser(app, 'debrief-schema@coach.dev', 'Debrief Schema User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('the schema handed to the AI does NOT include scores[].color', async () => {
    completeStructured.mockClear();

    const res = await request(app.getHttpServer())
      .post('/api/interviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ round: '技术一面', company: 'Acme', role: '后端工程师', transcript: VALID_TRANSCRIPT });

    expect(res.status).toBe(201);
    expect(completeStructured).toHaveBeenCalledTimes(1);

    const callArg = completeStructured.mock.calls[0][0] as unknown as StructuredCallArgs;
    const scoreItem = callArg.schema.properties.scores.items;

    // The half-baked field is gone from both properties and required.
    expect(scoreItem.properties).not.toHaveProperty('color');
    expect(scoreItem.required).not.toContain('color');
    // The legitimate fields remain.
    expect(scoreItem.properties).toHaveProperty('name');
    expect(scoreItem.properties).toHaveProperty('score');
    expect(scoreItem.required).toEqual(expect.arrayContaining(['name', 'score']));
  });

  it('persisted scores carry only name+score, no color', async () => {
    completeStructured.mockClear();

    const res = await request(app.getHttpServer())
      .post('/api/interviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ round: 'HR面', company: 'Acme', role: '后端工程师', transcript: VALID_TRANSCRIPT });

    expect(res.status).toBe(201);
    expect(Array.isArray(res.body.scores)).toBe(true);
    expect(res.body.scores.length).toBeGreaterThan(0);
    for (const s of res.body.scores as Array<Record<string, unknown>>) {
      expect(typeof s.name).toBe('string');
      expect(typeof s.score).toBe('number');
      expect(s).not.toHaveProperty('color');
    }
  });
});
