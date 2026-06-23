'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Conversation } from '@/lib/types';
import { ConversationCard } from '@/components/chat/conversation-card';
import {
  MessageSquare,
  Plus,
  Loader2,
  GraduationCap,
  Mic,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// 空态示例问句(逐字定稿 copy 附 A):点击=新建对话并带话进去,落到输入框由用户确认后发。
const STARTER_QUESTIONS: readonly string[] = [
  '下周有内容运营面试,怎么准备',
  '简历里实习经历太少,怎么补',
  '拿了两个 offer,怎么选',
] as const;

// 空态行动卡(逐字定稿 copy 附 A):点击=直达对应功能页。
interface StarterAction {
  icon: LucideIcon;
  label: string;
  href: string;
}
const STARTER_ACTIONS: readonly StarterAction[] = [
  { icon: GraduationCap, label: '诊断简历', href: '/diagnoses/campus' },
  { icon: Mic, label: '练一轮面试', href: '/mock' },
  { icon: FileText, label: '改写简历', href: '/resumes' },
] as const;

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
  const router = useRouter();
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

  // 点示例问句:新建对话并把问句带进去(落到输入框,用户确认后再发)。
  async function handleStarterQuestion(question: string) {
    if (creating) return;
    setCreating(true);
    try {
      const conv = await api.post<Conversation>('/conversations', { context_type: 'free' });
      router.push(`/chat/${conv.id}?prefill=${encodeURIComponent(question)}`);
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
            padding: '56px 40px 44px',
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
            说你的情况
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
            排出你的下一步，不用想怎么问
          </p>

          {/* 示例问句:点击=新建对话并带话进去 */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '24px',
            }}
          >
            {STARTER_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void handleStarterQuestion(q)}
                disabled={creating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--hair)',
                  background: 'rgba(47,143,255,.05)',
                  color: 'var(--color-ink-2)',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  letterSpacing: '-0.003em',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  opacity: creating ? 0.6 : 1,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (creating) return;
                  e.currentTarget.style.borderColor = 'var(--color-brand)';
                  e.currentTarget.style.background = 'var(--color-brand-soft)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--hair)';
                  e.currentTarget.style.background = 'rgba(47,143,255,.05)';
                }}
              >
                {q}
                <ArrowUpRight size={13} style={{ color: 'var(--color-ink-4)', flexShrink: 0 }} />
              </button>
            ))}
          </div>

          {/* 行动卡:点击=直达对应功能页 */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '28px',
            }}
          >
            {STARTER_ACTIONS.map((action) => (
              <button
                key={action.href}
                type="button"
                onClick={() => router.push(action.href)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-default)',
                  border: '1px solid var(--hair)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-ink)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  letterSpacing: '-0.003em',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, transform 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-brand)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--hair)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '26px',
                    height: '26px',
                    flexShrink: 0,
                    borderRadius: '8px',
                    background: 'var(--color-brand-soft)',
                    color: 'var(--color-brand)',
                  }}
                >
                  <action.icon size={15} />
                </span>
                {action.label}
              </button>
            ))}
          </div>

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
