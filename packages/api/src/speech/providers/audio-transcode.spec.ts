/**
 * audio-transcode 单元测试:转码包装器(ffmpeg arg 构造 / 目标格式映射 / 错误处理)。
 *
 * spawn 全程 mock,不依赖系统是否装了 ffmpeg(真实转码集成在部署期 Docker 镜像验证)。
 * 用一个可控的假 child process(EventEmitter + 假 stdio 流)模拟 ffmpeg 的成功/失败/缺失/空产出。
 */
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import {
  buildFfmpegArgs,
  TRANSCODED_FORMAT,
  transcodeToOggOpus,
} from './audio-transcode';

jest.mock('child_process', () => ({ spawn: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { spawn } = require('child_process') as { spawn: jest.Mock };

/** 假 child process:stdin 可写、stdout/stderr 可读(PassThrough),进程对象是 EventEmitter。 */
interface FakeChild extends EventEmitter {
  stdin: PassThrough;
  stdout: PassThrough;
  stderr: PassThrough;
  kill: jest.Mock;
}

function makeFakeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = jest.fn();
  return child;
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('buildFfmpegArgs — ffmpeg 参数构造', () => {
  it('构造 stdin→stdout、单声道 16kHz opus 24kbps、ogg 容器的参数', () => {
    const args = buildFfmpegArgs();
    // 输入输出走管道(隐私:不落临时文件)。
    expect(args).toContain('pipe:0');
    expect(args).toContain('pipe:1');
    // 单声道。
    expect(args[args.indexOf('-ac') + 1]).toBe('1');
    // 16kHz 采样率。
    expect(args[args.indexOf('-ar') + 1]).toBe('16000');
    // opus 编码 + 24kbps 码率。
    expect(args[args.indexOf('-c:a') + 1]).toBe('libopus');
    expect(args[args.indexOf('-b:a') + 1]).toBe('24k');
    // ogg 容器(StepFun 接受)。
    expect(args[args.indexOf('-f') + 1]).toBe('ogg');
    // 丢弃视频/封面流。
    expect(args).toContain('-vn');
  });
});

describe('TRANSCODED_FORMAT — 目标格式映射', () => {
  it('StepFun format.type = ogg', () => {
    expect(TRANSCODED_FORMAT.stepfunType).toBe('ogg');
  });
});

describe('transcodeToOggOpus — 成功路径', () => {
  it('成功:stdin 收原始字节,stdout 产出 → 返回非空 buffer', async () => {
    const child = makeFakeChild();
    spawn.mockReturnValue(child);

    const promise = transcodeToOggOpus(Buffer.from('raw-webm-bytes'));

    // 模拟 ffmpeg 写出 ogg 字节后正常退出。
    child.stdout.write(Buffer.from('OggS-transcoded'));
    child.stdout.end();
    child.emit('close', 0);

    const out = await promise;
    expect(out.length).toBeGreaterThan(0);
    expect(out.toString()).toBe('OggS-transcoded');

    // 用 'ffmpeg' 可执行名调用(系统 binary,无 npm 依赖)。
    expect(spawn).toHaveBeenCalledWith('ffmpeg', expect.any(Array), expect.any(Object));
  });
});

describe('transcodeToOggOpus — 错误处理(显式抛错,不返回空当成功)', () => {
  it('输入为空 → 抛错且不 spawn', async () => {
    await expect(transcodeToOggOpus(Buffer.alloc(0))).rejects.toThrow(/音频内容为空/);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('ffmpeg 未安装(ENOENT)→ 抛可读错误', async () => {
    const child = makeFakeChild();
    spawn.mockReturnValue(child);

    const promise = transcodeToOggOpus(Buffer.from('x'));
    const enoent: NodeJS.ErrnoException = new Error('spawn ffmpeg ENOENT');
    enoent.code = 'ENOENT';
    child.emit('error', enoent);

    await expect(promise).rejects.toThrow(/ffmpeg 未安装/);
  });

  it('非零退出 → 抛错带 ffmpeg stderr 详情', async () => {
    const child = makeFakeChild();
    spawn.mockReturnValue(child);

    const promise = transcodeToOggOpus(Buffer.from('bad-bytes'));
    child.stderr.write(Buffer.from('Invalid data found when processing input'));
    child.stderr.end();
    child.emit('close', 1);

    await expect(promise).rejects.toThrow(/ffmpeg 退出码 1/);
    await expect(promise).rejects.toThrow(/Invalid data found/);
  });

  it('退出码 0 但产出为空 → 抛错(不把空当成功)', async () => {
    const child = makeFakeChild();
    spawn.mockReturnValue(child);

    const promise = transcodeToOggOpus(Buffer.from('x'));
    child.stdout.end(); // 无任何输出
    child.emit('close', 0);

    await expect(promise).rejects.toThrow(/未产出任何内容/);
  });

  it('超时 → kill 进程并抛超时错误', async () => {
    jest.useFakeTimers();
    const child = makeFakeChild();
    spawn.mockReturnValue(child);

    const promise = transcodeToOggOpus(Buffer.from('x'), 5000);
    // 让超时定时器触发(进程一直不 close)。
    jest.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow(/转码超时/);
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
    jest.useRealTimers();
  });
});
