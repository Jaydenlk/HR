import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { User } from '../src/users/entities/user.entity';
import { Resume } from '../src/resumes/entities/resume.entity';
import { Diagnosis } from '../src/diagnoses/entities/diagnosis.entity';
import { AiUsage } from '../src/quota/entities/ai-usage.entity';
import { OpsEvent } from '../src/ops/entities/ops-event.entity';
import { request } from './test-utils';

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/diagnosis-stats(单次诊断成功率)e2e
//
// 核心断言:这是与 GET /admin/success-stats(AI 调用成功率)【两个独立指标,互不并计】。
//   - 鉴权矩阵:无 token→401 / role=user→403 / admin→200。
//   - 口径正确:按 diagnoses.status 聚合;NULL 状态(本特性前存量行)不进分母。
//   - 隔离/不双计:只种 diagnoses(不种 ai_usage/ops)→ diagnosis-stats 有数、success-stats 为零;
//                  只种 ai_usage(不种 diagnoses)→ success-stats 有数、diagnosis-stats 为零。
//   - failure_breakdown 反映各 failure_reason 计数。
//   - days 校验沿用 StatsQueryDto(0/91/abc → 400)。
//
// AI 不真打外网:mock AiService(本套件不触发诊断流水线,直接种诊断行)。
// ─────────────────────────────────────────────────────────────────────────────

const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock'),
  completeStructured: jest.fn().mockResolvedValue({ summary: 'mock' }),
  testConnection: jest.fn().mockResolvedValue({ ok: true, latencyMs: 12 }),
};

