'use client';

import type { MockSession } from '@/lib/types';
import { Play, CheckCircle, Clock } from 'lucide-react';

interface MockSessionCardProps {
  session: MockSession;
  onClick: () => void;
}

function statusConfig(status: string): { label: string; bg: string; color: string; icon: React.ReactNode } {
  if (status === 'completed') {
    return {
      label: '已完成',
      bg: 'var(--color-success-soft, #f0fdf4)',
      color: 'var(--color-success)',
      icon: <CheckCircle size={12} />,
    };
  }
  if (status === 'in_progress') {
    return {
      label: '进行中',
      bg: 'var(--color-brand-soft)',
      color: 'var(--color-brand)',
      icon: <Play size={12} />,
    };
  }
  return {
    label: '待开始',
    bg: 'var(--color-surface-3)',
    color: 'var(--color-ink-3)',
    icon: <Clock size={12} />,
  };
}

export function MockSessionCard({ session, onClick }: MockSessionCardProps) {
  const date = new Date(session.created_at).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });

  const { label, bg, color, icon } = statusConfig(session.status);

  const score =
    session.evaluation?.overall_score != null
      ? session.evaluation.overall_score
      : null;

  const grade = session.evaluation?.overall_grade ?? null;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '18px 20px',
        background: 'var(--color-surface)',
        borderRadius: '14px',
        border: '1px solid var(--color-line)',
        textAlign: 'left',
        cursor: 'pointer',
        width: '100%',
        transition: 'box-shadow 0.12s, border-color 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
        e.currentTarget.style.borderColor = 'var(--color-line-2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--color-line)';
      }}
    >
      {/* Score ring (compact) */}
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: score != null ? (score >= 70 ? 'var(--color-success)' : score >= 50 ? 'var(--color-warn)' : 'var(--color-danger)') : 'var(--color-surface-2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: score != null ? '#fff' : 'var(--color-ink-4)',
        }}
      >
        {score != null ? (
          <>
            <span style={{ fontSize: '17px', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em' }}>
              {score}
            </span>
            {grade && (
              <span style={{ fontSize: '10px', fontWeight: 700, opacity: 0.8, marginTop: '1px' }}>
                {grade}
              </span>
            )}
          </>
        ) : (
          <Play size={20} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: '5px',
          }}
        >
          {session.company ?? '未指定公司'}
          {session.role && (
            <span style={{ color: 'var(--color-ink-3)', fontWeight: 500 }}>
              {' · '}{session.role}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Status badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '6px',
              background: bg,
              color,
            }}
          >
            {icon}
            {label}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-ink-4)' }}>
            {date}
          </span>
          {session.questions && (
            <span style={{ fontSize: '12px', color: 'var(--color-ink-4)' }}>
              {session.answers?.length ?? 0}/{session.questions.length} 题
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
