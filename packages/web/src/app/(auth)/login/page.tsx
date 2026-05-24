'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ access_token: string }>('/auth/login', {
        email,
        name,
        invite_code: inviteCode,
      });
      localStorage.setItem('token', res.access_token);
      window.location.href = '/';
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败';
      if (msg.includes('401') || msg.includes('403') || msg.includes('invite')) {
        setError('邀请码无效，请确认后重试');
      } else {
        setError('登录失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
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
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
        }}
      >
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
            全程陪伴你的求职之路
          </p>

          {/* Error banner */}
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

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="login-email"
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--color-ink-2)',
                  letterSpacing: '-0.1px',
                }}
              >
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
                style={{
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
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-brand)';
                  e.currentTarget.style.boxShadow =
                    '0 0 0 3px rgba(10,132,255,0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-line)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="login-name"
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--color-ink-2)',
                  letterSpacing: '-0.1px',
                }}
              >
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
                style={{
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
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-brand)';
                  e.currentTarget.style.boxShadow =
                    '0 0 0 3px rgba(10,132,255,0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-line)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Invite code */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="login-invite"
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--color-ink-2)',
                  letterSpacing: '-0.1px',
                }}
              >
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
                style={{
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
                  letterSpacing: '0.06em',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-brand)';
                  e.currentTarget.style.boxShadow =
                    '0 0 0 3px rgba(10,132,255,0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-line)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px',
                height: '46px',
                borderRadius: '12px',
                background: loading
                  ? 'var(--color-ink-3)'
                  : 'var(--color-brand)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s, transform 0.1s',
                letterSpacing: '-0.1px',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                if (!loading)
                  e.currentTarget.style.background = 'var(--color-brand-hover)';
              }}
              onMouseLeave={(e) => {
                if (!loading)
                  e.currentTarget.style.background = 'var(--color-brand)';
              }}
              onMouseDown={(e) => {
                if (!loading) e.currentTarget.style.transform = 'translateY(1px)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {loading ? '登录中…' : '进入 Coach'}
            </button>
          </form>
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
