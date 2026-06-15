'use client';

import type { InterviewQuestion } from '@/lib/types';
import { Sparkles, HelpCircle } from 'lucide-react';

interface QuestionCardProps {
  question: InterviewQuestion;
  index: number;
}

function toneBg(tone: 'good' | 'warn' | 'bad'): { bg: string; border: string } {
  if (tone === 'warn')
    return {
      bg: 'color-mix(in srgb, var(--color-warn) 8%, transparent)',
      border: 'color-mix(in srgb, var(--color-warn) 32%, transparent)',
    };
  if (tone === 'bad')
    return {
      bg: 'color-mix(in srgb, var(--color-danger) 8%, transparent)',
      border: 'color-mix(in srgb, var(--color-danger) 32%, transparent)',
    };
  return { bg: 'rgba(47,143,255,.05)', border: 'var(--hair)' };
}

function numBg(tone: 'good' | 'warn' | 'bad'): string {
  if (tone === 'warn') return 'var(--color-warn)';
  if (tone === 'bad') return 'var(--color-danger)';
  return 'var(--color-brand)';
}

function aiCellStyle(tone: 'good' | 'warn' | 'bad'): { bg: string; color: string; lblColor: string } {
  if (tone === 'warn') return { bg: 'var(--color-warn-soft)', color: 'var(--color-ink-2)', lblColor: 'var(--color-warn)' };
  if (tone === 'bad') return { bg: 'var(--color-danger-soft)', color: 'var(--color-ink-2)', lblColor: 'var(--color-danger)' };
  return { bg: 'var(--color-brand-soft)', color: 'var(--color-ink-2)', lblColor: 'var(--color-brand-ink)' };
}

function statusLabel(tone: 'good' | 'warn' | 'bad'): string {
  if (tone === 'good') return '表现 OK';
  if (tone === 'warn') return '可改进';
  return '重点改进';
}

function statusColor(tone: 'good' | 'warn' | 'bad'): string {
  if (tone === 'good') return 'var(--color-success)';
  if (tone === 'warn') return 'var(--color-warn)';
  return 'var(--color-danger)';
}

export function QuestionCard({ question: q, index }: QuestionCardProps) {
  const { bg, border } = toneBg(q.tone);
  const numColor = numBg(q.tone);
  const ai = aiCellStyle(q.tone);
  const num = String(index + 1).padStart(2, '0');
  const gaps = q.knowledge_gaps ?? [];

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
      }}
    >
      {/* Head */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          marginBottom: '12px',
        }}
      >
        {/* Number badge */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-default)',
            background: numColor,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '15px',
            letterSpacing: '-0.02em',
            flexShrink: 0,
          }}
        >
          {num}
        </div>

        {/* Question text */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            lineHeight: 1.4,
            letterSpacing: '-0.005em',
          }}
        >
          {q.question}
        </div>
      </div>

      {/* Coach assessment */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: 'var(--radius-default)',
          background: ai.bg,
          fontSize: '13px',
          lineHeight: 1.55,
          fontWeight: 500,
          color: ai.color,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '10.5px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '6px',
            color: ai.lblColor,
          }}
        >
          Coach 评估
        </div>
        {q.coach_assessment}
      </div>

      {/* Better answer */}
      {q.better_answer && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            marginTop: '10px',
            background: 'var(--color-success-soft)',
            borderRadius: 'var(--radius-default)',
            padding: '11px 14px',
            fontSize: '13px',
            color: 'var(--color-ink-2)',
            lineHeight: 1.55,
            fontWeight: 500,
          }}
        >
          <Sparkles size={14} color="var(--color-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            <strong style={{ color: 'var(--color-success)', fontWeight: 700 }}>更好的答法 —— </strong>
            {q.better_answer}
          </span>
        </div>
      )}

      {/* Knowledge gaps */}
      {gaps.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--color-ink-3)',
            fontWeight: 500,
          }}
        >
          <HelpCircle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            识别到知识盲点 ·{' '}
            {gaps.map((gap, i) => (
              <span key={gap}>
                {i > 0 && '、'}
                <span style={{ color: 'var(--color-ink-2)', fontWeight: 600 }}>{gap}</span>
              </span>
            ))}
          </span>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '10px',
          marginTop: '10px',
          borderTop: '1px dashed var(--hair)',
        }}
      >
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 700,
            color: statusColor(q.tone),
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'currentColor',
              display: 'inline-block',
            }}
          />
          {statusLabel(q.tone)}
        </span>
      </div>
    </div>
  );
}
