import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * announcements 表新增「审核状态」与「引导 CTA」字段(纯 ADD COLUMN,无破坏性变更)。
 *
 * 背景:公告改为「AI 起草草稿 → 管理员审核/编辑 → 发布」两态流转,并支持在公告上挂一个
 * 指向站内功能的引导按钮(CTA)。
 *  - status:'draft' / 'published'。NOT NULL DEFAULT 'draft'(回填后所有行有值)。
 *    公开端只返 status='published';草稿对公开端绝不可见。
 *  - cta_label / cta_href / cta_tour_id / feature_key:可空,管理员设引导按钮(AI 只写正文,CTA 由人设)。
 *
 * 回填:存量行视为已发布(active=true 或曾发布过 published_at 非空)→ 'published';其余 → 'draft'。
 * 这与现行语义一致(此前无 status 概念,active 即对外可见)。
 *
 * 类型映射依据 TypeORM PostgresDriver(与既有迁移头注一致):@Column varchar → character varying。
 * SQLite 开发/测试态由 synchronize 自动加列,本迁移只管 Postgres(与 AddLoginIpAndTerms 口径一致)。
 *
 * 回滚(down):逆序删 5 列。
 */
export class AddAnnouncementStatusAndCta1781550000000 implements MigrationInterface {
  name = 'AddAnnouncementStatusAndCta1781550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD "status" character varying NOT NULL DEFAULT 'draft'`,
    );
    await queryRunner.query(`ALTER TABLE "announcements" ADD "cta_label" character varying`);
    await queryRunner.query(`ALTER TABLE "announcements" ADD "cta_href" character varying`);
    await queryRunner.query(`ALTER TABLE "announcements" ADD "cta_tour_id" character varying`);
    await queryRunner.query(`ALTER TABLE "announcements" ADD "feature_key" character varying`);

    // 回填:存量行此前无 status 概念,active=true 或曾发布过的视为已发布。
    await queryRunner.query(
      `UPDATE "announcements" SET "status" = 'published' WHERE "active" = true OR "published_at" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "announcements" DROP COLUMN "feature_key"`);
    await queryRunner.query(`ALTER TABLE "announcements" DROP COLUMN "cta_tour_id"`);
    await queryRunner.query(`ALTER TABLE "announcements" DROP COLUMN "cta_href"`);
    await queryRunner.query(`ALTER TABLE "announcements" DROP COLUMN "cta_label"`);
    await queryRunner.query(`ALTER TABLE "announcements" DROP COLUMN "status"`);
  }
}
