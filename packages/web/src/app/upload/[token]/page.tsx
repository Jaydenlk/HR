'use client';

import { useState, useRef, use } from 'react';
import { Upload, Mic, Info, Zap, CheckCircle2, AlertTriangle, Compass } from 'lucide-react';
import { useIsWeChatBrowser } from '@/lib/wechat';

// 扫码上传页(手机端 · 未登录直传):由电脑端生成的二维码扫开,凭 URL 路径里的一次性令牌
// 把面试录音直传到后端 POST /upload/:token。鉴权完全靠令牌(见 api 端 qr-upload.controller),
// 本页不需要也不持有任何登录态。
//
// 移动端豁免:本路由前缀 /upload/ 已在 mobile-gate.tsx 放行(否则手机扫开即被全站拦截层挡死)。
//
// 令牌校验时机:令牌是「10 分钟短时效 + 一次性(成功即焚)」,后端没有、也不应有单独的「探活」端点
//   (探活会浪费/烧掉一次性令牌)。因此本页不预校验,直接在「真正上传」时由后端返回区分:
//   401 → 链接无效/已过期(友好提示,引导回电脑端重生成二维码);其余错误按 message 展示。
//
// 不复用 lib/api 的 upload():那个封装在 401 时会清 localStorage.token 并 window.location.href='/login'
//   ——对未登录的手机端是错误跳转。本页用裸 fetch + 自有错误处理,401 只展示文案、不跳转。

// 与 lib/api 同口径的 API base(NEXT_PUBLIC_API_URL 缺省指向本地 3002/api)。
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api').trim();

// 文件选择 accept:显式列全音频扩展名 + audio/* 兜底(后端 multer fileFilter 才是真 guard)。
// 故意把扩展名摆在前面并加 audio/*:部分 Android 微信 XWeb 内核据此才肯露出「文件」入口让用户挑录音;
// 但这对 iOS 微信几乎无效(WKWebView 只给相册/拍照),所以下方还配了「在浏览器打开」引导横幅兜底。
const ACCEPT =
  '.mp3,.wav,.m4a,.aac,.ogg,.webm,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/webm,audio/aac,audio/*';

// 可读文件大小。
function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// 从后端响应里取干净的中文 message(NestJS 形如 {statusCode, message, error}),回退到状态码。
async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const body: unknown = JSON.parse(text);
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: unknown }).message;
      if (typeof message === 'string' && message.length > 0) return message;
      if (Array.isArray(message) && message.length > 0) return message.join('；');
    }
  } catch {
    /* 非 JSON 响应,回退 */
  }
  return `上传失败（${res.status}）`;
}

