'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Toaster } from '@/components/ui/sonner';
import type {
  LoginResponse,
  RequestCodeRequest,
  RequestCodeResponse,
} from '@/lib/types';

// 两步式登录(契约见 packages/web/src/lib/types.ts):
//   步骤1 邮箱 → POST /auth/request-code → 返回 registered(是否已注册)与 dev_code(开发态)。
//   步骤2 6 位验证码;若 registered=false 追加 邀请码 + 姓名(均必填)→ POST /auth/login。
// 错误一律内联展示后端中文 message;成功存 token 跳 /today。

type Step = 'email' | 'code';

// 测试通道仅在显式开启时渲染(本地 web/.env.local 设 NEXT_PUBLIC_DEV_LOGIN=1);
// Next.js 在构建期内联 NEXT_PUBLIC_* 字面量,未开启时整段折叠区不出现在 DOM。
const DEV_LOGIN_ENABLED = process.env.NEXT_PUBLIC_DEV_LOGIN === '1';

// 共享输入框样式:聚焦时变品牌色 + 柔光环,与现页视觉语言一致。
const inputBaseStyle: React.CSSProperties = {
  height: '44px',
  padding: '0 14px',
  borderRadius: '11px',
  border: '1.5px solid var(--color-line)',
  background: 'var(--color-surface)',
  color: 'var(--color-ink)',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  width: '100%',
};

function focusInput(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--color-brand)';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,132,255,0.12)';
}

function blurInput(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--color-line)';
  e.currentTarget.style.boxShadow = 'none';
}

