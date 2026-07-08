/**
 * 字级/碎片转写片段 → 句级片段的归并(纯函数,provider 层与读取层共用)。
 *
 * 背景(线上 psql 实读 task 4a8e0091,22MB mp3):StepFun 真实录音下逐字推 delta,库里落成
 * 字级 segment(一字一段,如 {idx:0,text:"然",startMs:240,endMs:240,speaker:"candidate"}),
 * 连续语流的字间 gap 仅 0-80ms,句间才有大 gap。字级流【无任何标点】,故聚句不能依赖标点。
 *
 * 聚句主信号(满足任一即结束当前句、开新句):
 *   ① speaker 变化(有 speaker 时:不同必切句);
 *   ② 停顿间隙 gap = 本段 startMs − 上段 endMs ≥ PAUSE_GAP_MS(主依据,不依赖标点);
 *   ③ 当前句累积字数 ≥ MAX_SENTENCE_CHARS(兜底,防无停顿无标点的长语流不切)。
 * 标点仅作【辅助】:上一段文本以句末标点结尾也切句(有则用,绝不作主依据或必需条件)。
 *
 * 归并后每句:text 拼接、startMs 取该句首段起点、endMs 取该句末段终点(恒 ≥ startMs);
 * 有 speaker 时取该连续段的一致值(speaker 变化本就是切句点,故整句 speaker 唯一)。
 */

/** 归并的最小输入契约:任意带文本 + 毫秒时间戳的片段,speaker 可选。 */
export interface MergeableSegment {
  text: string;
  startMs: number;
  endMs: number;
  speaker?: string;
}

/** 切句停顿阈值(ms):本段起点与上段终点间隔 ≥ 此值视为句间停顿。700ms 取 VAD 常用句间静音区间
 * (真实连续语流字间 gap 0-80ms,句间才大),既能切句又不误切句内正常字间隔。 */
export const PAUSE_GAP_MS = 700;
/** 单句累积字数上限:达此长度即强制断句(兜底,防无停顿无标点的长语流撑爆单句)。 */
export const MAX_SENTENCE_CHARS = 120;
/** 句末标点(辅助):片段以其一结尾即视为一句自然结束。仅辅助,非主依据、非必需。 */
const SENTENCE_END_PUNCT = /[。！？；…!?;]$/;

/** ASCII 字母/数字:相邻片段的尾字符与首字符都命中此类才需要补空格(拉丁词间分隔)。 */
const ASCII_WORD_CHAR = /[A-Za-z0-9]/;

/** 平均文本字长阈值:段平均字长 ≤ 此值判为「字级脏数据」(中文单字 utterance)。 */
export const CHAR_LEVEL_AVG_TEXT_LEN = 2;

/** 判断一组片段是否为字级脏数据(平均 text 长度 ≤ CHAR_LEVEL_AVG_TEXT_LEN,且段数 > 1)。 */
export function looksCharLevel(segments: ReadonlyArray<MergeableSegment>): boolean {
  if (segments.length <= 1) return false;
  const totalChars = segments.reduce((sum, s) => sum + s.text.trim().length, 0);
  return totalChars / segments.length <= CHAR_LEVEL_AVG_TEXT_LEN;
}

/**
 * 把相邻片段归并成句级。泛型:调用方给一个 build 把「聚合结果」组装回其自身片段类型
 * (provider 层不带 speaker/idx;读取层带 speaker 且 idx 从 0 重编号)。
 *
 * @param raw   原始片段(按时间顺序)。
 * @param build 组装器:(聚合信息, 该句在结果中的序号) → 目标片段。
 */
export function mergeAdjacentSegments<T>(
  raw: ReadonlyArray<MergeableSegment>,
  build: (
    merged: { text: string; startMs: number; endMs: number; speaker?: string },
    index: number,
  ) => T,
): T[] {
  const out: T[] = [];
  let curText = '';
  let curStart = 0;
  let curEnd = 0;
  let curSpeaker: string | undefined;
  let prevEnd = 0;
  let hasCur = false;

  const flush = (): void => {
    if (!hasCur) return;
    const text = curText.trim();
    if (text.length > 0) {
      out.push(
        build(
          { text, startMs: curStart, endMs: Math.max(curEnd, curStart), speaker: curSpeaker },
          out.length,
        ),
      );
    }
    hasCur = false;
    curText = '';
    curSpeaker = undefined;
  };

  for (const seg of raw) {
    const pieceText = seg.text.trim();
    if (pieceText.length === 0) continue;

    if (hasCur) {
      // 停顿间隔;负值(时间戳重叠/回退)按 0 处理,不误判为停顿。
      const gap = seg.startMs - prevEnd;
      const speakerChanged = seg.speaker !== undefined && seg.speaker !== curSpeaker;
      const prevEndsSentence = SENTENCE_END_PUNCT.test(curText.trim());
      const tooLong = curText.length >= MAX_SENTENCE_CHARS;
      if (speakerChanged || gap >= PAUSE_GAP_MS || prevEndsSentence || tooLong) {
        flush();
      }
    }

    if (!hasCur) {
      hasCur = true;
      curText = pieceText;
      curStart = seg.startMs;
      curEnd = seg.endMs;
      curSpeaker = seg.speaker;
    } else {
      // 拉丁文本(ASCII 字母/数字)片段间需要空格分隔,否则逐段 trim 后直接拼接会把词粘连
      // (如 "Hi" + "OK" → "HiOK")。CJK 字符本就不靠空格分词,拼接行为不变。
      const prevChar = curText.charAt(curText.length - 1);
      const nextChar = pieceText.charAt(0);
      const needsSpace = ASCII_WORD_CHAR.test(prevChar) && ASCII_WORD_CHAR.test(nextChar);
      curText += (needsSpace ? ' ' : '') + pieceText;
      curEnd = Math.max(curEnd, seg.endMs);
    }
    prevEnd = seg.endMs;
  }
  flush();

  return out;
}
