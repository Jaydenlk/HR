/**
 * StepFunProvider ASR 逐字→句级归并的单元测试 —— 本次「逐字成句」P0 bug 的核心验收。
 *
 * 背景(线上实测 2026-07-07):真实录音下 StepFun 逐字推 `transcript.text.delta`,每字一个事件、
 * 各带自己的 start_time。旧实现把每个带 start_time 的 delta 直接 push 成一段 → 6611 个单字 utterance,
 * 逐字级角色打标全乱。修复:在 consumeSse 返回前按「时间停顿间隔为主、句末标点为辅、长度上限兜底」归并成句级片段。
 *
 * 三种 SSE 形状都要鲁棒:
 *  - 用例A(逐字):同一句内单字 delta 间隔小,句间停顿大 → 各自聚成整句(复现 bug,旧实现必 FAIL)。
 *  - 用例B(句级):delta 本身已是整句,句间停顿大 → 原样保留,不被误并也不被切碎。
 *  - 用例C(done 兜底):只有 done 无 delta → 单段全文,保持现有行为(走 done 兜底,不进归并函数)。
 *
 * transcode 与 fetch 全程 mock:不调系统 ffmpeg、不打真实 StepFun。
 */
import { ConfigService } from '@nestjs/config';
import type { SpeechConfig } from '../../config/speech.config';

// 必须在 import provider 之前 mock,确保 provider 引用到的是 mock。
jest.mock('./audio-transcode', () => {
  const actual = jest.requireActual('./audio-transcode');
  return {
    ...actual,
    transcodeToOggOpus: jest.fn(),
  };
});

import { StepFunProvider } from './stepfun.provider';
import { transcodeToOggOpus } from './audio-transcode';

const transcodeMock = transcodeToOggOpus as jest.Mock;

const TTS_CFG: SpeechConfig['tts'] = {
  apiKey: 'sk-test',
  baseURL: 'https://api.stepfun.com/v1',
  model: 'step-tts-mini',
  voice: 'cixingnansheng',
  responseFormat: 'mp3',
  timeoutMs: 60000,
};

function makeConfig(asrOverrides: Partial<SpeechConfig['stepfun']> = {}): ConfigService {
  const asr: SpeechConfig['stepfun'] = {
    apiKey: 'sk-test',
    baseURL: 'https://api.stepfun.com/v1',
    asrModel: 'stepaudio-2.5-asr',
    timeoutMs: 120000,
    maxRetries: 2,
    ...asrOverrides,
  };
  return {
    get: (key: string) => (key === 'speech.tts' ? TTS_CFG : asr),
  } as unknown as ConfigService;
}

function provider(asrOverrides: Partial<SpeechConfig['stepfun']> = {}): StepFunProvider {
  return new StepFunProvider(makeConfig(asrOverrides));
}

/** 构造一个返回指定 SSE 文本的 ok Response(单 chunk)。 */
function sseResponse(lines: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(lines.join('\n') + '\n'));
      controller.close();
    },
  });
  return { ok: true, status: 200, body } as unknown as Response;
}

/** 一个逐字 delta SSE 行(照 provider 取字段顺序:text 优先,故用 text 单字复现线上逐字形态)。 */
function charDelta(text: string, startMs: number, endMs: number): string {
  return (
    'data: ' +
    JSON.stringify({
      type: 'transcript.text.delta',
      text,
      start_time: startMs,
      end_time: endMs,
    })
  );
}

const realFetch = global.fetch;
beforeEach(() => {
  transcodeMock.mockReset();
  transcodeMock.mockResolvedValue(Buffer.from('OggS-fake-transcoded'));
});
afterEach(() => {
  global.fetch = realFetch;
  jest.restoreAllMocks();
});

describe('归并 A — 逐字 delta 聚成句级(复现线上「逐字成句」bug)', () => {
  it('同句单字间隔小、句间停顿大 → 归并为整句,段数远小于逐字数', async () => {
    // 第一句「然后这次意向的是新」9 字,字间隔 ~130ms(远小于停顿阈值);
    // 末字 endMs=1080,下一句首字 startMs=2000 → 停顿 920ms(≥ 阈值)→ 切句。
    const s1 = '然后这次意向的是新';
    const s1Lines = s1.split('').map((ch, i) => charDelta(ch, i * 130, i * 130 + 100));
    // 第二句「你好」2 字。
    const s2Lines = [charDelta('你', 2000, 2100), charDelta('好', 2130, 2230)];

    const fetchMock = jest
      .fn()
      .mockResolvedValue(sseResponse([...s1Lines, ...s2Lines, 'data: [DONE]']));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await provider().transcribeFile(Buffer.from('x'), 'audio/webm');

    // 旧实现:11 个单字段 → 以下断言必 FAIL。修复后:恰好 2 段整句。
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('然后这次意向的是新');
    expect(result[0].startMs).toBe(0); // 该句首字 start
    expect(result[0].endMs).toBe(8 * 130 + 100); // 该句末字 end = 1140
    expect(result[1].text).toBe('你好');
    expect(result[1].startMs).toBe(2000);
    expect(result[1].endMs).toBe(2230);
    // 每段 endMs ≥ startMs。
    for (const seg of result) {
      expect(seg.endMs).toBeGreaterThanOrEqual(seg.startMs);
    }
  });
});

describe('归并 B — 句级 delta 原样保留(防切坏/防误并)', () => {
  it('两个已成句的 delta、句间停顿大 → 仍是 2 段,文本不被切碎也不被误并', async () => {
    const line1 =
      'data: ' +
      JSON.stringify({
        type: 'transcript.text.delta',
        text: '你好，请自我介绍一下',
        start_time: 0,
        end_time: 2000,
      });
    const line2 =
      'data: ' +
      JSON.stringify({
        type: 'transcript.text.delta',
        text: '好的，我叫小明',
        start_time: 3500, // 与上句 end=2000 停顿 1500ms(≥ 阈值)
        end_time: 5000,
      });

    const fetchMock = jest
      .fn()
      .mockResolvedValue(sseResponse([line1, line2, 'data: [DONE]']));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await provider().transcribeFile(Buffer.from('x'), 'audio/webm');

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('你好，请自我介绍一下');
    expect(result[1].text).toBe('好的，我叫小明');
  });
});

describe('归并 C — done 全文兜底(无 delta 时保持现有行为)', () => {
  it('只有 transcript.text.done 无 delta → 返回单段全文,start=0 end=0', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      sseResponse([
        'data: ' +
          JSON.stringify({ type: 'transcript.text.done', text: '你好世界' }),
        'data: [DONE]',
      ]),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await provider().transcribeFile(Buffer.from('x'), 'audio/webm');

    expect(result).toEqual([{ text: '你好世界', startMs: 0, endMs: 0 }]);
  });
});
