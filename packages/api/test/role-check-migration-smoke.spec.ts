/**
 * AddRoleCheckConstraint 迁移结构冒烟(不依赖运行中的 Postgres,捕获迁移发出的 SQL 做结构断言)。
 *  - up() 对 users 表 ADD CONSTRAINT "check_user_role" CHECK (role IN ('user', 'admin'))。
 *  - 纯加法:不 CREATE/DROP TABLE、不 DROP CONSTRAINT,且只 ALTER users(不碰其它表)。
 *  - down() 发出 DROP CONSTRAINT "check_user_role",且只 ALTER users。
 *
 * 真正的 migration:run 端到端需 Postgres(本机无实例),口径与 transcribe-meta-migration-smoke.spec.ts 一致(SKIPPED 真跑)。
 */
import { QueryRunner } from 'typeorm';
import { AddRoleCheckConstraint1782000000000 } from '../src/database/migrations/1782000000000-AddRoleCheckConstraint';

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

const TABLE = 'users';

describe('AddRoleCheckConstraint1782000000000 迁移结构', () => {
  const migration = new AddRoleCheckConstraint1782000000000();

  it('类可实例化且 name 与文件时间戳一致', () => {
    expect(migration.name).toBe('AddRoleCheckConstraint1782000000000');
  });

  it('up() 对 users 发出 ADD CONSTRAINT check_user_role,含 CHECK (role IN (...))', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);

    const stmt = sql.find(
      (q) =>
        /ADD CONSTRAINT "check_user_role"/.test(q) &&
        /CHECK \(role IN \('user', 'admin'\)\)/.test(q),
    );
    expect(stmt).toBeDefined();
    // 只 ALTER users 表。
    expect(/ALTER TABLE "users"/.test(stmt as string)).toBe(true);
  });

  it('纯加法:up() 不 CREATE/DROP TABLE、不 DROP CONSTRAINT,且只 ALTER users(不碰其它表)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    for (const q of sql) {
      expect(/CREATE TABLE/.test(q)).toBe(false);
      expect(/DROP TABLE/.test(q)).toBe(false);
      expect(/DROP CONSTRAINT/.test(q)).toBe(false);
      const alterMatch = q.match(/ALTER TABLE "([a-z_]+)"/);
      if (alterMatch) {
        expect(alterMatch[1]).toBe(TABLE);
      }
    }
  });

  it('down() 对 users 发出 DROP CONSTRAINT check_user_role(只动 users 表)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.down(runner);

    const stmt = sql.find((q) =>
      /DROP CONSTRAINT "check_user_role"/.test(q),
    );
    expect(stmt).toBeDefined();
    expect(/ALTER TABLE "users"/.test(stmt as string)).toBe(true);

    for (const q of sql) {
      const alterMatch = q.match(/ALTER TABLE "([a-z_]+)"/);
      if (alterMatch) {
        expect(alterMatch[1]).toBe(TABLE);
      }
    }
  });
});
