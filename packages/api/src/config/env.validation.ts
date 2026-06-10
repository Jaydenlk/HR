import { IsIn, IsNotEmpty, IsNumberString, IsOptional, IsString, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export class EnvironmentVariables {
  // ── AI 大模型(必填) ──────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  CLOUDDREAM_API_KEY!: string;

  // ── Auth(必填) ───────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  // ── AI 大模型(可选,字符串) ──────────────────────────────────────
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
}

export function validate(config: Record<string, unknown>): Record<string, unknown> {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.map((e) => e.toString()).join('\n')}`);
  }
  // 返回完整 config 而非仅声明字段的实例:@nestjs/config 用本函数返回值作为 ConfigService 的配置源。
  // 若只返回 validated 实例,DB_PATH/DB_TYPE/DB_HOST/DB_PORT/NODE_ENV 等未声明变量会被剥离 →
  // 生产 postgres 连接全部退回默认值、且 NODE_ENV 读不到致 synchronize 永不关闭(数据风险);
  // 测试也无法用 DB_PATH=:memory: 隔离(会污染 dev 库)。校验只覆盖声明的必填/可选子集,其余原样透传。
  return config;
}
