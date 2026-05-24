'use client';

import type { InterviewQuestion } from '@/lib/types';
import { Sparkles, HelpCircle } from 'lucide-react';

interface QuestionCardProps {
  question: InterviewQuestion;
  index: number;
}

function toneBg(tone: 'good' | 'warn' | 'bad'): { bg: string; border: string } {
  if (tone === 'warn') return { bg: '#fffbf2', border: '#f5dca8' };
  if (tone === 'bad') return { bg: '#fff5f3', border: '#f5beb8' };
  return { bg: 'var(--color-surface)', border: 'var(--color-line)' };
}

function numBg(tone: 'good' | 'warn' | 'bad'): string {
  if (tone === 'warn') return 'var(--color-warn)';
  if (tone === 'bad') return 'var(--color-danger)';
  return 'var(--color-ink)';
}

function tsBg(tone: 'good' | 'warn' | 'bad'): { bg: string; color: string } {
  if (tone === 'warn') return { bg: 'rgba(255,149,0,.12)', color: '#a86200' };
  if (tone === 'bad') return { bg: 'rgba(255,59,48,.1)', color: '#bf2418' };
  return { bg: 'var(--color-surface-2)', color: 'var(--color-ink-3)' };
}

function aiCellStyle(tone: 'good' | 'warn' | 'bad'): { bg: string; color: string; lblColor: string } {
  if (tone === 'warn') return { bg: 'var(--color-warn-soft)', color: '#5c3700', lblColor: '#a86200' };
  if (tone === 'bad') return { bg: 'var(--color-danger-soft)', color: '#831a13', lblColor: '#bf2418' };
  return { bg: 'var(--color-brand-soft)', color: 'var(--color-ink-2)', lblColor: 'var(--color-brand-ink)' };
}

function statusLabel(tone: 'good' | 'warn' | 'bad'): string {
  if (tone === 'good') return '表现 OK';
  if (tone === 'warn') return '可改进';
  return '重点改进';
}

function statusColor(tone: 'good' | 'warn' | 'bad'): string {
  if (tone === 'good') return 'var(--color-success)';
  if (tone === 'warn') return '#a86200';
  return 'var(--color-danger)';
}

export function QuestionCard({ question: q, index }: QuestionCardProps) {
  const { bg, border } = toneBg(q.tone);
  const numColor = numBg(q.tone);
  const ts = tsBg(q.tone);
  const ai = aiCellStyle(q.tone);
  const num = String(index + 1).padStart(2, '0');

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '18px',
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
            borderRadius: '10px',
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

        {/* Head body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '6px', alignItems: 'center' }}>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'var(--color-surface-3)',
                color: 'var(--color-ink-2)',
              }}
            >
              {q.type}
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'var(--color-surface-3)',
                color: 'var(--color-ink-2)',
              }}
            >
              {q.topic}
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'var(--color-surface-3)',
                color: 'var(--color-ink-2)',
              }}
            >
              难度 {q.diff}
            </span>
          </div>
          {/* Question text */}
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--color-ink)',
              lineHeight: 1.4,
              letterSpacing: '-0.005em',
            }}
          >
            {q.q}
          </div>
        </div>

        {/* Timestamp */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 600,
            color: ts.color,
            background: ts.bg,
            padding: '5px 9px',
            borderRadius: '7px',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          ⏱ {q.time}
        </span>
      </div>

      {/* Pair: you vs AI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {/* Your answer */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            background: 'var(--color-surface-2)',
            fontSize: '13px',
            lineHeight: 1.55,
            fontWeight: 500,
            color: 'var(--color-ink-2)',
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
              color: 'var(--color-ink-3)',
            }}
          >
            你 · 转写
          </div>
          {q.you}
        </div>

        {/* AI eval */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
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
          {q.ai}
        </div>
      </div>

      {/* Better answer */}
      {q.better && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            marginTop: '10px',
            background: 'var(--color-success-soft)',
            borderRadius: '12px',
            padding: '11px 14px',
            fontSize: '13px',
            color: '#1e5a2a',
            lineHeight: 1.55,
            fontWeight: 500,
          }}
        >
          <Sparkles size={14} color="#1e7a3a" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            <strong style={{ color: '#0e4a18', fontWeight: 700 }}>更好的答法 —— </strong>
            {q.better}
          </span>
        </div>
      )}

      {/* Gap link */}
      {q.gap && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--color-ink-3)',
            fontWeight: 500,
          }}
        >
          <HelpCircle size={13} />
          <span>识别到知识盲点 ·</span>
          <a
            href={q.gap.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--color-brand)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {q.gap.topic} →
          </a>
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
          borderTop: '1px dashed rgba(0,0,0,0.08)',
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
