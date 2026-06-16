/**
 * AddAiProviderSettings 迁移结构冒烟(不依赖运行中的 Postgres,捕获迁移 SQL 做结构断言)。
 *  - up() 建 ai_provider_settings 表:id(uuid PK gen_random_uuid)、"primary"(varchar NOT NULL)、
 *    "order"(text NOT NULL)、updated_by(uuid 可空)、updated_at(timestamp NOT NULL DEFAULT now())。
 *  - 不 seed 初始行(service 无记录回退 env)。
 *  - down() DROP TABLE。
 *
 * 真正的 migration:run 端到端需 Postgres(本机无实例);SQLite(dev/test)由 synchronize 自动建表。
 */
import { QueryRunner } from 'typeorm';
import { AddAiProviderSettings1781450000000 } from '../src/database/migrations/1781450000000-AddAiProviderSettings';

function makeRecordingRunner(): { runner: QueryRunner; sql: string[] } {
  const sql: string[] = [];
  const recording: Pick<QueryRunner, 'query'> = {
    query: (q: string): Promise<unknown> => {
      sql.push(q);
      return Promise.resolve(undefined);
    },
  };
  return { runner: recording as QueryRunner, sql };
}

describe('AddAiProviderSettings1781450000000 迁移结构', () => {
  const migration = new AddAiProviderSettings1781450000000();

  it('类可实例化且 name 与文件时间戳一致', () => {
    expect(migration.name).toBe('AddAiProviderSettings1781450000000');
  });

  it('up() 建表含 uuid PK / "primary" / "order" / updated_by / updated_at', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    const create = sql.find((q) => /CREATE TABLE "ai_provider_settings"/.test(q));
    expect(create).toBeDefined();
    expect(create).toMatch(/"id" uuid NOT NULL DEFAULT gen_random_uuid\(\)/);
    expect(create).toMatch(/"primary" character varying NOT NULL/);
    expect(create).toMatch(/"order" text NOT NULL/);
    expect(create).toMatch(/"updated_by" uuid/);
    expect(create).toMatch(/"updated_at" TIMESTAMP NOT NULL DEFAULT now\(\)/);
    expect(create).toMatch(/CONSTRAINT "PK_ai_provider_settings" PRIMARY KEY \("id"\)/);
  });

  it('up() 不写入任何初始行(无记录回退 env)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    expect(sql.some((q) => /INSERT INTO "ai_provider_settings"/.test(q))).toBe(false);
  });

  it('down() DROP TABLE', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.down(runner);
    expect(sql.some((q) => /DROP TABLE "ai_provider_settings"/.test(q))).toBe(true);
  });
});
