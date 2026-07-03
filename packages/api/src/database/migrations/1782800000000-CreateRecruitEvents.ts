import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * recruit_events 表:T2 月刊校招情报摄入流水线——三类适配器(sheet_file/sheet_link/wechat_dump)
 * 解析产出的结构化事件,与 feed_items 是两张独立的表(职业维基「入行层-校招信号」一手源之一,
 * 本迁移只建表,不做 T3 侧消费)。
 *
 * 类型映射依据 TypeORM PostgresDriver(与既有迁移头注一致):
 *  - @PrimaryGeneratedColumn('uuid') → uuid DEFAULT gen_random_uuid()
 *  - @Column({ type: 'varchar' })(非 nullable) → character varying NOT NULL(company/event_type/dedup_key)
 *  - @Column({ type: 'varchar', nullable: true }) → character varying,可空
 *  - event_date(TIMESTAMP_COLUMN_TYPE,可空)→ 生产 Postgres 端为 timestamp,可空
 *  - confidence 默认 'medium'(与 feed_items.confidence 同口径)
 *
 * 唯一索引 dedup_key:去重键(归一化公司名+event_type+event_date)冲突时由应用层 upsert 合并,
 * 而非落两条重复行——防重复摄入(周 cron 重复抓取同一 sheet_link / 重复上传同一文件)。
 *
 * 双端说明:e2e 走 better-sqlite3 in-memory + synchronize,不执行本迁移;
 * 本迁移仅在生产 Postgres 上执行。回滚(down):逆序 DROP 索引 / 表。
 */
export class CreateRecruitEvents1782800000000 implements MigrationInterface {
  name = 'CreateRecruitEvents1782800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "recruit_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company" character varying NOT NULL,
        "role_hint" character varying,
        "event_type" character varying NOT NULL,
        "event_date" TIMESTAMP,
        "city" character varying,
        "apply_url" character varying(1000),
        "source_ref" character varying,
        "confidence" character varying NOT NULL DEFAULT 'medium',
        "dedup_key" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recruit_events" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_recruit_events_dedup_key" ON "recruit_events" ("dedup_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_recruit_events_event_date" ON "recruit_events" ("event_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_recruit_events_event_date"`);
    await queryRunner.query(`DROP INDEX "IDX_recruit_events_dedup_key"`);
    await queryRunner.query(`DROP TABLE "recruit_events"`);
  }
}
