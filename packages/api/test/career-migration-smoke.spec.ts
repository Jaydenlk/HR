/**
 * AddCareerTrust 迁移结构冒烟(不依赖运行中的 Postgres,捕获迁移 SQL 做结构断言)。
 *  - up() 建 career_analysis 表(uuid PK + user_id uuid + result_json text + created_at)
 *    + (user_id, created_at) 索引 + FK user_id→users CASCADE。
 *  - up() 建 user_skill_self_assessment 表(uuid PK + user_id uuid + skill_name + self_score integer)
 *    + UNIQUE (user_id, skill_name) + FK user_id→users CASCADE。
 *  - 两表均纯加法,不碰现有表(只发 CREATE/ALTER ADD,无 DROP/ALTER 现有表)。
 *  - down() 逆序回滚(撤 FK → 删索引 → 删表)。
 *
 * 真正的 migration:run 端到端需 Postgres(本机无实例)。
 */
import { QueryRunner } from 'typeorm';
import { AddCareerTrust1781331026533 } from '../src/database/migrations/1781331026533-AddCareerTrust';

type RecordingRunner = Pick<QueryRunner, 'query'>;

function makeRecordingRunner(): { runner: QueryRunner; sql: string[] } {
  const sql: string[] = [];
  const recording: RecordingRunner = {
    query: (q: string): Promise<unknown> => {
      sql.push(q);
      return Promise.resolve(undefined);
    },
  };
  return { runner: recording as QueryRunner, sql };
}

function findCreateTable(sql: string[], table: string): string | undefined {
  return sql.find((q) => new RegExp(`CREATE TABLE "${table}"\\s*\\(`).test(q));
}

describe('AddCareerTrust1781331026533 迁移结构', () => {
  const migration = new AddCareerTrust1781331026533();

  it('类可实例化且 name 与文件时间戳一致', () => {
    expect(migration.name).toBe('AddCareerTrust1781331026533');
  });

  it('up() 建 career_analysis 表,列与类型齐全', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    const ddl = findCreateTable(sql, 'career_analysis');
    expect(ddl).toBeDefined();
    const d = ddl as string;
    expect(d).toMatch(/"id" uuid NOT NULL DEFAULT gen_random_uuid\(\)/);
    expect(d).toMatch(/"user_id" uuid NOT NULL/);
    expect(d).toMatch(/"result_json" text NOT NULL/);
    expect(d).toMatch(/"created_at" TIMESTAMP NOT NULL DEFAULT now\(\)/);
    expect(d).toMatch(/CONSTRAINT "PK_career_analysis" PRIMARY KEY \("id"\)/);
  });

  it('up() 建 career_analysis (user_id, created_at) 索引', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    expect(
      sql.some((q) =>
        /CREATE INDEX "IDX_career_analysis_user_id_created_at" ON "career_analysis" \("user_id", "created_at"\)/.test(q),
      ),
    ).toBe(true);
  });

  it('up() career_analysis FK user_id→users CASCADE', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    const joined = sql.join('\n');
    expect(joined).toMatch(/FK_career_analysis_user_id[\s\S]*?REFERENCES "users"\("id"\) ON DELETE CASCADE/);
  });

  it('up() 建 user_skill_self_assessment 表,列与类型齐全', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    const ddl = findCreateTable(sql, 'user_skill_self_assessment');
    expect(ddl).toBeDefined();
    const d = ddl as string;
    expect(d).toMatch(/"id" uuid NOT NULL DEFAULT gen_random_uuid\(\)/);
    expect(d).toMatch(/"user_id" uuid NOT NULL/);
    expect(d).toMatch(/"skill_name" character varying NOT NULL/);
    expect(d).toMatch(/"self_score" integer NOT NULL/);
    expect(d).toMatch(/"updated_at" TIMESTAMP NOT NULL DEFAULT now\(\)/);
    expect(d).toMatch(/CONSTRAINT "PK_user_skill_self_assessment" PRIMARY KEY \("id"\)/);
  });

  it('up() 建 user_skill_self_assessment UNIQUE (user_id, skill_name)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    expect(
      sql.some((q) =>
        /CREATE UNIQUE INDEX "UQ_user_skill_self_assessment" ON "user_skill_self_assessment" \("user_id", "skill_name"\)/.test(q),
      ),
    ).toBe(true);
  });

  it('up() self_assessment FK user_id→users CASCADE', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    const joined = sql.join('\n');
    expect(joined).toMatch(/FK_user_skill_self_assessment_user_id[\s\S]*?REFERENCES "users"\("id"\) ON DELETE CASCADE/);
  });

  it('纯加法:up() 不碰现有表(无 DROP / 无对现有表 ALTER ADD COLUMN)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    for (const q of sql) {
      expect(/DROP TABLE/.test(q)).toBe(false);
      // 仅允许对本批两张新表做 ALTER(加 FK);不得 ALTER 任何现有表。
      const alterMatch = q.match(/ALTER TABLE "([a-z_]+)"/);
      if (alterMatch) {
        expect(['career_analysis', 'user_skill_self_assessment']).toContain(alterMatch[1]);
      }
    }
  });

  it('down() 逆序回滚:两表均先撤 FK → 删索引 → 删表', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.down(runner);
    // career_analysis
    const caFk = sql.findIndex((q) => /career_analysis" DROP CONSTRAINT "FK_career_analysis_user_id/.test(q));
    const caIdx = sql.findIndex((q) => /DROP INDEX "IDX_career_analysis_user_id_created_at"/.test(q));
    const caTbl = sql.findIndex((q) => /DROP TABLE "career_analysis"/.test(q));
    expect(caFk).toBeGreaterThanOrEqual(0);
    expect(caIdx).toBeGreaterThan(caFk);
    expect(caTbl).toBeGreaterThan(caIdx);
    // user_skill_self_assessment
    const saFk = sql.findIndex((q) => /user_skill_self_assessment" DROP CONSTRAINT "FK_user_skill_self_assessment_user_id/.test(q));
    const saIdx = sql.findIndex((q) => /DROP INDEX "UQ_user_skill_self_assessment"/.test(q));
    const saTbl = sql.findIndex((q) => /DROP TABLE "user_skill_self_assessment"/.test(q));
    expect(saFk).toBeGreaterThanOrEqual(0);
    expect(saIdx).toBeGreaterThan(saFk);
    expect(saTbl).toBeGreaterThan(saIdx);
  });
});