async function registerUser(app: INestApplication, email: string, name: string): Promise<string> {
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

interface DiagStatsRow {
  date: string;
  total: number;
  success: number;
  failed: number;
  partial: number;
  success_rate: number | null;
  failure_breakdown: Record<string, number>;
}

interface SuccessStatsRow {
  date: string;
  success: number;
  failed: number;
  success_rate: number | null;
}

describe('Admin /admin/diagnosis-stats(单次诊断成功率,独立于 AI 成功率)e2e', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let resumeRepo: Repository<Resume>;
  let diagnosisRepo: Repository<Diagnosis>;
  let usageRepo: Repository<AiUsage>;
  let opsRepo: Repository<OpsEvent>;

  let adminToken: string;
  let userToken: string;
  let diagUserId: string; // 种诊断行的目标用户
  let aiOnlyUserId: string; // 只种 ai_usage 的用户(隔离反证)

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_EMAILS = 'ds-admin@coach.dev';
    delete process.env.SMTP_HOST;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue(mockAiService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    userRepo = moduleRef.get(getRepositoryToken(User));
    resumeRepo = moduleRef.get(getRepositoryToken(Resume));
    diagnosisRepo = moduleRef.get(getRepositoryToken(Diagnosis));
    usageRepo = moduleRef.get(getRepositoryToken(AiUsage));
    opsRepo = moduleRef.get(getRepositoryToken(OpsEvent));

    adminToken = await registerUser(app, 'ds-admin@coach.dev', '诊断统计超管');
    expect((await userRepo.findOneBy({ email: 'ds-admin@coach.dev' }))!.role).toBe('admin');

    userToken = await registerUser(app, 'ds-user@coach.dev', '诊断统计普通');

    await registerUser(app, 'ds-diag@coach.dev', '诊断主体');
    diagUserId = (await userRepo.findOneBy({ email: 'ds-diag@coach.dev' }))!.id;

    await registerUser(app, 'ds-aionly@coach.dev', 'AI仅用量');
    aiOnlyUserId = (await userRepo.findOneBy({ email: 'ds-aionly@coach.dev' }))!.id;

    const resume = await resumeRepo.save(
      resumeRepo.create({ user_id: diagUserId, title: 't', raw_text: '简历正文足够长'.repeat(5) }),
    );

    // 今日种诊断行(created_at 默认 now,落在 days=1 窗口内):
    //   3 success + 1 failed(analyzer_error)+ 1 failed(parser_error)+ 1 partial(rewriter_error)
    //   + 2 NULL(本特性前存量行,必须被排除在分母外)。
    const mk = (status: 'success' | 'failed' | 'partial' | null, reason?: string): Diagnosis =>
      diagnosisRepo.create({
        user_id: diagUserId,
        resume_id: resume.id,
        mode: 'profession_standard',
        status: status ?? undefined,
        failure_reason: reason,
      });
    await diagnosisRepo.save([
      mk('success'),
      mk('success'),
      mk('success'),
      mk('failed', 'analyzer_error'),
      mk('failed', 'parser_error'),
      mk('partial', 'rewriter_error'),
      mk(null),
      mk(null),
    ]);

    // 只给 aiOnlyUser 种 ai_usage(让 success-stats 有数,但 diagnosis-stats 不应受影响)。
    await usageRepo.save([
      usageRepo.create({ user_id: aiOnlyUserId, endpoint: '/api/diagnoses/campus/stream' }),
      usageRepo.create({ user_id: aiOnlyUserId, endpoint: '/api/diagnoses/campus/stream' }),
    ]);
    // 给 ops 种一条 AI_CALL_FAILED(success-stats 的失败分母来源,与诊断成功率无关)。
    await opsRepo.save(opsRepo.create({ type: 'AI_CALL_FAILED', detail: { stage: 'test' } }));
  }, 120000);

  afterAll(async () => {
    await app.close();
    delete process.env.ADMIN_EMAILS;
  });

  // ── 鉴权矩阵 ──
  it('无 token → 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/admin/diagnosis-stats');
    expect(res.status).toBe(401);
  });

  it('role=user → 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/diagnosis-stats')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('admin → 200,返回按日数组', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/diagnosis-stats?days=1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // ── 口径正确:按 status 聚合,NULL 不进分母 ──
  it('诊断成功率按 status 聚合;NULL 状态行不计入分母', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/diagnosis-stats?days=1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const rows = res.body as DiagStatsRow[];
    // 汇总窗口内所有天(种的都在今日,跨日边界也兜底求和)。
    const sum = rows.reduce(
      (a, r) => ({
        total: a.total + r.total,
        success: a.success + r.success,
        failed: a.failed + r.failed,
        partial: a.partial + r.partial,
      }),
      { total: 0, success: 0, failed: 0, partial: 0 },
    );
    // total = 3 success + 2 failed + 1 partial = 6(2 个 NULL 行被排除)。
    expect(sum.total).toBe(6);
    expect(sum.success).toBe(3);
    expect(sum.failed).toBe(2);
    expect(sum.partial).toBe(1);
    // 当日行的成功率 = 3/6 = 0.5。
    const today = rows[rows.length - 1];
    expect(today.success_rate).toBeCloseTo(0.5, 5);
  });

  it('failure_breakdown 反映各 failure_reason 计数', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/diagnosis-stats?days=1')
      .set('Authorization', `Bearer ${adminToken}`);
    const rows = res.body as DiagStatsRow[];
    const merged: Record<string, number> = {};
    for (const r of rows) {
      for (const [k, v] of Object.entries(r.failure_breakdown)) merged[k] = (merged[k] ?? 0) + v;
    }
    expect(merged.analyzer_error).toBe(1);
    expect(merged.parser_error).toBe(1);
    expect(merged.rewriter_error).toBe(1);
  });

  // ── 隔离 / 不双计:两个端点指标互不并计 ──
  it('【不双计】只种诊断、不种 ai_usage 的成败 → diagnosis-stats 有数,但不被 success-stats 计入;反之亦然', async () => {
    const diagRes = await request(app.getHttpServer())
      .get('/api/admin/diagnosis-stats?days=1')
      .set('Authorization', `Bearer ${adminToken}`);
    const successRes = await request(app.getHttpServer())
      .get('/api/admin/success-stats?days=1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(diagRes.status).toBe(200);
    expect(successRes.status).toBe(200);

    const diagRows = diagRes.body as DiagStatsRow[];
    const successRows = successRes.body as SuccessStatsRow[];

    const diagTotal = diagRows.reduce((a, r) => a + r.total, 0);
    const aiSuccess = successRows.reduce((a, r) => a + r.success, 0);
    const aiFailed = successRows.reduce((a, r) => a + r.failed, 0);

    // 诊断成功率分母(6)≠ AI 成功率分母(2 成功 + 1 失败 = 3):两套口径独立,数值不相等即证不并计。
    expect(diagTotal).toBe(6);
    expect(aiSuccess).toBe(2); // 仅 aiOnlyUser 的 2 条 ai_usage
    expect(aiFailed).toBe(1); // 仅 1 条 AI_CALL_FAILED
    // 诊断的 6 次成败绝不出现在 AI 成功率的分母里(3 ≠ 6),反证零并计。
    expect(aiSuccess + aiFailed).not.toBe(diagTotal);
    // 反向:AI 的 3 次调用计数绝不出现在诊断成功率分母里。
    expect(diagTotal).not.toBe(aiSuccess + aiFailed);
  });

  // ── days 校验(沿用 StatsQueryDto)──
  it('days=0 → 400(@Min(1))', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/diagnosis-stats?days=0')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('days=91 → 400(@Max(90))', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/diagnosis-stats?days=91')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('days=abc → 400(@IsInt)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/diagnosis-stats?days=abc')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('缺省 days → 200,返回 7 天(窗口默认)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/diagnosis-stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect((res.body as DiagStatsRow[]).length).toBe(7);
  });
});
