'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Conversation, ChatMessage } from '@/lib/types';
import { MessageBubble } from '@/components/chat/message-bubble';
import { ChatInput } from '@/components/chat/chat-input';
import { ArrowLeft } from 'lucide-react';

// Typing indicator shown while waiting for assistant reply
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'var(--color-surface-3)',
          border: '1px solid var(--color-line)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--color-ink-2)',
        }}
      >
        C
      </div>
      <div
        style={{
          padding: '14px 18px',
          borderRadius: '18px 18px 18px 6px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-line)',
          display: 'flex',
          gap: '5px',
          alignItems: 'center',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--color-ink-3)',
              display: 'inline-block',
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes bounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-6px); }
          }
        `}</style>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[60, 180, 80, 220].map((w, i) => (
          <div
            key={i}
            style={{
              height: '48px',
              width: `${w}px`,
              maxWidth: '80%',
              borderRadius: '14px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-line)',
              alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start',
              opacity: 0.7,
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface ChatDetailClientProps {
  params: Promise<{ id: string }>;
}

export function ChatDetailClient({ params }: ChatDetailClientProps) {
  const { id } = use(params);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<Conversation>(`/conversations/${id}`)
      .then((data) => {
        setConversation(data);
        setMessages(data.messages ?? []);
        setLoading(false);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : '';
        // 404 / "Not Found" → 统一中文兜底
        const isNotFound = /404|not found/i.test(msg);
        setError(isNotFound ? '对话不存在' : msg || '加载失败');
        setLoading(false);
      });
  }, [id]);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, sending]);

  async function handleSend(content: string) {
    if (sending) return;

    // Optimistic user message
    const optimisticMsg: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      conversation_id: id,
      role: 'user',
      content,
      rich_card: null,
      tool_used: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setSending(true);

    try {
      const response = await api.post<{ user_message: ChatMessage; assistant_message: ChatMessage }>(
        `/conversations/${id}/messages`,
        { content }
      );

      // Replace optimistic message + add assistant reply
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== optimisticMsg.id);
        return [...withoutOptimistic, response.user_message, response.assistant_message];
      });
    } catch (err) {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setError(err instanceof Error ? err.message : '发送失败，请重试');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--color-line)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--color-surface)',
          }}
        >
          <Link
            href="/chat"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--color-ink-3)',
              fontSize: '13.5px',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={15} />
            对话
          </Link>
        </div>
        <LoadingState />
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 32px' }}>
        <Link
          href="/chat"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-ink-3)',
            fontSize: '13.5px',
            fontWeight: 500,
            textDecoration: 'none',
            marginBottom: '24px',
          }}
        >
          <ArrowLeft size={15} />
          返回
        </Link>
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            background: 'var(--color-danger-soft)',
            borderRadius: '14px',
            color: 'var(--color-danger)',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  const title = conversation?.title ?? '新对话';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Topbar */}
      <div
        style={{
          padding: '14px 24px',
          borderBottom: '1px solid var(--color-line)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: 'var(--color-surface)',
          flexShrink: 0,
        }}
      >
        <Link
          href="/chat"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            color: 'var(--color-ink-3)',
            fontSize: '13.5px',
            fontWeight: 500,
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={15} />
          对话
        </Link>
        <div
          style={{
            width: '1px',
            height: '16px',
            background: 'var(--color-line)',
            flexShrink: 0,
          }}
        />
        <h1
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '-0.3px',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </h1>
      </div>

      {/* Error banner (non-fatal) */}
      {error && (
        <div
          style={{
            padding: '10px 24px',
            background: 'var(--color-danger-soft)',
            color: 'var(--color-danger)',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-danger)',
              fontSize: '16px',
              padding: '0 4px',
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Feed */}
      <div
        ref={feedRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px 16px',
        }}
      >
        <div
          style={{
            maxWidth: '840px',
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {messages.length === 0 && !sending && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'var(--color-ink-3)',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              说点什么，开始对话吧
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {sending && <TypingIndicator />}
        </div>
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0 }}>
        <ChatInput onSend={handleSend} loading={sending} />
      </div>
    </div>
  );
}
