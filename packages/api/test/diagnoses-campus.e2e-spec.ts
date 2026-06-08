import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

/**
 * 校招职业标尺诊断 e2e — POST /api/diagnoses/campus
 *
 * 分两类:
 *  - 非 AI(快):未知职业 → 404;简历过短 → 400(AI 调用前就抛错)
 *  - AI live(真跑 CloudDreamAI,150s 超时):有效简历不带 jd_text → 201 职业标尺结果
 */
describe('Diagnoses Campus (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = './test-diagnoses-campus-e2e.db';
    app = await createTestApp();
    token = await loginUser(app, 'campus-owner@coach.dev', 'Campus Owner');
  }, 30000);

  afterAll(async () => {
    await app.close();
    try {
      const fs = await import('fs/promises');
      await fs.unlink('./test-diagnoses-campus-e2e.db');
    } catch {
      // ignore if file doesn't exist
    }
  });

  // 充足的应届产品经理简历原文(>30 字,供 AI live 用例)
  const validResumeText = `张三 应届毕业生 互联网产品经理求职意向
教育背景：某重点大学 信息管理与信息系统 本科 2022-2026 GPA 3.8/4.0
实习经历：2025.06-2025.09 字节跳动 产品实习生
- 负责抖音电商商家工具方向，从用户调研出发梳理商家发券链路痛点
- 主导一次需求评审，协调研发与设计推动优惠券模板功能上线，覆盖商家 1.2 万家
- 通过数据分析将商家发券转化率从 18% 提升到 27%，留存提升 9%
项目经历：校园二手交易平台（担任产品负责人，团队 5 人）
- 完成竞品分析与用户访谈 30 份，输出 PRD 与需求优先级排序
- 上线 3 个月累计注册用户 8000+，日活 600+
技能：SQL、Axure、墨刀、数据分析；获全国大学生市场调研大赛二等奖`;

  // ─── 非 AI:边界/校验 ───────────────────────────────────────────────
  describe('校验与边界(AI 调用前)', () => {
    it('未知职业 → 404', async () => {
      // 先建一个真实简历拿到合法 UUID(避免 UUID 校验先于业务逻辑触发)
      const resumeRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '未知职业用简历', raw_text: validResumeText });
      expect(resumeRes.status).toBe(201);

      const res = await request(app.getHttpServer())
        .post('/api/diagnoses/campus')
        .set('Authorization', `Bearer ${token}`)
        .send({ resume_id: resumeRes.body.id, profession: '星际探险家' });

      expect(res.status).toBe(404);
    });

    it('简历过短 → 创建阶段即 400(短简历拒绝前移到 resume 层,进不了诊断)', async () => {
      // resume 创建 DTO 要求 raw_text ≥30 字,过短简历在创建阶段就被 400 拦下,
      // 拿不到 resume_id,自然无法进入 campus 诊断——这是用户实际遇到的拦截点。
      // (campus 服务内仍保留 <30 的冗余护栏作纵深防御,但正常 API 已不可达。)
      const resumeRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '过短简历', raw_text: '太短' });
      expect(resumeRes.status).toBe(400);
    });

    it('未鉴权 → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/diagnoses/campus')
        .send({ resume_id: '00000000-0000-0000-0000-000000000000', profession: '互联网产品经理' });
      expect(res.status).toBe(401);
    });
  });

  // ─── AI live:真实调用 CloudDreamAI(默认跳过,RUN_AI_LIVE=1 开启) ─────────
  // 门控原因:不门控会让默认 e2e 套件在 auto-v2 中转抖动时环境性 flaky,与其它 AI-live 块对齐。
  const LIVE = process.env.RUN_AI_LIVE === '1';
  (LIVE ? describe : describe.skip)('AI live — 职业标尺诊断(真跑)', () => {
    it('有效简历不带 jd_text → 201 + profession_standard 结果', async () => {
      const resumeRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '产品经理校招简历', raw_text: validResumeText });
      expect(resumeRes.status).toBe(201);

      const res = await request(app.getHttpServer())
        .post('/api/diagnoses/campus')
        .set('Authorization', `Bearer ${token}`)
        .send({ resume_id: resumeRes.body.id, profession: '互联网产品经理' });

      // Log first for visibility on failure
      console.log('[campus AI] status:', res.status);
      console.log('[campus AI] mode:', res.body.mode);
      console.log('[campus AI] profession:', res.body.profession);
      console.log('[campus AI] score:', res.body.score);
      console.log('[campus AI] dimensions count:', res.body.dimensions?.dimensions?.length);
      console.log('[campus AI] suggestions count:', res.body.suggestions?.length);

      expect([200, 201]).toContain(res.status);
      expect(res.body.mode).toBe('profession_standard');
      expect(res.body.profession).toBe('互联网产品经理');
      expect(res.body.preset_id).toBe('product-manager-campus');

      // dimensions 是 ProfessionStandardResult,应有内容
      expect(res.body.dimensions).toBeDefined();
      expect(Array.isArray(res.body.dimensions.dimensions)).toBe(true);
      expect(res.body.dimensions.dimensions.length).toBeGreaterThan(0);
      expect(typeof res.body.dimensions.total_score).toBe('number');

      // suggestions 非空
      expect(Array.isArray(res.body.suggestions)).toBe(true);
      expect(res.body.suggestions.length).toBeGreaterThan(0);

      // 未传 jd_text → jd_text 为空
      expect(res.body.jd_text == null || res.body.jd_text === '').toBe(true);
      // 校招流程串行 3 次 AI 调用(解析简历 + 标尺分析 + 改写建议),给足超时
    }, 280000);
  });
});
