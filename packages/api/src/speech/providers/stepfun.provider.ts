import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpeechConfig } from '../../config/speech.config';
import {
  SpeechCapabilities,
  SpeechProvider,
  SynthesizedAudio,
  TranscriptSegment,
} from './speech.provider';
import { TRANSCODED_FORMAT, transcodeToOggOpus } from './audio-transcode';

// SSE delta 事件:增量句子 + 句级毫秒时间戳(实测 probe.py 跑通的字段形态)。
interface StepFunDeltaEvent {
  type: 'transcript.text.delta';
  delta?: string;
  text?: string;
  start_time?: number;
  end_time?: number;
}
interface StepFunDoneEvent {
  type: 'transcript.text.done';
  text?: string;
}
interface StepFunErrorEvent {
  type: 'error';
  message?: string;
}
type StepFunEvent =
  | StepFunDeltaEvent
  | StepFunDoneEvent
  | StepFunErrorEvent
  | { type?: string };

/** 标记「瞬时可重试」失败(HTTP 429 限流);区别于确定性失败,供退避重试逻辑识别。 */
class RetryableStepFunError extends Error {}

/**
 * StepFun ASR 供应商:SSE base64 内联转写(stepaudio-2.5-asr,enable_itn + enable_timestamp)。
 * 音频字节始终在 后端↔StepFun 的 HTTPS 加密信道,不落任何公网 URL;供应商不持有 fs。
 * 实现严格照已实测跑通的参考(probe.py 的 asr()):POST /audio/asr/sse,逐行解析 SSE。
 *
 * 防编造红线:非 2xx / error 事件 / SSE 中途断流 / 空 utterances 一律显式抛错,绝不返回空当成功。
 * 并发由调用方(SpeechService)包在注入的 ConcurrencyLimiter.run() 里,本类不直接持有 limiter。
 */
@Injectable()
export class StepFunProvider implements SpeechProvider {
  private readonly logger = new Logger(StepFunProvider.name);
  private readonly cfg: SpeechConfig['stepfun'];
  private readonly ttsCfg: SpeechConfig['tts'];

  // TTS 输入上限(StepFun /audio/speech 单次最大 1000 字符);超长在 synthesize 前截断保护。
  private static readonly TTS_MAX_CHARS = 1000;

  // StepFun ASR 硬上限:base64 音频 > 10485760 字节(10MB)→ SSE "exceeds maximum allowed size"(线上实测)。
  // 转码后超此值即抛用户可读错误,不发请求(避免必败的大请求白占并发/超时)。
  private static readonly MAX_BASE64_BYTES = 10 * 1024 * 1024;

  // 可重试的瞬时错误(StepFun 偶发抖动 / 限流):仅这两类退避重试,确定性失败(格式/超限/空)不重试。
  private static readonly RETRYABLE_SSE_FRAGMENT = 'internal error';
  // 重试基线退避(ms):第 n 次重试前等 RETRY_BASE_DELAY_MS × 2^(n-1)(指数退避)。
  private static readonly RETRY_BASE_DELAY_MS = 800;

  readonly capabilities: SpeechCapabilities = {
    diarization: false,
    channelSplit: false,
    realtime: true,
  };

  constructor(config: ConfigService) {
    this.cfg = config.get<SpeechConfig['stepfun']>('speech.stepfun')!;
    this.ttsCfg = config.get<SpeechConfig['tts']>('speech.tts')!;
  }

