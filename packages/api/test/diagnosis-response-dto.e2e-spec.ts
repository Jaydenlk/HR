/**
 * DiagnosisResponseDto 脱敏 e2e
 *
 * 成功判据:
 *  GET /diagnoses/:id 对一个 status='failed' 的 Diagnosis 行,响应:
 *   - 不含 pipeline_error_message 和 failure_reason 两个 key
 *   - 含 status='failed' 和 user_message='诊断分析未完成,请重试'
 *  GET /diagnoses 对同一行,同样不含这两个内部字段。
 *
 * 数据造法:直接用 getRepositoryToken(Diagnosis) 拿 repo 插行(最简),避免调用 AI 流水线。
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { Diagnosis } from '../src/diagnoses/entities/diagnosis.entity';
import { User } from '../src/users/entities/user.entity';
import { Resume } from '../src/resumes/entities/resume.entity';
import { request } from './test-utils';

// 简单 mock:诊断测试不需要真实 AI 调用
const mockAiService = {
  complete: jest.fn().mockResolvedValue('是'),
  completeStructured: jest.fn().mockRejectedValue(new Error('不应被调用')),
};

describe('DiagnosisResponseDto 脱敏 (e2e)', () => {
  let app: INestApplication;
  let diagnosisRepo: Repository<Diagnosis>;
  let userRepo: Repository<User>;
  let resumeRepo: Repository<Resume>;

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
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    diagnosisRepo = moduleRef.get<Repository<Diagnosis>>(getRepositoryToken(Diagnosis));
    userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    resumeRepo = moduleRef.get<Repository<Resume>>(getRepositoryToken(Resume));
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  async function registerUser(email: string, name: string): Promise<{ token: string; userId: string }> {
    const codeRes = await request(app.getHttpServer())
      .post('/api/auth/request-code')
      .send({ email, terms_agreed: true });
    const devCode = codeRes.body.dev_code as string;
    if (!devCode) throw new Error(`无 dev_code: ${JSON.stringify(codeRes.body)}`);
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, code: devCode, invite_code: 'COACH2026', name });
    const token = loginRes.body.access_token as string;
    const user = await userRepo.findOneByOrFail({ email });
    return { token, userId: user.id };
  }

  async function createResume(userId: string): Promise<string> {
    const resume = resumeRepo.create({
      user_id: userId,
      title: '测试简历',
      raw_text: '李雷 应届生 本科计算机 React NestJS',
      parsed_json: null,
    });
    const saved = await resumeRepo.save(resume);
    return saved.id;
  }

  // ── GET /diagnoses/:id 不含内部字段,含 user_message ─────────────────────────
  it('GET /diagnoses/:id 对 status=failed 行:无 pipeline_error_message/failure_reason,含 user_message', async () => {
    const email = `dto-test-${Date.now()}@coach.dev`;
    const { token, userId } = await registerUser(email, '脱敏测试');
    const resumeId = await createResume(userId);

    // 直接插一条 failed 诊断行(带敏感内部字段)
    const diagnosis = diagnosisRepo.create({
      user_id: userId,
      resume_id: resumeId,
      mode: 'jd_match',
      jd_company: 'TestCo',
      jd_role: '产品经理',
      score: 0,
      keywords_hit: [],
      keywords_miss: [],
      suggestions: [],
      status: 'failed',
      failure_reason: 'analyzer_error',
      pipeline_error_message: 'Error: AI 超时 at AnalyzerService.analyze (analyzer.service.ts:99)',
    } as Partial<Diagnosis> as Diagnosis);
    const saved = await diagnosisRepo.save(diagnosis);

    const res = await request(app.getHttpServer())
      .get(`/api/diagnoses/${saved.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    // 核心断言:两个内部字段的 key 不得出现在响应体中
    expect(Object.keys(res.body)).not.toContain('pipeline_error_message');
    expect(Object.keys(res.body)).not.toContain('failure_reason');

    // 应含 status 和 user_message
    expect(res.body.status).toBe('failed');
    expect(res.body.user_message).toBe('诊断分析未完成,请重试');
  }, 15000);

  // ── GET /diagnoses(列表)同样脱敏 ────────────────────────────────────────────
  it('GET /diagnoses 列表:每条 failed 行均无内部字段,含 user_message', async () => {
    const email = `dto-list-${Date.now()}@coach.dev`;
    const { token, userId } = await registerUser(email, '列表脱敏');
    const resumeId = await createResume(userId);

    // 插两条:一条 failed,一条 success
    await diagnosisRepo.save(
      diagnosisRepo.create({
        user_id: userId,
        resume_id: resumeId,
        mode: 'jd_match',
        jd_company: 'Co1',
        jd_role: '工程师',
        score: 0,
        keywords_hit: [],
        keywords_miss: [],
        suggestions: [],
        status: 'failed',
        failure_reason: 'parser_error',
        pipeline_error_message: '内部错误 stack trace',
      } as Partial<Diagnosis> as Diagnosis),
    );
    await diagnosisRepo.save(
      diagnosisRepo.create({
        user_id: userId,
        resume_id: resumeId,
        mode: 'jd_match',
        jd_company: 'Co2',
        jd_role: '工程师',
        score: 85,
        keywords_hit: ['React'],
        keywords_miss: [],
        suggestions: [],
        status: 'success',
        failure_reason: undefined,
        pipeline_error_message: undefined,
      } as Partial<Diagnosis> as Diagnosis),
    );

    const res = await request(app.getHttpServer())
      .get('/api/diagnoses')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);

    // 每一条响应对象均不含内部字段
    for (const item of res.body as Record<string, unknown>[]) {
      expect(Object.keys(item)).not.toContain('pipeline_error_message');
      expect(Object.keys(item)).not.toContain('failure_reason');
    }

    // failed 那条含 user_message,success 那条 user_message=null
    const failedItem = (res.body as Array<Record<string, unknown>>).find((i) => i.status === 'failed');
    const successItem = (res.body as Array<Record<string, unknown>>).find((i) => i.status === 'success');
    expect(failedItem?.user_message).toBe('诊断分析未完成,请重试');
    expect(successItem?.user_message).toBeNull();
  }, 15000);

  // ── partial 状态同样脱敏且含 user_message ───────────────────────────────────
  it('GET /diagnoses/:id 对 status=partial 行:无内部字段,user_message 非空', async () => {
    const email = `dto-partial-${Date.now()}@coach.dev`;
    const { token, userId } = await registerUser(email, 'partial脱敏');
    const resumeId = await createResume(userId);

    const diagnosis = diagnosisRepo.create({
      user_id: userId,
      resume_id: resumeId,
      mode: 'profession_standard',
      jd_company: 'TestCo',
      jd_role: '产品经理',
      score: 60,
      keywords_hit: ['SQL'],
      keywords_miss: [],
      suggestions: [],
      status: 'partial',
      failure_reason: 'rewriter_error',
      pipeline_error_message: '改写阶段超时',
    } as Partial<Diagnosis> as Diagnosis);
    const saved = await diagnosisRepo.save(diagnosis);

    const res = await request(app.getHttpServer())
      .get(`/api/diagnoses/${saved.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).not.toContain('pipeline_error_message');
    expect(Object.keys(res.body)).not.toContain('failure_reason');
    expect(res.body.status).toBe('partial');
    expect(res.body.user_message).toBe('诊断分析未完成,请重试');
  }, 15000);

  // ── success 状态 user_message=null ────────────────────────────────────────
  it('GET /diagnoses/:id 对 status=success 行:user_message=null', async () => {
    const email = `dto-success-${Date.now()}@coach.dev`;
    const { token, userId } = await registerUser(email, 'success测试');
    const resumeId = await createResume(userId);

    const diagnosis = diagnosisRepo.create({
      user_id: userId,
      resume_id: resumeId,
      mode: 'jd_match',
      jd_company: 'Co',
      jd_role: '工程师',
      score: 90,
      keywords_hit: [],
      keywords_miss: [],
      suggestions: [],
      status: 'success',
    } as Partial<Diagnosis> as Diagnosis);
    const saved = await diagnosisRepo.save(diagnosis);

    const res = await request(app.getHttpServer())
      .get(`/api/diagnoses/${saved.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.user_message).toBeNull();
    expect(Object.keys(res.body)).not.toContain('pipeline_error_message');
    expect(Object.keys(res.body)).not.toContain('failure_reason');
  }, 15000);
});
