'use client';

interface TrackerStatsProps {
  stats: Record<string, number>;
}

interface StatTile {
  key: string;
  label: string;
  color: string;
}

const TILES: StatTile[] = [
  { key: 'wishlist',  label: '想投',  color: 'var(--color-ink-3)' },
  { key: 'applied',   label: '已投递', color: 'var(--color-brand)' },
  { key: 'interview', label: '面试中', color: 'var(--color-warn)' },
  { key: 'final',     label: '终面',  color: 'var(--au-violet)' },
  { key: 'offer',     label: 'Offer', color: 'var(--color-success)' },
  { key: 'rejected',  label: '已拒',  color: 'var(--color-danger)' },
];

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
      {TILES.map((tile) => {
        const count = stats[tile.key] ?? 0;
        return (
          <div
            key={tile.key}
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