// Next.js 16:动态路由参数是 Promise,需用 React.use() 解包。
export default function UploadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 链接本身失效(401):单独成态,展示「无效/过期」终态,而非可重试的普通错误。
  const [linkDead, setLinkDead] = useState(false);
  const [success, setSuccess] = useState(false);
  // 是否身处微信内置浏览器:其文件选择器只给相册/拍照、不给文件选择器,挑不了已有录音。
  // SSR 安全(服务端快照恒 false,客户端首帧给真值),详见 lib/wechat。
  const inWeChat = useIsWeChatBrowser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 路径里没有令牌段时(理论上 Next 不会路由到此,这里兜底)直接判失效。
  const tokenMissing = !token || token.trim().length === 0;

  function acceptFile(f: File) {
    if (!f.type.startsWith('audio/') && !f.name.match(/\.(mp3|wav|ogg|m4a|webm|aac)$/i)) {
      setError('请选择音频文件（MP3、WAV、M4A、OGG、AAC 等）');
      return;
    }
    setFile(f);
    setError(null);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
    e.target.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('请先选择或拍摄一段录音');
      return;
    }
    if (!consent) {
      setError('请阅读并勾选同意《录音上传与隐私条款》后继续');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('consent', 'true');
      // 裸 fetch:不带 Authorization(手机端无登录态),鉴权靠 URL 里的一次性令牌。
      const res = await fetch(`${API_BASE}/upload/${encodeURIComponent(token)}`, {
        method: 'POST',
        body: form,
      });

      if (res.status === 401) {
        // 令牌无效/过期/已用过 → 终态:引导回电脑端重生成二维码。
        setLinkDead(true);
        return;
      }
      if (!res.ok) {
        setError(await readErrorMessage(res));
        return;
      }

      setSuccess(true);
    } catch {
      setError('网络异常，请检查手机网络后重试');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !!file && consent && !loading;

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--color-bg)',
        color: 'var(--color-ink)',
        padding: '24px 16px calc(24px + env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* 品牌头(与移动拦截层一致:黑底圆角 + C 字标) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              background: 'var(--color-ink)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="19" height="19" viewBox="0 0 22 22" fill="none">
              <path
                d="M18 7.5C16.8 5.1 14.1 3.5 11 3.5C7.1 3.5 4 6.6 4 10.5C4 14.4 7.1 17.5 11 17.5C14.1 17.5 16.8 15.9 18 13.5"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span
            style={{
              fontFamily: 'var(--serif)',
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            Coach 录音上传
          </span>
        </div>

        {/* 玻璃卡片 */}
        <div className="lg" style={{ padding: '22px 18px' }}>
          {tokenMissing || linkDead ? (
            <DeadLink />
          ) : success ? (
            <SuccessView />
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Beta 准确率 + 1v1 门控提示 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '9px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255,181,0,.07)',
                  border: '1px solid rgba(255,181,0,.35)',
                }}
              >
                <Info size={15} color="var(--color-warn)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 600, marginBottom: '3px', color: 'var(--color-ink)' }}>
                    Beta 功能，转写能力持续优化中
                  </div>
                  <div>
                    <strong>仅支持 1 对 1 面试</strong>。方言口音、多人同时说话、环境嘈杂时识别准确率会下降，
                    建议安静环境下单人清晰普通话录制。
                  </div>
                </div>
              </div>

              {/* 微信内置浏览器引导:微信里点选录音只会弹「拍照/相册」,选不了已有文件,
                  唯一可靠出口是「在浏览器打开」后再传。仅在微信内显示,普通浏览器不显示。 */}
              {inWeChat && <WeChatGuide />}

              {/* 选择/拍摄音频 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
                  录音文件（MP3 / WAV / M4A / OGG 等，≤ 25 MB）
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  onChange={handleFileInput}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '30px 18px',
                    borderRadius: '12px',
                    border: `2px dashed ${file ? 'var(--color-brand)' : 'var(--color-line-2)'}`,
                    background: file ? 'var(--color-brand-soft)' : 'rgba(47,143,255,.04)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {file ? (
                    <>
                      <Mic size={28} color="var(--color-brand)" />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-brand-ink)' }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginTop: '3px' }}>
                          {fileSize(file.size)} · 点击更换
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload size={28} color="var(--color-ink-4)" />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--color-ink-2)' }}>
                          点击选择录音文件
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-ink-4)', marginTop: '3px' }}>
                          可从「文件 / 录音机」里选已有录音
                        </div>
                      </div>
                    </>
                  )}
                </button>
              </div>

              {/* 隐私条款勾选 */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '13px 14px',
                  borderRadius: '10px',
                  background: 'rgba(47,143,255,.04)',
                  border: `1px solid ${consent ? 'var(--color-brand)' : 'var(--color-line)'}`,
                  transition: 'border-color 0.12s',
                }}
              >
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    setError(null);
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    flexShrink: 0,
                    marginTop: '1px',
                    accentColor: 'var(--color-brand)',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.65 }}>
                  我已阅读并同意《录音上传与隐私条款》：音频仅用于本次转写，
                  完成后立即销毁，不落盘、不对外共享、不生成可访问的公网链接。
                </span>
              </label>

              {/* 错误 */}
              {error && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '9px',
                    background: 'var(--color-danger-soft)',
                    color: 'var(--color-danger)',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  {error}
                </div>
              )}

              {/* 7 点数消耗提示 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '9px',
                  background: 'rgba(47,143,255,.05)',
                  border: '1px solid var(--hair)',
                }}
              >
                <Zap size={13} color="var(--color-brand)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>
                  本次录音转写复盘消耗 <strong style={{ color: 'var(--color-ink-2)' }}>7 点数</strong>
                  （成功才扣，失败不扣）。
                </span>
              </div>

              {/* 提交 */}
              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  padding: '13px 22px',
                  borderRadius: '11px',
                  border: 'none',
                  background: canSubmit
                    ? 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))'
                    : 'var(--color-line)',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  opacity: canSubmit ? 1 : 0.6,
                  transition: 'all 0.12s',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {loading ? '上传中…' : '上传录音'}
              </button>
            </form>
          )}
        </div>

        {/* 底部说明:仅在表单态显示 */}
        {!tokenMissing && !linkDead && !success && (
          <p
            style={{
              fontSize: '11.5px',
              color: 'var(--color-ink-4)',
              textAlign: 'center',
              lineHeight: 1.6,
              marginTop: '16px',
            }}
          >
            此链接由你的电脑端生成，约 10 分钟内有效，仅可使用一次。
          </p>
        )}
      </div>
    </main>
  );
}

