'use client';

import type { InterviewPrediction } from '@/lib/types';

interface PredictionCardProps {
  prediction: InterviewPrediction;
}

export function PredictionCard({ prediction: p }: PredictionCardProps) {
  const topics = p.next_round_topics ?? [];

  return (
    <div
      style={{
        background: 'var(--color-ink)',
        color: '#fff',
        borderRadius: '22px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(500px 280px at 100% -20%, rgba(10,132,255,0.32), transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255,255,255,0.12)',
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '12px',
            backdropFilter: 'blur(8px)',
          }}
        >
          🔮 预测·下一轮
        </div>

        {/* Title */}
        <h3
          style={{
            margin: 0,
            fontSize: '22px',
            fontWeight: 700,
            letterSpacing: '-0.018em',
            lineHeight: 1.15,
          }}
        >
          下一轮很可能问到{' '}
          <span style={{ color: 'var(--color-brand)' }}>——</span>
        </h3>

        {/* Summary */}
        {p.summary && (
          <div
            style={{
              marginTop: '8px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 500,
              lineHeight: 1.6,
              paddingBottom: '14px',
              borderBottom: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {p.summary}
          </div>
        )}

        {/* Predicted topics */}
        {topics.length > 0 ? (
          <div style={{ marginTop: '2px' }}>
            {topics.map((item) => {
              const isHigh = item.likelihood >= 80;
              return (
                <div
                  key={item.topic}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 0',
                    fontSize: '13px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      lineHeight: 1.45,
                      color: 'rgba(255,255,255,0.92)',
                      fontWeight: 500,
                    }}
                  >
                    {item.topic}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 9px',
                      borderRadius: '6px',
                      background: isHigh ? 'var(--color-brand)' : 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {item.likelihood}%
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              marginTop: '14px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.55)',
              fontWeight: 500,
              lineHeight: 1.6,
            }}
          >
            暂无下一轮主题预测
          </div>
        )}
      </div>
    </div>
  );
}
