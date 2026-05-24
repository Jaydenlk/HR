'use client';

import type { ResumeVersion } from '@/lib/types';
import { History } from 'lucide-react';

interface VersionListProps {
  versions: ResumeVersion[];
}

export function VersionList({ versions }: VersionListProps) {
  if (versions.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--color-ink-4)',
          fontSize: '13px',
          background: 'var(--color-surface-2)',
          borderRadius: '10px',
          border: '1px dashed var(--color-line-2)',
        }}
      >
        暂无历史版本
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {versions.map((v) => {
        const date = new Date(v.created_at).toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        return (
          <div
            key={v.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px 16px',
              background: 'var(--color-surface)',
              borderRadius: '10px',
              border: '1px solid var(--color-line)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--color-surface-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <History size={15} color="var(--color-ink-3)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--color-ink-3)',
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--color-surface-3)',
                    padding: '1px 7px',
                    borderRadius: '4px',
                    flexShrink: 0,
                  }}
                >
                  v{v.version_num}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-ink-4)',
                    flexShrink: 0,
                  }}
                >
                  {date}
                </span>
              </div>
              {v.change_note && (
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--color-ink-2)',
                    marginTop: '5px',
                    lineHeight: 1.5,
                  }}
                >
                  {v.change_note}
                </p>
              )}
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--color-ink-4)',
                  marginTop: '5px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {v.raw_text.slice(0, 120)}…
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
