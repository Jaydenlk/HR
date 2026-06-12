/**
 * coach-handoffs.e2e-spec.ts
 * Step 2 验证:接待接口 owner-only 404 / 非法流转 400 / 合法流转链
 * migration 冒烟:sqlite synchronize 建表(app init 时自动同步实体)
 */
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createTestApp, loginUser, request } from './test-utils';
import { CoachHandoff } from '../src/coach-handoffs/entities/coach-handoff.entity';
import { Conversation } from '../src/conversations/entities/conversation.entity';

describe('coach-handoffs (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;
  let handoffRepo: Repository<CoachHandoff>;
  let convRepo: Repository<Conversation>;

  beforeAll(async () => {
    app = await createTestApp();
    token = await loginUser(app, 'handoff-owner@test.dev', 'Owner');
    otherToken = await loginUser(app, 'handoff-other@test.dev', 'Other');
    handoffRepo = app.get<Repository<CoachHandoff>>(getRepositoryToken(CoachHandoff));
    convRepo = app.get<Repository<Conversation>>(getRepositoryToken(Conversation));
  });

  afterAll(async () => {
    await app.close();
  });

  async function getOwnerId(): Promise<string> {
    // GET /api/auth/me から user id を取得
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    return res.body.id as string;
  }

  async function createHandoffDirectly(userId: string): Promise<CoachHandoff> {
    // 必须先有 conversation
    const conv = convRepo.create({ user_id: userId, context_type: 'free' } as Partial<Conversation>);
    await convRepo.save(conv);
    const handoff = handoffRepo.create({
      user_id: userId,
      conversation_id: conv.id,
      target: 'mock',
      payload: { company: '字节', role: 'PM' },
      status: 'proposed',
    } as Partial<CoachHandoff>);
    return handoffRepo.save(handoff) as Promise<CoachHandoff>;
  }

  it('migration smoke: coach_handoffs table exists (sqlite synchronize)', async () => {
    // sqlite synchronize 在 app init 时自动建表;能直接 insert 即说明表存在。
    const userId = await getOwnerId();
    const h = await createHandoffDirectly(userId);
    expect(h.id).toBeDefined();
    expect(h.status).toBe('proposed');
  });

  it('GET /coach-handoffs/:id — owner 200', async () => {
    const userId = await getOwnerId();
    const h = await createHandoffDirectly(userId);
    const res = await request(app.getHttpServer())
      .get(`/api/coach-handoffs/${h.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.target).toBe('mock');
    expect(res.body.status).toBe('proposed');
    expect(res.body.conversation_id).toBe(h.conversation_id);
  });

  it('GET /coach-handoffs/:id — non-owner 404 (不泄露存在性)', async () => {
    const userId = await getOwnerId();
    const h = await createHandoffDirectly(userId);
    await request(app.getHttpServer())
      .get(`/api/coach-handoffs/${h.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('GET /coach-handoffs/:id — unknown id 404', async () => {
    await request(app.getHttpServer())
      .get('/api/coach-handoffs/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('PATCH status: proposed → accepted (合法)', async () => {
    const userId = await getOwnerId();
    const h = await createHandoffDirectly(userId);
    const res = await request(app.getHttpServer())
      .patch(`/api/coach-handoffs/${h.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'accepted' })
      .expect(200);
    expect(res.body.status).toBe('accepted');
  });

  it('PATCH status: proposed → dismissed (合法)', async () => {
    const userId = await getOwnerId();
    const h = await createHandoffDirectly(userId);
    const res = await request(app.getHttpServer())
      .patch(`/api/coach-handoffs/${h.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'dismissed' })
      .expect(200);
    expect(res.body.status).toBe('dismissed');
  });

  it('PATCH status: accepted → completed (合法)', async () => {
    const userId = await getOwnerId();
    const h = await createHandoffDirectly(userId);
    // 先转 accepted
    await request(app.getHttpServer())
      .patch(`/api/coach-handoffs/${h.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'accepted' });
    const res = await request(app.getHttpServer())
      .patch(`/api/coach-handoffs/${h.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' })
      .expect(200);
    expect(res.body.status).toBe('completed');
  });

  it('PATCH status: proposed → completed (非法流转 400)', async () => {
    const userId = await getOwnerId();
    const h = await createHandoffDirectly(userId);
    await request(app.getHttpServer())
      .patch(`/api/coach-handoffs/${h.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' })
      .expect(400);
  });

  it('PATCH status: dismissed → accepted (终态不可再转 400)', async () => {
    const userId = await getOwnerId();
    const h = await createHandoffDirectly(userId);
    await request(app.getHttpServer())
      .patch(`/api/coach-handoffs/${h.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'dismissed' });
    await request(app.getHttpServer())
      .patch(`/api/coach-handoffs/${h.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'accepted' })
      .expect(400);
  });

  it('PATCH status: non-owner 404', async () => {
    const userId = await getOwnerId();
    const h = await createHandoffDirectly(userId);
    await request(app.getHttpServer())
      .patch(`/api/coach-handoffs/${h.id}/status`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ status: 'accepted' })
      .expect(404);
  });

  it('PATCH status: invalid status value 400', async () => {
    const userId = await getOwnerId();
    const h = await createHandoffDirectly(userId);
    await request(app.getHttpServer())
      .patch(`/api/coach-handoffs/${h.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'invalid_state' })
      .expect(400);
  });
});
