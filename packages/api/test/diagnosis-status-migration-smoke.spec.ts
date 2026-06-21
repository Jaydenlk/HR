/**
 * AddDiagnosisStatus 迁移结构冒烟(不依赖运行中的 Postgres,捕获迁移发出的 SQL 做结构断言)。
 *  - up() 对 diagnoses 发出 3 条 ADD COLUMN(status varchar / failure_reason varchar /
 *    pipeline_error_message text),全可空(无 NOT NULL / 无 DEFAULT)。
 *  - 纯加法:不 CREATE/DROP TABLE,不 ALTER 任何其它表(只动 diagnoses)。
 *  - down() 逆序回滚:3 条 DROP COLUMN,顺序与 up 的 ADD 相反。
 *  - up/down 列对称:up ADD 的每列 down 必 DROP。
 *
 * 真正的 migration:run 端到端需 Postgres(本机无实例),口径与 migration-smoke.spec.ts 头注一致(SKIPPED 真跑)。
 */
import { QueryRunner } from 'typeorm';
import { AddDiagnosisStatus1782100000000 } from '../src/database/migrations/1782100000000-AddDiagnosisStatus';

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

const TABLE = 'diagnoses';
const ADDED_COLUMNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['status', /"status" character varying/],
  ['failure_reason', /"failure_reason" character varying/],
  ['pipeline_error_message', /"pipeline_error_message" text/],
];

describe('AddDiagnosisStatus1782100000000 迁移结构', () => {
  const migration = new AddDiagnosisStatus1782100000000();

  it('类可实例化且 name 与文件时间戳一致', () => {
    expect(migration.name).toBe('AddDiagnosisStatus1782100000000');
  });

  it('up() 对 diagnoses 发出 3 条 ADD COLUMN,列与类型齐全(全可空)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);

    for (const [col, typePattern] of ADDED_COLUMNS) {
      const stmt = sql.find(
        (q) =>
          new RegExp(`ALTER TABLE "${TABLE}" ADD COLUMN "${col}"`).test(q) &&
          typePattern.test(q),
      );
      expect(stmt).toBeDefined();
      // 可空:不得带 NOT NULL,也不得带 DEFAULT(存量行回填后即 NULL)。
      expect(/NOT NULL/.test(stmt as string)).toBe(false);
      expect(/DEFAULT/.test(stmt as string)).toBe(false);
    }
    const addCount = sql.filter((q) => /ADD COLUMN/.test(q)).length;
    expect(addCount).toBe(3);
  });

  it('纯加法:up() 不 CREATE/DROP TABLE,且只 ALTER diagnoses(不碰其它表)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    for (const q of sql) {
      expect(/CREATE TABLE/.test(q)).toBe(false);
      expect(/DROP TABLE/.test(q)).toBe(false);
      const alterMatch = q.match(/ALTER TABLE "([a-z_]+)"/);
      if (alterMatch) {
        expect(alterMatch[1]).toBe(TABLE);
      }
    }
  });

  it('down() 逆序回滚:3 条 DROP COLUMN,顺序与 up 的 ADD 相反', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.down(runner);

    const dropOrder = sql
      .map((q) => q.match(/DROP COLUMN "([a-z_]+)"/)?.[1])
      .filter((c): c is string => Boolean(c));
    expect(dropOrder).toEqual(['pipeline_error_message', 'failure_reason', 'status']);
  });

  it('up/down 列对称:up ADD 的每列 down 必 DROP', async () => {
    const up = makeRecordingRunner();
    await migration.up(up.runner);
    const down = makeRecordingRunner();
    await migration.down(down.runner);

    for (const [col] of ADDED_COLUMNS) {
      const added = up.sql.some((q) => new RegExp(`ADD COLUMN "${col}"`).test(q));
      const dropped = down.sql.some((q) => new RegExp(`DROP COLUMN "${col}"`).test(q));
      expect(added).toBe(true);
      expect(dropped).toBe(true);
    }
  });
});
