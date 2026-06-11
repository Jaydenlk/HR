'use client';

const STAGE_META: Record<
  string,
  { label: string; color: string }
> = {
  wishlist: { label: '心愿单', color: 'var(--color-ink-3)' },
  applied: { label: '已投递', color: 'var(--color-brand)' },
  interview: { label: '面试中', color: 'var(--color-warn)' },
  final: { label: '终面', color: 'var(--color-warn-2, #e07b39)' },
  offer: { label: 'Offer', color: 'var(--color-success)' },
};

const STAGE_ORDER = ['wishlist', 'applied', 'interview', 'final', 'offer'];

interface FunnelChartProps {
  funnel: Record<string, number>;
}

export function FunnelChart({ funnel }: FunnelChartProps) {
  const entries = STAGE_ORDER.map((key) => ({
    key,
    label: STAGE_META[key]?.label ?? key,
    color: STAGE_META[key]?.color ?? '#a1a1aa',
    count: funnel[key] ?? 0,
  }));

  const maxCount = Math.max(...entries.map((e) => e.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {entries.map((entry) => {
        const pct = (entry.count / maxCount) * 100;
        return (
          <div
            key={entry.key}
            style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 40px',
              gap: '12px',
              alignItems: 'center',
              fontSize: '13px',
            }}
          >
            {/* stage label */}
            <span
              style={{
                fontWeight: 600,
                color: 'var(--color-ink-2)',
                fontSize: '12.5px',
                letterSpacing: '-0.003em',
              }}
            >
              {entry.label}
            </span>

            {/* bar */}
            <div
              style={{
                height: '26px',
                background: 'var(--color-surface-2)',
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: entry.color,
                  borderRadius: '8px',
                  transition: 'width 0.4s ease',
                  minWidth: entry.count > 0 ? '26px' : '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '6px',
                  boxSizing: 'border-box',
                }}
              >
                {entry.count > 0 && pct >= 20 && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#fff',
                      opacity: 0.9,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {Math.round(pct)}%
                  </span>
                )}
              </div>
            </div>

            {/* count */}
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '14px',
                fontWeight: 800,
                color: 'var(--color-ink)',
                textAlign: 'right',
                letterSpacing: '-0.01em',
              }}
            >
              {entry.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
