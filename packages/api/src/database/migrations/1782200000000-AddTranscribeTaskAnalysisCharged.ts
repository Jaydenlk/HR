import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * interview_transcribe_tasks 表新增 analysis_charged 列(纯 ADD COLUMN,无破坏性变更)。
 *
 * 背景:一次录音转写复盘按进度分两段计费(转写 1 点 + 分析 6 点 = 7 点)。分析费 6 点在 confirm
 * 「分析真实成功」(落 completed)那一刻扣,且必须幂等——分析阶段失败可免重传重试,重试成功只补扣
 * 那一次 6 点,绝不双扣。本列即该幂等护栏:confirm 分析成功后无条件置 true,重试时据此判断是否已结算。
 *  - analysis_charged:boolean NOT NULL DEFAULT false。存量行(本特性上线前)默认 false——
 *    它们要么早已 completed(不再走 confirm,无从重扣),要么处于失败/进行中态(后续 confirm 成功自然扣 6),
 *    DEFAULT false 对存量无任何回扣风险。
 *
 * 类型映射依据 TypeORM PostgresDriver(与既有迁移头注一致):
 *   @Column({ type:'boolean', default:false }) → boolean NOT NULL DEFAULT false。
 * SQLite 开发/测试态由 synchronize 自动加列,本迁移只管 Postgres(与既有 Add* 迁移口径一致)。
 *
 * 回滚(down):删该列。
 */
export class AddTranscribeTaskAnalysisCharged1782200000000 implements MigrationInterface {
  name = 'AddTranscribeTaskAnalysisCharged1782200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "interview_transcribe_tasks" ADD COLUMN "analysis_charged" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "interview_transcribe_tasks" DROP COLUMN "analysis_charged"`,
    );
  }
}
