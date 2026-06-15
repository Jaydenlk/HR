'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Conversation } from '@/lib/types';
import { ConversationCard } from '@/components/chat/conversation-card';
import { MessageSquare, Plus, Loader2 } from 'lucide-react';

export default function ChatListPage() {
  return (
    <Suspense fallback={<ChatListLoading />}>
      <ChatListInner />
    </Suspense>
  );
}

function ChatListLoading() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: '72px',
              borderRadius: 'var(--radius-default)',
              background: 'rgba(47,143,255,.05)',
              border: '1px solid var(--hair)',
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ChatListInner() {
  const searchParams = useSearchParams();
  const contextType = searchParams.get('context');
  const contextId = searchParams.get('id');

  const hasContext = contextType === 'opportunity' && !!contextId;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [contextDone, setContextDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creatingContext = hasContext && !contextDone;

  // Handle context-based conversation creation (e.g. from opportunity detail)
  useEffect(() => {
    if (!hasContext) return;
    api
      .post<Conversation>('/conversations', {
        context_type: 'opportunity',
        context_id: contextId,
      })
      .then((conv) => {
        window.location.href = `/chat/${conv.id}`;
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '无法创建上下文对话');
        setContextDone(true);
      });
  }, [hasContext, contextId]);

  useEffect(() => {
    api
      .get<Conversation[]>('/conversations')
      .then((data) => {
        setConversations(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败');
        setLoading(false);
      });
  }, []);

  async function handleNewConversation() {
    if (creating) return;
    setCreating(true);
    try {
      const conv = await api.post<Conversation>('/conversations', { context_type: 'free' });
      window.location.href = `/chat/${conv.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
      setCreating(false);
    }
  }

  // Show a full-page spinner while creating a context conversation
  if (creatingContext) {
    return (
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '48px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          minHeight: '300px',
        }}
      >
        <Loader2
          size={28}
          style={{ animation: 'spin 1s linear infinite', color: 'var(--color-ink-3)' }}
        />
        <span style={{ fontSize: '14px', color: 'var(--color-ink-3)', fontWeight: 500 }}>
          正在创建对话...
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 32px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--serif)',
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.4px',
              margin: 0,
            }}
          >
            对话
          </h1>
          {!loading && (
            <p
              style={{
                fontSize: '13px',
                color: 'var(--color-ink-3)',
                marginTop: '4px',
                fontWeight: 500,
              }}
            >
              {conversations.length > 0
                ? `共 ${conversations.length} 条对话`
                : '还没有对话记录'}
            </p>
          )}
        </div>
        <button
          onClick={handleNewConversation}
          disabled={creating}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '9px 16px',
            background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontWeight: 600,
            cursor: creating ? 'not-allowed' : 'pointer',
            opacity: creating ? 0.7 : 1,
            letterSpacing: '-0.003em',
            boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
            transition: 'opacity 0.12s',
          }}
        >
          <Plus size={15} />
          {creating ? '创建中…' : '新建对话'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '14px 18px',
            background: 'var(--color-danger-soft)',
            border: '1px solid var(--color-danger)',
            borderRadius: '12px',
            color: 'var(--color-danger)',
            fontSize: '13.5px',
            fontWeight: 500,
            marginBottom: '24px',
          }}
        >
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: '72px',
                borderRadius: 'var(--radius-default)',
                background: 'rgba(47,143,255,.05)',
                border: '1px solid var(--hair)',
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      )}

      {/* List */}
      {!loading && conversations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {conversations.map((conv) => (
            <ConversationCard key={conv.id} conversation={conv} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && conversations.length === 0 && !error && (
        <div
          className="lg"
          style={{
            textAlign: 'center',
            padding: '80px 40px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'var(--color-brand-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <MessageSquare size={24} color="var(--color-brand)" />
          </div>
          <h2
            style={{
              fontFamily: 'var(--serif)',
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.3px',
              margin: '0 0 8px',
            }}
          >
            开始你的第一次对话
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-ink-3)',
              margin: '0 0 28px',
              lineHeight: 1.6,
              fontWeight: 500,
            }}
          >
            向 Coach 提问，获得个性化的求职建议
          </p>
          <button
            onClick={handleNewConversation}
            disabled={creating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '11px 20px',
              background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: creating ? 'not-allowed' : 'pointer',
              opacity: creating ? 0.7 : 1,
              letterSpacing: '-0.003em',
              boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
            }}
          >
            <Plus size={15} />
            {creating ? '创建中…' : '新建对话'}
          </button>
        </div>
      )}
    </div>
  );
}
