'use client';

import Link from 'next/link';
import type { Interview } from '@/lib/types';
import { ChevronRight } from 'lucide-react';

function gradeColor(grade: string | null): { bg: string; text: string } {
  if (!grade) return { bg: 'var(--color-ink-4)', text: '#fff' };
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return { bg: 'var(--color-success)', text: '#fff' };
  if (g.startsWith('B')) return { bg: 'var(--color-ink)', text: '#fff' };
  if (g.startsWith('C')) return { bg: 'var(--color-warn)', text: '#fff' };
  return { bg: 'var(--color-danger)', text: '#fff' };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  });
}

interface InterviewCardProps {
  interview: Interview;
}

export function InterviewCard({ interview: iv }: InterviewCardProps) {
  const { bg, text } = gradeColor(iv.overall_grade);

  return (
    <Link
      href={`/debrief/${iv.id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '54px 1fr auto',
        gap: '14px',
        alignItems: 'center',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: '16px',
        padding: '16px 18px',
        textDecoration: 'none',
        transition: 'border-color 0.12s, box-shadow 0.12s, transform 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-brand)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-line)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Grade badge */}
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '14px',
          background: bg,
          color: text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          flexShrink: 0,
        }}
      >
        {iv.overall_grade ?? '?'}
      </div>

      {/* Body */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: '14.5px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {iv.company ?? '未知公司'}
          <span
            style={{
              color: 'var(--color-ink-3)',
              fontWeight: 500,
              fontSize: '13px',
            }}
          >
            {iv.role ? ` · ${iv.role}` : ''}
          </span>
        </div>
        <div
          style={{
            fontSize: '12.5px',
            color: 'var(--color-ink-3)',
            fontWeight: 500,
            marginTop: '2px',
          }}
        >
          {iv.round}
        </div>
        <div
          style={{
            marginTop: '7px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '5px',
            alignItems: 'center',
          }}
        >
          {iv.transcript && (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'var(--color-success-soft)',
                color: 'var(--color-success)',
              }}
            >
              有转写
            </span>
          )}
          {iv.scores && iv.scores.length > 0 && (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'var(--color-brand-soft)',
                color: 'var(--color-brand-ink)',
              }}
            >
              已分析
            </span>
          )}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-ink-4)',
              fontWeight: 500,
              marginLeft: 'auto',
            }}
          >
            {formatDate(iv.interview_at)}
            {iv.duration_min ? ` · ${iv.duration_min}min` : ''}
          </span>
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight size={16} color="var(--color-ink-3)" style={{ flexShrink: 0 }} />
    </Link>
  );
}
