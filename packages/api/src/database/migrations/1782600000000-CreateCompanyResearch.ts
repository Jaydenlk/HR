import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * company_research 表：T6 博查统一搜索服务重设计——公司搜索结果落库缓存。
 *
 * 背景:此前 mock/company-search.service.ts 只用进程内存 Map 做 24h 缓存,且只保留 items[0]
 * 一条候选。新设计落库为 company_research 表,候选全量保留,缓存命中条件收紧为
 * "canonical_name 精确相等 且 retrieved_at 距今 ≤7 天"(红线:模糊匹配永远只产生候选,不用于命中缓存)。
 *
 * 类型映射依据 TypeORM PostgresDriver(与 InitialSchema 头注一致):
 *  - @PrimaryGeneratedColumn('uuid') → uuid DEFAULT gen_random_uuid()
 *  - @Column()(string) → character varying NOT NULL(canonical_name/display_name/summary/source_url/source_domain)
 *  - retrieved_at(普通 @Column(),非 nullable 单一 Date 类型)→ timestamp NOT NULL,无 DEFAULT
 *    (应用层每次落库/刷新显式赋值 new Date())
 *  - raw(@Column('simple-json', {nullable:true}))→ text,可空(TypeORM 在 PG 上把 simple-json 落为 text)
 *
 * 唯一索引 canonical_name:归一化名全局唯一,作为缓存键与 upsert 定位键。
 *
 * 双端说明:e2e 走 better-sqlite3 in-memory + synchronize,不执行本迁移;
 * 本迁移仅在生产 Postgres 上执行。回滚(down):逆序 DROP 索引 / 表。
 */
export class CreateCompanyResearch1782600000000 implements MigrationInterface {
  name = 'CreateCompanyResearch1782600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "company_research" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "canonical_name" character varying NOT NULL,
        "display_name" character varying NOT NULL,
        "summary" character varying NOT NULL,
        "source_url" character varying NOT NULL,
        "source_domain" character varying NOT NULL,
        "retrieved_at" TIMESTAMP NOT NULL,
        "raw" text,
        CONSTRAINT "PK_company_research" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_company_research_canonical_name" ON "company_research" ("canonical_name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_company_research_canonical_name"`);
    await queryRunner.query(`DROP TABLE "company_research"`);
  }
}
