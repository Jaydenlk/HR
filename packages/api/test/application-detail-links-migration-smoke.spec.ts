/**
 * AddApplicationDetailLinks 迁移结构冒烟(不依赖运行中的 Postgres,捕获迁移发出的 SQL 做结构断言)。
 *  - up():防御性清洗(UPDATE ... SET application_id = NULL WHERE NOT IN)+ 真外键
 *    (mock_sessions/cover_letters.application_id → applications.id ON DELETE SET NULL)
 *    + 两个新增软引用列(applications.resume_version_id → resume_versions.id,
 *    applications.company_research_id → company_research.id,均 ON DELETE SET NULL)。
 *  - 红线断言:up() 中不出现任何把 resume_version_id/company_research_id 写死具体业务值的
 *    UPDATE(存量数据只允许被置 NULL,不允许被回填/推断出的值覆盖)。
 *  - down():逆序 DROP 约束 / 列。
 *
 * 真正的 migration:run 端到端需 Postgres(本机无实例),口径与其它 *-migration-smoke.spec.ts 一致。
 */
import { QueryRunner } from 'typeorm';
import { AddApplicationDetailLinks1782700000000 } from '../src/database/migrations/1782700000000-AddApplicationDetailLinks';

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

describe('AddApplicationDetailLinks1782700000000 迁移结构', () => {
  const migration = new AddApplicationDetailLinks1782700000000();

  it('类可实例化且 name 与文件时间戳一致', () => {
    expect(migration.name).toBe('AddApplicationDetailLinks1782700000000');
  });

  it('up() 对 mock_sessions 先防御性清洗脏外键再 ADD CONSTRAINT 真外键(ON DELETE SET NULL)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);

    const cleanup = sql.find(
      (q) =>
        /UPDATE "mock_sessions" SET "application_id" = NULL/.test(q) &&
        /NOT IN \(SELECT "id" FROM "applications"\)/.test(q),
    );
    expect(cleanup).toBeDefined();

    const fk = sql.find(
      (q) =>
        /ALTER TABLE "mock_sessions" ADD CONSTRAINT "FK_mock_sessions_application"/.test(q) &&
        /FOREIGN KEY \("application_id"\) REFERENCES "applications"\("id"\)/.test(q) &&
        /ON DELETE SET NULL/.test(q),
    );
    expect(fk).toBeDefined();

    // 清洗必须先于加约束(否则存量脏值会导致 ADD CONSTRAINT 失败)。
    expect(sql.indexOf(cleanup as string)).toBeLessThan(sql.indexOf(fk as string));
  });

  it('up() 对 cover_letters 同样先清洗再 ADD CONSTRAINT 真外键', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);

    const cleanup = sql.find(
      (q) =>
        /UPDATE "cover_letters" SET "application_id" = NULL/.test(q) &&
        /NOT IN \(SELECT "id" FROM "applications"\)/.test(q),
    );
    expect(cleanup).toBeDefined();

    const fk = sql.find(
      (q) =>
        /ALTER TABLE "cover_letters" ADD CONSTRAINT "FK_cover_letters_application"/.test(q) &&
        /ON DELETE SET NULL/.test(q),
    );
    expect(fk).toBeDefined();
    expect(sql.indexOf(cleanup as string)).toBeLessThan(sql.indexOf(fk as string));
  });

  it('up() 对 applications 新增 resume_version_id 列 + 真外键指向 resume_versions', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);

    const addColumn = sql.find((q) => /ALTER TABLE "applications" ADD "resume_version_id" uuid/.test(q));
    expect(addColumn).toBeDefined();

    const fk = sql.find(
      (q) =>
        /ALTER TABLE "applications" ADD CONSTRAINT "FK_applications_resume_version"/.test(q) &&
        /REFERENCES "resume_versions"\("id"\)/.test(q) &&
        /ON DELETE SET NULL/.test(q),
    );
    expect(fk).toBeDefined();
  });

  it('up() 对 applications 新增 company_research_id 列 + 真外键指向 company_research', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);

    const addColumn = sql.find((q) => /ALTER TABLE "applications" ADD "company_research_id" uuid/.test(q));
    expect(addColumn).toBeDefined();

    const fk = sql.find(
      (q) =>
        /ALTER TABLE "applications" ADD CONSTRAINT "FK_applications_company_research"/.test(q) &&
        /REFERENCES "company_research"\("id"\)/.test(q) &&
        /ON DELETE SET NULL/.test(q),
    );
    expect(fk).toBeDefined();
  });

  it('红线:up() 不含任何把新列/清洗列写死具体业务值的 UPDATE(存量数据不回填不清洗,只允许置 NULL)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);

    const updates = sql.filter((q) => /^\s*UPDATE/i.test(q.trim()));
    for (const stmt of updates) {
      // 唯一允许的 UPDATE 形态:SET "application_id" = NULL(防御性清洗),不得出现任何非 NULL 赋值。
      expect(/=\s*NULL/i.test(stmt)).toBe(true);
      expect(/resume_version_id/.test(stmt)).toBe(false);
      expect(/company_research_id/.test(stmt)).toBe(false);
    }
  });

  it('down() 逆序 DROP 两个新约束 + 两个新列,且不 DROP 其它表结构', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.down(runner);

    expect(sql.some((q) => /DROP CONSTRAINT "FK_applications_company_research"/.test(q))).toBe(true);
    expect(sql.some((q) => /DROP COLUMN "company_research_id"/.test(q))).toBe(true);
    expect(sql.some((q) => /DROP CONSTRAINT "FK_applications_resume_version"/.test(q))).toBe(true);
    expect(sql.some((q) => /DROP COLUMN "resume_version_id"/.test(q))).toBe(true);
    expect(sql.some((q) => /DROP CONSTRAINT "FK_cover_letters_application"/.test(q))).toBe(true);
    expect(sql.some((q) => /DROP CONSTRAINT "FK_mock_sessions_application"/.test(q))).toBe(true);

    for (const q of sql) {
      expect(/CREATE TABLE|DROP TABLE/.test(q)).toBe(false);
    }
  });
});
