/**
 * 列类型映射工具 —— 双端(better-sqlite3 / postgres)兼容。
 *
 * 背景:可空时间列的 TS 类型是 `Date | null`(联合类型),emitDecoratorMetadata 对联合类型只能反射出
 * `Object`,TypeORM 无法据此推出列类型,故这类列必须显式标 type。但 better-sqlite3 只认 'datetime'、
 * postgres 只认 'timestamp',两者互不支持,写死任一字面量都会在另一端 buildMetadatas 抛 DataTypeNotSupportedError。
 *
 * 解法:按 DB_TYPE 在装饰器求值期(模块加载时)选出当前驱动支持的时间列类型。
 * DB_TYPE 在两端都在进程启动前注入(dev/test 由 shell/jest 设,生产由 compose env_file 注入)。
 * main.ts 与 data-source.ts 均已在顶部前置装载 .env,裸启动时装饰器求值期即可见 DB_TYPE,
 * 与 seed.ts 读取 process.env.DB_TYPE 的口径一致。
 */
import type { ColumnType } from 'typeorm';

/** 当前驱动支持的「日期时间」列类型:postgres → 'timestamp',其余(better-sqlite3)→ 'datetime'。 */
export const TIMESTAMP_COLUMN_TYPE: ColumnType =
  (process.env.DB_TYPE ?? 'sqlite') === 'postgres' ? 'timestamp' : 'datetime';

/**
 * 当前驱动支持的「结构化 JSON」列类型:postgres → 'jsonb'(可被 ->>/@> 等操作符查询,
 * T3 职业维基 occupation_entries.skeleton 需要这个能力供未来推荐系统查询结构化字段);
 * 其余(better-sqlite3,仅 e2e 用)→ 'simple-json'(与仓库其它 JSON 列一致落 text,
 * TypeORM 仍自动做 JS 对象 ↔ 字符串的序列化/反序列化,应用层代码无需感知差异)。
 */
export const JSONB_COLUMN_TYPE: ColumnType =
  (process.env.DB_TYPE ?? 'sqlite') === 'postgres' ? 'jsonb' : 'simple-json';
