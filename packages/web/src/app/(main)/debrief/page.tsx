'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Interview } from '@/lib/types';
import { InterviewCard } from '@/components/interview/interview-card';
import { InterviewForm } from '@/components/interview/interview-form';
import { Plus, Mic } from 'lucide-react';

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 32px',
        textAlign: 'center',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Mic size={28} color="var(--color-ink-3)" />
      </div>
      <div>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            letterSpacing: '-0.01em',
            marginBottom: '6px',
          }}
        >
          还没有面试记录
        </div>
        <div style={{ fontSize: '13.5px', color: 'var(--color-ink-3)', fontWeight: 500 }}>
          录入你的第一场面试，AI 将自动生成复盘分析
        </div>
      </div>
      <button
        onClick={onNew}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '11px 22px',
          background: 'var(--color-ink)',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: '-0.005em',
        }}
      >
        <Plus size={16} />
        录入新面试
      </button>
    </div>
  );
}

export default function DebriefListPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<Interview[]>('/interviews')
      .then((data) => {
        setInterviews(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败');
        setLoading(false);
      });
  }, []);

  async function handleSubmit(data: {
    company: string;
    role: string;
    round: string;
    interview_at: string;
    duration_min: string;
    interviewer: string;
    transcript: string;
    application_id: string;
  }) {
    setSubmitting(true);
    try {
      const body = {
        company: data.company || null,
        role: data.role || null,
        round: data.round,
        interview_at: data.interview_at || null,
        duration_min: data.duration_min ? parseInt(data.duration_min, 10) : null,
        interviewer: data.interviewer || null,
        transcript: data.transcript || null,
        application_id: data.application_id || null,
      };
      const created = await api.post<Interview>('/interviews', body);
      setInterviews((prev) => [created, ...prev]);
      setShowForm(false);
      // Navigate to detail for analysis
      window.location.href = `/debrief/${created.id}`;
    } catch (err) {
      alert(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 32px' }}>
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
              fontSize: '26px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.025em',
              margin: 0,
              marginBottom: '4px',
            }}
          >
            面试复盘
          </h1>
          <p
            style={{
              fontSize: '13.5px',
              color: 'var(--color-ink-3)',
              fontWeight: 500,
              margin: 0,
            }}
          >
            记录 · 转写 · 逐题评估 · 预测下一轮
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '10px 18px',
            background: 'var(--color-ink)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '13.5px',
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '-0.005em',
            flexShrink: 0,
          }}
        >
          <Plus size={15} />
          录入新面试
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: '100px',
                borderRadius: '16px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-line)',
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          style={{
            padding: '20px',
            background: 'var(--color-danger-soft)',
            borderRadius: '14px',
            color: 'var(--color-danger)',
            fontSize: '13.5px',
          }}
        >
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && interviews.length === 0 && (
        <EmptyState onNew={() => setShowForm(true)} />
      )}

      {/* Grid */}
      {!loading && !error && interviews.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
          }}
        >
          {interviews.map((iv) => (
            <InterviewCard key={iv.id} interview={iv} />
          ))}
        </div>
      )}

      {/* Form dialog */}
      {showForm && (
        <InterviewForm
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
          loading={submitting}
        />
      )}
    </div>
  );
}
