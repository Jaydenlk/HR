/**
 * AddAiProviders 迁移结构冒烟(不依赖运行中的 Postgres,捕获迁移 SQL 做结构断言)。
 *  - up() 建 ai_providers 表:id(uuid PK gen_random_uuid)、name(varchar UNIQUE)、protocol、
 *    base_url、api_key_enc(text)、model_pro/model_flash、role、sort_order/timeout_ms/max_retries(int)、
 *    created_at/updated_at(timestamp DEFAULT now())。
 *  - 不 seed 初始行(启动期 AiProviderBootstrap 在表空时从 env 种入)。
 *  - down() DROP TABLE。
 *
 * 真正的 migration:run 端到端需 Postgres(本机无实例);SQLite(dev/test)由 synchronize 自动建表。
 */
import { QueryRunner } from 'typeorm';
import { AddAiProviders1781450000000 } from '../src/database/migrations/1781450000000-AddAiProviders';

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

describe('AddAiProviders1781450000000 迁移结构', () => {
  const migration = new AddAiProviders1781450000000();

  it('类可实例化且 name 与文件时间戳一致', () => {
    expect(migration.name).toBe('AddAiProviders1781450000000');
  });

  it('up() 建表含 uuid PK / name UNIQUE / 凭证列 / 角色列 / 数值列 / 时间戳', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    const create = sql.find((q) => /CREATE TABLE "ai_providers"/.test(q));
    expect(create).toBeDefined();
    expect(create).toMatch(/"id" uuid NOT NULL DEFAULT gen_random_uuid\(\)/);
    expect(create).toMatch(/"name" character varying NOT NULL/);
    expect(create).toMatch(/"protocol" character varying NOT NULL DEFAULT 'anthropic-compat'/);
    expect(create).toMatch(/"base_url" character varying NOT NULL/);
    expect(create).toMatch(/"api_key_enc" text NOT NULL/);
    expect(create).toMatch(/"model_pro" character varying NOT NULL/);
    expect(create).toMatch(/"model_flash" character varying NOT NULL/);
    expect(create).toMatch(/"role" character varying NOT NULL DEFAULT 'backup'/);
    expect(create).toMatch(/"sort_order" integer NOT NULL DEFAULT 0/);
    expect(create).toMatch(/"timeout_ms" integer NOT NULL DEFAULT 120000/);
    expect(create).toMatch(/"max_retries" integer NOT NULL DEFAULT 2/);
    expect(create).toMatch(/"created_at" TIMESTAMP NOT NULL DEFAULT now\(\)/);
    expect(create).toMatch(/"updated_at" TIMESTAMP NOT NULL DEFAULT now\(\)/);
    expect(create).toMatch(/CONSTRAINT "PK_ai_providers" PRIMARY KEY \("id"\)/);
    expect(create).toMatch(/CONSTRAINT "UQ_ai_providers_name" UNIQUE \("name"\)/);
  });

  it('up() 不写入任何初始行(启动期从 env 种入)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    expect(sql.some((q) => /INSERT INTO "ai_providers"/.test(q))).toBe(false);
  });

  it('down() DROP TABLE', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.down(runner);
    expect(sql.some((q) => /DROP TABLE "ai_providers"/.test(q))).toBe(true);
  });
});
