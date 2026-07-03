'use client';

import { STAGE_META } from '@/lib/tracker-stages';

interface TrackerStatsProps {
  stats: Record<string, number>;
}

export function TrackerStats({ stats }: TrackerStatsProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '12px',
        marginBottom: '20px',
      }}
    >
      {STAGE_META.map((tile) => {
        const count = stats[tile.id] ?? 0;
        return (
          <div
            key={tile.id}
            className="lg"
            style={{
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: tile.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--color-ink-3)',
                  fontWeight: 600,
                  letterSpacing: '-0.003em',
                }}
              >
                {tile.label}
              </span>
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: tile.color,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
