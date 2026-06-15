import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpeechConfig } from '../../config/speech.config';
import {
  SpeechCapabilities,
  SpeechProvider,
  SynthesizedAudio,
  TranscriptSegment,
} from './speech.provider';

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

    const body = JSON.stringify({
      audio: {
        data: audio.toString('base64'),
        input: {
          transcription: {
            language: 'zh',
            model: this.cfg.asrModel,
            enable_itn: true,
            enable_timestamp: true,
            hotwords,
          },
          format: { type: this.formatFromMime(mimeType) },
        },
      },
    });

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
      throw new Error(`StepFun ASR 请求失败:${this.describeFetchError(err)}`);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const detail = await this.safeReadText(response);
      throw new Error(`StepFun ASR 返回非 2xx(${response.status}):${detail}`);
    }
    if (!response.body) {
      throw new Error('StepFun ASR 响应无流体(response.body 为空)');
    }

    return this.consumeSse(response.body, controller, timer);
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

  /** 由 mimeType 推 StepFun format.type;未知类型回退 mp3(最常见上传格式)。 */
  private formatFromMime(mimeType: string): string {
    const mt = mimeType.toLowerCase().split(';')[0].trim();
    switch (mt) {
      case 'audio/mpeg':
      case 'audio/mp3':
        return 'mp3';
      case 'audio/wav':
      case 'audio/x-wav':
      case 'audio/wave':
        return 'wav';
      case 'audio/ogg':
      case 'audio/opus':
        return 'ogg';
      case 'audio/webm':
        return 'webm';
      case 'audio/mp4':
      case 'audio/m4a':
      case 'audio/x-m4a':
        return 'm4a';
      case 'audio/aac':
        return 'aac';
      case 'audio/flac':
      case 'audio/x-flac':
        return 'flac';
      default:
        this.logger.warn(`未识别音频 mimeType "${mimeType}",回退 format=mp3`);
        return 'mp3';
    }
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
