/**
 * handoff-parser.spec.ts
 * Step 3 验证:
 *  - 合法标记:剥离成功,card 正确,正文无损
 *  - 非法 JSON:正文无损降级
 *  - 无标记:零影响
 *  - 标记字符出现在正文中段:通过 finish().extra 补发,正文无损
 *  - StreamHandoffSplitter:跨 chunk 检测 / 停止转发 / finish 解析
 *  - 非流式 parseHandoff:与流式结果一致
 *
 * 设计说明:StreamHandoffSplitter 使用"保守窗口"——feed() 保留末尾 PREFIX_LEN-1 字节
 * 作为 pending 窗口以跨 chunk 检测标记;这些字节在 finish().extra 中补发。
 * 因此测试中全文 = feed 的所有返回值拼接 + finish().extra。
 */
import { parseHandoff, StreamHandoffSplitter } from '../src/conversations/handoff-parser';

// 辅助:把多个 chunk 喂给 splitter,收集全部 emit 文本
function feedAll(splitter: StreamHandoffSplitter, chunks: string[]): string {
  return chunks.map((c) => splitter.feed(c)).join('');
}

// ─── parseHandoff 单元测试 ─────────────────────────────────────────────────────

describe('parseHandoff()', () => {
  it('无标记 → 原文返回,card=null', () => {
    const text = '这是一段正常的 AI 回复,没有任何标记。';
    const result = parseHandoff(text);
    expect(result.clean).toBe(text);
    expect(result.card).toBeNull();
  });

  it('合法标记(mock)→ 剥离成功,card 填充正确', () => {
    const payload = { company: '字节跳动', role: '产品经理', jd_text: '负责xxx' };
    const text = `好的,我来帮你配置模拟面试。\n\n<handoff>${JSON.stringify({ target: 'mock', payload })}</handoff>`;
    const result = parseHandoff(text);
    expect(result.card).not.toBeNull();
    expect(result.card!.target).toBe('mock');
    expect(result.card!.payload).toEqual(payload);
    expect(result.clean).not.toContain('<handoff>');
    expect(result.clean).toContain('帮你配置模拟面试');
  });

  it('合法标记(diagnosis)', () => {
    const text = `我来帮你诊断。\n<handoff>{"target":"diagnosis","payload":{"jd_company":"阿里","jd_role":"数据分析"}}</handoff>`;
    const result = parseHandoff(text);
    expect(result.card!.target).toBe('diagnosis');
    expect(result.card!.payload.jd_company).toBe('阿里');
  });

  it('合法标记(cover_letter)', () => {
    const text = `好的。\n<handoff>{"target":"cover_letter","payload":{"company":"腾讯","role":"运营"}}</handoff>`;
    const result = parseHandoff(text);
    expect(result.card!.target).toBe('cover_letter');
  });

  it('合法标记(resume_rewrite)', () => {
    const text = `好的。\n<handoff>{"target":"resume_rewrite","payload":{"note":"聚焦数据感"}}</handoff>`;
    const result = parseHandoff(text);
    expect(result.card!.target).toBe('resume_rewrite');
  });

  it('非法 JSON → 正文无损返回,card=null', () => {
    const text = '正文内容。\n<handoff>{"target":"mock", INVALID_JSON}</handoff>';
    const result = parseHandoff(text);
    expect(result.card).toBeNull();
    expect(result.clean).toBe(text);
  });

  it('非法 target → 正文无损返回,card=null', () => {
    const text = '正文内容。\n<handoff>{"target":"unknown_module","payload":{}}</handoff>';
    const result = parseHandoff(text);
    expect(result.card).toBeNull();
    expect(result.clean).toBe(text);
  });

  it('无闭合标记 → 原文无损返回,card=null', () => {
    const text = '正文。\n<handoff>{"target":"mock","payload":{}}';
    const result = parseHandoff(text);
    expect(result.card).toBeNull();
    expect(result.clean).toBe(text);
  });

  it('payload 字段缺失时使用空对象', () => {
    const text = '<handoff>{"target":"mock"}</handoff>';
    const result = parseHandoff(text);
    expect(result.card!.payload).toEqual({});
  });
});

// ─── StreamHandoffSplitter 单元测试 ──────────────────────────────────────────

