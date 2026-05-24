'use client';

import type { ChatMessage } from '@/lib/types';

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: '12px',
        alignItems: 'flex-end',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: isUser ? 'var(--color-brand-soft)' : 'var(--color-surface-3)',
          border: '1px solid var(--color-line)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 700,
          color: isUser ? 'var(--color-brand-ink)' : 'var(--color-ink-2)',
        }}
      >
        {isUser ? '我' : 'C'}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          maxWidth: '580px',
        }}
      >
        {/* Bubble */}
        <div
          style={{
            padding: isUser ? '12px 16px' : '13px 18px',
            borderRadius: isUser ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
            background: isUser ? '#0a84ff' : 'var(--color-surface)',
            border: isUser ? 'none' : '1px solid var(--color-line)',
            color: isUser ? '#fff' : 'var(--color-ink)',
            fontSize: '14.5px',
            lineHeight: 1.6,
            fontWeight: 500,
            letterSpacing: '-0.003em',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {message.content}
        </div>

        {/* Timestamp */}
        <div
          style={{
            marginTop: '4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-ink-4)',
            fontWeight: 500,
          }}
        >
          {formatTime(message.created_at)}
          {message.tool_used && (
            <span
              style={{
                marginLeft: '6px',
                background: 'var(--color-surface-2)',
                color: 'var(--color-ink-2)',
                padding: '1px 7px',
                borderRadius: '5px',
                fontFamily: 'var(--font)',
                fontWeight: 600,
                fontSize: '10.5px',
                letterSpacing: 0,
              }}
            >
              {message.tool_used}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
