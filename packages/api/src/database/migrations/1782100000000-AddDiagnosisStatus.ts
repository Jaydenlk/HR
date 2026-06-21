import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * diagnoses 表新增「单次诊断成败记账」三列(纯 ADD COLUMN,无破坏性变更)。
 *
 * 背景:此前只有【全局 AI 成功率】(/admin/success-stats:ai_usage 成功 vs ops_events AI_CALL_FAILED,
 * 横跨所有端点)。它无法回答「某一次诊断本身成没成、为什么没成」。本迁移给每行诊断补成败状态:
 *  - status:'success' / 'failed' / 'partial'(可空)。存量行(本特性上线前)留 NULL —— 视为「未记账」,
 *    统计端(/admin/diagnosis-stats)把 NULL 排除在分母外,绝不污染历史数据。
 *  - failure_reason:失败归类(可空):input_validation | parser_error | analyzer_timeout |
 *    analyzer_error | rewriter_error | client_disconnect | unknown。
 *  - pipeline_error_message:原始错误信息(可空,text);供后台排障,不投影给用户。
 *
 * 与全局 AI 成功率的关系:两个【独立指标】,互不并计。诊断成功率按 diagnoses.status 聚合(每次诊断一行),
 * AI 成功率按 ai_usage/ops_events 聚合(每次 AI 调用一条)。一次诊断内含多次 AI 调用,故两者口径天然不同。
 *
 * 类型映射依据 TypeORM PostgresDriver(与既有迁移头注一致):@Column varchar → character varying;
 *   @Column({type:'text'}) → text。三列均可空(无 NOT NULL / 无 DEFAULT),存量行回填后即 NULL。
 * SQLite 开发/测试态由 synchronize 自动加列,本迁移只管 Postgres(与既有 Add* 迁移口径一致)。
 *
 * 回滚(down):逆序删 3 列。
 */
export class AddDiagnosisStatus1782100000000 implements MigrationInterface {
  name = 'AddDiagnosisStatus1782100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "diagnoses" ADD COLUMN "status" character varying`);
    await queryRunner.query(
      `ALTER TABLE "diagnoses" ADD COLUMN "failure_reason" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "diagnoses" ADD COLUMN "pipeline_error_message" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "diagnoses" DROP COLUMN "pipeline_error_message"`);
    await queryRunner.query(`ALTER TABLE "diagnoses" DROP COLUMN "failure_reason"`);
    await queryRunner.query(`ALTER TABLE "diagnoses" DROP COLUMN "status"`);
  }
}
