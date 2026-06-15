import { registerAs } from '@nestjs/config';
import { parseTimeoutMs, parseMaxRetries, parseEnvNumber } from './ai.config';

// 语音(ASR/TTS)配置命名空间。P0 仅 StepFun ASR(SSE base64 内联,音频不出后端→StepFun 加密信道)。
// 复用 ai.config 的 parse helper(parseTimeoutMs/parseMaxRetries/parseEnvNumber),不重复造轮子。
export interface SpeechStepFunConfig {
  // 缺省 undefined:无 key 时 transcribeFile 显式抛错(防编造:不静默吞掉缺配置)。
  apiKey: string | undefined;
  baseURL: string;
  asrModel: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface SpeechConfig {
  stepfun: SpeechStepFunConfig;
  // 上传音频上限(MB)。base64≈4/3 倍 + V0 并发 5,P0 保守 25MB(约 25–50min mp3)。
  audioMaxSizeMb: number;
}

// 槽位 env 名(真实 key 由主代理写 .env.production,永不入库):
//   STEP_API_KEY      StepFun Bearer key(无缺省;缺失则转写时显式抛错)
//   STEP_BASE_URL     base URL,缺省 https://api.stepfun.com/v1
//   STEP_ASR_MODEL    ASR 模型,缺省 stepaudio-2.5-asr(实测跑通)
//   STEP_TIMEOUT_MS   单次 ASR 超时,缺省 120000(最小钳到 1000)
//   STEP_MAX_RETRIES  失败重试,缺省 1(最小钳到 0)
//   AUDIO_MAX_SIZE_MB 上传上限 MB,缺省 25(最小钳到 1)
export const speechConfig = registerAs('speech', (): SpeechConfig => ({
  stepfun: {
    apiKey: process.env.STEP_API_KEY,
    baseURL: process.env.STEP_BASE_URL ?? 'https://api.stepfun.com/v1',
    asrModel: process.env.STEP_ASR_MODEL ?? 'stepaudio-2.5-asr',
    timeoutMs: parseTimeoutMs(process.env.STEP_TIMEOUT_MS, 120000),
    maxRetries: parseMaxRetries(process.env.STEP_MAX_RETRIES, 1),
  },
  audioMaxSizeMb: Math.max(1, parseEnvNumber(process.env.AUDIO_MAX_SIZE_MB, 25)),
}));
