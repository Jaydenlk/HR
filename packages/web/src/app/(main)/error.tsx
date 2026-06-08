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
          borderRadius: '16px',
          background: 'var(--color-danger-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AlertTriangle size={26} color="var(--color-danger)" />
      </div>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
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
            borderRadius: '10px',
            border: 'none',
            background: 'var(--color-brand)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          重试
        </button>
        <a
          href="/overview"
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: '1px solid var(--color-line)',
            background: 'var(--color-surface)',
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
