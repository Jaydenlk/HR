// e2e 测试隔离:强制所有 e2e 用独立内存 sqlite,避免写入并污染 dev 库 coach-dev.db。
// setupFiles 在每个测试文件加载前最早执行 → 在 AppModule/ConfigModule 初始化前设好 DB_PATH。
// 依赖 env.validation.validate 透传未声明变量(已修),否则 DB_PATH 会被剥离而失效。
process.env.DB_TYPE = 'sqlite';
process.env.DB_PATH = ':memory:';
// 默认关闭全局限流:e2e 多用户共享 127.0.0.1 高频请求会误触 ThrottlerGuard。
// 限流自身的验证由 throttle.e2e-spec.ts 在用例内显式打开(delete 本变量后建模块)完成。
process.env.DISABLE_THROTTLE = '1';
// 默认放开每日 AI 配额:功能型 AI e2e(follow-up/offer-comparator 等)单用户调用数远超默认 20,
// 会被 QuotaGuard 提前 429 误伤。
// 注意:AppModule 的 ConfigModule cache:true 在「import 时」快照本键,故必须在此(setupFiles
// 早于任何 import 执行)设置才对所有 AppModule-based 套件生效;运行时再改无效。
// 因此 quota.e2e 的封顶用例改用 per-user daily_quota_override(DB 运行时读取、优先于全局)验证,
// 不受本全局默认影响。
process.env.DAILY_AI_QUOTA = '100000';