// 上传成功终态:提示回电脑端查看(转写在电脑端轮询展示)。
function SuccessView() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
        padding: '20px 4px',
        textAlign: 'center',
      }}
    >
      <CheckCircle2 size={48} color="var(--color-brand)" />
      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)' }}>已上传成功</div>
      <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)', lineHeight: 1.7, margin: 0 }}>
        录音已开始转写。
        <br />
        请回到<strong style={{ color: 'var(--color-ink-2)' }}>电脑端</strong>查看转写进度与复盘结果。
        <br />
        此页面可以关闭了。
      </p>
    </div>
  );
}

// 微信内置浏览器引导横幅:告诉用户点右上角「···」→「在浏览器打开」后再上传。
// 不做自动跳转(微信禁止网页主动跳外部浏览器),只给静态图文指引 + 右上角箭头。
function WeChatGuide() {
  return (
    <div
      data-testid="wechat-guide"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '14px 16px',
        borderRadius: '10px',
        background: 'var(--color-brand-soft)',
        border: '1px solid var(--color-brand)',
      }}
    >
      {/* 指向右上角「···」的箭头(横幅本就在卡片内、靠近页面顶部,箭头朝右上提示菜单位置) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-10px',
          right: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '20px',
          lineHeight: 1,
          color: 'var(--color-brand)',
          transform: 'rotate(-8deg)',
        }}
      >
        <span style={{ fontSize: '15px', fontWeight: 700 }}>···</span>
        <span>↗</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Compass size={16} color="var(--color-brand)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-brand-ink)' }}>
          微信里选不了录音文件
        </div>
      </div>

      <div style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.7 }}>
        微信自带的浏览器只能拍照、选图片，挑不出已经录好的音频。请按下面两步换到手机自带浏览器再上传：
      </div>

      <ol
        style={{
          margin: 0,
          paddingLeft: '18px',
          fontSize: '12.5px',
          color: 'var(--color-ink-2)',
          lineHeight: 1.85,
        }}
      >
        <li>
          点屏幕<strong style={{ color: 'var(--color-ink)' }}>右上角的「···」</strong>
        </li>
        <li>
          选<strong style={{ color: 'var(--color-ink)' }}>「在浏览器打开」</strong>
          （苹果手机显示「在Safari中打开」），打开后再在这个页面里选录音上传即可
        </li>
      </ol>
    </div>
  );
}

// 令牌失效终态:无效/过期/已使用,引导回电脑端重生成二维码。
function DeadLink() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
        padding: '20px 4px',
        textAlign: 'center',
      }}
    >
      <AlertTriangle size={44} color="var(--color-warn)" />
      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)' }}>上传链接已失效</div>
      <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)', lineHeight: 1.7, margin: 0 }}>
        这个二维码无效、已过期或已经用过了。
        <br />
        请回到<strong style={{ color: 'var(--color-ink-2)' }}>电脑端</strong>重新生成二维码后再扫码上传。
      </p>
    </div>
  );
}
