import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 新增 announcements 表(纯加法,不 ALTER 任何存量表)。
 *
 * 用途:站内公告。运营经管理后台发布,公开端只返 active=true 的。
 *  - kind:feature/fix/maintenance(service/DTO 层白名单校验,DB 不加 CHECK 约束以保持加表纯净)。
 *  - display_type:banner/modal,默认 banner(service/DTO 层白名单校验)。
 *  - active:上架开关,默认 true;下架置 false(软下架)。
 *  - published_at:可空,上架时记发布点;下架不清空(保留历史发布时间)。
 *    公开端 3 天窗口为计算式过滤(now ≤ published_at + 3 天),不加 expires 列。
 *
 * 类型映射依据 TypeORM PostgresDriver(与既有迁移头注一致):
 *  - uuid DEFAULT gen_random_uuid():主键(pgcrypto 已在 InitialSchema.up 里 CREATE EXTENSION IF NOT EXISTS)
 *  - character varying NOT NULL:title / kind
 *  - text NOT NULL:body
 *  - boolean NOT NULL DEFAULT true:active
 *  - TIMESTAMP NOT NULL DEFAULT now():created_at
 *  - TIMESTAMP(可空):published_at
 *
 * 索引:
 *  - IDX_announcements_active (active):公开端按 active 过滤
 *
 * 回滚(down):逆序删索引 → 删表(完整 DROP)。
 */
export class CreateAnnouncements1781500000000 implements MigrationInterface {
  name = 'CreateAnnouncements1781500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // pgcrypto 已在 InitialSchema 中 CREATE EXTENSION IF NOT EXISTS,此处不重复。
    await queryRunner.query(`
      CREATE TABLE "announcements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying NOT NULL,
        "body" text NOT NULL,
        "kind" character varying NOT NULL DEFAULT 'feature',
        "display_type" character varying NOT NULL DEFAULT 'banner',
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "published_at" TIMESTAMP,
        CONSTRAINT "PK_announcements" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_announcements_active" ON "announcements" ("active")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 逆序回滚:先删索引,再完整 DROP 表。
    await queryRunner.query(`DROP INDEX "IDX_announcements_active"`);
    await queryRunner.query(`DROP TABLE "announcements"`);
  }
}
