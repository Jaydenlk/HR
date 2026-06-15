'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number | null;
  sub?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}

export function StatCard({ label, value, sub, icon, accent }: StatCardProps) {
  return (
    <div
      style={{
        // accent:品牌渐变实底(白字达标,替代旧 var(--color-ink) 黑底);
        // 普通:微染 + 发丝边玻璃子单元(透极光,不铺实色 surface)。
        background: accent
          ? 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))'
          : 'rgba(47,143,255,.05)',
        border: accent ? 'none' : '1px solid var(--hair)',
        borderRadius: '18px',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxShadow: accent
          ? '0 10px 30px -14px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.35)'
          : 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: accent ? 'rgba(255,255,255,0.78)' : 'var(--color-ink-3)',
        }}
      >
        {icon && (
          <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
        )}
        {label}
      </div>
      <div
        style={{
          fontSize: '36px',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          color: accent ? '#fff' : 'var(--color-ink)',
        }}
      >
        {value ?? '—'}
      </div>
      {sub && (
        <div
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: accent ? 'rgba(255,255,255,0.78)' : 'var(--color-ink-3)',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
