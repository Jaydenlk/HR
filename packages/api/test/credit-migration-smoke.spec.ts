/**
 * AddCreditSystem 迁移结构冒烟(不依赖运行中的 Postgres,捕获迁移 SQL 做结构断言)。
 *  - up() 加 users.credit_balance(integer NOT NULL DEFAULT 0)。
 *  - up() 建 credit_transactions 表 + (user_id, created_at) 索引。
 *  - up() 给存量用户 +50 并逐人插 signup_grant 流水,balance_after 取自当前 users.credit_balance。
 *  - down() 逆序回滚(删索引 → 删表 → 删列)。
 *
 * 真正的 migration:run + 存量回填端到端校验需 Postgres(本机无实例);回填数据自洽性
 * 由 credit-migration-backfill.spec.ts 用 sqlite 跑等价 SQL 验证(贴 balance_after 输出)。
 */
import { QueryRunner } from 'typeorm';
import { AddCreditSystem1781278692997 } from '../src/database/migrations/1781278692997-AddCreditSystem';

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

describe('AddCreditSystem1781278692997 迁移结构', () => {
  const migration = new AddCreditSystem1781278692997();

  it('类可实例化且 name 与文件时间戳一致', () => {
    expect(migration.name).toBe('AddCreditSystem1781278692997');
  });

  it('up() 给 users 加 credit_balance(integer NOT NULL DEFAULT 0)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    expect(
      sql.some((q) =>
        /ALTER TABLE "users" ADD "credit_balance" integer NOT NULL DEFAULT 0/.test(q),
      ),
    ).toBe(true);
  });

  it('up() 建 credit_transactions 表,列与类型齐全', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    const ddl = sql.find((q) => /CREATE TABLE "credit_transactions"\s*\(/.test(q));
    expect(ddl).toBeDefined();
    const d = ddl as string;
    expect(d).toMatch(/"id" uuid NOT NULL DEFAULT gen_random_uuid\(\)/);
    expect(d).toMatch(/"user_id" uuid NOT NULL/);
    expect(d).toMatch(/"delta" integer NOT NULL/);
    expect(d).toMatch(/"type" character varying NOT NULL/);
    expect(d).toMatch(/"balance_after" integer NOT NULL/);
    expect(d).toMatch(/"note" character varying(?!\s+NOT NULL)/);
    expect(d).toMatch(/"created_by" uuid(?!\s+NOT NULL)/);
    expect(d).toMatch(/"endpoint" character varying(?!\s+NOT NULL)/);
    expect(d).toMatch(/"created_at" TIMESTAMP NOT NULL DEFAULT now\(\)/);
    expect(d).toMatch(/CONSTRAINT "PK_credit_transactions" PRIMARY KEY \("id"\)/);
  });

  it('up() 建 (user_id, created_at) 复合索引', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    expect(
      sql.some((q) =>
        /CREATE INDEX "IDX_credit_transactions_user_id_created_at" ON "credit_transactions" \("user_id", "created_at"\)/.test(
          q,
        ),
      ),
    ).toBe(true);
  });

  it('up() 给存量用户 +50 并逐人插 signup_grant 流水(balance_after 取当前余额)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    expect(
      sql.some((q) => /UPDATE "users" SET "credit_balance" = "credit_balance" \+ 50/.test(q)),
    ).toBe(true);
    const insert = sql.find((q) =>
      /INSERT INTO "credit_transactions"[\s\S]*SELECT[\s\S]*FROM "users"/.test(q),
    );
    expect(insert).toBeDefined();
    const i = insert as string;
    expect(i).toMatch(/50, 'signup_grant', "credit_balance"/);
    // 顺序铁律:先 +50 再插流水(否则 balance_after 会少 50)。
    const updateIdx = sql.findIndex((q) => /SET "credit_balance" = "credit_balance" \+ 50/.test(q));
    const insertIdx = sql.findIndex((q) => /INSERT INTO "credit_transactions"/.test(q));
    expect(updateIdx).toBeGreaterThanOrEqual(0);
    expect(insertIdx).toBeGreaterThan(updateIdx);
  });

  it('down() 逆序回滚:删索引 → 删表 → 删列', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.down(runner);
    const dropIndex = sql.findIndex((q) => /DROP INDEX "IDX_credit_transactions_user_id_created_at"/.test(q));
    const dropTable = sql.findIndex((q) => /DROP TABLE "credit_transactions"/.test(q));
    const dropColumn = sql.findIndex((q) => /ALTER TABLE "users" DROP COLUMN "credit_balance"/.test(q));
    expect(dropIndex).toBeGreaterThanOrEqual(0);
    expect(dropTable).toBeGreaterThan(dropIndex);
    expect(dropColumn).toBeGreaterThan(dropTable);
  });
});
