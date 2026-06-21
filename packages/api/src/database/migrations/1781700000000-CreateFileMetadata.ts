import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * file_metadata 表:为每个上传对象 key 记录归属用户,落地对象级 ACL(IDOR 修复)。
 *
 * 背景:FilesService.upload 此前把文件写到 /uploads/<folder>/<uuid>.<ext> 并返回 key,
 * key 与用户无任何绑定;任何持有效 JWT 者可枚举/猜测 uuid 越权拉取他人简历/头像。
 * 本表把「key → user_id」固化为可校验归属关系,下载端点据此 assertOwner,非属主一律 404。
 *
 * 类型映射依据 TypeORM PostgresDriver(与 InitialSchema 头注一致):
 *  - @PrimaryGeneratedColumn('uuid') → uuid DEFAULT gen_random_uuid()
 *  - @Column() (string) → character varying NOT NULL(key / user_id / folder)
 *  - @CreateDateColumn → timestamp NOT NULL DEFAULT now()
 *
 * 唯一索引 key:对象 key 全局唯一(uuid 文件名),作为 ACL 校验主键路径并防重复登记。
 * FK user_id → users.id CASCADE:用户注销后元数据随之清理。
 *
 * 双端说明:e2e 走 better-sqlite3 in-memory,靠 TypeORM synchronize 从实体自动建表,不执行本迁移;
 * 本迁移仅在生产 Postgres 上执行。回滚(down):逆序 DROP FK / 索引 / 表。
 */
export class CreateFileMetadata1781700000000 implements MigrationInterface {
  name = 'CreateFileMetadata1781700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "file_metadata" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "key" character varying NOT NULL,
        "user_id" uuid NOT NULL,
        "folder" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_file_metadata" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_file_metadata_key" ON "file_metadata" ("key")`,
    );

    await queryRunner.query(
      `ALTER TABLE "file_metadata" ADD CONSTRAINT "FK_file_metadata_user_id"
       FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "file_metadata" DROP CONSTRAINT "FK_file_metadata_user_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_file_metadata_key"`);
    await queryRunner.query(`DROP TABLE "file_metadata"`);
  }
}