  async transcribeFile(
    audio: Buffer,
    mimeType: string,
    hotwords: string[] = [],
  ): Promise<TranscriptSegment[]> {
    if (!this.cfg.apiKey) {
      // 缺 key 显式抛错,绝不静默(防编造:不把缺配置当成功)。
      throw new Error('StepFun ASR 未配置 STEP_API_KEY,无法转写音频');
    }
    if (audio.length === 0) {
      throw new Error('音频内容为空,无法转写');
    }

    // 1) 转码:任意上传格式(webm/amr/mp4/…)→ StepFun 接受的 ogg/opus 单声道 16kHz。
    //    StepFun ASR 只认 wav/mp3/m4a/ogg,浏览器默认录 webm → 不转码真实用户几乎必失败。
    //    mimeType 在此后不再决定 format.type(产出恒为 ogg),仅保留入参兼容接口签名。
    void mimeType;
    const transcoded = await transcodeToOggOpus(audio, this.cfg.timeoutMs);

    // 2) 体积闸:StepFun base64 ≤ 10MB 硬上限,超限发了也必败 → 提前抛用户可读错误,不占并发。
    const base64 = transcoded.toString('base64');
    if (base64.length > StepFunProvider.MAX_BASE64_BYTES) {
      throw new Error(
        '录音过长,请控制在约 40 分钟以内(更长时段的分段转写正在开发中)',
      );
    }

    const body = JSON.stringify({
      audio: {
        data: base64,
        input: {
          transcription: {
            language: 'zh',
            model: this.cfg.asrModel,
            enable_itn: true,
            enable_timestamp: true,
            hotwords,
          },
          format: { type: TRANSCODED_FORMAT.stepfunType },
        },
      },
    });

    // 3) 带退避重试:仅对瞬时失败(SSE "internal error" / HTTP 429)重试,确定性失败不重试。
    //    总尝试次数 = 1 + maxRetries,钳到 [1, 3](避免配置异常导致过量重试拖垮 2C2G)。
    return this.transcribeWithRetry(body);
  }

