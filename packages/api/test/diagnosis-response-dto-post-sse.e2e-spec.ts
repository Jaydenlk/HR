/**
 * 诊断脱敏白名单封全 e2e —— POST 出口(/diagnoses 与 /diagnoses/campus)
 *
 * 背景:DiagnosisResponseDto 原先只作用于 GET /diagnoses 与 GET /diagnoses/:id 两个出口;
 * POST /diagnoses、POST /diagnoses/campus 直接 return 原始实体(裸返 failure_reason /
 * pipeline_error_message 两个内部字段)。本测试走真实 HTTP + 完整 AI 流水线(只 mock AiService
 * 的 completeStructured,各阶段喂能过护栏的合法产物),断言两个 POST 成功响应体均不含这两个内部 key,
 * 证明白名单已封全 POST 出口。
 *
 * (SSE done 出口的脱敏由 service 级 diagnosis-stream.e2e-spec.ts 覆盖:done.diagnosis 现为
 *  DiagnosisResponseDto,其字段集即白名单——天然不含两个内部字段;此处不重复造 SSE HTTP 流。)
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { User } from '../src/users/entities/user.entity';
import { Resume } from '../src/resumes/entities/resume.entity';
import { request } from './test-utils';

// 完整简历正文:含可被 parse/analyze/rewrite 护栏接受的真实句子(REAL_ORIGINAL 是 suggest 的 original 子串)。
const RESUME_TEXT = [
  '李雷 应届毕业生 互联网产品经理求职意向',
  '教育背景:某重点大学 信息管理与信息系统 本科 2022-2026 GPA 3.8/4.0',
  '实习经历:2025.06-2025.09 某互联网公司 产品实习生',
  '- 负责商家工具方向,从用户调研出发梳理商家发券链路痛点',
  '- 主导一次需求评审,协调研发与设计推动优惠券模板功能上线',
  '项目经历:校园二手交易平台(担任产品负责人,团队五人)',
  '技能:SQL、Axure、墨刀、数据分析',
].join('\n');

const REAL_ORIGINAL = '负责商家工具方向,从用户调研出发梳理商家发券链路痛点';

const JD_TEXT =
  '招聘互联网产品经理(校招):负责需求调研与产品设计,撰写 PRD,推动跨职能协作落地,' +
  '用数据分析(SQL)定义与衡量产品成功。要求本科及以上,熟悉用户调研与竞品分析。';

// 各阶段 AI 原始产物(对齐 diagnosis-stream.e2e-spec 的 defaultStructured,确保能过真实护栏)。
function defaultStructured(toolName: string): unknown {
  switch (toolName) {
    case 'parse_resume':
      return {
        basic_info: { name: '李雷' },
        work_experience: [
          {
            company: '某互联网公司',
            title: '产品实习生',
            start_date: '2025-06',
            end_date: '2025-09',
            description: '负责商家工具方向',
            achievements: ['推动优惠券模板功能上线'],
          },
        ],
        education: [
          { school: '某重点大学', degree: '本科', major: '信息管理与信息系统', graduation_date: '2026-06' },
        ],
        skills: { technical: ['SQL', 'Axure'] },
        projects: [{ name: '校园二手交易平台', description: '产品负责人' }],
      };
    case 'parse_jd':
      return {
        job_title: '互联网产品经理',
        company: '某互联网公司',
        required_skills: [{ skill: 'SQL', level: 'required' }],
        responsibilities: ['需求调研', '产品设计'],
        qualifications: { education: '本科', must_have: ['用户调研'] },
        keywords: ['数据驱动', 'PRD'],
      };
    case 'analyze_match':
      return {
        total_score: 78,
        dimensions: {
          skills: { score: 20, max: 25, matched: ['SQL'], missing: ['数据分析平台'], partial: [] },
          experience: { score: 18, max: 25, analysis: '有相关产品实习' },
          education: { score: 15, max: 15, analysis: '本科对口' },
          keywords: { score: 12, max: 15, coverage_rate: 0.8, missing_keywords: ['增长'] },
          overall: { score: 78, max: 100, analysis: '整体匹配度较好' },
        },
      };
    case 'profession_standard_review':
      return {
        total_score: 0,
        dimensions: [
          { score: 18, why: '有需求调研与竞品分析,产品思维清晰', evidenceFound: ['用户访谈'], gap: '' },
          { score: 17, why: '有量化表达', evidenceFound: ['优惠券模板功能上线'], gap: '缺基数口径' },
          { score: 15, why: '担任产品负责人体现主导权', evidenceFound: ['产品负责人'], gap: '' },
          { score: 11, why: '有跨职能协作场景', evidenceFound: ['协调研发与设计'], gap: '' },
          { score: 12, why: '专业与实习对口,掌握基础工具', evidenceFound: ['SQL'], gap: '' },
        ],
        conventionChecks: [{ key: 'GPA', status: 'ok', note: 'GPA 已展示' }],
        interviewHooks: [
          {
            resumeHit: '推动优惠券模板功能上线',
            interviewQuestion: '这个功能的核心指标是什么?',
            prepDirection: '准备清楚指标定义与数据来源',
          },
        ],
      };
    case 'suggest_rewrites':
      return {
        suggestions: [
          {
            section: '实习经历',
            type: 'rewrite',
            priority: 'high',
            original: REAL_ORIGINAL,
            suggested: '主导商家工具方向,基于用户调研定位发券链路核心痛点并推动优化',
            reason: '突出主导动作与问题定位,增强产品思维可信度',
          },
        ],
      };
    case 'flag_fabrication':
      return { indices: [] };
    default:
      throw new Error(`unexpected toolName: ${toolName}`);
  }
}

interface StructuredParams {
  toolName: string;
}

const mockAiService = {
  complete: jest.fn().mockResolvedValue('是'),
  completeStructured: jest.fn().mockImplementation((params: StructuredParams) =>
    Promise.resolve(defaultStructured(params.toolName)),
  ),
};

describe('诊断脱敏白名单封全 — POST 出口 (e2e)', () => {
  let app: INestApplication;
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
    const saved = await resumeRepo.save(
      resumeRepo.create({
        user_id: userId,
        title: '校招简历',
        raw_text: RESUME_TEXT,
        is_primary: true,
      }),
    );
    return saved.id;
  }

  // 断言响应体不含两个内部字段,且形态是投影后的 DTO(带 user_message 字段——成功/非失败态为 null)。
  // 注:非流式 POST 路径不写 status(成败记账只在流式 pipeline 里发生),故 status 为 null;
  //     这正说明 user_message 据 status 推导也为 null(非 failed/partial)。脱敏的核心证据是两个内部 key 不出现。
  function expectSealed(body: Record<string, unknown>): void {
    expect(Object.keys(body)).not.toContain('pipeline_error_message');
    expect(Object.keys(body)).not.toContain('failure_reason');
    // DTO 投影标志:fromEntity 一定会注入 user_message 字段(裸实体没有这个字段)。
    expect(body).toHaveProperty('user_message');
    // 非 failed/partial → user_message 为 null。
    expect(body.user_message).toBeNull();
  }

  it('POST /diagnoses(JD 匹配)成功响应:无 pipeline_error_message/failure_reason,且为投影 DTO', async () => {
    const { token, userId } = await registerUser(`post-jd-${Date.now()}@coach.dev`, 'POST-JD');
    const resumeId = await createResume(userId);

    const res = await request(app.getHttpServer())
      .post('/api/diagnoses')
      .set('Authorization', `Bearer ${token}`)
      .send({ resume_id: resumeId, jd_text: JD_TEXT });

    expect(res.status).toBe(201);
    expectSealed(res.body as Record<string, unknown>);
    // 实体真有 success 落库的 score。
    expect(typeof res.body.score).toBe('number');
  }, 30000);

  it('POST /diagnoses/campus(职业标尺)成功响应:无 pipeline_error_message/failure_reason,且为投影 DTO', async () => {
    const { token, userId } = await registerUser(`post-campus-${Date.now()}@coach.dev`, 'POST-Campus');
    const resumeId = await createResume(userId);

    const res = await request(app.getHttpServer())
      .post('/api/diagnoses/campus')
      .set('Authorization', `Bearer ${token}`)
      .send({ resume_id: resumeId, profession: '互联网产品经理' });

    expect(res.status).toBe(201);
    expectSealed(res.body as Record<string, unknown>);
    expect(res.body.mode).toBe('profession_standard');
  }, 30000);
});
