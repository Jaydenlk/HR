import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 给 interview_transcribe_tasks 加 4 个可空上传元数据列(纯加法 ALTER,不碰其它表)。
 *
 * 用途:桌面端「已收到上传」回执——手机扫码/电脑端传完后,电脑端轮询 status 立即拿到
 * 文件名/字节数/MIME/上传时刻,渲染回执卡(✓ 《文件名》 humansize 相对时间)+ 下接实时进度。
 *
 * 隐私铁律:这 4 列是「文件元数据」(原始文件名/字节数/MIME/收到时刻),不是音频内容本身。
 * 音频 Buffer 仍全程只在内存、interview.audio_url 仍恒为 null、转写后即 GC——本迁移不引入任何音频存储。
 *
 * 双端说明:e2e 走 better-sqlite3 in-memory,靠 TypeORM synchronize 从实体自动建列,不执行本迁移;
 * 本迁移仅在生产 Postgres 上执行。类型映射依据 TypeORM PostgresDriver(与 InitialSchema 头注一致):
 *  - character varying(可空):original_filename / mime_type
 *  - integer(可空):file_size_bytes(25MB 上限远在 int4 内,双端均返回 number)
 *  - TIMESTAMP(可空):uploaded_at
 *
 * 回滚(down):逆序 DROP 这 4 列。
 */
export class AddTranscribeTaskUploadMeta1781600000000
  implements MigrationInterface
{
  name = 'AddTranscribeTaskUploadMeta1781600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "interview_transcribe_tasks" ADD COLUMN "original_filename" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "interview_transcribe_tasks" ADD COLUMN "file_size_bytes" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "interview_transcribe_tasks" ADD COLUMN "mime_type" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "interview_transcribe_tasks" ADD COLUMN "uploaded_at" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 逆序回滚:与 up 的 ADD 顺序相反逐列 DROP。
    await queryRunner.query(
      `ALTER TABLE "interview_transcribe_tasks" DROP COLUMN "uploaded_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interview_transcribe_tasks" DROP COLUMN "mime_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interview_transcribe_tasks" DROP COLUMN "file_size_bytes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interview_transcribe_tasks" DROP COLUMN "original_filename"`,
    );
  }
}
