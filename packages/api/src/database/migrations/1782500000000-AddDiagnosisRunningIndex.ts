import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * diagnoses 表新增 (user_id, status) 复合索引(纯 ADD INDEX,无破坏性变更)。
 *
 * 背景:S0「流式任务状态保持与防重复」给 diagnoses.status 引入了新枚举值 'running'(发起即插的最小行)。
 * 由此新增两条按 (user_id, status='running') 过滤的读路径:
 *   - 防重复查重 findRunningConflict:发起诊断前查「同用户同 mode 未超时进行中诊断」→ 存在则 409(不重复扣费);
 *   - 回来可见 / 惰性防僵尸:findAllByUser / findOne 读取时扫 running 行做孤儿判死。
 * 这两条路径高频命中 user_id + status 过滤,加复合索引避免线上诊断表增大后退化为全表扫描。
 *
 * 'running' 本身【不需要 DDL】——status 是既有 varchar 可空列(无 CHECK 约束),天然容纳新枚举值,
 * 故本迁移不新增/不修改任何列,只补一个查询索引;存量行的 status 值(success/failed/partial/NULL)一律不动。
 *
 * 类型/风格依据既有迁移(1782100000000-AddDiagnosisStatus)。SQLite 开发/测试态由 synchronize 处理,
 * 本迁移只管 Postgres(与既有 Add* 迁移口径一致);IF NOT EXISTS 保证对已手工建过索引的库幂等。
 *
 * 回滚(down):DROP 该索引(不碰任何数据)。
 */
export class AddDiagnosisRunningIndex1782500000000 implements MigrationInterface {
  name = 'AddDiagnosisRunningIndex1782500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_diagnoses_user_status" ON "diagnoses" ("user_id", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_diagnoses_user_status"`);
  }
}
