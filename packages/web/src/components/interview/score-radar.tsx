'use client';

import type { InterviewScore } from '@/lib/types';

interface ScoreRadarProps {
  scores: InterviewScore[];
}

function scoreTone(score: number): string {
  if (score >= 75) return 'var(--color-success)';
  if (score >= 55) return 'var(--color-warn)';
  return 'var(--color-danger)';
}

function scoreSoftTone(score: number): string {
  if (score >= 75) return 'var(--color-success-soft)';
  if (score >= 55) return 'var(--color-warn-soft)';
  return 'var(--color-danger-soft)';
}

export function ScoreRadar({ scores }: ScoreRadarProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {scores.map((s) => {
        const color = scoreTone(s.score);
        const softColor = scoreSoftTone(s.score);
        const pct = Math.min(100, Math.max(0, s.score));

        return (
          <div key={s.name}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '5px',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-ink-2)',
                }}
              >
                {s.name}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color,
                  background: softColor,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {s.score}
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'var(--color-ink-4)',
                    marginLeft: '1px',
                  }}
                >
                  /100
                </span>
              </span>
            </div>
            <div
              style={{
                height: '6px',
                background: 'rgba(47,143,255,.10)',
                borderRadius: 'var(--radius-pill)',
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
      })}
    </div>
  );
}
