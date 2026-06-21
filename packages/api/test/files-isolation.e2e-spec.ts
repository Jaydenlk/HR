import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

/**
 * Files 对象级 ACL / IDOR 对抗测试。
 *
 * 修复前(0be9ed2):FilesService.upload 不绑定 user_id,且无下载端点;key 与用户无归属关系,
 * 任何持有效 JWT 者都能枚举/猜测 uuid 拉取他人文件。
 * 修复后:upload 落 file_metadata(key→user_id),download 端点先 assertOwner,
 * 非属主一律 404(不泄露存在性,对齐 findOne(id,userId) 现行模式),无 JWT 401。
 *
 * 本套件对 pre-fix 代码必然 FAIL:pre-fix 无 GET /files/download/:folder/:name 端点(404 路由不存在,
 * 但「属主 200」断言拿不到文件 → FAIL),也无 user_id 绑定。post-fix 全绿。
 */
describe('Files isolation / object-level ACL (e2e)', () => {
  let app: INestApplication;
  let tokenA: string;
  let tokenB: string;
  let keyA: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
    tokenA = await loginUser(app, 'files-a@coach.dev', 'Files User A');
    tokenB = await loginUser(app, 'files-b@coach.dev', 'Files User B');

    // 用户 A 上传一个文件,拿到 key
    const up = await request(app.getHttpServer())
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from('OWNER-A-SECRET-RESUME'), 'resume.pdf');
    expect(up.status).toBe(201);
    expect(up.body).toHaveProperty('key');
    keyA = up.body.key;
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── POST /api/files/upload ────────────────────────────────────────────────
  describe('POST /api/files/upload', () => {
    it('owner uploads → 201 + key', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('file', Buffer.from('hello'), 'a.pdf');
      expect(res.status).toBe(201);
      expect(typeof res.body.key).toBe('string');
      expect(res.body.key).toMatch(/^resumes\//);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/files/upload')
        .attach('file', Buffer.from('hello'), 'a.pdf');
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/files/download/:folder/:name — IDOR 出口 ──────────────────────
  describe('GET /api/files/download/:folder/:name', () => {
    it('owner downloads own file → 200 + file content', async () => {
      const [folder, name] = keyA.split('/');
      const res = await request(app.getHttpServer())
        .get(`/api/files/download/${folder}/${name}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      // body 是文件原文(supertest 把非 JSON 响应体放到 res.text)
      expect(res.text).toContain('OWNER-A-SECRET-RESUME');
    });

    it('NON-OWNER downloads other user file → 404 (IDOR closed, no leak)', async () => {
      const [folder, name] = keyA.split('/');
      const res = await request(app.getHttpServer())
        .get(`/api/files/download/${folder}/${name}`)
        .set('Authorization', `Bearer ${tokenB}`);
      // 必须 404(不泄露存在性),绝不能 200 拿到 A 的文件
      expect(res.status).toBe(404);
      expect(res.text).not.toContain('OWNER-A-SECRET-RESUME');
    });

    it('non-existent key → 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/files/download/resumes/00000000-0000-0000-0000-000000000000.pdf')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(404);
    });

    it('without JWT → 401', async () => {
      const [folder, name] = keyA.split('/');
      const res = await request(app.getHttpServer())
        .get(`/api/files/download/${folder}/${name}`);
      expect(res.status).toBe(401);
    });
  });
});
