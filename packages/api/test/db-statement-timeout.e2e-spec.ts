import type { DataSource } from 'typeorm';

// DB statement_timeout(单语句超时,防失控查询独占池化连接)的配置级验证。
//
// e2e 全程走内存 sqlite(jest-setup-env 强制 DB_TYPE=sqlite),postgres 分支不会被真连;
// 故这里只验证「TypeORM postgres 选项里确实带上了 extra.statement_timeout,且默认 30000、可经
// DB_STATEMENT_TIMEOUT_MS 覆盖」——sqlite e2e 不会真触发 pg 的 statement_timeout,如实记录。
//
// 用 jest.isolateModules 在「设好 env」后全新 require data-source.ts,让其 buildOptions() 按当次
// env 重新装配(AppDataSource 在模块加载时即据 process.env 构建一次,无法事后改)。
describe('DB statement_timeout 配置(防失控查询独占连接)', () => {
  const SAVED: Record<string, string | undefined> = {};
  const KEYS = ['DB_TYPE', 'DB_STATEMENT_TIMEOUT_MS'];

  beforeEach(() => {
    for (const k of KEYS) SAVED[k] = process.env[k];
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (SAVED[k] === undefined) delete process.env[k];
      else process.env[k] = SAVED[k];
    }
  });

  // 在给定 env 下全新加载 data-source.ts,返回其 AppDataSource 的选项。
  function loadOptions(): DataSource['options'] {
    let options!: DataSource['options'];
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('../src/database/data-source') as { AppDataSource: DataSource };
      options = mod.AppDataSource.options;
    });
    return options;
  }

  it('postgres 默认携带 extra.statement_timeout=30000', () => {
    process.env.DB_TYPE = 'postgres';
    delete process.env.DB_STATEMENT_TIMEOUT_MS;
    const options = loadOptions();
    expect(options.type).toBe('postgres');
    const extra = (options as { extra?: { statement_timeout?: number } }).extra;
    expect(extra).toBeDefined();
    expect(extra!.statement_timeout).toBe(30000);
  });

  it('DB_STATEMENT_TIMEOUT_MS 覆盖默认值', () => {
    process.env.DB_TYPE = 'postgres';
    process.env.DB_STATEMENT_TIMEOUT_MS = '8000';
    const options = loadOptions();
    const extra = (options as { extra?: { statement_timeout?: number } }).extra;
    expect(extra!.statement_timeout).toBe(8000);
  });
});
