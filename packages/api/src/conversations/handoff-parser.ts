/**
 * handoff-parser.ts — Coach 行动卡片的标记提取与流式剥离。
 *
 * 规格:
 *  - 模型在正文末尾输出单行 `<handoff>{"target":"mock","payload":{...}}</handoff>`。
 *  - 一次回复最多处理一张卡片;多张时只取第一张,其余视为文本。
 *  - 合法标记:合法 JSON 且 target 合法 → 剥离返回 { clean, card }。
 *  - 非法/缺失:原文返回 { clean: fullText, card: null }。
 *
 * 流式剥离策略(保守优先:宁可误缓冲不可漏 JSON):
 *  - 检测到 `<handoff` 起始就停止向客户端转发增量并进入缓冲。
 *  - 流结束后再对缓冲区解析:合法 → card;非法 → 把缓冲内容追加到 extra 降级补发。
 */

export interface HandoffCard {
  target: 'mock' | 'diagnosis' | 'cover_letter' | 'resume_rewrite';
  payload: Record<string, unknown>;
}

export interface ParseResult {
  /** 已剥离标记后的正文(存库 + 显示给用户) */
  clean: string;
  /** 解析成功的卡片;null 表示无卡片或解析失败 */
  card: HandoffCard | null;
}

const VALID_TARGETS = new Set(['mock', 'diagnosis', 'cover_letter', 'resume_rewrite']);
const OPEN_TAG = '<handoff>';
const CLOSE_TAG = '</handoff>';

/** 对完整回复文本解析并剥离 handoff 标记(非流式路径 / 测试用)。 */
export function parseHandoff(fullText: string): ParseResult {
  const start = fullText.indexOf(OPEN_TAG);
  if (start === -1) {
    return { clean: fullText, card: null };
  }

  const end = fullText.indexOf(CLOSE_TAG, start);
  if (end === -1) {
    // 标记开启但未闭合:视为非法,原样返回(防止截断正文)。
    return { clean: fullText, card: null };
  }

  const inner = fullText.slice(start + OPEN_TAG.length, end).trim();
  const before = fullText.slice(0, start).trimEnd();
  const after = fullText.slice(end + CLOSE_TAG.length).trim();
  const clean = after ? `${before}\n${after}` : before;

  try {
    const parsed: unknown = JSON.parse(inner);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'target' in parsed &&
      typeof (parsed as Record<string, unknown>).target === 'string' &&
      VALID_TARGETS.has((parsed as Record<string, unknown>).target as string)
    ) {
      const obj = parsed as Record<string, unknown>;
      return {
        clean,
        card: {
          target: obj.target as HandoffCard['target'],
          payload:
            obj.payload && typeof obj.payload === 'object'
              ? (obj.payload as Record<string, unknown>)
              : {},
        },
      };
    }
    // JSON 合法但 target 非法:原文无损降级。
    return { clean: fullText, card: null };
  } catch {
    // JSON.parse 失败:原文无损降级。
    return { clean: fullText, card: null };
  }
}

/**
 * StreamHandoffSplitter — 流式剥离状态机。
 *
 * 每次调用 feed(chunk) 时:
 *  - 若尚未检测到 <handoff 起始:返回可立即 emit 给客户端的文本。
 *    (使用"最长可能前缀"窗口:最末尾 MARKER_LEN-1 个字符暂缓发出以等待跨 chunk 的完整标记)
 *  - 一旦检测到 <handoff 起始:进入缓冲模式,返回 '' 停止转发。
 *    (若该 chunk 中 <handoff 在中段,前半段先 emit)
 *
 * 流结束后调用 finish():
 *  - 无标记触发:把 pending 窗口作为 extra 补发,card=null。
 *  - 有标记:解析缓冲区。合法 → card;非法 → extra=缓冲原文(正文无损降级)。
 *
 * 注意:pending 窗口(MARKER_LEN-1 字节)在 finish() 时统一处理。
 * 这意味着 "feed 无标记文本 → finish" 的场景,部分末尾字节会出现在 extra 而非 emit 的返回值中。
 * 调用方应将 finish().extra 追加到已 emit 文本后再输出完整正文。
 */
export class StreamHandoffSplitter {
  // 已进入缓冲模式(检测到 <handoff 起始)
  private buffering = false;
  // 缓冲区(含 <handoff> 自身)
  private buffer = '';
  // 跨 chunk 检测窗口:最多保留 MARKER_PREFIX_LEN-1 个字符,等待凑齐完整标记前缀
  private pending = '';

  // 我们只需要检测 '<handoff' 这 8 个字符就能开始缓冲(不需要完整 9 字符的 <handoff>)
  // 更保守:以 '<handoff' 为前缀(8 字符)触发缓冲,结束时用 parseHandoff 处理完整缓冲区
  private static readonly PREFIX = '<handoff';
  private static readonly PREFIX_LEN = StreamHandoffSplitter.PREFIX.length; // 8

  feed(chunk: string): string {
    if (this.buffering) {
      this.buffer += chunk;
      return '';
    }

    // 拼上跨 chunk 的 pending 窗口
    const combined = this.pending + chunk;
    const idx = combined.indexOf(StreamHandoffSplitter.PREFIX);

    if (idx === -1) {
      // 前缀完全不在此帧内
      // 保留末尾 PREFIX_LEN-1 个字符作为下次的 pending 窗口(跨 chunk 检测)
      const keep = StreamHandoffSplitter.PREFIX_LEN - 1; // 7
      if (combined.length <= keep) {
        // 整段都要留作窗口(极短 chunk)
        this.pending = combined;
        return '';
      }
      const emit = combined.slice(0, combined.length - keep);
      this.pending = combined.slice(combined.length - keep);
      return emit;
    }

    // 找到前缀:idx 之前的部分 emit,之后(含 PREFIX)进入缓冲
    const emit = combined.slice(0, idx);
    this.buffering = true;
    this.buffer = combined.slice(idx);
    this.pending = '';
    return emit;
  }

  finish(): { extra: string; card: HandoffCard | null } {
    if (!this.buffering) {
      // 没有触发缓冲:pending 窗口作为 extra 补发
      const extra = this.pending;
      this.pending = '';
      return { extra, card: null };
    }

    // 触发了缓冲:解析完整缓冲区
    const fullBuffer = this.buffer;
    const result = parseHandoff(fullBuffer);
    if (result.card) {
      // 成功:clean 是缓冲区内标记前的内容(通常为空字符串,因为标记在末尾)
      return { extra: result.clean, card: result.card };
    }
    // 失败(非法 JSON / 非法 target / 未闭合):把缓冲区原样补发(正文无损降级)
    return { extra: fullBuffer, card: null };
  }
}
