import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T5 投递追踪二级页——数据打通(一次做齐,全部 nullable,存量数据零迁移不回填)。
 *
 *  - mock_sessions.application_id / cover_letters.application_id:此前只是裸列,无外键、
 *    无归属校验(mock.service.ts create() / cover-letters.service.ts generate()/regenerate()
 *    零校验写入)。补真外键 ON DELETE SET NULL(归属校验在 service 层补,见对应 service 改动)。
 *  - applications 新增 resume_version_id(软引用 resume_versions,语义"发送的是哪一版",与既有
 *    resume_id 不是一回事)+ company_research_id(软引用 T6 的 company_research,已落地故建真外键)。
 *    两列均 nullable,存量 applications 行一律 NULL,不做任何回填/推断(红线)。
 *
 * 防御性清洗(不算回填,是数据完整性维护):加 FK 前先把指向不存在 applications 行的脏值置 NULL,
 * 否则 ADD CONSTRAINT 在存量脏数据上会直接失败。
 *
 * 双端说明:e2e 走 better-sqlite3 in-memory + synchronize,不执行本迁移;
 * 本迁移仅在生产 Postgres 上执行。回滚(down):逆序 DROP 约束 / 列。
 */
export class AddApplicationDetailLinks1782700000000 implements MigrationInterface {
  name = 'AddApplicationDetailLinks1782700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── mock_sessions.application_id：防御性清洗 + 真外键 ──────────────────────
    await queryRunner.query(`
      UPDATE "mock_sessions" SET "application_id" = NULL
      WHERE "application_id" IS NOT NULL
        AND "application_id" NOT IN (SELECT "id" FROM "applications")
    `);
    await queryRunner.query(`
      ALTER TABLE "mock_sessions" ADD CONSTRAINT "FK_mock_sessions_application"
      FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // ── cover_letters.application_id：防御性清洗 + 真外键 ──────────────────────
    await queryRunner.query(`
      UPDATE "cover_letters" SET "application_id" = NULL
      WHERE "application_id" IS NOT NULL
        AND "application_id" NOT IN (SELECT "id" FROM "applications")
    `);
    await queryRunner.query(`
      ALTER TABLE "cover_letters" ADD CONSTRAINT "FK_cover_letters_application"
      FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // ── applications.resume_version_id：新增软引用列 + 真外键(resume_versions 已存在) ──
    await queryRunner.query(`ALTER TABLE "applications" ADD "resume_version_id" uuid`);
    await queryRunner.query(`
      ALTER TABLE "applications" ADD CONSTRAINT "FK_applications_resume_version"
      FOREIGN KEY ("resume_version_id") REFERENCES "resume_versions"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // ── applications.company_research_id：新增软引用列 + 真外键(T6 company_research 已落地) ──
    await queryRunner.query(`ALTER TABLE "applications" ADD "company_research_id" uuid`);
    await queryRunner.query(`
      ALTER TABLE "applications" ADD CONSTRAINT "FK_applications_company_research"
      FOREIGN KEY ("company_research_id") REFERENCES "company_research"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "applications" DROP CONSTRAINT "FK_applications_company_research"`);
    await queryRunner.query(`ALTER TABLE "applications" DROP COLUMN "company_research_id"`);

    await queryRunner.query(`ALTER TABLE "applications" DROP CONSTRAINT "FK_applications_resume_version"`);
    await queryRunner.query(`ALTER TABLE "applications" DROP COLUMN "resume_version_id"`);

    await queryRunner.query(`ALTER TABLE "cover_letters" DROP CONSTRAINT "FK_cover_letters_application"`);
    await queryRunner.query(`ALTER TABLE "mock_sessions" DROP CONSTRAINT "FK_mock_sessions_application"`);
  }
}
