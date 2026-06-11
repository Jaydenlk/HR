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
// AppModule 在 import 时即调用 ConfigModule.forRoot({ validate }),校验 CLOUDDREAM_API_KEY/JWT_SECRET
// 必填。直接 import AppModule 的套件(quota/admin 等)若是 worker 内首个加载者,beforeAll 还来不及设值。
// 故在 setupFiles(早于任何 import)铺设测试默认值;套件内可再覆盖。
if (!process.env.CLOUDDREAM_API_KEY) process.env.CLOUDDREAM_API_KEY = 'test-key';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret';
// ── 运营开关密封基线 ───────────────────────────────────────────────────────
// 本地 .env 含 DEV_LOGIN=1 / ADMIN_EMAILS=admin@coach.dev,经 ConfigModule.forRoot
// 的 dotenv 注入,会泄入 AppModule-based 测试:
//   - auth.e2e 期望 dev-login 端点在未开启时 404(DEV_LOGIN 应 undefined);
//   - auth-dev-login.e2e 自管 DEV_LOGIN 各组合,delete 后期望真的 undefined。
// 仅删 process.env 不够:auth-dev-login 的内联 ConfigModule(cache:false)会再次 dotenv
// 读 .env、把 DEV_LOGIN=1 写回(assignVariablesToProcess 只跳过「已存在」键,被删的会重写入)。
// 故双管齐下:① 这里删除建立干净基线;② 置 __SEAL_OPS_ENV__ 旗标,让 env.validation.validate
// 对「不在 process.env 的密封键」从 .env 合并结果中剔除——AI 等其它 .env 键不受影响(AI-live 套件仍可用真钥)。
// 各套件需要时在用例内用 process.env 显式自管(beforeAll 设、afterAll 删)即可。
delete process.env.DEV_LOGIN;
delete process.env.ADMIN_EMAILS;
process.env.__SEAL_OPS_ENV__ = '1';
