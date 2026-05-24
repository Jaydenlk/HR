'use client';

import type { MatchDimensions } from '@/lib/types';

interface DimensionBarProps {
  label: string;
  score: number;
  max: number;
}

function DimensionBar({ label, score, max }: DimensionBarProps) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const color =
    pct >= 70
      ? 'var(--color-success)'
      : pct >= 50
        ? 'var(--color-warn)'
        : 'var(--color-danger)';
  const softColor =
    pct >= 70
      ? 'var(--color-success-soft)'
      : pct >= 50
        ? 'var(--color-warn-soft)'
        : 'var(--color-danger-soft)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-ink-2)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color,
            background: softColor,
            padding: '2px 8px',
            borderRadius: '6px',
          }}
        >
          {score} / {max}
        </span>
      </div>
      <div
        style={{
          height: '8px',
          background: 'var(--color-surface-2)',
          borderRadius: '999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: '999px',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
}

interface DimensionBarsProps {
  dimensions: MatchDimensions;
}

export function DimensionBars({ dimensions }: DimensionBarsProps) {
  const bars: DimensionBarProps[] = [
    { label: '技能匹配', score: dimensions.skills.score, max: dimensions.skills.max },
    { label: '工作经验', score: dimensions.experience.score, max: dimensions.experience.max },
    { label: '教育背景', score: dimensions.education.score, max: dimensions.education.max },
    { label: '关键词覆盖', score: dimensions.keywords.score, max: dimensions.keywords.max },
    { label: '综合评估', score: dimensions.overall.score, max: dimensions.overall.max },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {bars.map((bar) => (
        <DimensionBar key={bar.label} {...bar} />
      ))}
    </div>
  );
}
