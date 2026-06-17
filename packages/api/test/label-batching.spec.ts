/**
 * LabelService 长转写打标韧性单测(复现并锁死 max_tokens 截断 503 生产事故)。
 *
 * 背景:面试复盘的角色打标走 AiService.completeStructured(toolName='label_speakers')。
 * 旧实现一次性把全部 N 段送一个调用,输出需 N 条 {idx,speaker} JSON;长面试(20-40 分钟
 * ≈ 800-1200 句)时输出 token 超过 max_tokens(且旧公式 512+N*24 在 N>660 处被 16384 硬顶
 * 钉死、每段预算被吃掉),被截断 → attemptStructured 抛「max_tokens 处被截断」→ 主备通道均
 * 失败 → 用户收 503,整条复盘不可用。
 *
 * 本套件用一个忠实复刻生产截断契约的 AiService mock(单次调用的模拟输出 token 超过该次
 * 请求的 max_tokens 即抛与生产同样的截断错误),覆盖三点:
 *  1) 复现:把全部 800 段塞进单次调用(= 旧行为)→ 截断抛错(FAIL-before 证据);
 *  2) 修复:新 LabelService 对同样 800 段按批打标 → 全部成功、段数一一对应、不抛(PASS-after);
 *  3) 优雅降级:provider 持续失败(每批都抛)→ 不抛 503,返回完整未丢段的转写,
 *     缺判的段落落安全默认 'candidate'(用户在确认页纠正),debrief 仍可用。
 *
 * 不触真实 DeepSeek/relay:AiService 全 mock。
 */
import { ServiceUnavailableException } from '@nestjs/common';
import { LabelService } from '../src/speech/label.service';
import { AiService } from '../src/ai/ai.service';
import type { TranscriptSegment } from '../src/speech/providers/speech.provider';

// 生产侧每条 {"idx":1199,"speaker":"interviewer"}, 最坏约 22 输出 token。mock 用此估算单次输出。
const SIMULATED_TOKENS_PER_SEGMENT = 22;

interface StructuredParams {
  prompt: string;
  toolName: string;
  maxTokens?: number;
}

// 从 user prompt 还原"本次调用包含多少待标注段"——prompt 形如「...共 N 句。...」+ N 行「idx: 文本」。
// 用行数(idx: 前缀)统计最稳:上下文参考块以"面试官:/候选人:"前缀,不会被误计。
function countLabelLines(prompt: string): number {
  return prompt.split('\n').filter((l) => /^\d+:\s/.test(l)).length;
}

/**
 * 忠实复刻 AiService.completeStructured 对 label_speakers 的关键契约:
 *  - 单次调用的"模拟输出 token"= 段数 * 每段 token;若 > 本次请求的 max_tokens →
 *    抛与生产 attemptStructured 完全同义的截断错误(让旧单次行为像生产一样炸)。
 *  - 否则按段数返回一一对应、idx 完整的 {idx,speaker}[](candidate/interviewer 交替,内容无关)。
 */
function makeTruncatingAi(): AiService {
  const completeStructured = jest.fn(async (params: StructuredParams) => {
    const segCount = countLabelLines(params.prompt);
    const simulatedOutputTokens = segCount * SIMULATED_TOKENS_PER_SEGMENT;
    const budget = params.maxTokens ?? 8192;
    if (simulatedOutputTokens > budget) {
      // 与 ai.service.ts attemptStructured 抛出的字符串同义(截断 → 通道失败 → 上抛)。
      throw new ServiceUnavailableException(
        `AI 服务暂时不可用(completeStructured 主备通道均失败:通道 relay 工具 "${params.toolName}" 输出在 max_tokens 处被截断,结构化结果不完整),请稍后重试。`,
      );
    }
    const segments = Array.from({ length: segCount }, (_v, idx) => ({
      idx,
      speaker: idx % 2 === 0 ? 'interviewer' : 'candidate',
    }));
    return { segments };
  });
  return { completeStructured } as unknown as AiService;
}

// provider 持续失败:任何打标调用都抛(模拟主备通道全挂),用于验优雅降级。
function makeAlwaysFailingAi(): AiService {
  const completeStructured = jest.fn(async () => {
    throw new ServiceUnavailableException(
      'AI 服务暂时不可用(completeStructured 主备通道均失败:连接超时),请稍后重试。',
    );
  });
  return { completeStructured } as unknown as AiService;
}

