// e2e 测试隔离:强制所有 e2e 用独立内存 sqlite,避免写入并污染 dev 库 coach-dev.db。
// setupFiles 在每个测试文件加载前最早执行 → 在 AppModule/ConfigModule 初始化前设好 DB_PATH。
// 依赖 env.validation.validate 透传未声明变量(已修),否则 DB_PATH 会被剥离而失效。
process.env.DB_TYPE = 'sqlite';
process.env.DB_PATH = ':memory:';
