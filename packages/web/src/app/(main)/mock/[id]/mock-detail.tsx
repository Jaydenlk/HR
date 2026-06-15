'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { MockSession } from '@/lib/types';
import { MockStage } from '@/components/mock/mock-stage';
import { MockResult } from '@/components/mock/mock-result';
import { ArrowLeft, Building2 } from 'lucide-react';

function LoadingState() {
  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[60, 120, 200, 160].map((h, i) => (
          <div
            key={i}
            style={{
              height: `${h}px`,
              borderRadius: '14px',
              background: 'rgba(47,143,255,.05)',
              border: '1px solid var(--hair)',
              opacity: 0.7,
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface MockDetailProps {
  params: Promise<{ id: string }>;
}

export function MockDetail({ params }: MockDetailProps) {
  const { id } = use(params);
  const [session, setSession] = useState<MockSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    api
      .get<MockSession>(`/mock-sessions/${id}`)
      .then((data) => {
        setSession(data);
        setLoading(false);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : '加载失败';
        // 404 = 会话不存在或无权访问,属确定性结果,走中文兜底而非异常态。
        if (/(^|\D)404(\D|$)/.test(message)) {
          setNotFound(true);
        } else {
          setError(message);
        }
        setLoading(false);
      });
  }, [id]);

  async function handleAnswer(answer: string) {
    if (!session) return;
    setSubmitting(true);
    try {
      // 后端 submitAnswer 返回整个 MockSession(含追加后的 answers 数组),
      // 而非单条 answer。直接用返回的会话覆盖,最新一条点评/得分才不会丢失。
      const updated = await api.post<MockSession>(`/mock-sessions/${id}/answer`, { answer });
      setSession(updated);
      window.dispatchEvent(new Event('coach:credit-refresh'));
    } catch (err) {
      alert(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      const updated = await api.post<MockSession>(`/mock-sessions/${id}/complete`, {});
      setSession(updated);
      window.dispatchEvent(new Event('coach:credit-refresh'));
    } catch (err) {
      alert(err instanceof Error ? err.message : '结束失败，请重试');
      setCompleting(false);
    }
  }

  if (loading) return <LoadingState />;

  if (notFound || error || !session) {
    // notFound:确定性结果(会话不存在/无权访问),中性文案;error:真实异常,展示后端原因。
    const isNotFound = notFound || !error;
    return (
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 32px' }}>
        <Link
          href="/mock"
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
          返回模拟列表
        </Link>
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            background: isNotFound ? 'rgba(47,143,255,.05)' : 'var(--color-danger-soft)',
            border: isNotFound ? '1px solid var(--hair)' : 'none',
            borderRadius: '14px',
            color: isNotFound ? 'var(--color-ink-3)' : 'var(--color-danger)',
            fontSize: '14px',
          }}
        >
          {isNotFound ? '模拟面试记录不存在，或你没有访问权限。' : error}
        </div>
      </div>
    );
  }

  const isCompleted = session.status === 'completed';
  const questions = session.questions ?? [];
  const answers = session.answers ?? [];

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 32px' }}>
      {/* Back */}
      <Link
        href="/mock"
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
        返回模拟列表
      </Link>

      {/* Session header */}
      <div
        className="lg"
        style={{
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
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
          <Building2 size={20} color="var(--color-brand)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.02em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {session.company ?? '通用模拟'}
            {session.role && (
              <span style={{ color: 'var(--color-ink-3)', fontWeight: 500 }}>
                {' · '}{session.role}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '6px',
                background: isCompleted ? 'var(--color-success-soft)' : 'var(--color-brand-soft)',
                color: isCompleted ? 'var(--color-success)' : 'var(--color-brand)',
              }}
            >
              {isCompleted ? '已完成' : '进行中'}
            </span>
            {questions.length > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--color-ink-4)' }}>
                {answers.length}/{questions.length} 题
              </span>
            )}
            <span style={{ fontSize: '12px', color: 'var(--color-ink-4)' }}>
              {new Date(session.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      {isCompleted ? (
        <MockResult session={session} />
      ) : (
        <MockStage
          sessionId={id}
          mode={session.mode}
          questions={questions}
          answers={answers}
          onAnswer={handleAnswer}
          onComplete={handleComplete}
          submitting={submitting}
          completing={completing}
        />
      )}
    </div>
  );
}
