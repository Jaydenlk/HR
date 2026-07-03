'use client';

import { Sparkles, AlertTriangle } from 'lucide-react';

// 「诊断进行中」卡片:S0「回来可见」与 409 防重复复用同一视图——展示后台流水线仍在跑,
// 页面正轮询至终态;终态 success/partial 自动进结果页,failed 转失败卡片。
export function DiagnosisInProgressCard({ note }: { note: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        gap: '24px',
        textAlign: 'center',
      }}
    >
      <div style={{ position: 'relative', width: '80px', height: '80px' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid var(--color-line)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: 'var(--color-brand)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '20px',
            borderRadius: '50%',
            background: 'var(--color-brand-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles size={20} color="var(--color-brand)" />
        </div>
      </div>

      <div>
        <h2
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '-0.3px',
            marginBottom: '8px',
          }}
        >
          诊断进行中
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', margin: 0, maxWidth: '420px' }}>
          {note}
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// 「诊断未能完成」卡片:进行中诊断轮询到 failed 终态时展示,提供返回重试(回到表单)。
export function DiagnosisFailedCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        gap: '20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'var(--color-danger-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AlertTriangle size={28} color="var(--color-danger)" />
      </div>
      <div>
        <h2
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '-0.3px',
            marginBottom: '8px',
          }}
        >
          诊断未能完成
        </h2>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--color-ink-3)',
            margin: 0,
            maxWidth: '420px',
          }}
        >
          {message}
        </p>
      </div>
      <button
        onClick={onRetry}
        style={{
          padding: '11px 24px',
          background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
        }}
      >
        返回重新诊断
      </button>
    </div>
  );
}
