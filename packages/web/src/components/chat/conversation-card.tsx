'use client';

import type { Conversation } from '@/lib/types';

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

interface ConversationCardProps {
  conversation: Conversation;
}

export function ConversationCard({ conversation }: ConversationCardProps) {
  const title = conversation.title ?? '新对话';
  const lastMessage = conversation.messages && conversation.messages.length > 0
    ? conversation.messages[conversation.messages.length - 1]
    : null;
  const preview = lastMessage
    ? truncate(lastMessage.content, 60)
    : '暂无消息';
  const timeStr = relativeTime(conversation.updated_at);

  return (
    <a
      href={`/chat/${conversation.id}`}
      className="lg"
      style={{
        display: 'block',
        padding: '16px 18px',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'transform 0.12s, box-shadow 0.12s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '-0.003em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            marginRight: '12px',
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: '11px',
            color: 'var(--color-ink-4)',
            fontFamily: 'var(--font-mono)',
            flexShrink: 0,
            fontWeight: 500,
          }}
        >
          {timeStr}
        </span>
      </div>
      <div
        style={{
          fontSize: '13px',
          color: 'var(--color-ink-3)',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          letterSpacing: '-0.003em',
        }}
      >
        {preview}
      </div>
    </a>
  );
}