  /** 单次 HTTP+SSE 转写尝试;瞬时失败(429 / "internal error")抛 RetryableStepFunError。 */
  private async attemptTranscribe(body: string): Promise<TranscriptSegment[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${this.cfg.baseURL}/audio/asr/sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.cfg.apiKey}`,
          Accept: 'text/event-stream',
        },
        body,
        signal: controller.signal,
      });
    } catch (err) {
      // fetch 阶段失败(连接错误 / 超时 abort)。
      clearTimeout(timer);
      throw new Error(`StepFun ASR 请求失败:${this.describeFetchError(err)}`);
    }

    if (!response.ok) {
      clearTimeout(timer);
      const detail = await this.safeReadText(response);
      const msg = `StepFun ASR 返回非 2xx(${response.status}):${detail}`;
      // 429 限流是瞬时的(快速连发命中):标记可重试。其余非 2xx 为确定性失败,不重试。
      if (response.status === 429) {
        throw new RetryableStepFunError(msg);
      }
      throw new Error(msg);
    }
    if (!response.body) {
      clearTimeout(timer);
      throw new Error('StepFun ASR 响应无流体(response.body 为空)');
    }

    return this.consumeSse(response.body, controller, timer);
  }

  /**
   * 退避重试包装。仅 RetryableStepFunError(429 / SSE "internal error")触发重试;
   * 其它错误(格式不支持 / 超限 / 空转写 / 缺 key)立即上抛,不重试。
   * 退避:第 n 次重试前 sleep RETRY_BASE_DELAY_MS × 2^(n-1)(指数退避,缓解限流/抖动)。
   */
  private async transcribeWithRetry(body: string): Promise<TranscriptSegment[]> {
    const totalAttempts = Math.min(3, Math.max(1, 1 + this.cfg.maxRetries));
    let lastErr: unknown;
    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      try {
        return await this.attemptTranscribe(body);
      } catch (err) {
        lastErr = err;
        const retryable = this.isRetryable(err);
        if (!retryable || attempt === totalAttempts) {
          throw err;
        }
        const delay = StepFunProvider.RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        this.logger.warn(
          `StepFun ASR 瞬时失败,第 ${attempt}/${totalAttempts - 1} 次重试前退避 ${delay}ms:${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    // 理论不达(循环要么 return 要么 throw);兜底抛最后一个错误。
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  /** 判定错误是否瞬时可重试:RetryableStepFunError(429),或 SSE error 消息含 "internal error"。 */
  private isRetryable(err: unknown): boolean {
    if (err instanceof RetryableStepFunError) return true;
    if (err instanceof Error) {
      return err.message.toLowerCase().includes(StepFunProvider.RETRYABLE_SSE_FRAGMENT);
    }
    return false;
  }

  /**
   * 文本 → 合成音频字节(StepFun /audio/speech,step-tts-mini)。
   * 与 ASR 不同:此端点直回二进制音频(非 SSE、非 base64),body = {model,input,voice,response_format}。
   * 音频字节始终在 后端↔StepFun 的 HTTPS 加密信道,纯内存返回,供应商不落盘、不持有 fs。
   *
   * 防编造红线:缺 key / 空文本 / 非 2xx / 空响应体 → 显式抛错,绝不返回空 Buffer 当成功。
   * 超时按 ttsCfg.timeoutMs 控制(AbortController);并发由调用方(SpeechService)包在 limiter 里。
   */
  async synthesize(text: string, voice?: string): Promise<SynthesizedAudio> {
    if (!this.ttsCfg.apiKey) {
      // 缺 key 显式抛错,绝不静默(防编造:不把缺配置当成功)。
      throw new Error('StepFun TTS 未配置 STEP_API_KEY,无法合成语音');
    }
    const input = text.trim();
    if (input.length === 0) {
      throw new Error('合成文本为空,无法生成语音');
    }
    // 超长截断保护:StepFun 单次最大 1000 字符;面试题为正常语句,极少触顶,触顶则截断而非抛错。
    const safeInput =
      input.length > StepFunProvider.TTS_MAX_CHARS
        ? input.slice(0, StepFunProvider.TTS_MAX_CHARS)
        : input;

    const body = JSON.stringify({
      model: this.ttsCfg.model,
      input: safeInput,
      voice: voice?.trim() || this.ttsCfg.voice,
      response_format: this.ttsCfg.responseFormat,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.ttsCfg.timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${this.ttsCfg.baseURL}/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.ttsCfg.apiKey}`,
        },
        body,
        signal: controller.signal,
      });
    } catch (err) {
      throw new Error(`StepFun TTS 请求失败:${this.describeTtsError(err)}`);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const detail = await this.safeReadText(response);
      throw new Error(`StepFun TTS 返回非 2xx(${response.status}):${detail}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audio = Buffer.from(arrayBuffer);
    if (audio.length === 0) {
      // 空音频:上游未产出内容,显式抛错(防编造红线)。
      throw new Error('StepFun TTS 未产出任何音频内容(响应体为空)');
    }

    return { audio, mimeType: this.mimeFromFormat(this.ttsCfg.responseFormat) };
  }

  /** 区分 abort(TTS 超时)与一般错误,给出可读信息。 */
  private describeTtsError(err: unknown): string {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        return `请求超时(${this.ttsCfg.timeoutMs}ms)`;
      }
      return err.message;
    }
    return String(err);
  }

  /** 由 response_format 推合成音频的 mimeType,供 HTTP 直回 Content-Type / 浏览器播放。 */
  private mimeFromFormat(format: string): string {
    switch (format.toLowerCase()) {
      case 'wav':
        return 'audio/wav';
      case 'flac':
        return 'audio/flac';
      case 'opus':
        return 'audio/opus';
      case 'pcm':
        return 'audio/pcm';
      case 'mp3':
      default:
        return 'audio/mpeg';
    }
  }

