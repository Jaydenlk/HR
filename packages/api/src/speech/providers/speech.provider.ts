// 语音供应商抽象。P0 实现 = StepFunProvider(ASR);P1 再补 synthesize()(TTS)。
// 设计原则:供应商不持久化、不持有 fs,纯内存 buffer 进、结构化 segment 出;
// 上游失败/空结果一律由实现显式抛错,绝不返回空当成功(防编造红线)。

/** 供应商能力声明。调用方据此决定是否需要 LLM 打标(diarization=false 时必须)。 */
export interface SpeechCapabilities {
  /** 是否原生区分说话人(StepFun=false 由 LLM 打标;讯飞=true)。 */
  diarization: boolean;
  /** 是否支持双声道分轨。 */
  channelSplit: boolean;
  /** 是否支持实时流。 */
  realtime: boolean;
}

/** 句级转写片段。speaker 由 ASR 原生产出;StepFun 不产出,留空交 LLM 打标。 */
export interface TranscriptSegment {
  text: string;
  startMs: number;
  endMs: number;
  speaker?: string;
}

/**
 * 语音供应商接口。transcribeFile 收纯内存音频 buffer + mimeType,出句级带毫秒时间戳的片段数组。
 * hotwords:岗位/技术热词,纠正同音黑话(如 全栈→全站);P0 可空数组,接口预留。
 */
export interface SpeechProvider {
  readonly capabilities: SpeechCapabilities;
  transcribeFile(
    audio: Buffer,
    mimeType: string,
    hotwords?: string[],
  ): Promise<TranscriptSegment[]>;
}

/** DI token:SpeechProvider 是接口(运行期不存在),用此 token 在 module 里绑定具体实现。 */
export const SPEECH_PROVIDER = Symbol('SPEECH_PROVIDER');
