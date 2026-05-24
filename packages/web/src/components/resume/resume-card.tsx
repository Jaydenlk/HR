'use client';

import type { Resume } from '@/lib/types';
import { FileText } from 'lucide-react';

interface ResumeCardProps {
  resume: Resume;
  onClick: () => void;
}

export function ResumeCard({ resume, onClick }: ResumeCardProps) {
  const date = new Date(resume.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '20px',
        background: 'var(--color-surface)',
        borderRadius: '14px',
        border: '1px solid var(--color-line)',
        textDecoration: 'none',
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
      {/* Icon row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'var(--color-brand-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <FileText size={20} color="var(--color-brand)" />
        </div>
        {/* Badges */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {resume.is_primary && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'var(--color-brand-soft)',
                color: 'var(--color-brand-ink)',
                letterSpacing: '-0.01em',
              }}
            >
              主版本
            </span>
          )}
          {resume.file_type && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'var(--color-surface-3)',
                color: 'var(--color-ink-3)',
                letterSpacing: '0.01em',
                textTransform: 'uppercase',
              }}
            >
              {resume.file_type}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: '4px',
          }}
        >
          {resume.title}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--color-ink-4)',
          }}
        >
          {date}
        </div>
      </div>
    </button>
  );
}
