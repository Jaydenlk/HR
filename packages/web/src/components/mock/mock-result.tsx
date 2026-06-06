'use client';

import type { MockSession, MockQuestion, MockAnswer } from '@/lib/types';
import { CheckCircle, XCircle, MessageSquare } from 'lucide-react';

interface MockResultProps {
  session: MockSession;
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const strokeWidth = 10;
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
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-surface-3)" strokeWidth={strokeWidth} />
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
        <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {clampedScore}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink-4)', letterSpacing: '0.02em' }}>
          / 100
        </span>
      </div>
    </div>
  );
}

function getAnswerForQuestion(answers: MockAnswer[] | null, n: number): MockAnswer | undefined {
  return answers?.find((a) => a.n === n);
}

export function MockResult({ session }: MockResultProps) {
  const ev = session.evaluation;
  if (!ev) return null;

  const questions = session.questions ?? [];
  const answers = session.answers ?? [];

  const gradeColor =
    ev.overall_grade.startsWith('A')
      ? 'var(--color-success)'
      : ev.overall_grade.startsWith('B')
        ? 'var(--color-ink)'
        : ev.overall_grade.startsWith('C')
          ? 'var(--color-warn)'
          : 'var(--color-danger)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Score summary */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: '16px',
          border: '1px solid var(--color-line)',
          padding: '28px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
        }}
      >
        <ScoreRing score={ev.overall_score} size={120} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '44px',
                fontWeight: 800,
                color: gradeColor,
                lineHeight: 1,
                letterSpacing: '-0.04em',
              }}
            >
              {ev.overall_grade}
            </span>
            <span style={{ fontSize: '14px', color: 'var(--color-ink-3)', fontWeight: 500 }}>
              综合评级
            </span>
          </div>
          {session.total_filler_count != null && session.total_filler_count > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: '999px',
                background: 'var(--color-warn-soft, #fffbeb)',
                color: 'var(--color-warn)',
                marginBottom: '8px',
              }}
            >
              <MessageSquare size={12} />
              口头禅 {session.total_filler_count} 次
            </div>
          )}
          <p style={{ fontSize: '13.5px', color: 'var(--color-ink-2)', lineHeight: 1.6, margin: 0 }}>
            {ev.summary}
          </p>
        </div>
      </div>

      {/* Strengths & weaknesses */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div
          style={{
            background: 'var(--color-success-soft, #f0fdf4)',
            borderRadius: '14px',
            border: '1px solid var(--color-success)',
            padding: '18px 20px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--color-success)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            优势亮点
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ev.strengths.map((s, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle size={14} color="var(--color-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '13.5px', color: 'var(--color-ink-2)', lineHeight: 1.5 }}>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            background: 'var(--color-danger-soft)',
            borderRadius: '14px',
            border: '1px solid var(--color-danger)',
            padding: '18px 20px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--color-danger)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            待提升
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ev.weaknesses.map((w, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <XCircle size={14} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '13.5px', color: 'var(--color-ink-2)', lineHeight: 1.5 }}>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Per-question review */}
      {questions.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.01em',
              marginBottom: '14px',
            }}
          >
            逐题回顾 · {questions.length} 道
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {questions.map((q: MockQuestion) => {
              const ans = getAnswerForQuestion(answers, q.n);
              const score = ans?.score ?? null;
              const scoreColor =
                score == null
                  ? 'var(--color-ink-4)'
                  : score >= 7
                    ? 'var(--color-success)'
                    : score >= 4
                      ? 'var(--color-warn)'
                      : 'var(--color-danger)';

              return (
                <div
                  key={q.n}
                  style={{
                    background: 'var(--color-surface)',
                    borderRadius: '14px',
                    border: '1px solid var(--color-line)',
                    padding: '20px',
                  }}
                >
                  {/* Q header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-ink-3)',
                            background: 'var(--color-surface-3)',
                            padding: '2px 8px',
                            borderRadius: '999px',
                          }}
                        >
                          Q{q.n}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-ink-3)',
                            background: 'var(--color-surface-3)',
                            padding: '2px 8px',
                            borderRadius: '999px',
                          }}
                        >
                          {q.type}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-ink-4)',
                            background: 'var(--color-surface-3)',
                            padding: '2px 8px',
                            borderRadius: '999px',
                          }}
                        >
                          {q.topic}
                        </span>
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, lineHeight: 1.5 }}>
                        {q.question}
                      </p>
                    </div>
                    {score != null && (
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: score >= 7 ? 'var(--color-success-soft, #f0fdf4)' : score >= 4 ? 'var(--color-warn-soft, #fffbeb)' : 'var(--color-danger-soft)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontSize: '16px', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                          {score}
                        </span>
                        <span style={{ fontSize: '9px', fontWeight: 600, color: scoreColor, opacity: 0.7 }}>
                          /10
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Answer */}
                  {ans && (
                    <>
                      <div
                        style={{
                          background: 'var(--color-surface-2)',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          marginBottom: '10px',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink-4)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                          你的回答
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.6, margin: 0 }}>
                          {ans.answer}
                        </p>
                      </div>

                      <div
                        style={{
                          background: 'var(--color-brand-soft)',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          borderLeft: '3px solid var(--color-brand)',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-brand)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                          AI 点评
                        </div>
                        <p style={{ fontSize: '13px', color: ans.feedback ? 'var(--color-ink-2)' : 'var(--color-ink-4)', lineHeight: 1.6, margin: 0 }}>
                          {ans.feedback || '暂无点评'}
                        </p>
                      </div>

                      {ans.filler_count > 0 && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-warn)',
                            background: 'var(--color-warn-soft, #fffbeb)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          <MessageSquare size={11} />
                          口头禅 {ans.filler_count} 次
                        </div>
                      )}
                    </>
                  )}

                  {!ans && (
                    <div style={{ fontSize: '13px', color: 'var(--color-ink-4)', fontStyle: 'italic' }}>
                      未作答
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
