import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 新增 interview_transcribe_tasks 表(纯加法,不 ALTER 任何存量表)。
 *
 * 用途:面试录音 ASR 转写任务的状态机存储。
 *  - segments_json 存带角色标的转写段落(LabeledSegment[] JSON),非空时支持重跑不重转写。
 *  - status 跟踪 submitted → transcribing → labeling → awaiting_confirm → analyzing → completed | failed。
 *  - P0 无数据库级外键(service 层校验所有权);P1 可按需补 FK。
 *
 * 类型映射依据 TypeORM PostgresDriver(与 InitialSchema 头注一致):
 *  - uuid DEFAULT gen_random_uuid():主键(pgcrypto 已在 InitialSchema.up 里 CREATE EXTENSION IF NOT EXISTS)
 *  - character varying NOT NULL:status / interview_id / user_id
 *  - character varying(可空):failed_at_stage / asr_job_id
 *  - text(可空):segments_json(simple-json) / error_message
 *  - TIMESTAMP NOT NULL DEFAULT now():created_at / updated_at
 *
 * 索引:
 *  - IDX_transcribe_tasks_interview (interview_id):按面试查任务
 *  - IDX_transcribe_tasks_user (user_id):按用户查任务
 *
 * 回滚(down):逆序删索引 → 删表。
 */
export class AddInterviewTranscribeTask1781400000000 implements MigrationInterface {
  name = 'AddInterviewTranscribeTask1781400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // pgcrypto 已在 InitialSchema 中 CREATE EXTENSION IF NOT EXISTS,此处不重复(幂等亦可,留注释说明)。
    await queryRunner.query(`
      CREATE TABLE "interview_transcribe_tasks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "interview_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "status" character varying NOT NULL DEFAULT 'submitted',
        "failed_at_stage" character varying,
        "asr_job_id" character varying,
        "segments_json" text,
        "error_message" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_interview_transcribe_tasks" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_transcribe_tasks_interview" ON "interview_transcribe_tasks" ("interview_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_transcribe_tasks_user" ON "interview_transcribe_tasks" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 逆序回滚:先删索引,再删表。
    await queryRunner.query(`DROP INDEX "IDX_transcribe_tasks_user"`);
    await queryRunner.query(`DROP INDEX "IDX_transcribe_tasks_interview"`);
    await queryRunner.query(`DROP TABLE "interview_transcribe_tasks"`);
  }
}
