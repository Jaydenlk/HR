'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '@/lib/api';
import type { QrUploadTokenResponse, TranscribeStatusResponse } from '@/lib/types';
import { Smartphone, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export interface QrUploadPanelProps {
  interviewId: string;
  // 手机端把音频传上来、后端建好转写任务后回调:父层据此关弹层 + 启动进度轮询。
  onPhoneUploaded: (taskId: string) => void;
}

// 令牌服务端 10 分钟过期且一次性。这里把二维码"视觉刷新"节奏定为约 2 分钟换一张新码(纯展示节奏,
// 与令牌过期解耦):刚换码前签发的旧码因服务端仍保留其映射(未用、未过期),在 10 分钟内继续有效,
// 所以"扫了 2 分钟前那张码"也能正常上传。换码只是给长时间停留者一张更新鲜的码,不会让旧码失效。
const QR_REFRESH_INTERVAL_MS = 115_000;
// 轮询手机是否传完的间隔。
const POLL_STATUS_MS = 3000;

// 把已存在的转写任务态视作「正在进行/已进行」——用于判断手机是否已经传上来。
// submitted 起即代表后端已收到手机上传并建了任务(电脑端此前并未自己上传,故出现非 null 任务=手机传了)。
const ACTIVE_STATUSES = new Set<TranscribeStatusResponse['status']>([
  'submitted',
  'transcribing',
  'labeling',
  'awaiting_confirm',
  'analyzing',
]);

// 站点 origin(手机扫码后访问的地址)。优先用显式配置,回退当前页 origin。
// 必须是绝对地址(prod 即 http://139.224.248.44):微信/相机扫到相对路径打不开。
function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

// 用 qrcode 库把 URL 渲染成 SVG 字符串(纯 JS、不依赖 canvas)。
// 纠错等级 M、留白 4 模块(规范要求)、纯黑#000 / 纯白#fff,尺寸 220px。
async function buildQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 4,
    width: 220,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

export function QrUploadPanel({ interviewId, onPhoneUploaded }: QrUploadPanelProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);

  // onPhoneUploaded 通过 ref 进入 effect,避免父层每次渲染传新函数导致 effect 反复重建(进而重置轮询)。
  const onUploadedRef = useRef(onPhoneUploaded);
  useEffect(() => {
    onUploadedRef.current = onPhoneUploaded;
  }, [onPhoneUploaded]);

  // 手动重试(错误态点「重试」)挂到 ref:effect 内部定义真正的 issueToken,这里只暴露一个稳定入口。
  const retryRef = useRef<() => void>(() => {});

  useEffect(() => {
    let mounted = true;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let done = false; // 手机已传完:停掉重签与轮询。
    // 区分「手机这次新传的」与「进入面板前页面早就有的旧任务」,避免把旧任务误判成刚传完。
    let baselineTaskId: string | null = null;
    let baselineResolved = false;

    // 签发/重签令牌 → 拼绝对 URL → 生成二维码 SVG → 安排下一次重签(过期前 10s)。
    async function issueToken(): Promise<void> {
      try {
        const resp = await api.post<QrUploadTokenResponse>(
          `/interviews/${interviewId}/upload-token`,
          {},
        );
        if (!mounted) return;
        const url = `${siteOrigin()}${resp.uploadPath}`;
        const qrSvg = await buildQrSvg(url);
        if (!mounted) return;
        setSvg(qrSvg);
        setError(null);
        setLoading(false);

        // 约 2 分钟换一张新码(视觉刷新节奏,与 10 分钟令牌过期解耦):旧码在服务端仍有效到自然过期,
        // 故换码不影响"几分钟前扫的那张码"继续上传。
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
          if (mounted && !done) void issueToken();
        }, QR_REFRESH_INTERVAL_MS);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : '生成二维码失败，请重试');
        setLoading(false);
      }
    }

    // 轮询转写任务状态:出现「基线之外的新任务」即视作手机已传完 → 回调父层关弹层 + 启动进度。
    async function pollPhoneUpload(): Promise<void> {
      try {
        const data = await api.get<TranscribeStatusResponse>(
          `/interviews/${interviewId}/transcribe/status`,
        );
        if (!mounted) return;

        if (!baselineResolved) {
          baselineResolved = true;
          if (data.taskId && ACTIVE_STATUSES.has(data.status)) {
            baselineTaskId = data.taskId;
          }
        } else if (
          data.taskId &&
          data.taskId !== baselineTaskId &&
          ACTIVE_STATUSES.has(data.status)
        ) {
          // 出现了一个不同于基线的活动任务 → 手机这次传上来了。
          done = true;
          setUploaded(true);
          if (refreshTimer) clearTimeout(refreshTimer);
          onUploadedRef.current(data.taskId);
          return; // 停止轮询,交给父层的进度区接管。
        }
      } catch {
        // 404(暂无任务)或网络抖动:静默,继续轮询。
      }
      if (mounted && !done) {
        pollTimer = setTimeout(() => void pollPhoneUpload(), POLL_STATUS_MS);
      }
    }

    retryRef.current = () => {
      setLoading(true);
      void issueToken();
    };

    void issueToken();
    void pollPhoneUpload();

    return () => {
      mounted = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [interviewId]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        padding: '18px',
        width: '240px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
        <Smartphone size={15} color="var(--color-brand)" />
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
          用手机扫码上传录音
        </span>
      </div>

      {/* 顶部时效提示:解释"码每约 2 分钟换新"与"扫码后 10 分钟内完成上传即可",消除"码一直变会不会失效"的疑虑。 */}
      <div
        style={{
          fontSize: '11px',
          color: 'var(--color-ink-3)',
          textAlign: 'center',
          lineHeight: 1.6,
          padding: '7px 10px',
          borderRadius: '8px',
          background: 'rgba(47,143,255,.05)',
          border: '1px solid var(--hair)',
        }}
      >
        二维码每约2分钟自动刷新；已扫码的请在10分钟内完成「选文件→上传」即可。
      </div>

      {/* QR / 状态区 */}
      <div
        style={{
          width: '168px',
          height: '168px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px',
          background: '#fff',
          border: '1px solid var(--color-line)',
          padding: '8px',
        }}
      >
        {uploaded ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={36} color="var(--color-success)" />
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-success)' }}>
              已收到手机录音
            </span>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '0 10px', textAlign: 'center' }}>
            <AlertCircle size={28} color="var(--color-danger)" />
            <span style={{ fontSize: '11.5px', color: 'var(--color-danger)', lineHeight: 1.4 }}>
              {error}
            </span>
            <button
              type="button"
              onClick={() => retryRef.current()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '2px',
                padding: '5px 12px',
                borderRadius: '7px',
                border: '1px solid var(--color-line)',
                background: 'transparent',
                color: 'var(--color-ink-2)',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={11} />
              重试
            </button>
          </div>
        ) : loading || !svg ? (
          <Loader2 size={28} color="var(--color-brand)" style={{ animation: 'qr-spin 0.8s linear infinite' }} />
        ) : (
          <div
            role="img"
            aria-label="手机上传二维码"
            className="qr-upload-svg"
            style={{
              width: '150px',
              height: '150px',
              background: '#fff',
              borderRadius: '8px',
            }}
            // qrcode 库输出的 SVG 字符串(库内置,非用户输入,无 XSS 风险);带 viewBox 故等比缩放到 150px。
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>

      {!uploaded && !error && (
        <div style={{ fontSize: '11.5px', color: 'var(--color-ink-3)', textAlign: 'center', lineHeight: 1.6 }}>
          用手机相机或微信扫一扫，
          <br />
          在手机上选录音文件直传。
          <span style={{ display: 'block', marginTop: '4px', color: 'var(--color-ink-4)' }}>
            二维码每约2分钟自动刷新，保持本窗口打开
          </span>
        </div>
      )}
      {uploaded && (
        <div style={{ fontSize: '11.5px', color: 'var(--color-ink-3)', textAlign: 'center', lineHeight: 1.6 }}>
          正在转写，马上为你展示进度…
        </div>
      )}

      <style>{`
        @keyframes qr-spin { to { transform: rotate(360deg); } }
        .qr-upload-svg svg { display: block; width: 100%; height: 100%; }
      `}</style>
    </div>
  );
}