describe('StreamHandoffSplitter', () => {
  it('无标记 → 全部文本在 emit+extra 中输出,card=null', () => {
    const splitter = new StreamHandoffSplitter();
    const chunks = ['这是', '普通', '回复'];
    const emitted = feedAll(splitter, chunks);
    const { extra, card } = splitter.finish();
    expect(card).toBeNull();
    // 全部文本 = feed 返回 + finish extra
    expect(emitted + extra).toBe('这是普通回复');
  });

  it('标记在单个 chunk → 标记前文本 emit,标记后 finish 返回合法卡片', () => {
    const marker = '<handoff>{"target":"mock","payload":{"company":"字节"}}</handoff>';
    const splitter = new StreamHandoffSplitter();
    const emitted = splitter.feed('正文内容。\n' + marker);
    const { extra, card } = splitter.finish();

    expect(card).not.toBeNull();
    expect(card!.target).toBe('mock');
    // 正文在 emitted 中(标记前部分)
    expect(emitted + extra).toContain('正文内容。');
    // 不含标记
    expect((emitted + extra)).not.toContain('<handoff>');
  });

  it('标记跨多个 chunk → 标记前正文在 emit 中,缓冲后 card 正确', () => {
    const splitter = new StreamHandoffSplitter();
    const emit1 = splitter.feed('正文');
    const emit2 = splitter.feed('结尾。\n<hand');  // <hand 进入 pending 窗口,部分文本 emit
    const emit3 = splitter.feed('off>{"target":"diagnosis","payload":{}}</handoff>');
    const { card, extra } = splitter.finish();

    // 标记前的正文必须出现在 emit 序列 + extra 中的某处(宁可误缓冲,正文无损)
    const allText = emit1 + emit2 + emit3 + extra;
    expect(allText).toContain('正文');
    expect(card!.target).toBe('diagnosis');
    // 标记本身不透传给客户端(在缓冲区中处理)
    expect(allText).not.toContain('<handoff>');
  });

  it('非法 JSON 缓冲 → finish 返回 extra=缓冲原文,card=null(正文无损降级)', () => {
    const splitter = new StreamHandoffSplitter();
    splitter.feed('正文。\n');
    splitter.feed('<handoff>INVALID</handoff>');
    const { extra, card } = splitter.finish();
    expect(card).toBeNull();
    // 缓冲区原文通过 extra 补发
    expect(extra).toContain('<handoff>');
    expect(extra).toContain('INVALID');
  });

  it('正文中含 <handoff 但未闭合 → card=null,缓冲内容通过 extra 还原', () => {
    const splitter = new StreamHandoffSplitter();
    // 无闭合标签:parseHandoff 返回 card=null → extra=缓冲原文
    splitter.feed('我在解释 <handoff 这个词的含义,不是要输出卡片');
    const { extra, card } = splitter.finish();
    expect(card).toBeNull();
    // 缓冲内容通过 extra 补发,前端可拼接到正文
    expect(extra).toContain('<handoff');
  });

  it('完全无标记的多 chunk → emitted+extra = 完整原文', () => {
    const splitter = new StreamHandoffSplitter();
    const chunks = ['chunk1 ', 'chunk2 ', 'chunk3'];
    const emitted = feedAll(splitter, chunks);
    const { extra, card } = splitter.finish();
    expect(card).toBeNull();
    expect(emitted + extra).toBe('chunk1 chunk2 chunk3');
  });

  it('缓冲期间 feed 返回空字符串', () => {
    const splitter = new StreamHandoffSplitter();
    splitter.feed('前缀。');
    // 开始缓冲
    splitter.feed('<handoff>{"target":"mock","payload":{}}</handoff>');
    // 任何后续 feed 也应该返回空字符串(已在缓冲模式)
    const emitAfter = splitter.feed('多余文本');
    expect(emitAfter).toBe('');
  });
});

// ─── MAX_BUFFER 上限保护 ──────────────────────────────────────────────────────

describe('StreamHandoffSplitter MAX_BUFFER', () => {
  it('超长未闭合标记超过 8192 字符 → 全部缓冲内容原样补发(一字不丢),退出缓冲模式', () => {
    const splitter = new StreamHandoffSplitter();
    // 先触发缓冲模式
    splitter.feed('<handoff>');
    // 喂入超过 8192 字符的内容(不含闭合标记)
    const oversize = 'x'.repeat(8200);
    const emitted = splitter.feed(oversize);
    // 超限时:整个缓冲区原样 flush,返回值非空
    expect(emitted.length).toBeGreaterThan(0);
    // flush 内容包含开头的 <handoff> 标记以及超长内容
    expect(emitted).toContain('<handoff>');
    expect(emitted).toContain(oversize.slice(0, 10));
    // 退出缓冲模式后:后续 feed 正常通过(不再缓冲)
    const afterFlush = splitter.feed('后续正文');
    // 后续内容需要经过 pending 窗口,但整段会在 finish 时补发
    const { card, extra } = splitter.finish();
    expect(card).toBeNull();
    // 后续正文出现在 afterFlush 或 extra 中(内存有界,无 infinite buffer)
    expect(afterFlush + extra).toContain('后续');
  });

  it('未超限的合法 handoff 缓冲正常工作(MAX_BUFFER 不干扰正常流程)', () => {
    const splitter = new StreamHandoffSplitter();
    const payload = { company: '字节', role: 'PM' };
    const tag = `<handoff>${JSON.stringify({ target: 'mock', payload })}</handoff>`;
    // tag 远小于 8192 字符
    expect(tag.length).toBeLessThan(8192);
    splitter.feed('前文正文足够长以突破窗口。\n\n');
    const emitted = splitter.feed(tag);
    const { card, extra } = splitter.finish();
    // 合法标记正常解析
    expect(card).not.toBeNull();
    expect(card!.target).toBe('mock');
    // emitted + extra 不含 <handoff>(标记已被缓冲区处理,不透传)
    expect(emitted + extra).not.toContain('<handoff>');
  });
});

// ─── 非流式与流式结果一致性 ──────────────────────────────────────────────────

describe('parseHandoff vs StreamHandoffSplitter consistency', () => {
  it('同一文本两种路径均正确解析卡片', () => {
    const payload = { company: '腾讯', role: 'PM' };
    const text = `分析完毕,建议进行模拟面试。\n\n<handoff>${JSON.stringify({ target: 'mock', payload })}</handoff>`;

    // 非流式
    const directResult = parseHandoff(text);

    // 流式:单 chunk
    const splitter = new StreamHandoffSplitter();
    const emitted = splitter.feed(text);
    const { extra, card: streamCard } = splitter.finish();
    const streamClean = emitted + extra;

    expect(directResult.card!.target).toBe(streamCard!.target);
    expect(directResult.card!.payload).toEqual(streamCard!.payload);
    // clean 内容均不含 <handoff>
    expect(directResult.clean).not.toContain('<handoff>');
    expect(streamClean).not.toContain('<handoff>');
  });
});
