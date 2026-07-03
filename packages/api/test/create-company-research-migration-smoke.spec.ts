/**
 * CreateCompanyResearch 迁移结构冒烟(不依赖运行中的 Postgres,捕获迁移发出的 SQL 做结构断言)。
 *  - up() 建 company_research 表(uuid PK + canonical_name/display_name/summary/source_url/source_domain
 *    varchar NOT NULL + retrieved_at TIMESTAMP NOT NULL(无 DEFAULT，应用层每次显式赋值) + raw text 可空)。
 *  - up() 建 IDX_company_research_canonical_name 唯一索引(canonical_name)。
 *  - 纯加法:不碰现有表(无 DROP / 无对其它表 ALTER)。
 *  - down() 逆序回滚:先删索引 → 再 DROP 表。
 *
 * 真正的 migration:run 端到端已用本机 Postgres 实测通过(pnpm migration:run，见交付报告)。
 */
import { QueryRunner } from 'typeorm';
import { CreateCompanyResearch1782600000000 } from '../src/database/migrations/1782600000000-CreateCompanyResearch';

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

describe('CreateCompanyResearch1782600000000 迁移结构', () => {
  const migration = new CreateCompanyResearch1782600000000();

  it('类可实例化且 name 与文件时间戳一致', () => {
    expect(migration.name).toBe('CreateCompanyResearch1782600000000');
  });

  it('up() 建 company_research 表,列与类型齐全', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    const ddl = findCreateTable(sql, 'company_research');
    expect(ddl).toBeDefined();
    const d = ddl as string;
    expect(d).toMatch(/"id" uuid NOT NULL DEFAULT gen_random_uuid\(\)/);
    expect(d).toMatch(/"canonical_name" character varying NOT NULL/);
    expect(d).toMatch(/"display_name" character varying NOT NULL/);
    expect(d).toMatch(/"summary" character varying NOT NULL/);
    expect(d).toMatch(/"source_url" character varying NOT NULL/);
    expect(d).toMatch(/"source_domain" character varying NOT NULL/);
    // retrieved_at:非自动列，应用层每次显式赋值 new Date()，无 DEFAULT。
    expect(d).toMatch(/"retrieved_at" TIMESTAMP NOT NULL/);
    expect(d).not.toMatch(/"retrieved_at" TIMESTAMP NOT NULL DEFAULT/);
    // raw:simple-json 落 text 列，可空。
    expect(d).toMatch(/"raw" text/);
    expect(d).not.toMatch(/"raw" text NOT NULL/);
    expect(d).toMatch(/CONSTRAINT "PK_company_research" PRIMARY KEY \("id"\)/);
  });

  it('up() 建 IDX_company_research_canonical_name 唯一索引', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    expect(
      sql.some((q) =>
        /CREATE UNIQUE INDEX "IDX_company_research_canonical_name" ON "company_research" \("canonical_name"\)/.test(q),
      ),
    ).toBe(true);
  });

  it('纯加法:up() 不碰现有表(无 DROP / 无对其它表 ALTER)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    for (const q of sql) {
      expect(/DROP TABLE/.test(q)).toBe(false);
      const alterMatch = q.match(/ALTER TABLE "([a-z_]+)"/);
      if (alterMatch) expect(alterMatch[1]).toBe('company_research');
    }
  });

  it('down() 逆序回滚:先删索引 → 再 DROP 表', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.down(runner);
    const idxIdx = sql.findIndex((q) => /DROP INDEX "IDX_company_research_canonical_name"/.test(q));
    const tblIdx = sql.findIndex((q) => /DROP TABLE "company_research"/.test(q));
    expect(idxIdx).toBeGreaterThanOrEqual(0);
    expect(tblIdx).toBeGreaterThan(idxIdx);
  });

  it('up()/down() 表名对称:up 建的表 down 必删', async () => {
    const up = makeRecordingRunner();
    await migration.up(up.runner);
    const down = makeRecordingRunner();
    await migration.down(down.runner);
    const created = up.sql.some((q) => /CREATE TABLE "company_research"/.test(q));
    const dropped = down.sql.some((q) => /DROP TABLE "company_research"/.test(q));
    expect(created).toBe(true);
    expect(dropped).toBe(true);
  });
});
