/**
 * HardenOccupationGateA 迁移结构冒烟(不依赖运行中的 Postgres,捕获迁移发出的 SQL 做结构断言)。
 * 参照 test/occupation-tables-migration-smoke.spec.ts 的 RecordingRunner 模式。
 *
 * TC-04(docs/refactor2/t3-gate-a-taskcards-2026-07-10.md):门A additive 迁移——
 *  - up():occupation_slugs.l2_scene DROP NOT NULL;occupation_evidence 加 4 列
 *    (field_value_hash varchar(64) NOT NULL / span_start int NOT NULL / span_end int NOT NULL /
 *    reasoning_chain jsonb nullable)。纯加法:无 DROP TABLE/DROP COLUMN、无 DELETE。
 *  - down():先做数据安全检查(evidence 有行 或 slugs 有 NULL l2_scene 即 RAISE 拒绝),
 *    检查通过后才对称删 4 列 + l2_scene 恢复 SET NOT NULL。
 *
 * 本 spec 只做「迁移发出的 SQL 文本」结构断言(RecordingRunner 记录 query 调用,不接真实 PG);
 * 真实 PG 上的 run→revert→run 三连见交付报告(本地库操作,不写进 CI 单测)。
 */
import { QueryRunner } from 'typeorm';
import { HardenOccupationGateA1783100000000 } from '../src/database/migrations/1783100000000-HardenOccupationGateA';

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

