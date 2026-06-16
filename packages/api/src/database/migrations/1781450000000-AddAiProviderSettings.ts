import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AI provider 运行时主备配置表 ai_provider_settings(单行配置:全局仅一条有效配置,service 取 updated_at DESC 第一条)。
 *
 * 安全红线:本表只存「谁是主力 / 降级顺序」这类可在 UI 切换的元数据;
 * 密钥 / baseURL / 型号 / timeout / retries 永远从 env 取,绝不进 DB。
 *
 * 类型映射依据 TypeORM PostgresDriver(与 AddCreditSystem 头注一致):
 *  - @PrimaryGeneratedColumn('uuid') → uuid DEFAULT gen_random_uuid()
 *  - @Column({ type: 'varchar' }) → character varying NOT NULL
 *  - @Column({ type: 'text' }) → text NOT NULL
 *  - @Column({ type: 'uuid', nullable: true }) → uuid(可空)
 *  - @UpdateDateColumn() → timestamp NOT NULL DEFAULT now()
 *
 * 列名 "primary"/"order" 是 SQL 保留字,实体用 { name: 'primary'/'order' } 显式映射,
 * 故迁移与运行期查询均以双引号包裹,Postgres 合法。
 *
 * 不 seed 初始行:service 无记录时回退 env primaryProvider + 默认顺序(与今天行为一致),
 * 首次面板切换才写入第一行。SQLite(dev/test)由 synchronize 自动建表,本迁移只管 Postgres。
 */
export class AddAiProviderSettings1781450000000 implements MigrationInterface {
  name = 'AddAiProviderSettings1781450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_provider_settings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "primary" character varying NOT NULL,
        "order" text NOT NULL,
        "updated_by" uuid,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_provider_settings" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ai_provider_settings"`);
  }
}
