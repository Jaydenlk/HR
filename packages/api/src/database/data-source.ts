/**
 * TypeORM CLI 数据源 —— 仅供 migration:generate / migration:run / migration:revert 使用。
 *
 * 运行期(NestJS)的数据源在 app.module.ts 的 TypeOrmModule.forRootAsync 里另行装配,
 * 二者共用同一套 DB_* 环境变量,保证 CLI 生成/执行的迁移与运行期连接的是同一个库。
 *
 * 用法(经 package.json scripts 封装,见 module_wiring_needed):
 *   typeorm-ts-node-commonjs migration:run    -d src/database/data-source.ts
 *   typeorm-ts-node-commonjs migration:revert  -d src/database/data-source.ts
 *   typeorm-ts-node-commonjs migration:generate src/database/migrations/<Name> -d src/database/data-source.ts
 *
 * 设计取舍:
 * - uuid 主键在 Postgres 用 gen_random_uuid()(pgcrypto / PG13+ 内置),故 uuidExtension 固定 'pgcrypto',
 *   与初始迁移里写死的 DEFAULT gen_random_uuid() 完全一致。
 * - migrationsRun 一律 false:迁移由 CLI 显式触发,绝不在连接初始化时隐式跑(避免误迁移)。
 * - synchronize 一律 false:CLI 数据源永不自动改表,所有 schema 变更只走迁移文件。
 */
import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';

// CLI 在 Nest 之外运行,需自行加载 packages/api/.env(与运行期同一份配置源)。
// dotenv 为可选:生产用进程管理器(systemd/docker)注入环境变量,无 .env 时静默跳过。
loadDotenvIfPresent(path.resolve(__dirname, '..', '..', '.env'));

function loadDotenvIfPresent(envPath: string): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require('dotenv') as { config: (opts: { path: string }) => unknown };
    dotenv.config({ path: envPath });
  } catch {
    // dotenv 未安装 → 依赖进程环境变量,正常。
  }
}

// 实体与迁移用 glob 自动发现:ts-node 命中 .ts,编译产物命中 .js。
const entities = [path.resolve(__dirname, '..', '**', '*.entity.{ts,js}')];
const migrations = [path.resolve(__dirname, 'migrations', '*.{ts,js}')];

function buildOptions(): DataSourceOptions {
  const dbType = process.env.DB_TYPE ?? 'sqlite';

  if (dbType === 'sqlite') {
    // dev 本地用 sqlite:仅为让 CLI 在无 Postgres 环境也能跑通(如本机迁移冒烟)。
    return {
      type: 'better-sqlite3',
      database: process.env.DB_PATH ?? './coach-dev.db',
      entities,
      migrations,
      synchronize: false,
      migrationsRun: false,
      logging: false,
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER ?? 'coach',
    password: process.env.DB_PASS ?? 'coach',
    database: process.env.DB_NAME ?? 'coach',
    entities,
    migrations,
    // gen_random_uuid() 走 pgcrypto:与初始迁移内写死的 uuid 默认值保持一致。
    uuidExtension: 'pgcrypto',
    // 单语句超时(毫秒):与运行期(app.module.ts)一致,防 CLI 迁移/失控查询长期独占连接。
    // 默认 30s,经 DB_STATEMENT_TIMEOUT_MS 覆盖。
    extra: {
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS ?? '30000', 10),
    },
    synchronize: false,
    migrationsRun: false,
    logging: false,
  };
}

// 只导出单个具名 DataSource:typeorm CLI 的 loadDataSource 要求文件「只含一个 DataSource 导出」,
// 若再加 `export default AppDataSource` 会被判为两个 DataSource 导出而报
// "must contain only one export of DataSource instance",故不提供 default 导出。
export const AppDataSource = new DataSource(buildOptions());
