'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Conversation, ChatMessage } from '@/lib/types';
import { MessageBubble } from '@/components/chat/message-bubble';
import { HandoffCard } from '@/components/chat/handoff-card';
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

// 流式增量气泡:复用 MessageBubble 的 assistant 渲染(轻量 Markdown),末尾追加闪烁光标。
function StreamingBubble({ text }: { text: string }) {
  const synthetic: ChatMessage = {
    id: 'streaming',
    conversation_id: '',
    role: 'assistant',
    content: `${text}▍`,
    rich_card: null,
    tool_used: null,
    created_at: new Date().toISOString(),
  };
  return (
    <div style={{ animation: 'streamPulse 1.1s ease-in-out infinite' }}>
      <MessageBubble message={synthetic} />
      <style>{`
        @keyframes streamPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.82; }
        }
      `}</style>
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
  // 流式增量:本轮 assistant 正在生成的文本(done 后清空、落定为正式消息)。
  const [streamingText, setStreamingText] = useState('');
  // 排队提示:进入生成前若有积压,显示「前面还有 x 个请求」。
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  // 本轮流式产生的 card 事件(done 后将被 assistant_message.rich_card 覆盖)。
  const [streamingCard, setStreamingCard] = useState<{
    handoff_id: string; target: string; payload: Record<string, unknown>;
  } | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

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

  // Auto-scroll to bottom whenever messages change / streaming text grows
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, sending, streamingText]);

  // 非流式降级:浏览器不支持流读取 / 流在首 token 前失败时,退回保留的旧端点。
  async function sendNonStream(
    content: string,
    optimisticId: string,
  ): Promise<void> {
    const response = await api.post<{
      user_message: ChatMessage;
      assistant_message: ChatMessage;
    }>(`/conversations/${id}/messages`, { content });
    setMessages((prev) => {
      const withoutOptimistic = prev.filter((m) => m.id !== optimisticId);
      return [...withoutOptimistic, response.user_message, response.assistant_message];
    });
    refreshCredit();
  }

  function refreshCredit() {
    // 让侧边栏余额刷新(复用充值/402 同款广播口径)。
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('coach:credit-refresh'));
    }
  }

  async function handleSend(content: string) {
    if (sending) return;

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
    setStreamingText('');
    setQueuePosition(null);
    setStreamingCard(null);
    setError(null);

    // 浏览器不支持 ReadableStream → 直接走非流式降级。
    if (typeof ReadableStream === 'undefined') {
      try {
        await sendNonStream(content, optimisticMsg.id);
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        setError(err instanceof Error ? err.message : '发送失败，请重试');
      } finally {
        setSending(false);
      }
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    let acc = '';
    let firstTokenSeen = false;
    let done = false;
    try {
      for await (const evt of api.postStream(`/conversations/${id}/messages/stream`, {
        content,
      }, controller.signal)) {
        if (!mountedRef.current) break;
        if (evt.type === 'queue') {
          setQueuePosition(evt.position);
        } else if (evt.type === 'token') {
          firstTokenSeen = true;
          setQueuePosition(null);
          acc += evt.text;
          setStreamingText(acc);
        } else if (evt.type === 'card') {
          setStreamingCard({
            handoff_id: evt.handoff_id,
            target: evt.target,
            payload: evt.payload,
          });
        } else if (evt.type === 'done') {
          done = true;
          setMessages((prev) => {
            const withoutOptimistic = prev.filter((m) => m.id !== optimisticMsg.id);
            return [...withoutOptimistic, evt.user_message, evt.assistant_message];
          });
          setStreamingText('');
          setStreamingCard(null);
          setQueuePosition(null);
          refreshCredit();
        } else if (evt.type === 'error') {
          // 已渲染的增量不丢:落定为一条 assistant 消息再附错误提示。
          if (acc) {
            const partial: ChatMessage = {
              id: `partial-${Date.now()}`,
              conversation_id: id,
              role: 'assistant',
              content: acc,
              rich_card: null,
              tool_used: null,
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, partial]);
            setStreamingText('');
          }
          setError(evt.message || 'AI 服务暂时不可用，请稍后重试');
          setQueuePosition(null);
          done = true; // 已显式处理,不再走降级
        }
      }
    } catch (err) {
      // 组件已卸载(abort 触发):直接退出,不再 setState。
      if (!mountedRef.current) return;
      // 用户主动 abort 的错误:静默退出不报错。
      if (err instanceof Error && err.name === 'AbortError') return;

      // 流在首 token 前失败(含 HTTP 层 401/402/网络)。
      // 首 token 前且未显式 error → 退回非流式降级;首 token 后失败则保留已渲染内容只报错。
      if (!done && !firstTokenSeen) {
        try {
          await sendNonStream(content, optimisticMsg.id);
          if (mountedRef.current) setSending(false);
          return;
        } catch (fallbackErr) {
          if (!mountedRef.current) return;
          setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
          setError(
            fallbackErr instanceof Error ? fallbackErr.message : '发送失败，请重试',
          );
        }
      } else if (!done) {
        if (acc) {
          const partial: ChatMessage = {
            id: `partial-${Date.now()}`,
            conversation_id: id,
            role: 'assistant',
            content: acc,
            rich_card: null,
            tool_used: null,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, partial]);
        }
        setStreamingText('');
        setError(err instanceof Error ? err.message : 'AI 服务中断，请稍后重试');
      }
    } finally {
      if (mountedRef.current) {
        setStreamingText('');
        setQueuePosition(null);
        setStreamingCard(null);
        setSending(false);
      }
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

          {/* 排队提示:进入生成前若有积压 */}
          {sending && queuePosition !== null && queuePosition > 0 && (
            <div
              style={{
                alignSelf: 'flex-start',
                padding: '10px 16px',
                borderRadius: '14px',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-line)',
                color: 'var(--color-ink-2)',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              当前使用人数较多，正在排队，前面还有 {queuePosition} 个请求…
            </div>
          )}

          {/* 流式增量:本轮 assistant 正在生成的文本(带光标动效) */}
          {streamingText && (
            <div>
              <StreamingBubble text={streamingText} />
              {/* 行动卡片:card 事件到达后在流式气泡下方立即渲染 */}
              {streamingCard && (
                <div style={{ marginLeft: '44px' }}>
                  <HandoffCard
                    handoffId={streamingCard.handoff_id}
                    target={streamingCard.target}
                    payload={streamingCard.payload}
                  />
                </div>
              )}
            </div>
          )}

          {/* 首 token 前显示打字指示器;有增量后由 StreamingBubble 接管 */}
          {sending && !streamingText && queuePosition === null && <TypingIndicator />}
        </div>
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0 }}>
        <ChatInput onSend={handleSend} loading={sending} />
      </div>
    </div>
  );
}
