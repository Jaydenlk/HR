import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * interviews 表新增 summary 列:面试全过程客观总结(复盘三视图之「面试总结」视图的数据源)。
 *
 * 类型映射依据 TypeORM PostgresDriver(与既有迁移头注一致):
 *  - @Column('text', { nullable: true }) → text,可空
 * nullable:本列上线前生成的旧复盘记录为 null,前端据此优雅降级(不渲染总结视图),不白屏。
 *
 * 双端说明:e2e 走 better-sqlite3 in-memory + synchronize,不执行本迁移;
 * 本迁移仅在生产 Postgres 上执行。回滚(down):DROP COLUMN summary。
 */
export class AddInterviewSummary1782900000000 implements MigrationInterface {
  name = 'AddInterviewSummary1782900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "interviews" ADD COLUMN "summary" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "interviews" DROP COLUMN "summary"`,
    );
  }
}