  /**
   * 逐行消费 SSE 流。delta 事件(带 start_time)聚合句级 segment;done 事件取全文兜底;
   * error 事件 / 断流 / 空结果 → 抛显式错误。
   */
  private async consumeSse(
    stream: ReadableStream<Uint8Array>,
    controller: AbortController,
    timer: ReturnType<typeof setTimeout>,
  ): Promise<TranscriptSegment[]> {
    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');

    const segments: TranscriptSegment[] = [];
    let fullText = '';
    let errorMessage: string | null = null;
    let buffer = '';
    let streamEndedCleanly = false;

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          streamEndedCleanly = true;
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        // 按行切分:SSE 以 \n 分隔事件行;保留最后一段不完整行到下一轮。
        let nlIndex = buffer.indexOf('\n');
        while (nlIndex !== -1) {
          const rawLine = buffer.slice(0, nlIndex);
          buffer = buffer.slice(nlIndex + 1);
          const outcome = this.handleSseLine(rawLine, segments);
          if (outcome.fullText !== undefined) fullText = outcome.fullText;
          if (outcome.error !== undefined) errorMessage = outcome.error;
          nlIndex = buffer.indexOf('\n');
        }
      }
      // flush 末尾残留(无结尾换行的最后一行)。
      const tail = buffer + decoder.decode();
      if (tail.trim().length > 0) {
        const outcome = this.handleSseLine(tail, segments);
        if (outcome.fullText !== undefined) fullText = outcome.fullText;
        if (outcome.error !== undefined) errorMessage = outcome.error;
      }
    } catch (err) {
      // 读流中途异常(连接 reset / 超时 abort):断流,绝不把已收的半截当成功。
      throw new Error(`StepFun ASR 流读取中断:${this.describeFetchError(err)}`);
    } finally {
      clearTimeout(timer);
      reader.releaseLock();
      // 主动中止底层连接,避免读完即返回后流仍挂着占用资源。
      if (!controller.signal.aborted) controller.abort();
    }

    if (errorMessage) {
      throw new Error(`StepFun ASR 返回 error 事件:${errorMessage}`);
    }
    if (!streamEndedCleanly) {
      throw new Error('StepFun ASR 流未正常结束(疑似断流)');
    }

    // 句级片段优先;无片段则用 done 全文兜底成单段(start=0,end=0,交 LLM 打标)。
    if (segments.length > 0) {
      return segments;
    }
    if (fullText.trim().length > 0) {
      return [{ text: fullText.trim(), startMs: 0, endMs: 0 }];
    }
    // 空 utterances + 空全文:转写无内容,显式抛错(防编造红线)。
    throw new Error('StepFun ASR 未产出任何转写内容(空 utterances 与空全文)');
  }

  /**
   * 解析单行 SSE,命中事件则更新 segments / 返回 fullText / error。
   * 行形态(照 probe.py):可带 `data:` 前缀;`[DONE]` 与空行跳过;非 JSON 行跳过。
   */
  private handleSseLine(
    rawLine: string,
    segments: TranscriptSegment[],
  ): { fullText?: string; error?: string } {
    let line = rawLine.trim();
    if (!line) return {};
    if (line.startsWith('data:')) line = line.slice(5).trim();
    if (line === '' || line === '[DONE]') return {};

    let ev: StepFunEvent;
    try {
      ev = JSON.parse(line) as StepFunEvent;
    } catch {
      // 非 JSON 行(如 SSE 注释 / event: 行)忽略。
      return {};
    }

    if (ev.type === 'transcript.text.delta') {
      const delta = ev as StepFunDeltaEvent;
      // 仅当带时间戳时聚合为句级 segment(probe.py 同款判定:有 start_time 才入 utts)。
      if (typeof delta.start_time === 'number') {
        const text = (delta.text ?? delta.delta ?? '').trim();
        if (text.length > 0) {
          segments.push({
            text,
            startMs: delta.start_time,
            endMs: typeof delta.end_time === 'number' ? delta.end_time : delta.start_time,
          });
        }
      }
      return {};
    }
    if (ev.type === 'transcript.text.done') {
      return { fullText: (ev as StepFunDoneEvent).text ?? '' };
    }
    if (ev.type === 'error') {
      return { error: (ev as StepFunErrorEvent).message ?? '未知错误' };
    }
    return {};
  }

  /** 区分 abort(超时)与一般错误,给出可读信息。 */
  private describeFetchError(err: unknown): string {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        return `请求超时(${this.cfg.timeoutMs}ms)`;
      }
      return err.message;
    }
    return String(err);
  }

  /** 尽力读非 2xx 响应体文本作为错误详情;失败回退状态文本。 */
  private async safeReadText(response: Response): Promise<string> {
    try {
      const text = await response.text();
      return text.length > 0 ? text.slice(0, 500) : response.statusText || '未知错误';
    } catch {
      return response.statusText || '未知错误';
    }
  }
}
