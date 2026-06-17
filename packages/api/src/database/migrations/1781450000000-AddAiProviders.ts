import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AI provider 通道表 ai_providers(每通道一行的完整凭证 + 主备角色,由 admin 面板 CRUD 管理)。
 *
 * 取代原"单行元数据切换器"方案(ai_provider_settings,未部署过):把 baseURL/型号/密钥也搬进 DB,
 * 密钥以 AES-256-GCM 加密存 api_key_enc(明文绝不入库)。
 *
 * 类型映射依据 TypeORM PostgresDriver(与 AddCreditSystem 头注一致):
 *  - @PrimaryGeneratedColumn('uuid') → uuid DEFAULT gen_random_uuid()
 *  - @Column({ type: 'varchar' }) → character varying NOT NULL
 *  - @Column({ type: 'text' }) → text NOT NULL
 *  - @Column({ type: 'int', default }) → integer NOT NULL DEFAULT <n>
 *  - @CreateDateColumn/@UpdateDateColumn → timestamp NOT NULL DEFAULT now()
 *
 * 列名 "name" 唯一约束防重名通道。不 seed 初始行:启动期 AiProviderBootstrap 在表空时
 * 把 env 配的 deepseek/relay/glm 种入(key 加密),保证向后兼容。
 * SQLite(dev/test)由 synchronize 自动建表,本迁移只管 Postgres。
 */
export class AddAiProviders1781450000000 implements MigrationInterface {
  name = 'AddAiProviders1781450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_providers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "protocol" character varying NOT NULL DEFAULT 'anthropic-compat',
        "base_url" character varying NOT NULL,
        "api_key_enc" text NOT NULL,
        "model_pro" character varying NOT NULL,
        "model_flash" character varying NOT NULL,
        "role" character varying NOT NULL DEFAULT 'backup',
        "sort_order" integer NOT NULL DEFAULT 0,
        "timeout_ms" integer NOT NULL DEFAULT 120000,
        "max_retries" integer NOT NULL DEFAULT 2,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_providers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ai_providers_name" UNIQUE ("name")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ai_providers"`);
  }
}
