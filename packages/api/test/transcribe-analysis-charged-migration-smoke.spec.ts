/**
 * AddTranscribeTaskAnalysisCharged 迁移结构冒烟(不依赖运行中的 Postgres,捕获迁移发出的 SQL 做结构断言)。
 *  - up() 对 interview_transcribe_tasks 发出 1 条 ADD COLUMN "analysis_charged" boolean NOT NULL DEFAULT false。
 *  - 纯加法:不 CREATE/DROP TABLE,不 ALTER 任何其它表(只动 interview_transcribe_tasks)。
 *  - down() 逆序回滚:1 条 DROP COLUMN "analysis_charged"。
 *  - up/down 对称:up ADD 的列 down 必 DROP。
 *
 * 照搬 transcribe-meta-migration-smoke.spec.ts 的 recording-runner 模式,不依赖 Postgres。
 */
import { QueryRunner } from 'typeorm';
import { AddTranscribeTaskAnalysisCharged1782200000000 } from '../src/database/migrations/1782200000000-AddTranscribeTaskAnalysisCharged';

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

const TABLE = 'interview_transcribe_tasks';
const COLUMN = 'analysis_charged';

describe('AddTranscribeTaskAnalysisCharged1782200000000 迁移结构', () => {
  const migration = new AddTranscribeTaskAnalysisCharged1782200000000();

  it('类可实例化且 name 与文件时间戳一致', () => {
    expect(migration.name).toBe('AddTranscribeTaskAnalysisCharged1782200000000');
  });

  it('up() 对 interview_transcribe_tasks 发出 ADD COLUMN "analysis_charged" boolean NOT NULL DEFAULT false', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);

    // 恰 1 条 ADD COLUMN
    const addStmts = sql.filter((q) => /ADD COLUMN/.test(q));
    expect(addStmts).toHaveLength(1);

    const stmt = addStmts[0];
    // 目标表
    expect(new RegExp(`ALTER TABLE "${TABLE}"`).test(stmt)).toBe(true);
    // 列名
    expect(new RegExp(`ADD COLUMN "${COLUMN}"`).test(stmt)).toBe(true);
    // 类型
    expect(/boolean/.test(stmt)).toBe(true);
    // NOT NULL + DEFAULT false
    expect(/NOT NULL/.test(stmt)).toBe(true);
    expect(/DEFAULT false/.test(stmt)).toBe(true);
  });

  it('纯加法:up() 不 CREATE/DROP TABLE,且只 ALTER interview_transcribe_tasks(不碰其它表)', async () => {
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

  it('down() 发出 DROP COLUMN "analysis_charged"', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.down(runner);

    const dropStmts = sql.filter((q) => /DROP COLUMN/.test(q));
    expect(dropStmts).toHaveLength(1);

    const stmt = dropStmts[0];
    expect(new RegExp(`ALTER TABLE "${TABLE}"`).test(stmt)).toBe(true);
    expect(new RegExp(`DROP COLUMN "${COLUMN}"`).test(stmt)).toBe(true);
  });

  it('up/down 对称:up ADD 的列 down 必 DROP', async () => {
    const up = makeRecordingRunner();
    await migration.up(up.runner);
    const down = makeRecordingRunner();
    await migration.down(down.runner);

    const added = up.sql.some((q) => new RegExp(`ADD COLUMN "${COLUMN}"`).test(q));
    const dropped = down.sql.some((q) => new RegExp(`DROP COLUMN "${COLUMN}"`).test(q));
    expect(added).toBe(true);
    expect(dropped).toBe(true);
  });
});
