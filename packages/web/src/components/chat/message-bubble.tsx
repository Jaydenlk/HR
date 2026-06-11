'use client';

import type { ReactNode } from 'react';
import type { ChatMessage } from '@/lib/types';

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// 行内加粗:将 **text** 转为 <strong> 节点。
function parseInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// 轻量 Markdown 渲染:支持 ## 标题 / **粗体** / - 列表项 / --- 分隔线。
// 仅 assistant 消息使用;用户消息保持原样。
function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n');
  const nodes: ReactNode[] = [];
  let listItems: ReactNode[] = [];

  function flushList() {
    if (listItems.length > 0) {
      nodes.push(
        <ul key={`ul-${nodes.length}`} style={{ margin: '6px 0 6px 16px', padding: 0, listStyle: 'disc' }}>
          {listItems}
        </ul>,
      );
      listItems = [];
    }
  }

  lines.forEach((line, idx) => {
    // 分隔线
    if (/^---+$/.test(line.trim())) {
      flushList();
      nodes.push(<hr key={idx} style={{ border: 'none', borderTop: '1px solid var(--color-line)', margin: '8px 0' }} />);
      return;
    }
    // ## 标题
    if (line.startsWith('## ')) {
      flushList();
      nodes.push(
        <div key={idx} style={{ fontWeight: 700, fontSize: '15px', marginTop: '10px', marginBottom: '2px' }}>
          {parseInline(line.slice(3))}
        </div>,
      );
      return;
    }
    // - 列表项
    if (/^[-*]\s/.test(line)) {
      listItems.push(
        <li key={idx} style={{ marginBottom: '2px' }}>
          {parseInline(line.slice(2))}
        </li>,
      );
      return;
    }
    // 普通行(空行保留间距)
    flushList();
    if (line.trim() === '') {
      nodes.push(<div key={idx} style={{ height: '6px' }} />);
    } else {
      nodes.push(<div key={idx}>{parseInline(line)}</div>);
    }
  });
  flushList();
  return <>{nodes}</>;
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
            whiteSpace: isUser ? 'pre-wrap' : undefined,
          }}
        >
          {isUser ? message.content : <MarkdownContent text={message.content} />}
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
