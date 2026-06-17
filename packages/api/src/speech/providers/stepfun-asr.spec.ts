/**
 * StepFunProvider.transcribeFile()(ASR 转写)单元测试 —— 本次 P0 修复的核心验收。
 *
 * 验收点(对齐任务要求):
 *  - 转码先行:任意上传格式都先经 transcodeToOggOpus,format.type 恒为 ogg(StepFun 接受)。
 *  - 体积闸:转码后 base64 > 10MB → 抛中文用户可读错误("录音过长…"),不发请求。
 *  - 退避重试:仅瞬时失败(SSE "internal error" / HTTP 429)重试,确定性失败(格式/超限/空)不重试。
 *  - 防编造红线:缺 key / 空音频 显式抛错。
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
import { transcodeToOggOpus, TRANSCODED_FORMAT } from './audio-transcode';

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

/** 一段正常 done 的 SSE(单句全文兜底)。工厂函数:ReadableStream 单次消费,每次调用须新建。 */
function okSse(): Response {
  return sseResponse([
    'data: ' + JSON.stringify({ type: 'transcript.text.done', text: '你好世界' }),
    'data: [DONE]',
  ]);
}

const realFetch = global.fetch;
beforeEach(() => {
  transcodeMock.mockReset();
  // 默认:转码返回一小段 ogg 字节。
  transcodeMock.mockResolvedValue(Buffer.from('OggS-fake-transcoded'));
});
afterEach(() => {
  global.fetch = realFetch;
  jest.restoreAllMocks();
});

describe('transcribeFile — 转码先行 + format.type=ogg', () => {
  it('任意上传格式都先转码,请求体 format.type=ogg、data 用转码后字节的 base64', async () => {
    const fetchMock = jest.fn().mockResolvedValue(okSse());
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await provider().transcribeFile(Buffer.from('raw-webm'), 'audio/webm', ['全栈']);

    expect(transcodeMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ text: '你好世界', startMs: 0, endMs: 0 }]);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.stepfun.com/v1/audio/asr/sse');
    const body = JSON.parse(init.body as string) as {
      audio: { data: string; input: { format: { type: string }; transcription: { hotwords: string[] } } };
    };
    expect(body.audio.input.format.type).toBe(TRANSCODED_FORMAT.stepfunType);
    expect(body.audio.input.format.type).toBe('ogg');
    expect(body.audio.data).toBe(Buffer.from('OggS-fake-transcoded').toString('base64'));
    expect(body.audio.input.transcription.hotwords).toEqual(['全栈']);
  });
});

describe('transcribeFile — 体积闸(> 10MB base64)', () => {
  it('转码后 base64 > 10MB → 抛中文"录音过长"错误,不发请求', async () => {
    // 阈值:base64 > 10485760 ⇔ 原始 > 7864320 字节。8MB 原始 → base64 ≈ 10.67MB,触发闸门。
    const tooBig = Buffer.alloc(8_000_000, 0x61);
    transcodeMock.mockResolvedValue(tooBig);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(provider().transcribeFile(Buffer.from('x'), 'audio/webm')).rejects.toThrow(
      /录音过长/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('transcribeFile — 防编造红线', () => {
  it('缺 STEP_API_KEY → 抛错且不转码、不发请求', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      provider({ apiKey: undefined }).transcribeFile(Buffer.from('x'), 'audio/webm'),
    ).rejects.toThrow(/未配置 STEP_API_KEY/);
    expect(transcodeMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('空音频 → 抛错且不转码', async () => {
    await expect(provider().transcribeFile(Buffer.alloc(0), 'audio/webm')).rejects.toThrow(
      /音频内容为空/,
    );
    expect(transcodeMock).not.toHaveBeenCalled();
  });
});

describe('transcribeFile — 退避重试(仅瞬时失败)', () => {
  it('HTTP 429 后重试,第二次成功 → 返回结果', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'rate limited',
        statusText: 'Too Many Requests',
      } as unknown as Response)
      .mockResolvedValueOnce(okSse());
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await provider({ maxRetries: 2 }).transcribeFile(
      Buffer.from('x'),
      'audio/webm',
    );
    expect(result).toEqual([{ text: '你好世界', startMs: 0, endMs: 0 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('SSE "internal error" 后重试,第二次成功 → 返回结果', async () => {
    const errSse = sseResponse([
      'data: ' + JSON.stringify({ type: 'error', message: 'internal error' }),
    ]);
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(errSse)
      .mockResolvedValueOnce(okSse());
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await provider({ maxRetries: 2 }).transcribeFile(
      Buffer.from('x'),
      'audio/webm',
    );
    expect(result).toEqual([{ text: '你好世界', startMs: 0, endMs: 0 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('确定性失败(unsupported audio format)→ 不重试,只发一次', async () => {
    const unsupportedSse = sseResponse([
      'data: ' + JSON.stringify({ type: 'error', message: 'unsupported audio format' }),
    ]);
    const fetchMock = jest.fn().mockResolvedValue(unsupportedSse);
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      provider({ maxRetries: 2 }).transcribeFile(Buffer.from('x'), 'audio/webm'),
    ).rejects.toThrow(/unsupported audio format/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('空转写(确定性)→ 不重试,只发一次', async () => {
    const emptySse = sseResponse(['data: [DONE]']);
    const fetchMock = jest.fn().mockResolvedValue(emptySse);
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      provider({ maxRetries: 2 }).transcribeFile(Buffer.from('x'), 'audio/webm'),
    ).rejects.toThrow(/未产出任何转写内容/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('持续 429 直到耗尽尝试次数(1 + maxRetries,钳到 3)→ 抛错,恰好尝试 3 次', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
      statusText: 'Too Many Requests',
    } as unknown as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    // maxRetries=5 → 1+5=6,钳到 3。
    await expect(
      provider({ maxRetries: 5 }).transcribeFile(Buffer.from('x'), 'audio/webm'),
    ).rejects.toThrow(/429/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
