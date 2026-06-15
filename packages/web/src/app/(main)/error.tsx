'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

// (main) 路由段错误边界:任何页面在渲染期抛错(如 AI 返回缺字段导致 .map/.length 崩)
// 都会被这里兜住,展示可恢复的中文降级 UI,而非整站白屏。
export default function MainError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[main route error]', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '64px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-danger-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AlertTriangle size={26} color="var(--color-danger)" />
      </div>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
        这个页面出了点问题
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', maxWidth: '420px', lineHeight: 1.6 }}>
        加载或生成结果时遇到异常，可能是 AI 服务暂时不稳定。请重试，或返回总览。
      </p>
      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <button
          onClick={() => unstable_retry()}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-default)',
            border: 'none',
            background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
          }}
        >
          重试
        </button>
        <a
          href="/overview"
          className="lg-sm"
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-default)',
            background: 'var(--glass-bg)',
            color: 'var(--color-ink-2)',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          返回总览
        </a>
      </div>
    </div>
  );
}
