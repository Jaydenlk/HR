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

  // ── AI 大模型(可选,数值) ─────────────────────────────────────────
  @IsOptional()
  @IsNumberString()
  AI_PRIMARY_TIMEOUT_MS?: string;

  @IsOptional()
  @IsNumberString()
  AI_FALLBACK_TIMEOUT_MS?: string;

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

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.map((e) => e.toString()).join('\n')}`);
  }
  return validated;
}
