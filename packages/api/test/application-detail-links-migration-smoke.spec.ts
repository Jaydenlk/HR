/**
 * AddApplicationDetailLinks 迁移结构冒烟(不依赖运行中的 Postgres,捕获迁移发出的 SQL 做结构断言)。
 *  - up():防御性清洗(两步:①非 UUID 形态字符串置 NULL ②悬空引用置 NULL)+ 列类型转 uuid
 *    (mock_sessions/cover_letters.application_id 建表时是 character varying,与 applications.id
 *    的 uuid 类型不兼容,真机 migration:run 已实测暴露"operator does not exist: character
 *    varying = uuid",故必须先转型再加约束)+ 真外键(→ applications.id ON DELETE SET NULL)
 *    + 两个新增软引用列(applications.resume_version_id → resume_versions.id,
 *    applications.company_research_id → company_research.id,均 ON DELETE SET NULL)。
 *  - 红线断言:up() 中不出现任何把 resume_version_id/company_research_id 写死具体业务值的
 *    UPDATE(存量数据只允许被置 NULL,不允许被回填/推断出的值覆盖)。
 *  - down():逆序 DROP 约束 / 列,列类型改回 varchar。
 *
 * 真正的 migration:run 端到端已在本机 Postgres 实跑验证通过(见交付报告)。
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

  it('up() 对 mock_sessions 依次:①清洗非 UUID 形态 ②清洗悬空引用 ③转型 uuid ④ADD CONSTRAINT,顺序不能乱', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);

    const shapeCleanup = sql.find(
      (q) => /UPDATE "mock_sessions" SET "application_id" = NULL/.test(q) && /!~\*/.test(q),
    );
    expect(shapeCleanup).toBeDefined();

    const danglingCleanup = sql.find(
      (q) =>
        /UPDATE "mock_sessions" SET "application_id" = NULL/.test(q) &&
        /"application_id"::uuid NOT IN \(SELECT "id" FROM "applications"\)/.test(q),
    );
    expect(danglingCleanup).toBeDefined();

    const retype = sql.find(
      (q) =>
        /ALTER TABLE "mock_sessions" ALTER COLUMN "application_id" TYPE uuid/.test(q) &&
        /USING "application_id"::uuid/.test(q),
    );
    expect(retype).toBeDefined();

    const fk = sql.find(
      (q) =>
        /ALTER TABLE "mock_sessions" ADD CONSTRAINT "FK_mock_sessions_application"/.test(q) &&
        /FOREIGN KEY \("application_id"\) REFERENCES "applications"\("id"\)/.test(q) &&
        /ON DELETE SET NULL/.test(q),
    );
    expect(fk).toBeDefined();

    // 顺序铁律:两步清洗 → 转型 → 加约束,任一步骤提前都会在真实 Postgres 上报错。
    const idx = (s: string) => sql.indexOf(s);
    expect(idx(shapeCleanup as string)).toBeLessThan(idx(danglingCleanup as string));
    expect(idx(danglingCleanup as string)).toBeLessThan(idx(retype as string));
    expect(idx(retype as string)).toBeLessThan(idx(fk as string));
  });

  it('up() 对 cover_letters 同样先两步清洗、转型 uuid,再 ADD CONSTRAINT 真外键', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);

    const shapeCleanup = sql.find(
      (q) => /UPDATE "cover_letters" SET "application_id" = NULL/.test(q) && /!~\*/.test(q),
    );
    expect(shapeCleanup).toBeDefined();

    const danglingCleanup = sql.find(
      (q) =>
        /UPDATE "cover_letters" SET "application_id" = NULL/.test(q) &&
        /"application_id"::uuid NOT IN \(SELECT "id" FROM "applications"\)/.test(q),
    );
    expect(danglingCleanup).toBeDefined();

    const retype = sql.find(
      (q) => /ALTER TABLE "cover_letters" ALTER COLUMN "application_id" TYPE uuid/.test(q),
    );
    expect(retype).toBeDefined();

    const fk = sql.find(
      (q) =>
        /ALTER TABLE "cover_letters" ADD CONSTRAINT "FK_cover_letters_application"/.test(q) &&
        /ON DELETE SET NULL/.test(q),
    );
    expect(fk).toBeDefined();

    const idx = (s: string) => sql.indexOf(s);
    expect(idx(shapeCleanup as string)).toBeLessThan(idx(danglingCleanup as string));
    expect(idx(danglingCleanup as string)).toBeLessThan(idx(retype as string));
    expect(idx(retype as string)).toBeLessThan(idx(fk as string));
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
    expect(updates.length).toBeGreaterThan(0);
    for (const stmt of updates) {
      // 唯一允许的 UPDATE 形态:SET "application_id" = NULL(防御性清洗),不得出现任何非 NULL 赋值。
      expect(/=\s*NULL/i.test(stmt)).toBe(true);
      expect(/resume_version_id/.test(stmt)).toBe(false);
      expect(/company_research_id/.test(stmt)).toBe(false);
    }
  });

  it('down() 逆序 DROP 两个新约束 + 两个新列 + 两个 FK 约束,列类型改回 varchar,且不 DROP 其它表结构', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.down(runner);

    expect(sql.some((q) => /DROP CONSTRAINT "FK_applications_company_research"/.test(q))).toBe(true);
    expect(sql.some((q) => /DROP COLUMN "company_research_id"/.test(q))).toBe(true);
    expect(sql.some((q) => /DROP CONSTRAINT "FK_applications_resume_version"/.test(q))).toBe(true);
    expect(sql.some((q) => /DROP COLUMN "resume_version_id"/.test(q))).toBe(true);
    expect(sql.some((q) => /DROP CONSTRAINT "FK_cover_letters_application"/.test(q))).toBe(true);
    expect(sql.some((q) => /DROP CONSTRAINT "FK_mock_sessions_application"/.test(q))).toBe(true);
    expect(
      sql.some(
        (q) =>
          /ALTER TABLE "cover_letters" ALTER COLUMN "application_id" TYPE character varying/.test(q),
      ),
    ).toBe(true);
    expect(
      sql.some(
        (q) =>
          /ALTER TABLE "mock_sessions" ALTER COLUMN "application_id" TYPE character varying/.test(q),
      ),
    ).toBe(true);

    for (const q of sql) {
      expect(/CREATE TABLE|DROP TABLE/.test(q)).toBe(false);
    }
  });
});
