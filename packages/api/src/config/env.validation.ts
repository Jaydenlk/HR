import { IsIn, IsNotEmpty, IsNumberString, IsOptional, IsString, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export class EnvironmentVariables {
  // ── AI 大模型主通道密钥 ────────────────────────────────────────────
  // 槽位新名 AI_PRIMARY_API_KEY 与旧名 CLOUDDREAM_API_KEY 二者命中其一即通过
  // (跨字段必填在 validate() 内手动校验,class-validator 单字段无法表达"二选一必填")。
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  AI_PRIMARY_API_KEY?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  CLOUDDREAM_API_KEY?: string;

  // ── Auth(必填) ───────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  // ── AI 大模型(可选,字符串):新名 AI_PRIMARY_*/AI_FALLBACK_* + 旧名兜底 ──
  @IsOptional()
  @IsString()
  AI_PRIMARY_MODEL?: string;

  @IsOptional()
  @IsString()
  AI_PRIMARY_BASE_URL?: string;

  @IsOptional()
  @IsString()
  AI_FALLBACK_API_KEY?: string;

  @IsOptional()
  @IsString()
  AI_FALLBACK_MODEL?: string;

  @IsOptional()
  @IsString()
  AI_FALLBACK_BASE_URL?: string;

  @IsOptional()
  @IsString()
  CLOUDDREAM_MODEL?: string;

  @IsOptional()
  @IsString()
  CLOUDDREAM_BASE_URL?: string;

  @IsOptional()
  @IsString()
  DEEPSEEK_API_KEY?: string;

  @IsOptional()
  @IsString()
  DEEPSEEK_MODEL?: string;

  @IsOptional()
  @IsString()
  DEEPSEEK_BASE_URL?: string;

  // ── AI 大模型(可选,数值) ─────────────────────────────────────────
  @IsOptional()
  @IsNumberString()
  AI_PRIMARY_TIMEOUT_MS?: string;

  @IsOptional()
  @IsNumberString()
  AI_FALLBACK_TIMEOUT_MS?: string;

  @IsOptional()
  @IsNumberString()
  AI_PRIMARY_MAX_RETRIES?: string;

  @IsOptional()
  @IsNumberString()
  AI_FALLBACK_MAX_RETRIES?: string;

  @IsOptional()
  @IsNumberString()
  AI_MAX_CONCURRENCY?: string;

  @IsOptional()
  @IsNumberString()
  AI_MAX_QUEUE?: string;

  // ── HTTP(可选,数值) ──────────────────────────────────────────────
  @IsOptional()
  @IsNumberString()
  PORT?: string;

  @IsOptional()
  @IsNumberString()
  HTTP_REQUEST_TIMEOUT_MS?: string;

  @IsOptional()
  @IsNumberString()
  HTTP_HEADERS_TIMEOUT_MS?: string;

  @IsOptional()
  @IsNumberString()
  HTTP_KEEPALIVE_TIMEOUT_MS?: string;

  // ── 邮件 SMTP(可选;production 由 main.ts 检查 SMTP_HOST 必填) ────────
  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsOptional()
  @IsNumberString()
  SMTP_PORT?: string;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  @IsOptional()
  @IsString()
  SMTP_FROM?: string;

  // ── 试运行运营(可选) ─────────────────────────────────────────────
  // 管理员邮箱白名单,逗号分隔;登录时邮箱命中即提升 role=admin。
  @IsOptional()
  @IsString()
  ADMIN_EMAILS?: string;

  // 每日 AI 调用配额(整数,默认 20);QuotaGuard 经 ConfigService 读取。
  @IsOptional()
  @IsNumberString()
  DAILY_AI_QUOTA?: string;

  // CORS 来源白名单,逗号分隔;未配置且非 production 时回退 origin:true。
  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  // 测试通道开关:'1' 时开放 POST /api/auth/dev-login(免验证码免邀请码登录)。
  // 仅供本地/试运行联调,production 严禁开启(端点另有 NODE_ENV!=='production' 二重保护)。
  @IsOptional()
  @IsIn(['0', '1'])
  DEV_LOGIN?: string;

  // ── 数据库迁移(可选) ─────────────────────────────────────────────
  // '1' 时在 postgres 连接初始化阶段自动跑迁移;默认不设=不自动跑,由 CLI 显式 migration:run。
  // sqlite(dev)走 synchronize 不读此项。
  @IsOptional()
  @IsIn(['0', '1'])
  DB_MIGRATIONS_RUN?: string;

  // ── 备份(可选) ───────────────────────────────────────────────────
  // 备份脚本(scripts/backup.sh)输出目录;留空默认 packages/api/backups。
  @IsOptional()
  @IsString()
  BACKUP_DIR?: string;

  // ── 版本标识(可选) ───────────────────────────────────────────────
  // GET /api/health 的 version 字段读取本值,回退 'unknown';建议填镜像 tag / git short sha。
  @IsOptional()
  @IsString()
  APP_VERSION?: string;
}

// 测试密封名单:这些运营开关只应来自显式 process.env,绝不从 .env 文件泄入测试。
// jest-setup-env.ts(setupFiles)置 __SEAL_OPS_ENV__='1' 时,validate 对名单内、
// 且当前不在 process.env 的键直接剔除——使 .env 中的 DEV_LOGIN=1/ADMIN_EMAILS 不污染
// auth/admin 套件(它们各自用 process.env 显式自管这两个键)。生产/正常运行不置该旗标,行为不变。
const SEALED_OPS_ENV_KEYS = ['DEV_LOGIN', 'ADMIN_EMAILS'] as const;

export function validate(config: Record<string, unknown>): Record<string, unknown> {
  // 把值为空字符串(或纯空白)的键从待校验输入中剔除。
  // 动机:.env 模板约定"留空走默认",但 docker compose env_file 会把 `KEY=` 这类
  // 空值行注入为 '' 而非 undefined。class-validator 的 @IsOptional() 只豁免
  // null/undefined,不豁免空串——导致 isIn/isNumberString 约束失败,容器启动即崩。
  // 剔除后:可选项走字段默认值;必填项被视为"缺失"而非"非法值",报错语义更准确。
  for (const key of Object.keys(config)) {
    const val = config[key];
    if (typeof val === 'string' && val.trim() === '') {
      delete config[key];
    }
  }
  if (process.env.__SEAL_OPS_ENV__ === '1') {
    for (const key of SEALED_OPS_ENV_KEYS) {
      if (!(key in process.env)) delete config[key];
    }
  }
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.map((e) => e.toString()).join('\n')}`);
  }
  // 主通道密钥跨字段必填:新名 AI_PRIMARY_API_KEY 或旧名 CLOUDDREAM_API_KEY 至少有一个非空。
  if (!validated.AI_PRIMARY_API_KEY && !validated.CLOUDDREAM_API_KEY) {
    throw new Error(
      'Environment validation failed:\n必须配置主通道密钥(AI_PRIMARY_API_KEY,或旧名 CLOUDDREAM_API_KEY)',
    );
  }
  // 返回完整 config 而非仅声明字段的实例:@nestjs/config 用本函数返回值作为 ConfigService 的配置源。
  // 若只返回 validated 实例,DB_PATH/DB_TYPE/DB_HOST/DB_PORT/NODE_ENV 等未声明变量会被剥离 →
  // 生产 postgres 连接全部退回默认值、且 NODE_ENV 读不到致 synchronize 永不关闭(数据风险);
  // 测试也无法用 DB_PATH=:memory: 隔离(会污染 dev 库)。校验只覆盖声明的必填/可选子集,其余原样透传。
  return config;
}
