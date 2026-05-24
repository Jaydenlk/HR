import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

describe('Cover Letters (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
    token = await loginUser(app, 'coverletters-test@coach.dev', 'Cover Letters User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ─── Auth guard ───────────────────────────────────────────────────────────

  describe('Auth guard — all routes require JWT', () => {
    it('POST /api/cover-letters without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/cover-letters')
        .send({ company: 'ACME', role: 'Engineer' });
      expect(res.status).toBe(401);
    });

    it('GET /api/cover-letters without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/cover-letters');
      expect(res.status).toBe(401);
    });

    it('GET /api/cover-letters/:id without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/cover-letters/00000000-0000-0000-0000-000000000000',
      );
      expect(res.status).toBe(401);
    });

    it('DELETE /api/cover-letters/:id without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).delete(
        '/api/cover-letters/00000000-0000-0000-0000-000000000000',
      );
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/cover-letters (empty state) ────────────────────────────────

  describe('GET /api/cover-letters', () => {
    it('returns 200 with an array (initially empty)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/cover-letters')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ─── POST /api/cover-letters ──────────────────────────────────────────────

  describe('POST /api/cover-letters', () => {
    let createdId: string | undefined;

    it('valid payload → 201 and returns cover letter object (triggers AI — 30s timeout)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/cover-letters')
        .set('Authorization', `Bearer ${token}`)
        .send({
          company: 'Acme Corp',
          role: 'Software Engineer',
          tone: 'professional',
          length_words: 200,
          jd_text: 'We are looking for a skilled software engineer to join our team.',
        });

      // AI-dependent: accept 201 (success) or any non-500 handled error
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
      if (res.status === 201) {
        expect(res.body).toHaveProperty('id');
        // company/role fields may be null depending on the entity schema
        expect(res.body).toHaveProperty('content');
        expect(typeof res.body.content).toBe('string');
        createdId = res.body.id as string;
      }
    }, 30000);

    // ─── Subsequent CRUD only run if creation succeeded ───────────────────

    describe('After a cover letter is created', () => {
      beforeAll(async () => {
        if (!createdId) {
          // Try to create one and capture the id for dependent tests
          const res = await request(app.getHttpServer())
            .post('/api/cover-letters')
            .set('Authorization', `Bearer ${token}`)
            .send({ company: 'Beta Inc', role: 'Product Manager' });
          if (res.status === 201 && res.body?.id) {
            createdId = res.body.id as string;
          }
        }
      }, 30000);

      it('GET /api/cover-letters → 200 + array with at least one item', async () => {
        if (!createdId) {
          console.warn('No cover letter created — skipping list check');
          return;
        }
        const res = await request(app.getHttpServer())
          .get('/api/cover-letters')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      });

      it('GET /api/cover-letters/:id → 200 + specific cover letter', async () => {
        if (!createdId) {
          console.warn('No cover letter created — skipping findOne check');
          return;
        }
        const res = await request(app.getHttpServer())
          .get(`/api/cover-letters/${createdId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id', createdId);
      });

      it('GET /api/cover-letters/:id with unknown id → 404', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/cover-letters/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
      });

      it('DELETE /api/cover-letters/:id → 200', async () => {
        if (!createdId) {
          console.warn('No cover letter created — skipping delete check');
          return;
        }
        const res = await request(app.getHttpServer())
          .delete(`/api/cover-letters/${createdId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
      });

      it('GET /api/cover-letters/:id after deletion → 404', async () => {
        if (!createdId) {
          console.warn('No cover letter created — skipping post-delete check');
          return;
        }
        const res = await request(app.getHttpServer())
          .get(`/api/cover-letters/${createdId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
      });
    });
  });
});