function makeSegments(n: number): TranscriptSegment[] {
  return Array.from({ length: n }, (_v, i) => ({
    text: `这是第 ${i} 句面试转写内容,用于占位以撑出真实长度的逐句文本。`,
    startMs: i * 3000,
    endMs: i * 3000 + 2800,
  }));
}

describe('LabelService 长转写打标韧性', () => {
  // 一场长面试的真实段数量级(40 分钟、约 2-3 秒一句)。
  const LONG_N = 800;

  it('复现:把全部 800 段塞进单次 label_speakers 调用(= 旧行为)→ max_tokens 截断抛错', async () => {
    const ai = makeTruncatingAi();
    const segments = makeSegments(LONG_N);
    // 直接模拟旧单次调用:一个调用带全部段 + 旧公式 max_tokens(512+N*24,封顶 16384)。
    const oldMaxTokens = Math.min(512 + LONG_N * 24, 16384);
    const lines = segments.map((s, idx) => `${idx}: ${s.text}`).join('\n');
    const singleCall = ai.completeStructured({
      system: 'sys',
      prompt: `共 ${LONG_N} 句。\n${lines}`,
      toolName: 'label_speakers',
      toolDescription: 'd',
      schema: { type: 'object' },
      maxTokens: oldMaxTokens,
    });
    await expect(singleCall).rejects.toThrow(/max_tokens 处被截断/);
  });

  it('修复:新 LabelService 对 800 段按批打标 → 全部成功、段数一一对应、不抛 503', async () => {
    const ai = makeTruncatingAi();
    const service = new LabelService(ai);
    const segments = makeSegments(LONG_N);

    const labeled = await service.label(segments);

    // 段数完整、文本/时间戳原样回引(防编造:AI 仅决定 speaker)、speaker 恒为合法两枚举。
    expect(labeled).toHaveLength(LONG_N);
    for (let i = 0; i < LONG_N; i++) {
      expect(labeled[i].text).toBe(segments[i].text);
      expect(labeled[i].startMs).toBe(segments[i].startMs);
      expect(labeled[i].endMs).toBe(segments[i].endMs);
      expect(['interviewer', 'candidate']).toContain(labeled[i].speaker);
    }

    // 确实是按批切的(多次调用),且每次调用的 max_tokens 都没触发截断。
    const mock = (ai.completeStructured as jest.Mock).mock;
    expect(mock.calls.length).toBeGreaterThan(1);
    expect(mock.calls.length).toBe(Math.ceil(LONG_N / 60));
    for (const [params] of mock.calls as [StructuredParams][]) {
      const segCount = countLabelLines(params.prompt);
      expect(segCount).toBeLessThanOrEqual(60);
      // 该批模拟输出 token 严格小于其 max_tokens 预算 → 不会被截断。
      expect(segCount * SIMULATED_TOKENS_PER_SEGMENT).toBeLessThan(params.maxTokens ?? 0);
    }
  });

  it('优雅降级:provider 持续失败(每批都抛)→ 不抛 503,返回完整未丢段的转写,缺判段落落安全默认 candidate', async () => {
    const ai = makeAlwaysFailingAi();
    const service = new LabelService(ai);
    const segments = makeSegments(150); // 跨 3 批,全部批失败。

    // 关键:整条 label() 不抛(用户拿到完整转写,debrief 仍可用),而非把 503 上抛炸掉复盘。
    const labeled = await service.label(segments);

    expect(labeled).toHaveLength(150);
    for (let i = 0; i < 150; i++) {
      // 文本/时间戳原样保留(无丢段、无篡改);speaker 落安全默认 candidate,等用户在确认页纠正。
      expect(labeled[i].text).toBe(segments[i].text);
      expect(labeled[i].startMs).toBe(segments[i].startMs);
      expect(labeled[i].speaker).toBe('candidate');
    }
    // 确实尝试过(每批都调了一次再降级),不是直接放弃。
    expect((ai.completeStructured as jest.Mock).mock.calls.length).toBe(Math.ceil(150 / 60));
  });

  it('空转写仍显式抛错(防编造:不把空当成功)', async () => {
    const ai = makeTruncatingAi();
    const service = new LabelService(ai);
    await expect(service.label([])).rejects.toThrow(/转写结果为空/);
  });
});
