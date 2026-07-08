/**
 * CreateOccupationWikiTables 迁移结构冒烟(不依赖运行中的 Postgres,捕获迁移发出的 SQL 做结构断言)。
 * 参照 test/announcements-migration-smoke.spec.ts 的 RecordingRunner 模式。
 *
 *  - up() 建 5 张表(occupation_slugs/occupation_entries/occupation_edges/occupation_evidence/
 *    occupation_aliases),关键列/类型/PK 断言。
 *  - entries.slug → slugs.slug、evidence.entry_slug → entries.slug 两处数据库级 FK。
 *  - edges/aliases 不带 FK(悬空引用检查交给脚本/校验器,理由见 migration 头注)。
 *  - 纯加法:不碰任何既有表(无 DROP / 无对其它表 ALTER)。
 *  - down() 逆序回滚:aliases → evidence → edges → entries → slugs。
 */
import { QueryRunner } from 'typeorm';
import { CreateOccupationWikiTables1783000000000 } from '../src/database/migrations/1783000000000-CreateOccupationWikiTables';

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

describe('CreateOccupationWikiTables1783000000000 迁移结构', () => {
  const migration = new CreateOccupationWikiTables1783000000000();

  it('类可实例化且 name 与文件时间戳一致', () => {
    expect(migration.name).toBe('CreateOccupationWikiTables1783000000000');
  });

  describe('up()', () => {
    let sql: string[];

    beforeAll(async () => {
      const rec = makeRecordingRunner();
      await migration.up(rec.runner);
      sql = rec.sql;
    });

    it('建 occupation_slugs 表,slug 为主键', () => {
      const ddl = findCreateTable(sql, 'occupation_slugs') as string;
      expect(ddl).toBeDefined();
      expect(ddl).toMatch(/"slug" character varying NOT NULL/);
      expect(ddl).toMatch(/"name" character varying NOT NULL/);
      expect(ddl).toMatch(/"l0" character varying NOT NULL/);
      expect(ddl).toMatch(/"l1_family" character varying NOT NULL/);
      expect(ddl).toMatch(/"l2_scene" character varying NOT NULL/);
      expect(ddl).toMatch(/"l3_flag" boolean NOT NULL DEFAULT false/);
      expect(ddl).toMatch(/"status" character varying NOT NULL DEFAULT 'planned'/);
      expect(ddl).toMatch(/CONSTRAINT "PK_occupation_slugs" PRIMARY KEY \("slug"\)/);
    });

    it('建 occupation_entries 表,slug 既是主键也是外键 → occupation_slugs', () => {
      const ddl = findCreateTable(sql, 'occupation_entries') as string;
      expect(ddl).toBeDefined();
      expect(ddl).toMatch(/"slug" character varying NOT NULL/);
      expect(ddl).toMatch(/"skeleton" jsonb NOT NULL/);
      expect(ddl).toMatch(/"prose" text NOT NULL/);
      expect(ddl).toMatch(/"axis" character varying NOT NULL/);
      expect(ddl).toMatch(/"status" character varying NOT NULL DEFAULT 'draft'/);
      expect(ddl).toMatch(/"cost_tokens" integer NOT NULL DEFAULT 0/);
      expect(ddl).toMatch(/"last_verified" TIMESTAMP/);
      expect(ddl).toMatch(/CONSTRAINT "PK_occupation_entries" PRIMARY KEY \("slug"\)/);
      expect(ddl).toMatch(
        /CONSTRAINT "FK_occupation_entries_slug" FOREIGN KEY \("slug"\)\s*\n\s*REFERENCES "occupation_slugs"\("slug"\) ON DELETE CASCADE/,
      );
    });

    it('建 occupation_edges 表(无 FK)+ 3 个索引(from_slug/to_slug/唯一联合)', () => {
      const ddl = findCreateTable(sql, 'occupation_edges') as string;
      expect(ddl).toBeDefined();
      expect(ddl).toMatch(/"id" uuid NOT NULL DEFAULT gen_random_uuid\(\)/);
      expect(ddl).toMatch(/"from_slug" character varying NOT NULL/);
      expect(ddl).toMatch(/"to_slug" character varying NOT NULL/);
      expect(ddl).toMatch(/"type" character varying NOT NULL/);
      expect(ddl).toMatch(/"note" text NOT NULL/);
      expect(ddl).not.toMatch(/FOREIGN KEY/);

      expect(sql.some((q) => /CREATE INDEX "IDX_occupation_edges_from_slug" ON "occupation_edges" \("from_slug"\)/.test(q))).toBe(true);
      expect(sql.some((q) => /CREATE INDEX "IDX_occupation_edges_to_slug" ON "occupation_edges" \("to_slug"\)/.test(q))).toBe(true);
      expect(
        sql.some((q) =>
          /CREATE UNIQUE INDEX "UQ_occupation_edges_from_to_type" ON "occupation_edges" \("from_slug", "to_slug", "type"\)/.test(q),
        ),
      ).toBe(true);
    });

    it('建 occupation_evidence 表,entry_slug 外键 → occupation_entries + 复合索引', () => {
      const ddl = findCreateTable(sql, 'occupation_evidence') as string;
      expect(ddl).toBeDefined();
      expect(ddl).toMatch(/"entry_slug" character varying NOT NULL/);
      expect(ddl).toMatch(/"field_path" character varying NOT NULL/);
      expect(ddl).toMatch(/"claim" text NOT NULL/);
      expect(ddl).toMatch(/"source_excerpt" text NOT NULL/);
      expect(ddl).toMatch(/"source_url" character varying NOT NULL/);
      expect(ddl).toMatch(/"tier" character varying NOT NULL/);
      expect(ddl).toMatch(/"verdict" character varying NOT NULL/);
      expect(ddl).toMatch(/"last_verified" TIMESTAMP/);
      expect(ddl).toMatch(
        /CONSTRAINT "FK_occupation_evidence_entry_slug" FOREIGN KEY \("entry_slug"\)\s*\n\s*REFERENCES "occupation_entries"\("slug"\) ON DELETE CASCADE/,
      );
      expect(
        sql.some((q) =>
          /CREATE INDEX "IDX_occupation_evidence_entry_field" ON "occupation_evidence" \("entry_slug", "field_path"\)/.test(q),
        ),
      ).toBe(true);
    });

    it('建 occupation_aliases 表(无 FK)+ slug 索引 + (alias, slug) 唯一索引', () => {
      const ddl = findCreateTable(sql, 'occupation_aliases') as string;
      expect(ddl).toBeDefined();
      expect(ddl).toMatch(/"alias" character varying NOT NULL/);
      expect(ddl).toMatch(/"slug" character varying NOT NULL/);
      expect(ddl).toMatch(/"weight" double precision NOT NULL DEFAULT 1/);
      expect(ddl).not.toMatch(/FOREIGN KEY/);

      expect(sql.some((q) => /CREATE INDEX "IDX_occupation_aliases_slug" ON "occupation_aliases" \("slug"\)/.test(q))).toBe(true);
      expect(
        sql.some((q) => /CREATE UNIQUE INDEX "UQ_occupation_aliases_alias_slug" ON "occupation_aliases" \("alias", "slug"\)/.test(q)),
      ).toBe(true);
    });

    it('纯加法:不出现 DROP,且任何 ALTER TABLE 只能作用于本迁移新建的 5 张表之一(实际本迁移不含 ALTER)', () => {
      const ownTables = new Set(['occupation_slugs', 'occupation_entries', 'occupation_edges', 'occupation_evidence', 'occupation_aliases']);
      for (const q of sql) {
        expect(/DROP TABLE/.test(q)).toBe(false);
        expect(/DROP INDEX/.test(q)).toBe(false);
        const alterMatch = q.match(/ALTER TABLE "([a-z_]+)"/);
        if (alterMatch) {
          expect(ownTables.has(alterMatch[1])).toBe(true);
        }
      }
    });
  });

  describe('down()', () => {
    let sql: string[];

    beforeAll(async () => {
      const rec = makeRecordingRunner();
      await migration.down(rec.runner);
      sql = rec.sql;
    });

    it('逆序回滚:aliases → evidence → edges → entries → slugs', () => {
      const idx = (re: RegExp) => sql.findIndex((q) => re.test(q));
      const dropAliases = idx(/DROP TABLE "occupation_aliases"/);
      const dropEvidence = idx(/DROP TABLE "occupation_evidence"/);
      const dropEdges = idx(/DROP TABLE "occupation_edges"/);
      const dropEntries = idx(/DROP TABLE "occupation_entries"/);
      const dropSlugs = idx(/DROP TABLE "occupation_slugs"/);

      expect(dropAliases).toBeGreaterThanOrEqual(0);
      expect(dropEvidence).toBeGreaterThan(dropAliases);
      expect(dropEdges).toBeGreaterThan(dropEvidence);
      expect(dropEntries).toBeGreaterThan(dropEdges);
      expect(dropSlugs).toBeGreaterThan(dropEntries);
    });

    it('每张表的索引在其表被 DROP 之前先删除', () => {
      const idx = (re: RegExp) => sql.findIndex((q) => re.test(q));
      expect(idx(/DROP INDEX "UQ_occupation_aliases_alias_slug"/)).toBeLessThan(idx(/DROP TABLE "occupation_aliases"/));
      expect(idx(/DROP INDEX "IDX_occupation_aliases_slug"/)).toBeLessThan(idx(/DROP TABLE "occupation_aliases"/));
      expect(idx(/DROP INDEX "IDX_occupation_evidence_entry_field"/)).toBeLessThan(idx(/DROP TABLE "occupation_evidence"/));
      expect(idx(/DROP INDEX "UQ_occupation_edges_from_to_type"/)).toBeLessThan(idx(/DROP TABLE "occupation_edges"/));
      expect(idx(/DROP INDEX "IDX_occupation_edges_to_slug"/)).toBeLessThan(idx(/DROP TABLE "occupation_edges"/));
      expect(idx(/DROP INDEX "IDX_occupation_edges_from_slug"/)).toBeLessThan(idx(/DROP TABLE "occupation_edges"/));
    });
  });

  it('up()/down() 表名对称:up 建的 5 张表 down 必须逐一 DROP', async () => {
    const up = makeRecordingRunner();
    await migration.up(up.runner);
    const down = makeRecordingRunner();
    await migration.down(down.runner);

    for (const table of ['occupation_slugs', 'occupation_entries', 'occupation_edges', 'occupation_evidence', 'occupation_aliases']) {
      const created = up.sql.some((q) => new RegExp(`CREATE TABLE "${table}"`).test(q));
      const dropped = down.sql.some((q) => new RegExp(`DROP TABLE "${table}"`).test(q));
      expect(created).toBe(true);
      expect(dropped).toBe(true);
    }
  });
});
