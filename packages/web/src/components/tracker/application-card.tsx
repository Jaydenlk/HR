'use client';

import { useRouter } from 'next/navigation';
import type { Application } from '@/lib/types';
import { STAGE_META } from '@/lib/tracker-stages';

interface ApplicationCardProps {
  application: Application;
  onStageChange: (id: string, stage: string) => void;
}

function isUrgent(deadline: string | null): boolean {
  if (!deadline) return false;
  const diff = new Date(deadline).getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function formatDeadline(deadline: string | null): string | null {
  if (!deadline) return null;
  return new Date(deadline).toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  });
}

export function ApplicationCard({ application, onStageChange }: ApplicationCardProps) {
  const router = useRouter();
  const urgent = isUrgent(application.deadline);
  const deadlineLabel = formatDeadline(application.deadline);

  function openDetail() {
    router.push(`/applications/${application.id}`);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetail();
        }
      }}
      style={{
        background: urgent ? 'var(--color-warn-soft)' : 'rgba(47,143,255,.05)',
        border: `1px solid ${urgent ? 'color-mix(in srgb, var(--color-warn) 30%, transparent)' : 'var(--hair)'}`,
        borderRadius: 'var(--radius-default)',
        padding: '11px 13px',
        cursor: 'pointer',
        transition: 'border-color 0.12s, transform 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = urgent ? 'color-mix(in srgb, var(--color-warn) 50%, transparent)' : 'var(--hair-2)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = urgent ? 'color-mix(in srgb, var(--color-warn) 30%, transparent)' : 'var(--hair)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Company + Role */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: 'var(--color-ink)',
          letterSpacing: '-0.003em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {application.company}
      </div>
      <div
        style={{
          fontSize: '11.5px',
          color: 'var(--color-ink-3)',
          fontWeight: 500,
          marginTop: '1px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {application.role}
      </div>

      {/* Meta row */}
      <div
        style={{
          marginTop: '7px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10.5px',
          color: 'var(--color-ink-3)',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span
          style={{
            color: 'var(--color-ink-2)',
            fontWeight: 700,
          }}
        >
          {application.salary_range ?? application.location ?? '—'}
        </span>
        {deadlineLabel && (
          <span
            style={{
              color: urgent ? 'var(--color-warn)' : 'var(--color-ink-3)',
            }}
          >
            {deadlineLabel}
          </span>
        )}
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
        {application.referrer && (
          <span
            style={{
              fontFamily: 'var(--font)',
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 7px',
              borderRadius: '4px',
              display: 'inline-block',
              letterSpacing: '0.02em',
              background: 'var(--color-brand-soft)',
              color: 'var(--color-brand)',
            }}
          >
            内推
          </span>
        )}
      </div>

      {/* Stage change dropdown */}
      <div style={{ marginTop: '8px' }}>
        <select
          value={application.stage}
          onChange={(e) => onStageChange(application.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            padding: '4px 6px',
            borderRadius: '6px',
            border: '1px solid var(--color-line)',
            background: 'var(--color-surface)',
            color: 'var(--color-ink-2)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {STAGE_META.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
