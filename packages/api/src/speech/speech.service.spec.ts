/**
 * SpeechService(语音门面)单元测试 —— SpeechProvider 全程 mock,不调真 StepFun、不需 key。
 *
 * 验收点:
 *  ① transcribeFile:把 provider 产出的 segments 逐段过词库(全站→全栈),text 被纠正,
 *     时间戳/其它字段原样透传;hotwords 透传给 provider。
 *  ② transcribeFile:provider 抛错 → 门面不吞错、不兜底空数组,显式上抛(失败不计费的根)。
 *  ③ synthesize:转调 provider.synthesize(text, voice),返回其音频 buffer + mimeType;
 *     provider 抛错 → 门面显式上抛。
 *
 * 并发护栏 ConcurrencyLimiter 用「直通」假实现(run(fn)=fn()),只验证门面逻辑,不验证并发本身
 *(并发由 concurrency-limiter.spec 单独覆盖)。
 */
import { SpeechService } from './speech.service';
import type {
  SpeechProvider,
  TranscriptSegment,
  SynthesizedAudio,
} from './providers/speech.provider';
import type { ConcurrencyLimiter } from '../ai/concurrency-limiter';

// 直通 limiter:run(fn) 直接执行 fn,不引入并发语义,聚焦门面逻辑验证。
const passthroughLimiter = {
  run: <T>(fn: () => Promise<T>): Promise<T> => fn(),
} as unknown as ConcurrencyLimiter;

function makeService(provider: SpeechProvider): SpeechService {
  return new SpeechService(provider, passthroughLimiter);
}

describe('SpeechService.transcribeFile — 词库纠正 + 透传', () => {
  it('对 provider 产出的每段 text 应用词库(全站→全栈),时间戳原样透传', async () => {
    const raw: TranscriptSegment[] = [
      { text: '你好,先做个自我介绍。', startMs: 0, endMs: 2000 },
      { text: '我做全站,后段用密等。', startMs: 2000, endMs: 6000, speaker: 'candidate' },
    ];
    const transcribeFile = jest.fn().mockResolvedValue(raw);
    const provider: SpeechProvider = {
      capabilities: { diarization: false, channelSplit: false, realtime: false },
      transcribeFile,
      synthesize: jest.fn(),
    };

    const out = await makeService(provider).transcribeFile(
      Buffer.from('audio'),
      'audio/mpeg',
      ['Acme', '全栈工程师'],
    );

    // 第 1 段无错词,原样;第 2 段三处错词被纠正。
    expect(out[0].text).toBe('你好,先做个自我介绍。');
    expect(out[1].text).toBe('我做全栈,后端用幂等。');
    // 时间戳/speaker 原样透传,词库只动 text。
    expect(out[1]).toMatchObject({ startMs: 2000, endMs: 6000, speaker: 'candidate' });

    // hotwords 透传给 provider。
    expect(transcribeFile).toHaveBeenCalledWith(
      expect.any(Buffer),
      'audio/mpeg',
      ['Acme', '全栈工程师'],
    );
  });

  it('hotwords 缺省为空数组传给 provider', async () => {
    const transcribeFile = jest.fn().mockResolvedValue([]);
    const provider: SpeechProvider = {
      capabilities: { diarization: false, channelSplit: false, realtime: false },
      transcribeFile,
      synthesize: jest.fn(),
    };

    await makeService(provider).transcribeFile(Buffer.from('a'), 'audio/wav');
    expect(transcribeFile).toHaveBeenCalledWith(expect.any(Buffer), 'audio/wav', []);
  });

  it('provider 抛错 → 门面不吞错、显式上抛(失败不计费的根)', async () => {
    const provider: SpeechProvider = {
      capabilities: { diarization: false, channelSplit: false, realtime: false },
      transcribeFile: jest.fn().mockRejectedValue(new Error('ASR 上游不可用')),
      synthesize: jest.fn(),
    };

    await expect(
      makeService(provider).transcribeFile(Buffer.from('a'), 'audio/mpeg'),
    ).rejects.toThrow('ASR 上游不可用');
  });
});

describe('SpeechService.synthesize — TTS 转调 + 透传', () => {
  it('转调 provider.synthesize(text, voice),回传其音频 buffer + mimeType', async () => {
    const fakeAudio: SynthesizedAudio = {
      audio: Buffer.from([0x49, 0x44, 0x33]),
      mimeType: 'audio/mpeg',
    };
    const synthesize = jest.fn().mockResolvedValue(fakeAudio);
    const provider: SpeechProvider = {
      capabilities: { diarization: false, channelSplit: false, realtime: false },
      transcribeFile: jest.fn(),
      synthesize,
    };

    const out = await makeService(provider).synthesize('请做个自我介绍。', 'wenrounansheng');

    expect(synthesize).toHaveBeenCalledWith('请做个自我介绍。', 'wenrounansheng');
    expect(out.audio.length).toBe(3);
    expect(out.mimeType).toBe('audio/mpeg');
  });

  it('voice 缺省时仍透传 undefined,由 provider 取配置缺省音色', async () => {
    const synthesize = jest
      .fn()
      .mockResolvedValue({ audio: Buffer.from([1]), mimeType: 'audio/mpeg' });
    const provider: SpeechProvider = {
      capabilities: { diarization: false, channelSplit: false, realtime: false },
      transcribeFile: jest.fn(),
      synthesize,
    };

    await makeService(provider).synthesize('题目');
    expect(synthesize).toHaveBeenCalledWith('题目', undefined);
  });

  it('provider.synthesize 抛错 → 门面显式上抛,不兜底空音频', async () => {
    const provider: SpeechProvider = {
      capabilities: { diarization: false, channelSplit: false, realtime: false },
      transcribeFile: jest.fn(),
      synthesize: jest.fn().mockRejectedValue(new Error('TTS 上游不可用')),
    };

    await expect(makeService(provider).synthesize('题目')).rejects.toThrow('TTS 上游不可用');
  });
});
