/**
 * StepFunProvider.synthesize()(TTS 读题)单元测试。
 *
 * 验收点(对齐防编造红线 + 任务要求):
 *  - 成功:正常面试题 → 出非空音频 Buffer + 正确 mimeType,请求体含 model/input/voice/response_format。
 *  - voice 缺省取配置音色;调用方传 voice 覆盖。
 *  - 缺 STEP_API_KEY → 显式抛错,绝不静默(不发请求)。
 *  - 空/纯空白文本 → 显式抛错(不发请求)。
 *  - 上游非 2xx → 抛错带状态与详情。
 *  - 上游 2xx 但空响应体 → 抛错(不返回空 Buffer 当成功)。
 *  - 超长文本(>1000 字符)→ 截断到 1000 再发,不抛错(面试题为正常语句,极少触顶)。
 *
 * fetch 全程 mock,不打真实 StepFun(真跑准确度由集成/手测覆盖)。
 */
import { ConfigService } from '@nestjs/config';
import { StepFunProvider } from './stepfun.provider';
import type { SpeechConfig } from '../../config/speech.config';

const ASR_CFG: SpeechConfig['stepfun'] = {
  apiKey: 'sk-test',
  baseURL: 'https://api.stepfun.com/v1',
  asrModel: 'stepaudio-2.5-asr',
  timeoutMs: 120000,
  maxRetries: 1,
};

function makeConfig(ttsOverrides: Partial<SpeechConfig['tts']> = {}): ConfigService {
  const tts: SpeechConfig['tts'] = {
    apiKey: 'sk-test',
    baseURL: 'https://api.stepfun.com/v1',
    model: 'step-tts-mini',
    voice: 'cixingnansheng',
    responseFormat: 'mp3',
    timeoutMs: 60000,
    ...ttsOverrides,
  };
  return {
    get: (key: string) => (key === 'speech.tts' ? tts : ASR_CFG),
  } as unknown as ConfigService;
}

function provider(ttsOverrides: Partial<SpeechConfig['tts']> = {}): StepFunProvider {
  return new StepFunProvider(makeConfig(ttsOverrides));
}

/** 构造一个返回二进制音频的 ok Response。 */
function okAudioResponse(bytes: Uint8Array): Response {
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => bytes.buffer.slice(0),
  } as unknown as Response;
}

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  jest.restoreAllMocks();
});

describe('StepFunProvider.synthesize — 成功路径', () => {
  it('正常面试题 → 出非空音频 + audio/mpeg,请求体含 model/input/voice/response_format', async () => {
    const audioBytes = new Uint8Array([0x49, 0x44, 0x33, 0x04]); // 'ID3' mp3 头样本
    const fetchMock = jest.fn().mockResolvedValue(okAudioResponse(audioBytes));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await provider().synthesize('请做一个自我介绍。');

    expect(result.audio.length).toBe(4);
    expect(result.mimeType).toBe('audio/mpeg');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.stepfun.com/v1/audio/speech');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.model).toBe('step-tts-mini');
    expect(body.input).toBe('请做一个自我介绍。');
    expect(body.voice).toBe('cixingnansheng');
    expect(body.response_format).toBe('mp3');
  });

  it('调用方传 voice 覆盖配置缺省音色', async () => {
    const fetchMock = jest.fn().mockResolvedValue(okAudioResponse(new Uint8Array([1, 2, 3])));
    global.fetch = fetchMock as unknown as typeof fetch;

    await provider().synthesize('你好', 'wenrounansheng');

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string) as {
      voice: string;
    };
    expect(body.voice).toBe('wenrounansheng');
  });

  it('response_format=wav → mimeType=audio/wav', async () => {
    const fetchMock = jest.fn().mockResolvedValue(okAudioResponse(new Uint8Array([1])));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await provider({ responseFormat: 'wav' }).synthesize('题目');
    expect(result.mimeType).toBe('audio/wav');
  });

  it('超长文本截断到 1000 字符后再发(不抛错)', async () => {
    const fetchMock = jest.fn().mockResolvedValue(okAudioResponse(new Uint8Array([1])));
    global.fetch = fetchMock as unknown as typeof fetch;

    await provider().synthesize('一'.repeat(1500));

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string) as {
      input: string;
    };
    expect(body.input.length).toBe(1000);
  });
});

describe('StepFunProvider.synthesize — 防编造红线(显式抛错,不静默)', () => {
  it('缺 STEP_API_KEY → 抛错且不发请求', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(provider({ apiKey: undefined }).synthesize('题目')).rejects.toThrow(
      /未配置 STEP_API_KEY/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('空文本 → 抛错且不发请求', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(provider().synthesize('   ')).rejects.toThrow(/合成文本为空/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('上游非 2xx → 抛错带状态', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
      statusText: 'Unauthorized',
    } as unknown as Response) as unknown as typeof fetch;

    await expect(provider().synthesize('题目')).rejects.toThrow(/非 2xx\(401\)/);
  });

  it('上游 2xx 但空响应体 → 抛错(不返回空 Buffer 当成功)', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(okAudioResponse(new Uint8Array([]))) as unknown as typeof fetch;

    await expect(provider().synthesize('题目')).rejects.toThrow(/未产出任何音频内容/);
  });
});
