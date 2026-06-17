/**
 * CreateAnnouncements 迁移结构冒烟(不依赖运行中的 Postgres,捕获迁移发出的 SQL 做结构断言)。
 *  - up() 建 announcements 表(uuid PK + title varchar + body text + kind varchar DEFAULT 'feature'
 *    + active boolean DEFAULT true + created_at TIMESTAMP DEFAULT now() + published_at TIMESTAMP 可空)。
 *  - up() 建 IDX_announcements_active (active) 索引。
 *  - 纯加法:不碰现有表(无 DROP / 无对现有表 ALTER）。
 *  - down() 逆序回滚:先删索引 → 再 DROP 表。
 *
 * 真正的 migration:run 端到端需 Postgres(本机无实例),见 migration-smoke.spec.ts 头注口径一致。
 */
import { QueryRunner } from 'typeorm';
import { CreateAnnouncements1781500000000 } from '../src/database/migrations/1781500000000-CreateAnnouncements';
import { AddAnnouncementStatusAndCta1781550000000 } from '../src/database/migrations/1781550000000-AddAnnouncementStatusAndCta';

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

describe('CreateAnnouncements1781500000000 迁移结构', () => {
  const migration = new CreateAnnouncements1781500000000();

  it('类可实例化且 name 与文件时间戳一致', () => {
    expect(migration.name).toBe('CreateAnnouncements1781500000000');
  });

  it('up() 建 announcements 表,列与类型齐全', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    const ddl = findCreateTable(sql, 'announcements');
    expect(ddl).toBeDefined();
    const d = ddl as string;
    expect(d).toMatch(/"id" uuid NOT NULL DEFAULT gen_random_uuid\(\)/);
    expect(d).toMatch(/"title" character varying NOT NULL/);
    expect(d).toMatch(/"body" text NOT NULL/);
    expect(d).toMatch(/"kind" character varying NOT NULL DEFAULT 'feature'/);
    // display_type:banner/modal 分流列，默认 banner。
    expect(d).toMatch(/"display_type" character varying NOT NULL DEFAULT 'banner'/);
    expect(d).toMatch(/"active" boolean NOT NULL DEFAULT true/);
    expect(d).toMatch(/"created_at" TIMESTAMP NOT NULL DEFAULT now\(\)/);
    expect(d).toMatch(/"published_at" TIMESTAMP/);
    expect(d).toMatch(/CONSTRAINT "PK_announcements" PRIMARY KEY \("id"\)/);
  });

  it('up() 建 IDX_announcements_active (active) 索引', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    expect(
      sql.some((q) =>
        /CREATE INDEX "IDX_announcements_active" ON "announcements" \("active"\)/.test(q),
      ),
    ).toBe(true);
  });

  it('纯加法:up() 不碰现有表(无 DROP / 无对其它表 ALTER）', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    for (const q of sql) {
      expect(/DROP TABLE/.test(q)).toBe(false);
      const alterMatch = q.match(/ALTER TABLE "([a-z_]+)"/);
      if (alterMatch) {
        // 本迁移不应发出任何 ALTER（建表 + 建索引即可）。
        expect(alterMatch[1]).toBe('announcements');
      }
    }
  });

  it('down() 逆序回滚:先删索引 → 再 DROP 表', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.down(runner);
    const idxIdx = sql.findIndex((q) => /DROP INDEX "IDX_announcements_active"/.test(q));
    const tblIdx = sql.findIndex((q) => /DROP TABLE "announcements"/.test(q));
    expect(idxIdx).toBeGreaterThanOrEqual(0);
    expect(tblIdx).toBeGreaterThan(idxIdx);
  });

  it('up()/down() 表名对称:up 建的表 down 必删', async () => {
    const up = makeRecordingRunner();
    await migration.up(up.runner);
    const down = makeRecordingRunner();
    await migration.down(down.runner);
    const created = up.sql.some((q) => /CREATE TABLE "announcements"/.test(q));
    const dropped = down.sql.some((q) => /DROP TABLE "announcements"/.test(q));
    expect(created).toBe(true);
    expect(dropped).toBe(true);
  });
});

describe('AddAnnouncementStatusAndCta1781550000000 迁移结构', () => {
  const migration = new AddAnnouncementStatusAndCta1781550000000();

  it('类可实例化且 name 与文件时间戳一致', () => {
    expect(migration.name).toBe('AddAnnouncementStatusAndCta1781550000000');
  });

  it('up() 在 announcements 上加 status(NOT NULL DEFAULT draft)+ 4 个可空 CTA 列', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    const adds = sql.filter((q) => /ALTER TABLE "announcements" ADD/.test(q));
    expect(
      adds.some((q) =>
        /ADD "status" character varying NOT NULL DEFAULT 'draft'/.test(q),
      ),
    ).toBe(true);
    expect(adds.some((q) => /ADD "cta_label" character varying$/.test(q))).toBe(true);
    expect(adds.some((q) => /ADD "cta_href" character varying$/.test(q))).toBe(true);
    expect(adds.some((q) => /ADD "cta_tour_id" character varying$/.test(q))).toBe(true);
    expect(adds.some((q) => /ADD "feature_key" character varying$/.test(q))).toBe(true);
  });

  it('up() 回填:active=true 或 published_at 非空的行置 status=published', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    expect(
      sql.some((q) =>
        /UPDATE "announcements" SET "status" = 'published' WHERE "active" = true OR "published_at" IS NOT NULL/.test(
          q,
        ),
      ),
    ).toBe(true);
  });

  it('纯加法:up() 只 ALTER announcements,无 DROP / 无建表', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    for (const q of sql) {
      expect(/DROP /.test(q)).toBe(false);
      expect(/CREATE TABLE/.test(q)).toBe(false);
      const alterMatch = q.match(/ALTER TABLE "([a-z_]+)"/);
      if (alterMatch) expect(alterMatch[1]).toBe('announcements');
    }
  });

  it('down() 删除全部 5 个新增列(逆序),不碰其它', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.down(runner);
    for (const col of ['status', 'cta_label', 'cta_href', 'cta_tour_id', 'feature_key']) {
      expect(
        sql.some((q) =>
          new RegExp(`ALTER TABLE "announcements" DROP COLUMN "${col}"`).test(q),
        ),
      ).toBe(true);
    }
    // 末列(status)最后删:逆序回滚。
    const statusIdx = sql.findIndex((q) => /DROP COLUMN "status"/.test(q));
    const featureIdx = sql.findIndex((q) => /DROP COLUMN "feature_key"/.test(q));
    expect(statusIdx).toBeGreaterThan(featureIdx);
  });
});
