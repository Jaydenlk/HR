import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 第2批 career 可信度:新增两张表(纯加法,不碰现有表)。
 *
 * 1) career_analysis —— 每次职业地图生成成功后落一条(历史 + 第3批 Coach 可调铺路)。
 * 2) user_skill_self_assessment —— 用户对单技能的自评分(纠偏 AI 虚高分)。
 *
 * 类型映射依据 TypeORM PostgresDriver(与 InitialSchema 头注一致):
 *  - @PrimaryGeneratedColumn('uuid') → uuid DEFAULT gen_random_uuid()
 *  - @Column({ type: 'uuid' }) → uuid NOT NULL
 *  - @Column() (string) → character varying NOT NULL
 *  - @Column('int') → integer NOT NULL
 *  - @Column('simple-json') → text NOT NULL
 *  - @CreateDateColumn / @UpdateDateColumn → timestamp NOT NULL DEFAULT now()
 *
 * 索引:
 *  - career_analysis (user_id, created_at):「我的历史(时间倒序)」查询。
 *  - user_skill_self_assessment UNIQUE (user_id, skill_name):每用户每技能一条(upsert 落点)。
 * 两表 FK user_id → users.id CASCADE:用户注销自动清理。
 */
export class AddCareerTrust1781331026533 implements MigrationInterface {
  name = 'AddCareerTrust1781331026533';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "career_analysis" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "result_json" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_career_analysis" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_career_analysis_user_id_created_at" ON "career_analysis" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "career_analysis" ADD CONSTRAINT "FK_career_analysis_user_id"
       FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );

    await queryRunner.query(`
      CREATE TABLE "user_skill_self_assessment" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "skill_name" character varying NOT NULL,
        "self_score" integer NOT NULL,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_skill_self_assessment" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_skill_self_assessment" ON "user_skill_self_assessment" ("user_id", "skill_name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_skill_self_assessment" ADD CONSTRAINT "FK_user_skill_self_assessment_user_id"
       FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 逆序回滚:先撤 FK,再删索引,最后删表。
    await queryRunner.query(
      `ALTER TABLE "user_skill_self_assessment" DROP CONSTRAINT "FK_user_skill_self_assessment_user_id"`,
    );
    await queryRunner.query(`DROP INDEX "UQ_user_skill_self_assessment"`);
    await queryRunner.query(`DROP TABLE "user_skill_self_assessment"`);

    await queryRunner.query(
      `ALTER TABLE "career_analysis" DROP CONSTRAINT "FK_career_analysis_user_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_career_analysis_user_id_created_at"`);
    await queryRunner.query(`DROP TABLE "career_analysis"`);
  }
}
