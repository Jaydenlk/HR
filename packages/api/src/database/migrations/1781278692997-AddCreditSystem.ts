import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Credit 计费体系:users 加 credit_balance + 新表 credit_transactions + 存量用户一次性补 50。
 *
 * 类型映射依据 TypeORM PostgresDriver(与 InitialSchema 头注一致):
 *  - @Column({ type: 'int', default: 0 }) → integer NOT NULL DEFAULT 0
 *  - @PrimaryGeneratedColumn('uuid') → uuid DEFAULT gen_random_uuid()
 *  - @Column({ type: 'uuid', nullable: true }) → uuid(可空)
 *  - @Column({ type: 'varchar', nullable: true }) → character varying(可空)
 *  - @CreateDateColumn → timestamp NOT NULL DEFAULT now()
 *
 * 存量迁移(完全替代制,新注册另由 auth 轨 grant):
 *  - users.credit_balance 先以 DEFAULT 0 建列(存量行落 0)。
 *  - 给所有存量用户 +50:UPDATE 置 balance = balance + 50。
 *  - 逐人补一条 signup_grant 流水,balance_after = 该用户迁移后的余额(子查询取最新 users.credit_balance,
 *    此时已 +50,故 balance_after 自洽)。delta=50,created_by/endpoint/note 为 null。
 *
 * SQLite 开发态由 synchronize 自动加列/建表,本迁移只管 Postgres。
 */
export class AddCreditSystem1781278692997 implements MigrationInterface {
  name = 'AddCreditSystem1781278692997';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── users.credit_balance ───────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "users" ADD "credit_balance" integer NOT NULL DEFAULT 0`,
    );

    // ── credit_transactions ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "credit_transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "delta" integer NOT NULL,
        "type" character varying NOT NULL,
        "balance_after" integer NOT NULL,
        "note" character varying,
        "created_by" uuid,
        "endpoint" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_credit_transactions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_credit_transactions_user_id_created_at" ON "credit_transactions" ("user_id", "created_at")`,
    );

    // ── 存量用户一次性补 50 ─────────────────────────────────────────────────────
    // 先全员 +50(此前都是 DEFAULT 0,故等价置 50;用 +50 表达「补 50」语义,且对任何初值都正确)。
    await queryRunner.query(`UPDATE "users" SET "credit_balance" = "credit_balance" + 50`);
    // 逐人补一条 signup_grant 流水,balance_after 取该用户当前(已 +50)余额,保证自洽。
    await queryRunner.query(`
      INSERT INTO "credit_transactions" ("user_id", "delta", "type", "balance_after", "note", "created_by", "endpoint")
      SELECT "id", 50, 'signup_grant', "credit_balance", NULL, NULL, NULL FROM "users"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_credit_transactions_user_id_created_at"`);
    await queryRunner.query(`DROP TABLE "credit_transactions"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "credit_balance"`);
  }
}
