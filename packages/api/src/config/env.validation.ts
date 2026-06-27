import { IsIn, IsNotEmpty, IsNumberString, IsOptional, IsString, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { resolveMasterKey } from '../common/secret-crypto';

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

  // ── AI 通道密钥加密主密钥(可选声明,production 跨字段强制) ──────────────
  // AES-256-GCM 主密钥:64 位 hex(=32 字节)或 base64 解出 32 字节。
  // 缺失时:生产由 AiModule onModuleInit 拒绝启动;dev/test 降级只读(provider CRUD 被拒)。
  // 真值永不入库:.env.production 由运维写入,.env.production.example 仅占位。
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  PROVIDER_ENC_KEY?: string;

  // ── AI 通道顺序(可选):测试期默认 deepseek 主力,relay 备份,glm 可选第三通道。 ──
  @IsOptional()
  @IsIn(['deepseek', 'relay', 'glm'])
  AI_PRIMARY_PROVIDER?: string;

  // ── AI DeepSeek 直连(可选,字符串):分档型号 + 直连端点。旧名 DEEPSEEK_*/AI_FALLBACK_* 兜底。──
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  AI_DEEPSEEK_API_KEY?: string;

  @IsOptional()
  @IsString()
  AI_MODEL_PRO?: string;

  @IsOptional()
  @IsString()
  AI_MODEL_FLASH?: string;

  @IsOptional()
  @IsString()
  AI_DEEPSEEK_BASE_URL?: string;

  // ── AI Relay 中转(可选,字符串):auto-v2 别名。旧名 CLOUDDREAM_*/AI_PRIMARY_* 兜底。──
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  AI_RELAY_API_KEY?: string;

  @IsOptional()
  @IsString()
  AI_RELAY_MODEL?: string;

  @IsOptional()
  @IsString()
  AI_RELAY_BASE_URL?: string;

  // ── AI GLM 智谱直连(可选,字符串):Anthropic 兼容端点。缺 AI_GLM_API_KEY 时该通道不可用、不可设主力。──
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  AI_GLM_API_KEY?: string;

  @IsOptional()
  @IsString()
  AI_GLM_MODEL_PRO?: string;

  @IsOptional()
  @IsString()
  AI_GLM_MODEL_FLASH?: string;

  @IsOptional()
  @IsString()
  AI_GLM_BASE_URL?: string;

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
  AI_DEEPSEEK_TIMEOUT_MS?: string;

  @IsOptional()
  @IsNumberString()
  AI_DEEPSEEK_MAX_RETRIES?: string;

  @IsOptional()
  @IsNumberString()
  AI_RELAY_TIMEOUT_MS?: string;

  @IsOptional()
  @IsNumberString()
  AI_RELAY_MAX_RETRIES?: string;

  @IsOptional()
  @IsNumberString()
  AI_GLM_TIMEOUT_MS?: string;

  @IsOptional()
  @IsNumberString()
  AI_GLM_MAX_RETRIES?: string;

  @IsOptional()
  @IsNumberString()
  AI_MAX_CONCURRENCY?: string;

  @IsOptional()
  @IsNumberString()
  AI_MAX_QUEUE?: string;

  // ── AI 流式看门狗(watchdog-v2,可选) ──────────────────────────────────
  // chunk 间空闲超时(毫秒):默认 180000(3 分钟);真·TCP 半开挂死 3 分钟内必然触发,
  // 推理模型思考期(60-120s)不误杀(idle 重置点是 reader.read 返回)。
  @IsOptional()
  @IsNumberString()
  AI_STREAM_IDLE_MS?: string;

  // 流式总时长上限(毫秒):默认 900000(15 分钟);绝对宽裕,覆盖排队 + 多轮调用。
  @IsOptional()
  @IsNumberString()
  AI_STREAM_MAX_MS?: string;

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

  // 每日 AI 调用配额(整数);credit 完全替代制后 QuotaGuard 已退役、不再读取此值。
  // 保留为可选环境变量(不校验失败),避免存量 .env 注入时报未声明。
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

  // ── 联网搜索(可选) ──────────────────────────────────────────────
  // 博查 Web 搜索 API 密钥;仅 mock 模块的库外公司搜索使用。缺失时降级为通用模式。
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  BOCHA_API_KEY?: string;

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

  // ── 语音转写 StepFun ASR(可选;缺 STEP_API_KEY 时转写端点显式 503,不静默) ────────
  // 真实 key 由主代理写 .env.production,永不入库;此处仅声明,缺省值在 speech.config.ts。
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  STEP_API_KEY?: string;

  @IsOptional()
  @IsString()
  STEP_BASE_URL?: string;

  @IsOptional()
  @IsString()
  STEP_ASR_MODEL?: string;

  @IsOptional()
  @IsNumberString()
  STEP_TIMEOUT_MS?: string;

  @IsOptional()
  @IsNumberString()
  STEP_MAX_RETRIES?: string;

  // ── 语音合成 StepFun TTS(可选;复用 STEP_API_KEY,缺省值在 speech.config.ts) ────────
  @IsOptional()
  @IsString()
  STEP_TTS_MODEL?: string;

  @IsOptional()
  @IsString()
  STEP_TTS_VOICE?: string;

  @IsOptional()
  @IsString()
  STEP_TTS_FORMAT?: string;

  @IsOptional()
  @IsNumberString()
  STEP_TTS_TIMEOUT_MS?: string;

  @IsOptional()
  @IsNumberString()
  AUDIO_MAX_SIZE_MB?: string;
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
  // AI 通道密钥跨字段必填:至少配置一个通道(relay 或 deepseek)的密钥,否则无任何可用通道。
  //   relay    :AI_RELAY_API_KEY / CLOUDDREAM_API_KEY / AI_PRIMARY_API_KEY(旧名兜底)
  //   deepseek :AI_DEEPSEEK_API_KEY / DEEPSEEK_API_KEY / AI_FALLBACK_API_KEY(旧名兜底)
  const hasRelayKey =
    !!validated.AI_RELAY_API_KEY || !!validated.CLOUDDREAM_API_KEY || !!validated.AI_PRIMARY_API_KEY;
  const hasDeepseekKey =
    !!validated.AI_DEEPSEEK_API_KEY ||
    !!validated.DEEPSEEK_API_KEY ||
    !!validated.AI_FALLBACK_API_KEY;
  if (!hasRelayKey && !hasDeepseekKey) {
    throw new Error(
      'Environment validation failed:\n必须配置至少一个 AI 通道密钥(AI_DEEPSEEK_API_KEY 或 AI_RELAY_API_KEY,或旧名 DEEPSEEK_API_KEY/CLOUDDREAM_API_KEY)',
    );
  }
  // JWT_SECRET 强度跨字段校验(仅 production 强制,对齐 main.ts 启动期自检语义):
  // 不得为占位 'dev-secret'(config.get 三处兜底用的弱默认),长度须 ≥32,否则可被猜测密钥自签 admin token 越权。
  // 非生产放行(开发/测试常用短密钥),与现有 AI key 二选一手写校验同处跨字段块。
  if (config.NODE_ENV === 'production') {
    const jwtSecret = validated.JWT_SECRET;
    if (jwtSecret === 'dev-secret' || jwtSecret.length < 32) {
      throw new Error(
        'Environment validation failed:\nproduction 环境 JWT_SECRET 必须为强随机值(长度 ≥32 且非占位 dev-secret),否则可被猜测密钥自签 admin token 越权。',
      );
    }
    // PROVIDER_ENC_KEY 强约束:production 必须为合法 32 字节主密钥(hex 64 位或 base64),
    // 否则 ai_providers 表里加密的通道密钥无法解密 → AI 全线不可用且静默降级风险高。
    // 与 AiModule onModuleInit 的 fail-fast 双重防护(任一拦下即拒启)。
    if (!resolveMasterKey(validated.PROVIDER_ENC_KEY)) {
      throw new Error(
        'Environment validation failed:\nproduction 环境必须配置合法 PROVIDER_ENC_KEY(64 位 hex 或 base64 解出 32 字节),否则加密的 AI 通道密钥无法解密。',
      );
    }
  }
  // 返回完整 config 而非仅声明字段的实例:@nestjs/config 用本函数返回值作为 ConfigService 的配置源。
  // 若只返回 validated 实例,DB_PATH/DB_TYPE/DB_HOST/DB_PORT/NODE_ENV 等未声明变量会被剥离 →
  // 生产 postgres 连接全部退回默认值、且 NODE_ENV 读不到致 synchronize 永不关闭(数据风险);
  // 测试也无法用 DB_PATH=:memory: 隔离(会污染 dev 库)。校验只覆盖声明的必填/可选子集,其余原样透传。
  return config;
}
