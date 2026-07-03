import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T5 投递追踪二级页——数据打通(一次做齐,全部 nullable,存量数据零迁移不回填)。
 *
 *  - mock_sessions.application_id / cover_letters.application_id:此前只是裸列,无外键、
 *    无归属校验(mock.service.ts create() / cover-letters.service.ts generate()/regenerate()
 *    零校验写入)。补真外键 ON DELETE SET NULL(归属校验在 service 层补,见对应 service 改动)。
 *
 *    真机验证暴露的坑(migration:run 实跑发现,不是猜的):这两列在 InitialSchema 里建表时是
 *    `character varying`,不是 uuid(对照 interviews.application_id 当初建表就是 uuid,三者本该
 *    一致但历史上没对齐)。Postgres 的外键要求两端列类型可比较/兼容,varchar 直接 REFERENCES 一个
 *    uuid 主键会在 ADD CONSTRAINT 时报「operator does not exist: character varying = uuid」。
 *    故本迁移在加 FK 前先把这两列的类型改成 uuid(USING 显式转型),而不是只做防御性清洗。
 *
 *  - applications 新增 resume_version_id(软引用 resume_versions,语义"发送的是哪一版",与既有
 *    resume_id 不是一回事)+ company_research_id(软引用 T6 的 company_research,已落地故建真外键)。
 *    两列均 nullable,存量 applications 行一律 NULL,不做任何回填/推断(红线)。
 *
 * 防御性清洗(不算回填,是数据完整性维护,分两步做,避免和后面的类型转换互相踩坑):
 *  1) 先把不像 UUID 格式的脏字符串置 NULL(正则守卫,防止下一步 ::uuid 转型对垃圾字符串报错)。
 *  2) 再把指向不存在 applications 行的悬空引用置 NULL(转 uuid 后与 applications.id 直接比较)。
 *  两步都做完、列已确定干净,才能安全 ALTER COLUMN TYPE uuid USING application_id::uuid,
 *  否则任何一条脏数据都会让类型转换直接失败。
 *
 * 双端说明:e2e 走 better-sqlite3 in-memory + synchronize,不执行本迁移;
 * 本迁移仅在生产 Postgres 上执行。回滚(down):逆序 DROP 约束 / 列类型改回 varchar。
 */
const UUID_SHAPE = "'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'";

export class AddApplicationDetailLinks1782700000000 implements MigrationInterface {
  name = 'AddApplicationDetailLinks1782700000000';

  private async normalizeApplicationIdColumn(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<void> {
    // 1) 非 UUID 形态的脏字符串置 NULL(防止下一步转型报错)。
    await queryRunner.query(`
      UPDATE "${table}" SET "application_id" = NULL
      WHERE "application_id" IS NOT NULL
        AND "application_id" !~* ${UUID_SHAPE}
    `);
    // 2) 转型为 uuid 后,悬空引用(指向不存在的 applications 行)置 NULL。
    await queryRunner.query(`
      UPDATE "${table}" SET "application_id" = NULL
      WHERE "application_id" IS NOT NULL
        AND "application_id"::uuid NOT IN (SELECT "id" FROM "applications")
    `);
    // 3) 列已确定干净,类型改为 uuid,与 applications.id 对齐,FK 才能建。
    await queryRunner.query(`
      ALTER TABLE "${table}" ALTER COLUMN "application_id" TYPE uuid USING "application_id"::uuid
    `);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── mock_sessions.application_id：清洗 + 转型 uuid + 真外键 ──────────────────
    await this.normalizeApplicationIdColumn(queryRunner, 'mock_sessions');
    await queryRunner.query(`
      ALTER TABLE "mock_sessions" ADD CONSTRAINT "FK_mock_sessions_application"
      FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // ── cover_letters.application_id：清洗 + 转型 uuid + 真外键 ──────────────────
    await this.normalizeApplicationIdColumn(queryRunner, 'cover_letters');
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
    await queryRunner.query(`
      ALTER TABLE "cover_letters" ALTER COLUMN "application_id" TYPE character varying USING "application_id"::character varying
    `);

    await queryRunner.query(`ALTER TABLE "mock_sessions" DROP CONSTRAINT "FK_mock_sessions_application"`);
    await queryRunner.query(`
      ALTER TABLE "mock_sessions" ALTER COLUMN "application_id" TYPE character varying USING "application_id"::character varying
    `);
  }
}
