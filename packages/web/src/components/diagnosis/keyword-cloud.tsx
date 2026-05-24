'use client';

interface KeywordCloudProps {
  hit: string[];
  miss: string[];
}

function KeywordChip({
  word,
  variant,
}: {
  word: string;
  variant: 'hit' | 'miss';
}) {
  const color = variant === 'hit' ? 'var(--color-success)' : 'var(--color-danger)';
  const bg = variant === 'hit' ? 'var(--color-success-soft)' : 'var(--color-danger-soft)';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '12.5px',
        fontWeight: 500,
        color,
        background: bg,
        letterSpacing: '-0.003em',
      }}
    >
      {word}
    </span>
  );
}

export function KeywordCloud({ hit, miss }: KeywordCloudProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Hit keywords */}
      <div>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-success)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}
        >
          命中关键词 ({hit.length})
        </div>
        {hit.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--color-ink-4)' }}>暂无命中关键词</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {hit.map((word, i) => (
              <KeywordChip key={`hit-${i}`} word={word} variant="hit" />
            ))}
          </div>
        )}
      </div>

      {/* Miss keywords */}
      <div>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-danger)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}
        >
          缺失关键词 ({miss.length})
        </div>
        {miss.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--color-ink-4)' }}>无缺失关键词，覆盖良好</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {miss.map((word, i) => (
              <KeywordChip key={`miss-${i}`} word={word} variant="miss" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
