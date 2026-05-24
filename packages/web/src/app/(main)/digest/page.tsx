'use client';

import { BookOpen } from 'lucide-react';

export default function DigestPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        padding: '40px 32px 32px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '40px', flexShrink: 0 }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            letterSpacing: '-0.4px',
            marginBottom: '4px',
          }}
        >
          月刊·面经
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
          精选面经 · 每月更新 · 内容来自真实求职者
        </p>
      </div>

      {/* Empty state */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 32px',
          textAlign: 'center',
          gap: '16px',
        }}
      >
        {/* Icon illustration */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #eaf2ff 0%, #f0f4ff 100%)',
            border: '1px solid rgba(10,132,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '8px',
          }}
        >
          <BookOpen size={32} color="var(--color-brand)" />
        </div>

        <div>
          <p
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.015em',
              marginBottom: '8px',
            }}
          >
            面经内容管道正在搭建中，敬请期待
          </p>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-ink-3)',
              fontWeight: 500,
              lineHeight: 1.6,
              maxWidth: '460px',
            }}
          >
            我们正在接入来自社区的真实面经数据源，整理后将以月刊形式推送。第一期内容将覆盖字节、腾讯、美团等主流大厂的最新面试题。
          </p>
        </div>

        {/* Timeline hint */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-line)',
            borderRadius: '10px',
            fontSize: '13px',
            color: 'var(--color-ink-2)',
            fontWeight: 500,
            marginTop: '8px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--color-warn)',
              flexShrink: 0,
            }}
          />
          预计 Phase 8 上线 · 建设中
        </div>
      </div>
    </div>
  );
}
