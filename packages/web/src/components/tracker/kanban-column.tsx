'use client';

import type { Application } from '@/lib/types';
import { ApplicationCard } from './application-card';

interface KanbanColumnProps {
  stage: string;
  label: string;
  dotColor: string;
  applications: Application[];
  onStageChange: (id: string, stage: string) => void;
  onAdd: () => void;
}

export function KanbanColumn({
  label,
  dotColor,
  applications,
  onStageChange,
  onAdd,
}: KanbanColumnProps) {
  return (
    <div
      className="lg"
      style={{
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minHeight: 0,
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '2px 4px 8px',
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            letterSpacing: '-0.003em',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: dotColor,
              flexShrink: 0,
            }}
          />
          {label}
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-ink-3)',
            fontWeight: 700,
            background: 'rgba(47,143,255,.05)',
            border: '1px solid var(--hair)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
          }}
        >
          {applications.length}
        </span>
      </div>

      {/* Card list */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {applications.map((app) => (
          <ApplicationCard key={app.id} application={app} onStageChange={onStageChange} />
        ))}
      </div>

      {/* Add button */}
      <button
        onClick={onAdd}
        style={{
          background: 'transparent',
          border: '1px dashed var(--color-line-2)',
          color: 'var(--color-ink-3)',
          textAlign: 'center',
          fontSize: '11.5px',
          fontWeight: 600,
          padding: '9px 0',
          borderRadius: 'var(--radius-default)',
          cursor: 'pointer',
          transition: 'border-color 0.12s, color 0.12s',
          width: '100%',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-brand)';
          e.currentTarget.style.color = 'var(--color-brand)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-line-2)';
          e.currentTarget.style.color = 'var(--color-ink-3)';
        }}
      >
        + 添加
      </button>
    </div>
  );
}
