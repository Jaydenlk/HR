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

// TTS(语音合成)配置:StepFun /audio/speech 直出音频字节(非 SSE,非 base64)。
// 复用 stepfun.apiKey / stepfun.baseURL(同一供应商同一 key),仅模型/音色/格式/超时独立。
export interface SpeechTtsConfig {
  // 缺省 undefined:无 key 时 synthesize 显式抛错(防编造:不静默吞掉缺配置)。
  apiKey: string | undefined;
  baseURL: string;
  model: string;
  // 缺省音色:cixingnansheng(磁性男声,step-tts-mini 官方音色)。调用方可传 voice 覆盖。
  voice: string;
  // 返回音频格式(mp3|wav|flac|opus|pcm);浏览器 <audio> 直接喂,缺省 mp3。
  responseFormat: string;
  timeoutMs: number;
}

export interface SpeechConfig {
  stepfun: SpeechStepFunConfig;
  tts: SpeechTtsConfig;
  // 上传音频上限(MB)。base64≈4/3 倍 + V0 并发 5,P0 保守 25MB(约 25–50min mp3)。
  audioMaxSizeMb: number;
}

// 槽位 env 名(真实 key 由主代理写 .env.production,永不入库):
//   STEP_API_KEY      StepFun Bearer key(无缺省;缺失则转写时显式抛错)
//   STEP_BASE_URL     base URL,缺省 https://api.stepfun.com/v1
//   STEP_ASR_MODEL    ASR 模型,缺省 stepaudio-2.5-asr(实测跑通)
//   STEP_TIMEOUT_MS   单次 ASR 超时,缺省 120000(最小钳到 1000)
//   STEP_MAX_RETRIES  失败重试,缺省 1(最小钳到 0)
//   STEP_TTS_MODEL    TTS 模型,缺省 step-tts-mini(实测读题清晰)
//   STEP_TTS_VOICE    TTS 音色,缺省 cixingnansheng(磁性男声)
//   STEP_TTS_FORMAT   TTS 输出格式,缺省 mp3(浏览器 <audio> 直接喂)
//   STEP_TTS_TIMEOUT_MS 单次 TTS 超时,缺省 60000(最小钳到 1000)
//   AUDIO_MAX_SIZE_MB 上传上限 MB,缺省 25(最小钳到 1)
export const speechConfig = registerAs('speech', (): SpeechConfig => ({
  stepfun: {
    apiKey: process.env.STEP_API_KEY,
    baseURL: process.env.STEP_BASE_URL ?? 'https://api.stepfun.com/v1',
    asrModel: process.env.STEP_ASR_MODEL ?? 'stepaudio-2.5-asr',
    timeoutMs: parseTimeoutMs(process.env.STEP_TIMEOUT_MS, 120000),
    maxRetries: parseMaxRetries(process.env.STEP_MAX_RETRIES, 1),
  },
  tts: {
    // 复用 ASR 同一 key 与 base URL(同供应商);仅模型/音色/格式/超时独立可调。
    apiKey: process.env.STEP_API_KEY,
    baseURL: process.env.STEP_BASE_URL ?? 'https://api.stepfun.com/v1',
    model: process.env.STEP_TTS_MODEL ?? 'step-tts-mini',
    voice: process.env.STEP_TTS_VOICE ?? 'cixingnansheng',
    responseFormat: process.env.STEP_TTS_FORMAT ?? 'mp3',
    timeoutMs: parseTimeoutMs(process.env.STEP_TTS_TIMEOUT_MS, 60000),
  },
  audioMaxSizeMb: Math.max(1, parseEnvNumber(process.env.AUDIO_MAX_SIZE_MB, 25)),
}));
