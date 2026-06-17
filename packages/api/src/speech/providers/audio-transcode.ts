import { spawn } from 'child_process';

/**
 * 音频转码:任意上传格式 → StepFun ASR 接受的统一格式(ogg/opus 单声道 16kHz ~24kbps)。
 *
 * 为什么必须转码:StepFun ASR 只认 wav/mp3/m4a/ogg,拒收 webm/aac/amr/mp4;而浏览器 MediaRecorder
 * 默认录 audio/webm,部分安卓/微信录 amr —— 不转码真实用户几乎必失败(线上对 StepFun 实测复现)。
 *
 * 为什么选 ogg/opus 单声道 16k ~24kbps:StepFun 有 base64 ≤ 10MB 硬上限。opus@24kbps≈3KB/s,
 * 40 分钟≈7.2MB 原始 → base64(×4/3)≈9.6MB,仍在 10MB 内;mp3@48kbps 同时长 base64 会超 10MB。
 * 单声道 + 16kHz 是 ASR 充分采样率,既保识别率又把体积压到最小。两种格式均在 StepFun 实测 SUCCESS。
 *
 * 隐私铁律:全程 stdin→stdout 管道,音频字节不落任何临时文件(连「写完即删」的窗口都不留),
 * 进程退出后 buffer 由 GC 回收。这是比临时文件更强的隐私姿态。
 *
 * 防编造红线:ffmpeg 缺失 / 转码失败 / 产出空 → 显式抛带可读信息的错误,绝不返回空 buffer 当成功。
 */

/** 转码目标格式声明:供应商发 ASR 请求时据此填 format.type,避免散落硬编码。 */
export const TRANSCODED_FORMAT = {
  /** StepFun format.type 值(ogg 容器封装 opus 编码)。 */
  stepfunType: 'ogg',
} as const;

/** ffmpeg 参数:stdin 读任意格式 → 单声道 16kHz opus 24kbps → ogg 容器写 stdout。 */
export function buildFfmpegArgs(): string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    // 输入来自 stdin(任意容器/编码,由 ffmpeg 自动探测)。
    '-i',
    'pipe:0',
    // 丢弃视频/封面流(部分 mp4/webm 带封面图),只留音频,避免无谓体积与转码失败。
    '-vn',
    // 单声道:面试录音单人或近场,双声道无增益却翻倍体积。
    '-ac',
    '1',
    // 16kHz:ASR 充分采样率(语音带宽 ≤ 8kHz),高于此对识别率无益只增体积。
    '-ar',
    '16000',
    // opus 编码,24kbps:在 16k 单声道下兼顾清晰度与「40 分钟 < 10MB base64」上限。
    '-c:a',
    'libopus',
    '-b:a',
    '24k',
    // ogg 容器封装(StepFun 接受 ogg);输出到 stdout。
    '-f',
    'ogg',
    'pipe:1',
  ];
}

/**
 * 把任意格式音频 buffer 转码为 ogg/opus 单声道 16kHz。返回转码后的 buffer。
 *
 * @param input  原始音频字节(纯内存)。
 * @param timeoutMs  转码超时;超时 kill 进程并抛错(防卡死 2C2G 单进程)。
 * @throws ffmpeg 不存在 / 非零退出 / 超时 / 产出空 → 带可读信息的 Error。
 */
export function transcodeToOggOpus(input: Buffer, timeoutMs = 120000): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    if (input.length === 0) {
      reject(new Error('音频内容为空,无法转码'));
      return;
    }

    const child = spawn('ffmpeg', buildFfmpegArgs(), {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new Error(`音频转码超时(${timeoutMs}ms)`));
    }, timeoutMs);

    const fail = (err: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    };

    child.on('error', (err: NodeJS.ErrnoException) => {
      // ENOENT = 系统未安装 ffmpeg(生产镜像须在 Dockerfile 装上)。
      if (err.code === 'ENOENT') {
        fail(new Error('音频转码组件 ffmpeg 未安装,无法处理录音(请联系管理员)'));
        return;
      }
      fail(new Error(`音频转码进程启动失败:${err.message}`));
    });

    child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        const detail = Buffer.concat(stderrChunks).toString('utf-8').trim().slice(0, 500);
        reject(
          new Error(
            `音频转码失败(ffmpeg 退出码 ${code ?? '未知'})${detail ? `:${detail}` : ''}`,
          ),
        );
        return;
      }
      const out = Buffer.concat(stdoutChunks);
      if (out.length === 0) {
        // 非零退出已在上面处理;退出 0 却空产出 = 上游格式异常,显式抛错(防编造红线)。
        reject(new Error('音频转码未产出任何内容(疑似录音格式损坏或为空)'));
        return;
      }
      resolve(out);
    });

    // 写入 stdin:EPIPE(ffmpeg 早退导致管道断开)交给 close/error 处理,这里吞掉避免未捕获异常。
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}
