import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createTestApp, loginUser, request } from './test-utils';
import { MockSession } from '../src/mock/entities/mock-session.entity';
import { CoverLetter } from '../src/cover-letters/entities/cover-letter.entity';
import { CompanyResearch } from '../src/company-research/entities/company-research.entity';

// 直接经 Repository 落一行 MockSession/CoverLetter,绕开真实 AI 出题/生成调用——
// 这两条记录只用于验证 link/related 的数据打通逻辑,不需要真实 AI 产出的题目/正文。
async function getUserId(app: INestApplication, token: string): Promise<string> {
  const res = await request(app.getHttpServer()).get('/api/me').set('Authorization', `Bearer ${token}`);
  return res.body.id as string;
}

describe('Applications (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
    token = await loginUser(app, 'apps1@coach.dev', 'Apps User One');
    otherToken = await loginUser(app, 'apps2@coach.dev', 'Apps User Two');
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── POST /api/applications ───────────────────────────────────────────────

  describe('POST /api/applications', () => {
    it('valid data → 201 + application object', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Acme Corp', role: 'Engineer' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.company).toBe('Acme Corp');
      expect(res.body.role).toBe('Engineer');
      expect(res.body.stage).toBe('wishlist');
      expect(res.body).not.toHaveProperty('user_id');
    });

    it('valid data with stage → 201 + correct stage', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Beta Inc', role: 'PM', stage: 'applied' });

      expect(res.status).toBe(201);
      expect(res.body.stage).toBe('applied');
    });

    it('missing company → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'Engineer' });

      expect(res.status).toBe(400);
    });

    it('missing role → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Acme Corp' });

      expect(res.status).toBe(400);
    });

    it('invalid stage → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Acme Corp', role: 'Engineer', stage: 'not_a_stage' });

      expect(res.status).toBe(400);
    });

    it('company exceeds max length → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'a'.repeat(101), role: 'Engineer' });

      expect(res.status).toBe(400);
    });

    it('notes exceeds max length → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Acme Corp', role: 'Engineer', notes: 'a'.repeat(2001) });

      expect(res.status).toBe(400);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .send({ company: 'Acme Corp', role: 'Engineer' });

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/applications ────────────────────────────────────────────────

  describe('GET /api/applications', () => {
    it('returns 200 + array without user_id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/applications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).not.toHaveProperty('user_id');
      }
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/applications');

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/applications/stats ─────────────────────────────────────────

  describe('GET /api/applications/stats', () => {
    it('returns 200 + stats object with all stage keys', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/applications/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('wishlist');
      expect(res.body).toHaveProperty('applied');
      expect(res.body).toHaveProperty('interview');
      expect(res.body).toHaveProperty('final');
      expect(res.body).toHaveProperty('offer');
      expect(res.body).toHaveProperty('rejected');
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/applications/stats');

      expect(res.status).toBe(401);
    });
  });

  // ─── GET/PATCH/DELETE /api/applications/:id ──────────────────────────────

  describe('GET/PATCH/DELETE /api/applications/:id', () => {
    let appId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Target Co', role: 'Developer', stage: 'wishlist' });
      appId = res.body.id;
    });

    it('GET :id → 200 with events array, no user_id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(appId);
      expect(res.body).toHaveProperty('events');
      expect(Array.isArray(res.body.events)).toBe(true);
      expect(res.body).not.toHaveProperty('user_id');
    });

    it('PATCH :id change stage → 200 + updated stage, no user_id', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ stage: 'applied' });

      expect(res.status).toBe(200);
      expect(res.body.stage).toBe('applied');
      expect(res.body).not.toHaveProperty('user_id');
    });

    it('PATCH :id change stage → creates ApplicationEvent', async () => {
      // First move to interview
      await request(app.getHttpServer())
        .patch(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ stage: 'interview' });

      const res = await request(app.getHttpServer())
        .get(`/api/applications/${appId}/events`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Should have at least 2 events: initial creation + stage change(s)
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      // The latest event should reflect the interview transition
      const stageEvents = res.body.filter((e: { to_stage: string }) => e.to_stage === 'interview');
      expect(stageEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('GET :id/events → returns transition history', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/applications/${appId}/events`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('to_stage');
      expect(res.body[0]).toHaveProperty('application_id');
    });

    it('DELETE :id → 200', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Delete Me', role: 'Temp Role' });

      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/applications/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(deleteRes.status).toBe(200);

      // Confirm deleted
      const getRes = await request(app.getHttpServer())
        .get(`/api/applications/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(404);
    });

    it('GET with non-existent id → 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/applications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── Cross-user isolation ─────────────────────────────────────────────────

  describe('Cross-user access', () => {
    let ownerAppId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Private Corp', role: 'Secret Role' });
      ownerAppId = res.body.id;
    });

    it('other user cannot GET owner application → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/applications/${ownerAppId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('other user cannot PATCH owner application → 404', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${ownerAppId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ stage: 'applied' });

      expect(res.status).toBe(404);
    });

    it('other user cannot DELETE owner application → 404', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/applications/${ownerAppId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('GET /applications only returns own applications', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/applications')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.map((a: { id: string }) => a.id);
      expect(ids).not.toContain(ownerAppId);
    });
  });

  // ─── getStats whitelist guard (#82 regression) ────────────────────────────

  describe('getStats stage whitelist guard (#82)', () => {
    it('stats returns numeric counts for all known stages, ignores unknown stages', async () => {
      // Create applications at various stages
      await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '统计公司A', role: '工程师', stage: 'applied' });
      await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '统计公司B', role: '工程师', stage: 'offer' });

      const res = await request(app.getHttpServer())
        .get('/api/applications/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // All six known stage keys must be present and be non-negative numbers
      const knownStages = ['wishlist', 'applied', 'interview', 'final', 'offer', 'rejected'];
      for (const stage of knownStages) {
        expect(typeof res.body[stage]).toBe('number');
        expect(res.body[stage]).toBeGreaterThanOrEqual(0);
      }
      // No extra unknown keys injected from DB
      const keys = Object.keys(res.body);
      for (const key of keys) {
        expect(knownStages).toContain(key);
      }
    });
  });

  // ─── resume_id / diagnosis_id ownership guard (#112 regression) ──────────

  describe('update resume_id/diagnosis_id ownership guard (#112)', () => {
    let appId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '归属测试公司', role: 'Dev' });
      appId = res.body.id;
    });

    it('PATCH with non-existent resume_id → 403', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ resume_id: '00000000-0000-0000-0000-000000000099' });

      expect(res.status).toBe(403);
    });

    it('PATCH with non-existent diagnosis_id → 403', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ diagnosis_id: '00000000-0000-0000-0000-000000000099' });

      expect(res.status).toBe(403);
    });

    it('PATCH without resume_id/diagnosis_id → 200 (unaffected)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: '更新备注' });

      expect(res.status).toBe(200);
      expect(res.body.notes).toBe('更新备注');
    });
  });

  // ─── create() resume_id/diagnosis_id ownership guard (#112 IDOR symmetry) ──
  // create() 此前不校验引用归属，与 update() 不对称 → 跨用户引用(IDOR)。现已对称。
  describe('create resume_id ownership guard (#112 IDOR)', () => {
    let ownerResumeId: string;

    beforeAll(async () => {
      // token 用户(apps1)创建一份属于自己的简历，供归属测试使用。
      const res = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: '归属测试简历',
          raw_text: '这是一份用于跨用户归属校验的测试简历正文，包含足够长度以通过最小长度校验要求。',
        });
      expect(res.status).toBe(201);
      ownerResumeId = res.body.id;
    });

    it('create with another user\'s resume_id → 403 (IDOR blocked)', async () => {
      // otherToken(apps2)尝试引用 apps1 的简历 → 必须拒绝。
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ company: '越权公司', role: '工程师', resume_id: ownerResumeId });

      expect(res.status).toBe(403);
    });

    it('create with non-existent resume_id → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          company: '不存在引用公司',
          role: '工程师',
          resume_id: '00000000-0000-0000-0000-000000000099',
        });

      expect(res.status).toBe(403);
    });

    it('create with non-existent diagnosis_id → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          company: '不存在诊断公司',
          role: '工程师',
          diagnosis_id: '00000000-0000-0000-0000-000000000099',
        });

      expect(res.status).toBe(403);
    });

    it('create with own valid resume_id → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '合法引用公司', role: '工程师', resume_id: ownerResumeId });

      expect(res.status).toBe(201);
      expect(res.body.company).toBe('合法引用公司');
    });
  });

  // ─── T5 投递详情二级页:GET /related ────────────────────────────────────────
  describe('GET /api/applications/:id/related (T5)', () => {
    let appId: string;
    let interviewId: string;
    let mockSessionId: string;
    let coverLetterId: string;
    let userId: string;

    beforeAll(async () => {
      userId = await getUserId(app, token);

      const appRes = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Related测试公司', role: '工程师' });
      appId = appRes.body.id;

      const ivRes = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '一面', company: 'Related测试公司', application_id: appId });
      interviewId = ivRes.body.id;

      const mockRepo = app.get<Repository<MockSession>>(getRepositoryToken(MockSession));
      const mockRow = await mockRepo.save(
        mockRepo.create({
          user_id: userId,
          application_id: appId,
          company: 'Related测试公司',
          role: '工程师',
          mode: 'text',
          status: 'in_progress',
          questions: [],
          answers: [],
        }),
      );
      mockSessionId = mockRow.id;

      const letterRepo = app.get<Repository<CoverLetter>>(getRepositoryToken(CoverLetter));
      const letterRow = await letterRepo.save(
        letterRepo.create({
          user_id: userId,
          application_id: appId,
          company: 'Related测试公司',
          role: '工程师',
          tone: 'warm',
          content: '测试求职信正文',
          version: 1,
        }),
      );
      coverLetterId = letterRow.id;
    });

    it('返回聚合结果:interviews/mock_sessions/cover_letters 各含刚创建的一条,resume/company_research 为 null', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/applications/${appId}/related`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.interviews).toHaveLength(1);
      expect(res.body.interviews[0].id).toBe(interviewId);
      expect(res.body.mock_sessions).toHaveLength(1);
      expect(res.body.mock_sessions[0].id).toBe(mockSessionId);
      expect(res.body.cover_letters).toHaveLength(1);
      expect(res.body.cover_letters[0].id).toBe(coverLetterId);
      expect(res.body.resume).toBeNull();
      expect(res.body.company_research).toBeNull();
    });

    it('新建投递(无任何关联)→ 三个数组均为空,resume/company_research 为 null(诚实空态)', async () => {
      const emptyRes = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '空关联测试公司', role: '工程师' });

      const res = await request(app.getHttpServer())
        .get(`/api/applications/${emptyRes.body.id}/related`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.interviews).toEqual([]);
      expect(res.body.mock_sessions).toEqual([]);
      expect(res.body.cover_letters).toEqual([]);
      expect(res.body.resume).toBeNull();
      expect(res.body.company_research).toBeNull();
    });

    it('other user 访问 → 404(未归属保护)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/applications/${appId}/related`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get(`/api/applications/${appId}/related`);
      expect(res.status).toBe(401);
    });
  });

  // ─── T5 投递详情二级页:PATCH /link ──────────────────────────────────────────
  describe('PATCH /api/applications/:id/link (T5)', () => {
    let appId: string;
    let otherAppId: string;
    let freeInterviewId: string;
    let otherInterviewId: string;
    let resumeId: string;
    let ownVersionId: string;
    let otherResumeId: string;
    let otherVersionId: string;
    let companyResearchId: string;

    beforeAll(async () => {
      const appRes = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Link测试公司', role: '工程师' });
      appId = appRes.body.id;

      const otherAppRes = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ company: '他人的Link测试公司', role: '工程师' });
      otherAppId = otherAppRes.body.id;

      const ivRes = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '未关联一面' });
      freeInterviewId = ivRes.body.id;

      const otherIvRes = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ round: '他人的面试' });
      otherInterviewId = otherIvRes.body.id;

      const resumeRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Link测试简历',
          raw_text: '这是一份用于 link 端点测试的简历正文，长度需超过三十个字以通过后端最小长度校验规则。',
        });
      resumeId = resumeRes.body.id;
      const versionRes = await request(app.getHttpServer())
        .post(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          raw_text: '这是简历的第二版正文，同样需要超过三十个字才能通过后端的最小长度校验规则要求。',
        });
      ownVersionId = versionRes.body.id;

      const otherResumeRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          title: '他人的简历',
          raw_text: '这是他人的一份简历正文，长度同样需要超过三十个字以通过后端的最小长度校验规则。',
        });
      otherResumeId = otherResumeRes.body.id;
      const otherVersionRes = await request(app.getHttpServer())
        .post(`/api/resumes/${otherResumeId}/versions`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          raw_text: '这是他人简历的第二版正文，长度同样需要超过三十个字才能通过最小长度校验规则。',
        });
      otherVersionId = otherVersionRes.body.id;

      const researchRepo = app.get<Repository<CompanyResearch>>(getRepositoryToken(CompanyResearch));
      const researchRow = await researchRepo.save(
        researchRepo.create({
          canonical_name: 'link测试种子公司',
          display_name: 'Link测试种子公司',
          summary: '用于 link 端点测试的种子公司背景',
          source_url: 'https://seed.example.com/link-test',
          source_domain: 'seed.example.com',
          retrieved_at: new Date(),
          raw: null,
        }),
      );
      companyResearchId = researchRow.id;
    });

    it('type=interview,action=link:成功关联 → related 中出现该记录', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'interview', target_id: freeInterviewId, action: 'link' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });

      const related = await request(app.getHttpServer())
        .get(`/api/applications/${appId}/related`)
        .set('Authorization', `Bearer ${token}`);
      expect(related.body.interviews.map((iv: { id: string }) => iv.id)).toContain(freeInterviewId);
    });

    it('type=interview,action=unlink:取消关联后从 related 中消失', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'interview', target_id: freeInterviewId, action: 'unlink' });

      expect(res.status).toBe(200);

      const related = await request(app.getHttpServer())
        .get(`/api/applications/${appId}/related`)
        .set('Authorization', `Bearer ${token}`);
      expect(related.body.interviews.map((iv: { id: string }) => iv.id)).not.toContain(freeInterviewId);
    });

    it('unlink 一条实际未关联到本投递的记录 → 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'interview', target_id: freeInterviewId, action: 'unlink' });

      expect(res.status).toBe(400);
    });

    it('link 他人的 interview(target 不属于自己)→ 403,不能悄悄挂上他人记录', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'interview', target_id: otherInterviewId, action: 'link' });

      expect(res.status).toBe(403);
    });

    it('用他人的 application 尝试 link 自己的 interview → 404(application 本身归属未过)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${otherAppId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'interview', target_id: freeInterviewId, action: 'link' });

      expect(res.status).toBe(404);
    });

    it('type=resume_version,action=link:成功关联自己的简历版本', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'resume_version', target_id: ownVersionId, action: 'link' });

      expect(res.status).toBe(200);

      const related = await request(app.getHttpServer())
        .get(`/api/applications/${appId}/related`)
        .set('Authorization', `Bearer ${token}`);
      expect(related.body.resume.resume.id).toBe(resumeId);
      expect(related.body.resume.version.id).toBe(ownVersionId);
    });

    it('type=resume_version,action=unlink:只撤销"选中了哪一版",resume_id 不受影响(resume 块仍在,version 变 null)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'resume_version', target_id: ownVersionId, action: 'unlink' });

      expect(res.status).toBe(200);

      const related = await request(app.getHttpServer())
        .get(`/api/applications/${appId}/related`)
        .set('Authorization', `Bearer ${token}`);
      expect(related.body.resume.resume.id).toBe(resumeId);
      expect(related.body.resume.version).toBeNull();
    });

    it('type=resume_version,link 他人的简历版本(经 resume_id 反查归属)→ 403', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'resume_version', target_id: otherVersionId, action: 'link' });

      expect(res.status).toBe(403);
    });

    it('type=company_research,action=link:成功关联(无 user_id 列,只判存在)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'company_research', target_id: companyResearchId, action: 'link' });

      expect(res.status).toBe(200);

      const related = await request(app.getHttpServer())
        .get(`/api/applications/${appId}/related`)
        .set('Authorization', `Bearer ${token}`);
      expect(related.body.company_research.id).toBe(companyResearchId);
    });

    it('type=company_research,action=unlink:取消关联后变回 null', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'company_research', target_id: companyResearchId, action: 'unlink' });

      expect(res.status).toBe(200);

      const related = await request(app.getHttpServer())
        .get(`/api/applications/${appId}/related`)
        .set('Authorization', `Bearer ${token}`);
      expect(related.body.company_research).toBeNull();
    });

    it('type=company_research,target_id 不存在 → 404', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'company_research',
          target_id: '00000000-0000-0000-0000-000000000099',
          action: 'link',
        });

      expect(res.status).toBe(404);
    });

    it('type 非法枚举值 → 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'not_a_type', target_id: freeInterviewId, action: 'link' });

      expect(res.status).toBe(400);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}/link`)
        .send({ type: 'interview', target_id: freeInterviewId, action: 'link' });

      expect(res.status).toBe(401);
    });
  });

  // ─── T5 投递详情二级页:GET /link-suggestions(只读,不写库) ───────────────────
  describe('GET /api/applications/:id/link-suggestions (T5)', () => {
    let appId: string;
    let matchingInterviewId: string;
    let unrelatedInterviewId: string;
    let alreadyLinkedInterviewId: string;

    beforeAll(async () => {
      const appRes = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '建议测试科技有限公司', role: '工程师' });
      appId = appRes.body.id;

      // 公司名归一化后应与"建议测试科技有限公司"相同(剥离"科技"+"有限公司"后缀)。
      const matchRes = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '候选一面', company: '建议测试' });
      matchingInterviewId = matchRes.body.id;

      const unrelatedRes = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '不相关的面试', company: '完全不同的公司名称' });
      unrelatedInterviewId = unrelatedRes.body.id;

      const linkedRes = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '已关联的面试', company: '建议测试', application_id: appId });
      alreadyLinkedInterviewId = linkedRes.body.id;
    });

    it('公司名归一化后匹配的未关联记录 → 出现在候选中;不匹配/已关联的不出现', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/applications/${appId}/link-suggestions`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const ids = res.body.suggestions.map((s: { target_id: string }) => s.target_id);
      expect(ids).toContain(matchingInterviewId);
      expect(ids).not.toContain(unrelatedInterviewId);
      expect(ids).not.toContain(alreadyLinkedInterviewId);
    });

    it('只读:调用后 matchingInterview 的 application_id 仍为 null(建议不自动写库)', async () => {
      await request(app.getHttpServer())
        .get(`/api/applications/${appId}/link-suggestions`)
        .set('Authorization', `Bearer ${token}`);

      const check = await request(app.getHttpServer())
        .get(`/api/interviews/${matchingInterviewId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(check.body.application_id).toBeNull();
    });

    it('other user 访问 → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/applications/${appId}/link-suggestions`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/applications/${appId}/link-suggestions`,
      );
      expect(res.status).toBe(401);
    });
  });
});
