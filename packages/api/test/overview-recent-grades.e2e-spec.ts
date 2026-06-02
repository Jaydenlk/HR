import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Interview } from '../src/interviews/entities/interview.entity';
import { loginUser, request } from './test-utils';

/* ------------------------------------------------------------------ */
/*  P0-6: overview.recentGrades must be a STABLE selection of the 5    */
/*  most-recent graded interviews in created_at DESC order, with       */
/*  ungraded drafts filtered out and the filter NOT disturbing order.  */
/*                                                                     */
/*  The bug: the service trusted the repo's DESC order then sliced     */
/*  (0,5). created_at has only SECOND granularity, so a burst of       */
/*  inserts ties — the DB then orders ties by rowid (insertion ASC),   */
/*  and slice(0,5) returned the OLDEST-inserted five in ASC order,     */
/*  the opposite of "5 most recent, newest first". The fix sorts in    */
/*  the service by created_at DESC with id as a deterministic          */
/*  tiebreaker, so the output is stable regardless of upstream order.  */
/*                                                                     */
/*  Seeded directly via the repository (no AI) with explicit           */
/*  created_at values: a same-second cluster reproduces the tie, plus  */
/*  a strictly-newer row that must always lead.                        */
/* ------------------------------------------------------------------ */

interface RecentGrade {
  company: string;
  grade: string;
  date: string;
}

describe('Overview recentGrades (e2e) — DESC + filter stability (P0-6)', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;
  let repo: Repository<Interview>;

  // Same instant shared by the tied cluster (second granularity is irrelevant —
  // these are byte-identical Dates, the worst case for ordering stability).
  const TIE_INSTANT = new Date(Date.UTC(2026, 0, 10, 8, 0, 0));
  const NEWER_INSTANT = new Date(Date.UTC(2026, 0, 20, 8, 0, 0));
  const OLDER_INSTANT = new Date(Date.UTC(2026, 0, 1, 8, 0, 0));

  async function seed(
    company: string,
    when: Date,
    graded: boolean,
    fixedId?: string,
  ): Promise<void> {
    const iv = repo.create({
      user_id: userId,
      round: '技术一面',
      company,
      role: '后端工程师',
      overall_grade: graded ? 'A' : undefined,
      scores: graded ? [{ name: '技术深度', score: 85 }] : undefined,
    });
    if (fixedId) iv.id = fixedId;
    iv.created_at = when;
    await repo.save(iv);
  }

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    repo = moduleRef.get<Repository<Interview>>(getRepositoryToken(Interview));

    token = await loginUser(app, 'overview-recent@coach.dev', 'Overview Recent User');
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    userId = me.body.id as string;

    // A strictly-OLDER graded row inserted FIRST. Under the buggy slice(0,5) of an
    // ASC-by-rowid tie list this oldest row would wrongly surface near the top.
    await seed('G_OLD', OLDER_INSTANT, true);

    // An ungraded draft at the newest instant — must be filtered out entirely,
    // and its presence must not shift the graded ordering.
    await seed('D_NEWEST', NEWER_INSTANT, false);

    // Tied cluster: six graded interviews sharing the EXACT same created_at,
    // given fixed ids so the deterministic tiebreaker (id DESC) is assertable.
    await seed('G_TIE_a', TIE_INSTANT, true, '00000000-0000-4000-8000-000000000001');
    await seed('G_TIE_b', TIE_INSTANT, true, '00000000-0000-4000-8000-000000000002');
    await seed('G_TIE_c', TIE_INSTANT, true, '00000000-0000-4000-8000-000000000003');
    await seed('G_TIE_d', TIE_INSTANT, true, '00000000-0000-4000-8000-000000000004');
    await seed('G_TIE_e', TIE_INSTANT, true, '00000000-0000-4000-8000-000000000005');
    await seed('G_TIE_f', TIE_INSTANT, true, '00000000-0000-4000-8000-000000000006');

    // The strictly-NEWEST graded row, inserted LAST → must always lead recentGrades.
    await seed('G_NEWEST', NEWER_INSTANT, true, '00000000-0000-4000-8000-0000000000ff');
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  let recentGrades: RecentGrade[];

  beforeAll(async () => {
    const res = await request(app.getHttpServer())
      .get('/api/overview')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    recentGrades = (res.body.interviews as { recentGrades: RecentGrade[] }).recentGrades;
  });

  it('caps at 5 entries', () => {
    expect(recentGrades.length).toBe(5);
  });

  it('excludes ungraded drafts', () => {
    const companies = recentGrades.map((r) => r.company);
    expect(companies).not.toContain('D_NEWEST');
  });

  it('the strictly-newest graded interview always leads (DESC by created_at)', () => {
    expect(recentGrades[0].company).toBe('G_NEWEST');
  });

  it('never surfaces the strictly-oldest graded interview into the top 5', () => {
    // G_OLD is older than the whole tie cluster; with 7 graded rows it must be the
    // one dropped by the "5 most recent" cap. The bug returned it (oldest-first).
    const companies = recentGrades.map((r) => r.company);
    expect(companies).not.toContain('G_OLD');
  });

  it('tied-instant cluster is ordered deterministically by id DESC (stable)', () => {
    // After G_NEWEST, the next four are the tie cluster, highest id first.
    const companies = recentGrades.map((r) => r.company);
    expect(companies).toEqual([
      'G_NEWEST',
      'G_TIE_f',
      'G_TIE_e',
      'G_TIE_d',
      'G_TIE_c',
    ]);
  });

  it('dates are non-increasing (created_at DESC, filter did not reorder)', () => {
    for (let i = 1; i < recentGrades.length; i++) {
      expect(recentGrades[i - 1].date >= recentGrades[i].date).toBe(true);
    }
  });

  it('every entry carries company + grade + date', () => {
    for (const r of recentGrades) {
      expect(typeof r.company).toBe('string');
      expect(r.grade).toBe('A');
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
