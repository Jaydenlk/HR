'use client';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export function ScoreRing({ score, size = 120, strokeWidth = 10 }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const offset = circumference - (clampedScore / 100) * circumference;

  const color =
    clampedScore >= 70
      ? 'var(--color-success)'
      : clampedScore >= 50
        ? 'var(--color-warn)'
        : 'var(--color-danger)';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      {/* Score label */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1px',
        }}
      >
        <span
          style={{
            fontSize: size >= 100 ? '28px' : '20px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {clampedScore}
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--color-ink-4)',
            letterSpacing: '0.02em',
          }}
        >
          / 100
        </span>
      </div>
    </div>
  );
}
