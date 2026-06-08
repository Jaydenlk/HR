import { IsNotEmpty, IsNumberString, IsOptional, IsString, validateSync } from 'class-validator';
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
