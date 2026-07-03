import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T3 职业维基 Stage0——5 张表建表(occupation_slugs / occupation_entries / occupation_edges /
 * occupation_evidence / occupation_aliases),对应 docs/refactor2/T3-career-wiki.md §4。
 *
 * 类型映射依据 TypeORM PostgresDriver(与既有迁移头注一致):
 *  - @PrimaryGeneratedColumn('uuid') → uuid DEFAULT gen_random_uuid()
 *  - @PrimaryColumn({type:'varchar'})(slug 自然键)→ character varying NOT NULL PRIMARY KEY
 *  - @Column({type:'varchar'})(非 nullable)→ character varying NOT NULL
 *  - @Column({type:JSONB_COLUMN_TYPE})在生产 Postgres 端 → jsonb NOT NULL(occupation_entries.skeleton,
 *    设计文档数据模型表显式标注 "skeleton(jsonb)",供未来推荐系统按结构化字段查询;
 *    better-sqlite3 端(仅 e2e synchronize 用)回落 text,详见 column-types.ts 头注)
 *  - @Column({type:TIMESTAMP_COLUMN_TYPE, nullable:true}) → 生产端 timestamp,可空
 *  - @Column({type:'float'}) → double precision(weight)
 *
 * 外键取舍(IMPL 报告已展开完整理由):
 *  - occupation_entries.slug:数据库级外键 → occupation_slugs(slug)。设计文档数据模型表把
 *    这一列显式标注为「FK」;且 entries 只在 slug 已存在于注册表后才产生(§1 设计裁决 4
 *    「注册表先行」),不存在合法的时序冲突,硬 FK 安全。
 *  - occupation_evidence.entry_slug:数据库级外键 → occupation_entries(slug)。证据行与其
 *    所属 entry 在 seed-importer 同一次事务内一起写入,不存在跨批次中间态。
 *  - occupation_edges.from_slug / to_slug:不设外键——设计文档原文「脚本保证零悬空引用」
 *    把这份完整性保障明确划给脚本/校验器层,注册表 v1 阶段 edges 与全库 slug 坑位同批
 *    构建、批与批之间存在合法的「先建边、后建目标词条」中间态,硬 FK 会阻断这个节奏。
 *  - occupation_aliases.slug:同理不设外键(别名扩展是独立的机械环节,产出节奏可能与
 *    词条主体不完全同步)。
 *  两张无 FK 的表,悬空引用由 occupation.validator.ts 的 validateEdgesReferentialIntegrity
 *  在 occupation-seed-importer 落库前统一校验,并有专门测试覆盖(见 IMPL 报告)。
 *
 * 唯一索引:occupation_aliases (alias, slug) ——T3 §4 明确要求,检索精确命中去重键。
 * 另加 occupation_edges (from_slug, to_slug, type) 唯一索引,防止重复边行。
 *
 * 双端说明:e2e 走 better-sqlite3 in-memory + synchronize,不执行本迁移;
 * 本迁移仅在生产 Postgres 上执行。纯加法,不碰任何既有表。回滚(down):逆序 DROP。
 */
export class CreateOccupationWikiTables1782900000000 implements MigrationInterface {
  name = 'CreateOccupationWikiTables1782900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── occupation_slugs ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "occupation_slugs" (
        "slug" character varying NOT NULL,
        "name" character varying NOT NULL,
        "l0" character varying NOT NULL,
        "l1_family" character varying NOT NULL,
        "l2_scene" character varying NOT NULL,
        "l3_flag" boolean NOT NULL DEFAULT false,
        "status" character varying NOT NULL DEFAULT 'planned',
        CONSTRAINT "PK_occupation_slugs" PRIMARY KEY ("slug")
      )
    `);

    // ── occupation_entries ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "occupation_entries" (
        "slug" character varying NOT NULL,
        "skeleton" jsonb NOT NULL,
        "prose" text NOT NULL,
        "axis" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'draft',
        "cost_tokens" integer NOT NULL DEFAULT 0,
        "last_verified" TIMESTAMP,
        CONSTRAINT "PK_occupation_entries" PRIMARY KEY ("slug"),
        CONSTRAINT "FK_occupation_entries_slug" FOREIGN KEY ("slug")
          REFERENCES "occupation_slugs"("slug") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // ── occupation_edges ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "occupation_edges" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "from_slug" character varying NOT NULL,
        "to_slug" character varying NOT NULL,
        "type" character varying NOT NULL,
        "note" text NOT NULL,
        CONSTRAINT "PK_occupation_edges" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_occupation_edges_from_slug" ON "occupation_edges" ("from_slug")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_occupation_edges_to_slug" ON "occupation_edges" ("to_slug")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_occupation_edges_from_to_type" ON "occupation_edges" ("from_slug", "to_slug", "type")`,
    );

    // ── occupation_evidence ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "occupation_evidence" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "entry_slug" character varying NOT NULL,
        "field_path" character varying NOT NULL,
        "claim" text NOT NULL,
        "source_excerpt" text NOT NULL,
        "source_url" character varying NOT NULL,
        "tier" character varying NOT NULL,
        "verdict" character varying NOT NULL,
        "last_verified" TIMESTAMP,
        CONSTRAINT "PK_occupation_evidence" PRIMARY KEY ("id"),
        CONSTRAINT "FK_occupation_evidence_entry_slug" FOREIGN KEY ("entry_slug")
          REFERENCES "occupation_entries"("slug") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_occupation_evidence_entry_field" ON "occupation_evidence" ("entry_slug", "field_path")`,
    );

    // ── occupation_aliases ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "occupation_aliases" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "alias" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "weight" double precision NOT NULL DEFAULT 1,
        CONSTRAINT "PK_occupation_aliases" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_occupation_aliases_slug" ON "occupation_aliases" ("slug")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_occupation_aliases_alias_slug" ON "occupation_aliases" ("alias", "slug")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_occupation_aliases_alias_slug"`);
    await queryRunner.query(`DROP INDEX "IDX_occupation_aliases_slug"`);
    await queryRunner.query(`DROP TABLE "occupation_aliases"`);

    await queryRunner.query(`DROP INDEX "IDX_occupation_evidence_entry_field"`);
    await queryRunner.query(`DROP TABLE "occupation_evidence"`);

    await queryRunner.query(`DROP INDEX "UQ_occupation_edges_from_to_type"`);
    await queryRunner.query(`DROP INDEX "IDX_occupation_edges_to_slug"`);
    await queryRunner.query(`DROP INDEX "IDX_occupation_edges_from_slug"`);
    await queryRunner.query(`DROP TABLE "occupation_edges"`);

    await queryRunner.query(`DROP TABLE "occupation_entries"`);

    await queryRunner.query(`DROP TABLE "occupation_slugs"`);
  }
}
