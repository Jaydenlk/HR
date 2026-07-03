/**
 * AddDiagnosisRunningIndex 迁移结构冒烟(不依赖运行中的 Postgres,捕获迁移发出的 SQL 做结构断言)。
 *  - up() 对 diagnoses 建【一条】(user_id, status) 复合索引(CREATE INDEX);无列/表变更。
 *  - 纯加法:不 CREATE/DROP TABLE、不 ALTER TABLE、不 ADD/DROP COLUMN(running 只是既有 status 列的新枚举值)。
 *  - down() 回滚:DROP 同名索引。
 *  - up/down 索引名对称:up CREATE 的索引名 down 必 DROP。
 *
 * 真正的 migration:run 端到端需 Postgres(本机无实例),口径与既有 migration-smoke 一致(SKIPPED 真跑)。
 */
import { QueryRunner } from 'typeorm';
import { AddDiagnosisRunningIndex1782500000000 } from '../src/database/migrations/1782500000000-AddDiagnosisRunningIndex';

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
const INDEX = 'IDX_diagnoses_user_status';

describe('AddDiagnosisRunningIndex1782500000000 迁移结构', () => {
  const migration = new AddDiagnosisRunningIndex1782500000000();

  it('类可实例化且 name 与文件时间戳一致', () => {
    expect(migration.name).toBe('AddDiagnosisRunningIndex1782500000000');
  });

  it('up() 对 diagnoses 建一条 (user_id, status) 复合索引', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);

    const createStmt = sql.find(
      (q) =>
        new RegExp(`CREATE INDEX (IF NOT EXISTS )?"${INDEX}"`).test(q) &&
        new RegExp(`ON "${TABLE}"`).test(q),
    );
    expect(createStmt).toBeDefined();
    // 复合列顺序:user_id 在前(高选择性)、status 在后。
    expect(/"user_id",\s*"status"/.test(createStmt as string)).toBe(true);
    // 恰一条 CREATE INDEX。
    expect(sql.filter((q) => /CREATE INDEX/.test(q)).length).toBe(1);
  });

  it('纯加法:up() 不 CREATE/DROP TABLE、不 ALTER TABLE、不 ADD/DROP COLUMN', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    for (const q of sql) {
      expect(/CREATE TABLE/.test(q)).toBe(false);
      expect(/DROP TABLE/.test(q)).toBe(false);
      expect(/ALTER TABLE/.test(q)).toBe(false);
      expect(/ADD COLUMN/.test(q)).toBe(false);
      expect(/DROP COLUMN/.test(q)).toBe(false);
    }
  });

  it('down() 回滚:DROP 同名索引', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.down(runner);
    const dropStmt = sql.find((q) => new RegExp(`DROP INDEX (IF EXISTS )?"${INDEX}"`).test(q));
    expect(dropStmt).toBeDefined();
    // down 不碰表/列/数据。
    for (const q of sql) {
      expect(/DROP TABLE/.test(q)).toBe(false);
      expect(/DROP COLUMN/.test(q)).toBe(false);
      expect(/DELETE|UPDATE/.test(q)).toBe(false);
    }
  });

  it('up/down 索引名对称:up CREATE 的索引 down 必 DROP', async () => {
    const up = makeRecordingRunner();
    await migration.up(up.runner);
    const down = makeRecordingRunner();
    await migration.down(down.runner);

    const created = up.sql.some((q) => new RegExp(`CREATE INDEX (IF NOT EXISTS )?"${INDEX}"`).test(q));
    const dropped = down.sql.some((q) => new RegExp(`DROP INDEX (IF EXISTS )?"${INDEX}"`).test(q));
    expect(created).toBe(true);
    expect(dropped).toBe(true);
  });
});
