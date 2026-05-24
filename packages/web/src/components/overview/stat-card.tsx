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
        background: accent ? 'var(--color-ink)' : 'var(--color-surface)',
        border: accent ? 'none' : '1px solid var(--color-line)',
        borderRadius: '18px',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
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
          color: accent ? 'rgba(255,255,255,0.55)' : 'var(--color-ink-3)',
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
            color: accent ? 'rgba(255,255,255,0.55)' : 'var(--color-ink-3)',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