const labelStyle: React.CSSProperties = {
  fontSize: '12.5px',
  fontWeight: 600,
  color: 'var(--color-ink-2)',
  letterSpacing: '-0.1px',
};

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');

  // 步骤1
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [resendLeft, setResendLeft] = useState(0); // 重发倒计时(秒);>0 时禁止重发

  // 用户条款门:默认不勾选,必须手动勾选才允许发验证码(后端同样强校验)。
  // termsShake 触发复选框行抖动 + 红描边提示,动画结束自动复位。
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [termsShake, setTermsShake] = useState(false);

  // 步骤2
  const [code, setCode] = useState('');
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [name, setName] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // 测试通道(仅 DEV_LOGIN_ENABLED 时渲染)
  const [devOpen, setDevOpen] = useState(false);
  const [devEmail, setDevEmail] = useState('admin@coach.dev');
  const [devLoading, setDevLoading] = useState(false);

  // 倒计时:每秒递减,归零自动停。组件卸载/重置时清理定时器。
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (resendLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setResendLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resendLeft]);

  // 请求验证码:步骤1 提交,或步骤2 内的「重新发送」。成功后进入步骤2、起 60s 倒计时;
  // dev_code 存在则自动填充验证码并提示开发模式。
  async function requestCode() {
    // 条款门:未勾选时不发任何请求,toast 提示 + 复选框行抖动红描边。
    // (步骤2 的重发也走这里;能到步骤2 说明已勾选,此分支不会误拦。)
    if (!termsAgreed) {
      toast.error('请先阅读并同意《用户条款》');
      setTermsShake(true);
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      setError('请输入邮箱');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const body: RequestCodeRequest = { email: trimmed, terms_agreed: true };
      const res = await api.post<RequestCodeResponse>('/auth/request-code', body);
      setRegistered(res.registered);
      setStep('code');
      setResendLeft(60);
      if (res.dev_code) {
        setDevCode(res.dev_code);
        setCode(res.dev_code);
      } else {
        setDevCode(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送验证码失败，请稍后重试');
    } finally {
      setSending(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await requestCode();
  }

  async function handleResend() {
    if (resendLeft > 0 || sending) return;
    await requestCode();
  }

  // 登录:老用户(registered)只传 email+code;新用户(registered=false)必须带 invite_code+name。
  async function handleLoginSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError('请输入验证码');
      return;
    }
    if (registered === false) {
      if (!inviteCode.trim()) {
        setError('请输入邀请码');
        return;
      }
      if (!name.trim()) {
        setError('请输入姓名');
        return;
      }
    }
    setLoggingIn(true);
    setError(null);
    try {
      const body =
        registered === false
          ? {
              email: email.trim(),
              code: trimmedCode,
              invite_code: inviteCode.trim(),
              name: name.trim(),
            }
          : { email: email.trim(), code: trimmedCode };
      const res = await api.post<LoginResponse>('/auth/login', body);
      localStorage.setItem('token', res.access_token);
      router.replace('/today');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请稍后重试');
    } finally {
      setLoggingIn(false);
    }
  }

  // 测试通道:免验证码免邀请码,直接调 dev-login 拿 token 进站。
  async function handleDevLogin() {
    const trimmed = devEmail.trim();
    if (!trimmed) {
      setError('请输入邮箱');
      return;
    }
    setDevLoading(true);
    setError(null);
    try {
      const res = await api.post<LoginResponse>('/auth/dev-login', { email: trimmed });
      localStorage.setItem('token', res.access_token);
      router.replace('/today');
    } catch (err) {
      setError(err instanceof Error ? err.message : '测试通道登录失败');
    } finally {
      setDevLoading(false);
    }
  }

  // 返回步骤1(改邮箱):清空步骤2 的所有状态,避免残留。
  function backToEmail() {
    setStep('email');
    setCode('');
    setRegistered(null);
    setDevCode(null);
    setInviteCode('');
    setName('');
    setResendLeft(0);
    setError(null);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        padding: '24px',
      }}
    >
      {/* (auth) 无共享布局,toast 出口在页面内挂载(与 (main) 布局同参数) */}
      <Toaster position="top-center" richColors closeButton />
      {/* 条款行抖动提示动画:仅本页使用,作用域限页面内 */}
      <style>{`
        @keyframes terms-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        .terms-shake { animation: terms-shake 0.4s ease; }
      `}</style>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Card */}
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: '28px',
            padding: '44px 40px 36px',
            boxShadow:
              '0 1px 3px rgba(0,0,0,0.06), 0 12px 48px rgba(0,0,0,0.07)',
            border: '1px solid var(--color-line)',
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '36px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                background: 'var(--color-ink)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {/* Coach "C" glyph */}
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M18 7.5C16.8 5.1 14.1 3.5 11 3.5C7.1 3.5 4 6.6 4 10.5C4 14.4 7.1 17.5 11 17.5C14.1 17.5 16.8 15.9 18 13.5"
                  stroke="white"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  letterSpacing: '-0.3px',
                  lineHeight: 1.2,
                }}
              >
                Coach
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  color: 'var(--color-ink-4)',
                  marginTop: '1px',
                  fontWeight: 500,
                }}
              >
                AI 求职教练
              </div>
            </div>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.4px',
              marginBottom: '6px',
              lineHeight: 1.3,
            }}
          >
            欢迎使用
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-ink-3)',
              marginBottom: '28px',
              lineHeight: 1.5,
            }}
          >
            {step === 'email'
              ? '输入邮箱，我们会发送验证码给你'
              : `验证码已发送至 ${email}`}
          </p>

          {/* Error banner（内联展示后端中文 message） */}
          {error && (
            <div
              role="alert"
              style={{
                background: 'var(--color-danger-soft)',
                color: 'var(--color-danger)',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '13.5px',
                marginBottom: '20px',
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          {/* 步骤1:邮箱 */}
          {step === 'email' && (
            <form
              onSubmit={handleEmailSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <label htmlFor="login-email" style={labelStyle}>
                  邮箱
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={inputBaseStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>

              {/* 用户条款勾选行:未勾选点「获取验证码」时抖动 + 红描边提示 */}
              <label
                className={termsShake ? 'terms-shake' : undefined}
                onAnimationEnd={() => setTermsShake(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  border: termsShake
                    ? '1.5px solid var(--color-danger)'
                    : '1.5px solid transparent',
                  fontSize: '13px',
                  color: 'var(--color-ink-2)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'border-color 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: 'var(--color-brand)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
                <span>
                  我已阅读并同意
                  {/* 点链接只开新标签,不会触发 label 勾选(浏览器对交互元素的标准行为) */}
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--color-brand)',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    《用户条款》
                  </Link>
                </span>
              </label>

              <button
                type="submit"
                disabled={sending}
                style={{
                  marginTop: '6px',
                  height: '46px',
                  borderRadius: '12px',
                  background: sending
                    ? 'var(--color-ink-3)'
                    : 'var(--color-brand)',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s, transform 0.1s',
                  letterSpacing: '-0.1px',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!sending)
                    e.currentTarget.style.background =
                      'var(--color-brand-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!sending)
                    e.currentTarget.style.background = 'var(--color-brand)';
                }}
                onMouseDown={(e) => {
                  if (!sending)
                    e.currentTarget.style.transform = 'translateY(1px)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {sending ? '发送中…' : '获取验证码'}
              </button>
            </form>
          )}

          {/* 步骤2:验证码（+ 新用户的邀请码与姓名） */}
          {step === 'code' && (
            <form
              onSubmit={handleLoginSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              {/* 开发模式提示 */}
              {devCode && (
                <div
                  style={{
                    background: 'var(--color-warn-soft, rgba(255,159,10,0.12))',
                    color: 'var(--color-warn, #b25e00)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}
                >
                  开发模式：验证码已自动填入（{devCode}）
                </div>
              )}

              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <label htmlFor="login-code" style={labelStyle}>
                  验证码
                </label>
                <input
                  id="login-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="6 位数字验证码"
                  style={{ ...inputBaseStyle, letterSpacing: '0.3em' }}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
                {/* 重发倒计时 */}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLeft > 0 || sending}
                  style={{
                    alignSelf: 'flex-start',
                    background: 'none',
                    border: 'none',
                    padding: '2px 0',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    color:
                      resendLeft > 0 || sending
                        ? 'var(--color-ink-4)'
                        : 'var(--color-brand)',
                    cursor:
                      resendLeft > 0 || sending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {sending
                    ? '发送中…'
                    : resendLeft > 0
                      ? `${resendLeft}s 后可重新发送`
                      : '重新发送验证码'}
                </button>
              </div>

              {/* 新用户必填:邀请码 + 姓名 */}
              {registered === false && (
                <>
                  <div
                    style={{
                      background: 'var(--color-brand-soft, rgba(10,132,255,0.08))',
                      color: 'var(--color-ink-3)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      fontSize: '12.5px',
                      lineHeight: 1.5,
                    }}
                  >
                    检测到新用户，需填写邀请码与姓名完成注册
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <label htmlFor="login-invite" style={labelStyle}>
                      邀请码
                    </label>
                    <input
                      id="login-invite"
                      type="text"
                      required
                      autoComplete="off"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="请输入邀请码"
                      style={{ ...inputBaseStyle, letterSpacing: '0.06em' }}
                      onFocus={focusInput}
                      onBlur={blurInput}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <label htmlFor="login-name" style={labelStyle}>
                      姓名
                    </label>
                    <input
                      id="login-name"
                      type="text"
                      required
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="你的姓名"
                      style={inputBaseStyle}
                      onFocus={focusInput}
                      onBlur={blurInput}
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loggingIn}
                style={{
                  marginTop: '6px',
                  height: '46px',
                  borderRadius: '12px',
                  background: loggingIn
                    ? 'var(--color-ink-3)'
                    : 'var(--color-brand)',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: loggingIn ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s, transform 0.1s',
                  letterSpacing: '-0.1px',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!loggingIn)
                    e.currentTarget.style.background =
                      'var(--color-brand-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!loggingIn)
                    e.currentTarget.style.background = 'var(--color-brand)';
                }}
                onMouseDown={(e) => {
                  if (!loggingIn)
                    e.currentTarget.style.transform = 'translateY(1px)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {loggingIn ? '登录中…' : '进入 Coach'}
              </button>

              {/* 改邮箱 */}
              <button
                type="button"
                onClick={backToEmail}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px 0',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  color: 'var(--color-ink-4)',
                  cursor: 'pointer',
                  alignSelf: 'center',
                }}
              >
                更换邮箱
              </button>
            </form>
          )}

          {/* 测试通道(仅 NEXT_PUBLIC_DEV_LOGIN=1 时渲染,折叠) */}
          {DEV_LOGIN_ENABLED && (
            <div
              style={{
                marginTop: '24px',
                paddingTop: '18px',
                borderTop: '1px dashed var(--color-line)',
              }}
            >
              <button
                type="button"
                onClick={() => setDevOpen((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px 0',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--color-ink-4)',
                  cursor: 'pointer',
                }}
              >
                {devOpen ? '收起测试通道' : '测试通道（仅联调）'}
              </button>
              {devOpen && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    marginTop: '12px',
                  }}
                >
                  <input
                    type="email"
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    placeholder="admin@coach.dev"
                    style={inputBaseStyle}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                  <button
                    type="button"
                    onClick={handleDevLogin}
                    disabled={devLoading}
                    style={{
                      height: '42px',
                      borderRadius: '10px',
                      background: devLoading
                        ? 'var(--color-ink-3)'
                        : 'var(--color-surface-3)',
                      color: 'var(--color-ink)',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      border: '1px solid var(--color-line)',
                      cursor: devLoading ? 'not-allowed' : 'pointer',
                      width: '100%',
                    }}
                  >
                    {devLoading ? '进入中…' : '一键进入'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p
          style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--color-ink-4)',
            letterSpacing: '-0.1px',
          }}
        >
          对话端到端加密 · 不用于训练
        </p>
      </div>
    </div>
  );
}
