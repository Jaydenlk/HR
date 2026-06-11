/**
 * 初始迁移冒烟测试(不依赖运行中的 Postgres)。
 *
 * 本机/CI 无 PG 实例,无法真正执行 SQL,故改为「捕获迁移发出的全部 SQL 语句」做结构断言:
 *  - up() 为仓库当前全部实体各建一张表,且建表语句与实体表名一一对应(漏建/多建即失败)。
 *  - 所有 @JoinColumn FK 列声明为 uuid(TypeORM 把 join 列类型对齐被引用 PK=uuid;
 *    若误写 character varying,Postgres 建 FK 时会因类型不匹配报错 —— 此断言提前拦截)。
 *  - up() 建的每张表在 down() 都有对应 DROP(迁移可回滚)。
 *  - uuid 主键默认值用 gen_random_uuid()(与 data-source uuidExtension='pgcrypto' 一致)。
 *
 * 真正的 migration:run + seed 端到端冒烟需 Postgres,见 handoff 验证清单(本机 SKIPPED)。
 */
import { QueryRunner } from 'typeorm';
import { InitialSchema1781186894991 } from '../src/database/migrations/1781186894991-InitialSchema';

// 仓库当前全部实体对应的表名(新增实体务必同步本清单 + 迁移)。
const EXPECTED_TABLES = [
  'users',
  'login_codes',
  'invite_codes',
  'ai_usage',
  'resumes',
  'resume_versions',
  'diagnoses',
  'applications',
  'application_events',
  'conversations',
  'messages',
  'cover_letters',
  'interviews',
  'mock_sessions',
  'daily_tasks',
  'salary_entries',
  'companies',
  'departments',
  'role_categories',
  'feed_sources',
  'coverage_metrics',
  'feed_items',
  'digest_runs',
  'opportunities',
  'opportunity_actions',
  'opportunity_evaluations',
  'opportunity_evidence',
  'ops_events',
];

// @JoinColumn 装饰的 FK 列(表名 -> 列名),全部应为 uuid。
const JOIN_COLUMNS: ReadonlyArray<readonly [string, string]> = [
  ['resumes', 'user_id'],
  ['resume_versions', 'resume_id'],
  ['diagnoses', 'user_id'],
  ['diagnoses', 'resume_id'],
  ['applications', 'user_id'],
  ['application_events', 'application_id'],
  ['conversations', 'user_id'],
  ['messages', 'conversation_id'],
  ['cover_letters', 'user_id'],
  ['interviews', 'user_id'],
  ['interviews', 'application_id'],
  ['mock_sessions', 'user_id'],
  ['daily_tasks', 'user_id'],
  ['salary_entries', 'user_id'],
  ['departments', 'company_id'],
  ['feed_items', 'user_id'],
  ['feed_items', 'source_id'],
  ['feed_items', 'company_id'],
  ['feed_items', 'department_id'],
  ['feed_items', 'role_category_id'],
  ['digest_runs', 'source_id'],
  ['opportunities', 'user_id'],
  ['opportunity_actions', 'opportunity_id'],
  ['opportunity_evaluations', 'opportunity_id'],
  ['opportunity_evidence', 'opportunity_id'],
];

// 迁移 up()/down() 只调用 queryRunner.query();故替身仅需实现 query 一项,用 Pick 精确取这一成员,
// 避免 `as unknown as QueryRunner` 的全量强转(类型红线)。RecordingRunner 是 QueryRunner 的超类型
// (仅含 query),向 QueryRunner 收窄属合法 downcast,单次 `as` 即可,无需经 unknown 中转。
type RecordingRunner = Pick<QueryRunner, 'query'>;

/** 仅记录 SQL、不连库的 QueryRunner 替身(只实现 query)。 */
function makeRecordingRunner(): { runner: QueryRunner; sql: string[] } {
  const sql: string[] = [];
  const recording: RecordingRunner = {
    query: (q: string): Promise<unknown> => {
      sql.push(q);
      return Promise.resolve(undefined);
    },
  };
  return { runner: recording as QueryRunner, sql };
}

/** 提取某表的 CREATE TABLE 语句正文(用于列级断言)。 */
function findCreateTable(sql: string[], table: string): string | undefined {
  return sql.find((q) => new RegExp(`CREATE TABLE "${table}"\\s*\\(`).test(q));
}

describe('InitialSchema1781186894991 迁移结构', () => {
  const migration = new InitialSchema1781186894991();

  it('类可实例化且 name 正确', () => {
    expect(migration.name).toBe('InitialSchema1781186894991');
  });

  it('up() 为每个实体表发出 CREATE TABLE,无遗漏', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);

    for (const table of EXPECTED_TABLES) {
      expect(findCreateTable(sql, table)).toBeDefined();
    }
    // 不应建出清单外的表(防误增)。
    const created = sql
      .map((q) => q.match(/CREATE TABLE "([a-z_]+)"/)?.[1])
      .filter((t): t is string => Boolean(t));
    expect(created.sort()).toEqual([...EXPECTED_TABLES].sort());
  });

  it('up() 先启用 pgcrypto 扩展(gen_random_uuid 依赖)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    expect(sql.some((q) => /CREATE EXTENSION IF NOT EXISTS "pgcrypto"/.test(q))).toBe(true);
  });

  it('全部 uuid 主键默认 gen_random_uuid()', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    for (const table of EXPECTED_TABLES) {
      const ddl = findCreateTable(sql, table);
      expect(ddl).toBeDefined();
      expect(ddl).toMatch(/"id" uuid NOT NULL DEFAULT gen_random_uuid\(\)/);
    }
  });

  it('所有 @JoinColumn FK 列声明为 uuid(与被引用 PK 类型对齐)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);

    for (const [table, column] of JOIN_COLUMNS) {
      const ddl = findCreateTable(sql, table);
      expect(ddl).toBeDefined();
      // 形如:"user_id" uuid  (后接 NOT NULL 或逗号/换行)
      const pattern = new RegExp(`"${column}" uuid(\\s+NOT NULL)?\\s*,`);
      expect(pattern.test(ddl as string)).toBe(true);
    }
  });

  it('外键 onDelete 同时含 CASCADE 与 SET NULL(与实体一致)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.up(runner);
    const joined = sql.join('\n');
    expect(joined).toMatch(/FK_feed_items_source[\s\S]*?ON DELETE SET NULL/);
    expect(joined).toMatch(/FK_resumes_user[\s\S]*?ON DELETE CASCADE/);
  });

  it('down() 为每个实体表发出 DROP TABLE(可回滚)', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.down(runner);
    for (const table of EXPECTED_TABLES) {
      expect(sql.some((q) => new RegExp(`DROP TABLE "${table}"`).test(q))).toBe(true);
    }
  });

  it('down() 在删表前先撤所有外键约束', async () => {
    const { runner, sql } = makeRecordingRunner();
    await migration.down(runner);
    const firstDropConstraint = sql.findIndex((q) => /DROP CONSTRAINT/.test(q));
    const firstDropTable = sql.findIndex((q) => /DROP TABLE/.test(q));
    expect(firstDropConstraint).toBeGreaterThanOrEqual(0);
    expect(firstDropConstraint).toBeLessThan(firstDropTable);
  });
});
