'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Interview } from '@/lib/types';
import { InterviewCard } from '@/components/interview/interview-card';
import { InterviewForm } from '@/components/interview/interview-form';
import { Plus, Mic } from 'lucide-react';

// ── 统计卡片 ──────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: '16px',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-ink-3)', letterSpacing: '0.03em' }}>
        {label}
      </span>
      <span
        style={{
          fontSize: '28px',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          color: color ?? 'var(--color-ink)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ── 录音 capture banner ───────────────────────────────────────────────────────

function CaptureBanner({ onNew }: { onNew: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '14px 20px',
        background: 'var(--color-surface)',
        border: '1.5px dashed var(--color-line-2)',
        borderRadius: '14px',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'var(--color-brand-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Mic size={18} color="var(--color-brand)" />
        </div>
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-ink)' }}>
            刚完成一场面试？
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginTop: '2px' }}>
            趁记忆新鲜录入面试记录，AI 将自动生成复盘分析
          </div>
        </div>
      </div>
      <button
        onClick={onNew}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '9px 16px',
          background: 'var(--color-brand)',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: '-0.005em',
          flexShrink: 0,
        }}
      >
        <Plus size={14} />
        录入面试
      </button>
    </div>
  );
}

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

type FilterKey = 'all' | 'analyzed' | 'pending' | 'transcript';

const FILTER_LABELS: Record<FilterKey, string> = {
  all: '全部',
  analyzed: '已分析',
  pending: '待分析',
  transcript: '有转写',
};

export default function DebriefListPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

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

  // 统计计算
  const total = interviews.length;
  const analyzed = interviews.filter((iv) => iv.scores && iv.scores.length > 0).length;
  const withTranscript = interviews.filter((iv) => iv.transcript).length;
  const avgGrade = (() => {
    const graded = interviews.filter((iv) => iv.overall_grade);
    if (graded.length === 0) return '—';
    const gradeMap: Record<string, number> = { 'A+': 5, A: 4, 'B+': 3.5, B: 3, 'C+': 2.5, C: 2, D: 1 };
    const avg =
      graded.reduce((s, iv) => s + (gradeMap[iv.overall_grade ?? ''] ?? 2.5), 0) / graded.length;
    if (avg >= 4.5) return 'A+';
    if (avg >= 3.8) return 'A';
    if (avg >= 3.2) return 'B+';
    if (avg >= 2.6) return 'B';
    return 'C';
  })();

  // 过滤
  const filtered = interviews.filter((iv) => {
    if (filter === 'analyzed') return iv.scores && iv.scores.length > 0;
    if (filter === 'pending') return !iv.scores || iv.scores.length === 0;
    if (filter === 'transcript') return !!iv.transcript;
    return true;
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 32px 64px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
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

      {/* 4 stat tiles — 仅有数据时显示 */}
      {!loading && !error && total > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <StatTile label="面试场次" value={total} />
          <StatTile
            label="平均评级"
            value={avgGrade}
            color={avgGrade !== '—' ? 'var(--color-success)' : undefined}
          />
          <StatTile
            label="已分析"
            value={analyzed}
            sub={total > 0 ? `共 ${total} 场` : undefined}
            color="var(--color-brand)"
          />
          <StatTile label="有转写" value={withTranscript} color="var(--color-ink-2)" />
        </div>
      )}

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

      {/* Capture banner + filter + grid */}
      {!loading && !error && interviews.length > 0 && (
        <>
          <CaptureBanner onNew={() => setShowForm(true)} />

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: '1px solid',
                  borderColor: filter === key ? 'var(--color-brand)' : 'var(--color-line)',
                  background: filter === key ? 'var(--color-brand-soft)' : 'var(--color-surface)',
                  color: filter === key ? 'var(--color-brand-ink)' : 'var(--color-ink-2)',
                  fontSize: '12.5px',
                  fontWeight: filter === key ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.12s',
                }}
              >
                {FILTER_LABELS[key]}
                {key !== 'all' && (
                  <span style={{ marginLeft: '5px', opacity: 0.7 }}>
                    {key === 'analyzed' ? analyzed : key === 'pending' ? total - analyzed : withTranscript}
                  </span>
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                color: 'var(--color-ink-4)',
                fontSize: '13.5px',
                background: 'var(--color-surface)',
                borderRadius: '14px',
                border: '1px solid var(--color-line)',
              }}
            >
              该筛选条件下暂无记录
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}
            >
              {filtered.map((iv) => (
                <InterviewCard key={iv.id} interview={iv} />
              ))}
            </div>
          )}
        </>
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
