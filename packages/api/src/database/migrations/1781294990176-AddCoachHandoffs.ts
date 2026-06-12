import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * coach_handoffs 表:存储 Coach 对话中提议的模块跳转卡片。
 *
 * 类型映射依据 TypeORM PostgresDriver(与 InitialSchema 头注一致):
 *  - @PrimaryGeneratedColumn('uuid') → uuid DEFAULT gen_random_uuid()
 *  - @Column() (string) → character varying NOT NULL
 *  - @Column({ nullable: true }) → character varying(可空)
 *  - @Column('simple-json', { nullable: true }) → text(可空)
 *  - @CreateDateColumn / @UpdateDateColumn → timestamp NOT NULL DEFAULT now()
 *
 * 索引 (user_id, status):加速「我的待处理 handoff」查询(Coach 接待入口常见路径)。
 * FK user_id → users.id CASCADE:用户注销后自动清理其 handoff 记录。
 * message_id 可空:卡片在流完成时落库,message_id 同时写入关联 assistant 消息记录;
 *   若未来重构去关联则允许为 null 而不破坏现有记录。
 */
export class AddCoachHandoffs1781294990176 implements MigrationInterface {
  name = 'AddCoachHandoffs1781294990176';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "coach_handoffs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "conversation_id" uuid NOT NULL,
        "message_id" uuid,
        "target" character varying NOT NULL,
        "payload" text,
        "status" character varying NOT NULL DEFAULT 'proposed',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_coach_handoffs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_coach_handoffs_user_id_status" ON "coach_handoffs" ("user_id", "status")`,
    );

    await queryRunner.query(
      `ALTER TABLE "coach_handoffs" ADD CONSTRAINT "FK_coach_handoffs_user_id"
       FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "coach_handoffs" DROP CONSTRAINT "FK_coach_handoffs_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_coach_handoffs_user_id_status"`,
    );
    await queryRunner.query(`DROP TABLE "coach_handoffs"`);
  }
}
