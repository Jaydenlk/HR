import { Inject, Injectable } from '@nestjs/common';
import { ConcurrencyLimiter } from '../ai/concurrency-limiter';
import {
  SPEECH_PROVIDER,
  SpeechProvider,
  SynthesizedAudio,
  TranscriptSegment,
} from './providers/speech.provider';
import { applyLexicon } from './lexicon';

/**
 * 语音门面:对外暴露稳定的转写入口,屏蔽具体供应商(P0 = StepFun)。
 * 与 AiService 平级独立(AiService 是 Anthropic SDK 封装,本类是语音供应商封装),不塞进 AiModule。
 *
 * 并发护栏:转写/合成调用都包在 AiModule 已 export 的 ConcurrencyLimiter.run() 里,
 * 与重 AI 调用共用同一并发上限,避免 2C2G 单进程被同时进行的重调用拖垮。
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
    const segments = await this.limiter.run(() =>
      this.provider.transcribeFile(audio, mimeType, hotwords),
    );
    // 确定性同音错词替换(招聘/技术域无歧义词表)。
    // 在 ASR 产出后、LLM 打标前执行,零 token 消耗;有歧义词对不收录。
    return segments.map((seg) => ({ ...seg, text: applyLexicon(seg.text) }));
  }

  /**
   * 文本 → 合成音频字节(模拟面试 voice 模式读题)。
   * voice 缺省时由供应商取配置缺省音色;供应商对缺 key/空文本/上游失败显式抛错(防编造红线),
   * 门面不吞错、不兜底空音频。
   */
  async synthesize(text: string, voice?: string): Promise<SynthesizedAudio> {
    return this.limiter.run(() => this.provider.synthesize(text, voice));
  }
}