describe('HardenOccupationGateA1783100000000 迁移结构', () => {
  const migration = new HardenOccupationGateA1783100000000();

  it('类可实例化且 name 与文件时间戳一致', () => {
    expect(migration.name).toBe('HardenOccupationGateA1783100000000');
  });

  describe('up()', () => {
    let sql: string[];

    beforeAll(async () => {
      const rec = makeRecordingRunner();
      await migration.up(rec.runner);
      sql = rec.sql;
    });

    it('occupation_slugs.l2_scene 去掉 NOT NULL(DROP NOT NULL)', () => {
      expect(
        sql.some((q) =>
          /ALTER TABLE "occupation_slugs" ALTER COLUMN "l2_scene" DROP NOT NULL/.test(q),
        ),
      ).toBe(true);
    });

    it('occupation_evidence 新增 4 列:field_value_hash/span_start/span_end 均 NOT NULL,reasoning_chain 可空', () => {
      const addColumnSql = sql.find((q) => /ALTER TABLE "occupation_evidence"[\s\S]*ADD COLUMN/.test(q));
      expect(addColumnSql).toBeDefined();
      const ddl = addColumnSql as string;
      expect(ddl).toMatch(/ADD COLUMN "field_value_hash" varchar\(64\) NOT NULL/);
      expect(ddl).toMatch(/ADD COLUMN "span_start" integer NOT NULL/);
      expect(ddl).toMatch(/ADD COLUMN "span_end" integer NOT NULL/);
      expect(ddl).toMatch(/ADD COLUMN "reasoning_chain" jsonb/);
      expect(ddl).not.toMatch(/"reasoning_chain" jsonb NOT NULL/);
    });

    it('纯加法:无 DROP TABLE / DROP COLUMN / DELETE,且不写任何假默认值回填数据', () => {
      for (const q of sql) {
        expect(/DROP TABLE/i.test(q)).toBe(false);
        expect(/DROP COLUMN/i.test(q)).toBe(false);
        expect(/DELETE FROM/i.test(q)).toBe(false);
        expect(/UPDATE\s+"?occupation_/i.test(q)).toBe(false);
      }
    });

    it('只 ALTER occupation_slugs 与 occupation_evidence 两张既有表,不新建/不动其它表', () => {
      const touchedTables = new Set<string>();
      for (const q of sql) {
        const m = q.match(/ALTER TABLE "([a-z_]+)"/);
        if (m) touchedTables.add(m[1]);
        expect(/CREATE TABLE/i.test(q)).toBe(false);
      }
      expect(touchedTables).toEqual(new Set(['occupation_slugs', 'occupation_evidence']));
    });
  });

  describe('down()', () => {
    let sql: string[];

    beforeAll(async () => {
      const rec = makeRecordingRunner();
      await migration.down(rec.runner);
      sql = rec.sql;
    });

    it('回滚前先做数据安全检查:evidence 非空 或 slugs 存在 NULL l2_scene 时 RAISE 拒绝', () => {
      const guardSql = sql.find((q) => /DO\s*\$\$/.test(q));
      expect(guardSql).toBeDefined();
      const ddl = guardSql as string;
      expect(ddl).toMatch(/SELECT COUNT\(\*\)[\s\S]*occupation_evidence/);
      expect(ddl).toMatch(/RAISE EXCEPTION/i);
      expect(ddl).toMatch(/l2_scene[\s\S]*IS NULL/);
    });

    it('数据安全检查先于任何 ALTER/DROP COLUMN 执行', () => {
      const guardIdx = sql.findIndex((q) => /DO\s*\$\$/.test(q));
      const firstAlterIdx = sql.findIndex((q) => /ALTER TABLE/.test(q));
      expect(guardIdx).toBeGreaterThanOrEqual(0);
      expect(firstAlterIdx).toBeGreaterThan(guardIdx);
    });

    it('通过检查后对称删除本迁移新增的 4 列', () => {
      const dropColumnSql = sql.find((q) => /ALTER TABLE "occupation_evidence"[\s\S]*DROP COLUMN/.test(q));
      expect(dropColumnSql).toBeDefined();
      const ddl = dropColumnSql as string;
      expect(ddl).toMatch(/DROP COLUMN "field_value_hash"/);
      expect(ddl).toMatch(/DROP COLUMN "span_start"/);
      expect(ddl).toMatch(/DROP COLUMN "span_end"/);
      expect(ddl).toMatch(/DROP COLUMN "reasoning_chain"/);
    });

    it('恢复 occupation_slugs.l2_scene SET NOT NULL', () => {
      expect(
        sql.some((q) =>
          /ALTER TABLE "occupation_slugs" ALTER COLUMN "l2_scene" SET NOT NULL/.test(q),
        ),
      ).toBe(true);
    });

    it('down 只动本迁移新增的 4 列 + l2_scene,不 DROP TABLE、不清洗数据为空串求回滚', () => {
      for (const q of sql) {
        expect(/DROP TABLE/i.test(q)).toBe(false);
        expect(/UPDATE\s+"?occupation_evidence"?\s+SET/i.test(q)).toBe(false);
        expect(/UPDATE\s+"?occupation_slugs"?\s+SET/i.test(q)).toBe(false);
      }
      const dropColumnSql = sql.find((q) => /DROP COLUMN "field_value_hash"/.test(q)) as string;
      expect(dropColumnSql).not.toMatch(/DROP COLUMN "id"|DROP COLUMN "claim"|DROP COLUMN "entry_slug"/);
    });
  });

  it('up()/down() 对称:up 加的 4 列 down 必须逐一 DROP,l2_scene 状态互逆', async () => {
    const up = makeRecordingRunner();
    await migration.up(up.runner);
    const down = makeRecordingRunner();
    await migration.down(down.runner);

    for (const col of ['field_value_hash', 'span_start', 'span_end', 'reasoning_chain']) {
      const added = up.sql.some((q) => new RegExp(`ADD COLUMN "${col}"`).test(q));
      const dropped = down.sql.some((q) => new RegExp(`DROP COLUMN "${col}"`).test(q));
      expect(added).toBe(true);
      expect(dropped).toBe(true);
    }

    expect(up.sql.some((q) => /ALTER COLUMN "l2_scene" DROP NOT NULL/.test(q))).toBe(true);
    expect(down.sql.some((q) => /ALTER COLUMN "l2_scene" SET NOT NULL/.test(q))).toBe(true);
  });
});
