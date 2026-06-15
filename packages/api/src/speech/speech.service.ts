import { Inject, Injectable } from '@nestjs/common';
import { ConcurrencyLimiter } from '../ai/concurrency-limiter';
import {
  SPEECH_PROVIDER,
  SpeechProvider,
  TranscriptSegment,
} from './providers/speech.provider';

/**
 * 语音门面:对外暴露稳定的转写入口,屏蔽具体供应商(P0 = StepFun)。
 * 与 AiService 平级独立(AiService 是 Anthropic SDK 封装,本类是语音供应商封装),不塞进 AiModule。
 *
 * 并发护栏:转写调用包在 AiModule 已 export 的 ConcurrencyLimiter.run() 里,
 * 与重 AI 调用共用同一并发上限,避免 2C2G 单进程被同时进行的重调用拖垮。
 * P1 再加 synthesize()(TTS),同样经 limiter。
 */
@Injectable()
export class SpeechService {
  constructor(
    @Inject(SPEECH_PROVIDER) private readonly provider: SpeechProvider,
    private readonly limiter: ConcurrencyLimiter,
  ) {}

  /**
   * 转写纯内存音频 buffer → 句级带毫秒时间戳片段。
   * hotwords:岗位/技术热词(纠正同音黑话),P0 可空。
   * 供应商失败/空结果会显式抛错(防编造红线),门面不吞错、不兜底空数组。
   */
  async transcribeFile(
    audio: Buffer,
    mimeType: string,
    hotwords: string[] = [],
  ): Promise<TranscriptSegment[]> {
    return this.limiter.run(() =>
      this.provider.transcribeFile(audio, mimeType, hotwords),
    );
  }
}
