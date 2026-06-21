import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * interview_transcribe_tasks 表新增 analysis_charged 列 + 回填存量行(纯加法,无破坏性变更)。
 *
 * 背景:一次录音转写复盘的计费从「转写时一次性扣满 7」改为按进度分两段(转写 1 点 + 分析 6 点 = 7 点)。
 * 分析费 6 点在 confirm「分析真实成功」(落 completed)那一刻扣,且以本列做幂等护栏:confirm 分析成功后
 * 置 true,重试时据此不重扣。
 *
 * 存量回扣风险(本特性上线前已按旧「7 点一次扣满」模型结清的行):若新增列默认 false 而不回填,部署后这些
 * 存量任务一旦走 confirm,chargeAnalysis 会因 analysis_charged=false 再扣 6 点 → 单次复盘共扣 13(7+6),
 * 严重多扣。受影响的不止 completed:awaiting_confirm / analyzing / failed@analyzing 这些「转写费已按旧模型
 * 扣过、但尚可进入 confirm」的态同样会被二次扣 6。
 *
 *  - up():ADD COLUMN analysis_charged boolean NOT NULL DEFAULT false,随后回填——把所有「上线前已按旧 7 点
 *    模型结清转写费、且可能再走 confirm」的存量行标 analysis_charged=true,使其 confirm 时 CAS
 *    (WHERE analysis_charged=false)命中 0 行 → 不再扣 6。回填覆盖:
 *      status ∈ (awaiting_confirm, analyzing, completed) 或 (failed 且 failed_at_stage='analyzing')。
 *    其余 failed 态(转写/打标阶段失败)本就需重新上传、不进 confirm 分析路径,无回扣风险,不回填(保持 false)。
 *  - 上线后新建的任务初始 false:首次 confirm 由 CAS 抢到结算权正常扣 6,行为不受回填影响。
 *
 * 类型映射依据 TypeORM PostgresDriver(与既有迁移头注一致):
 *   @Column({ type:'boolean', default:false }) → boolean NOT NULL DEFAULT false。
 * SQLite 开发/测试态由 synchronize 自动加列,本迁移只管 Postgres(与既有 Add* 迁移口径一致)。
 *
 * 回滚(down):删该列(列没了回填值自然消失,对称可回滚)。
 */
export class AddTranscribeTaskAnalysisCharged1782200000000 implements MigrationInterface {
  name = 'AddTranscribeTaskAnalysisCharged1782200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "interview_transcribe_tasks" ADD COLUMN "analysis_charged" boolean NOT NULL DEFAULT false`,
    );
    // 回填:上线前已按旧「7 点一次扣满」模型结清转写费、且仍可能走 confirm 的存量行标已结算,防部署后二次扣 6。
    await queryRunner.query(
      `UPDATE "interview_transcribe_tasks" SET "analysis_charged" = true ` +
        `WHERE "status" IN ('awaiting_confirm','analyzing','completed') ` +
        `OR ("status" = 'failed' AND "failed_at_stage" = 'analyzing')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "interview_transcribe_tasks" DROP COLUMN "analysis_charged"`,
    );
  }
}
