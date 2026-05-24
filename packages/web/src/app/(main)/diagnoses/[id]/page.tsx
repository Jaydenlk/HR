'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Diagnosis } from '@/lib/types';
import { ScoreRing } from '@/components/diagnosis/score-ring';
import { DimensionBars } from '@/components/diagnosis/dimension-bars';
import { KeywordCloud } from '@/components/diagnosis/keyword-cloud';
import { SuggestionCard } from '@/components/diagnosis/suggestion-card';
import { ArrowLeft, Briefcase, Building2, Calendar } from 'lucide-react';

function LoadingState() {
  return (
    <div
      style={{
        maxWidth: '860px',
        margin: '0 auto',
        padding: '48px 32px',
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[80, 160, 200, 120, 240].map((h, i) => (
          <div
            key={i}
            style={{
              height: `${h}px`,
              borderRadius: '14px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-line)',
              opacity: 0.7,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function JdSection({ jdText }: { jdText: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: '14px',
        border: '1px solid var(--color-line)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid var(--color-line)' : 'none',
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            letterSpacing: '-0.01em',
          }}
        >
          原始 JD
        </span>
        <span
          style={{
            fontSize: '12px',
            color: 'var(--color-ink-4)',
            fontWeight: 500,
          }}
        >
          {expanded ? '收起' : '展开'}
        </span>
      </button>
      {expanded && (
        <div style={{ padding: '20px 24px' }}>
          <pre
            style={{
              fontSize: '13px',
              lineHeight: 1.7,
              color: 'var(--color-ink-2)',
              background: 'var(--color-surface-2)',
              borderRadius: '10px',
              padding: '16px 18px',
              border: '1px solid var(--color-line)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'var(--font-mono)',
              margin: 0,
              maxHeight: '400px',
              overflowY: 'auto',
            }}
          >
            {jdText}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function DiagnosisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Diagnosis>(`/diagnoses/${id}`)
      .then((data) => {
        setDiagnosis(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !diagnosis) {
    return (
      <div
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          padding: '48px 32px',
        }}
      >
        <Link
          href="/resumes"
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
          {error ?? '诊断记录不存在'}
        </div>
      </div>
    );
  }

  const date = new Date(diagnosis.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const scoreColor =
    diagnosis.score >= 70
      ? 'var(--color-success)'
      : diagnosis.score >= 50
        ? 'var(--color-warn)'
        : 'var(--color-danger)';

  const scoreLabel =
    diagnosis.score >= 80
      ? '匹配度优秀'
      : diagnosis.score >= 60
        ? '匹配度良好'
        : diagnosis.score >= 40
          ? '匹配度一般'
          : '匹配度较低';

  return (
    <div
      style={{
        maxWidth: '860px',
        margin: '0 auto',
        padding: '48px 32px',
      }}
    >
      {diagnosis.resume_id && (
        <Link
          href={`/resumes/${diagnosis.resume_id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-ink-3)',
            fontSize: '13.5px',
            fontWeight: 500,
            textDecoration: 'none',
            marginBottom: '24px',
            transition: 'color 0.1s',
          }}
        >
          <ArrowLeft size={15} />
          返回简历
        </Link>
      )}

      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: '16px',
          border: '1px solid var(--color-line)',
          padding: '28px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '28px' }}>
          <ScoreRing score={diagnosis.score} size={120} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: scoreColor, marginBottom: '8px', letterSpacing: '-0.01em' }}>
              {scoreLabel}
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.4px', margin: '0 0 12px' }}>
              {diagnosis.jd_role ?? '职位匹配诊断'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {diagnosis.jd_company && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--color-ink-3)' }}>
                  <Building2 size={13} />
                  {diagnosis.jd_company}
                </div>
              )}
              {diagnosis.jd_role && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--color-ink-3)' }}>
                  <Briefcase size={13} />
                  {diagnosis.jd_role}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--color-ink-4)' }}>
                <Calendar size={13} />
                {date}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', borderRadius: '14px', border: '1px solid var(--color-line)', padding: '24px 28px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em', marginBottom: '18px' }}>
          维度分析
        </h2>
        <DimensionBars dimensions={diagnosis.dimensions} />
      </div>

      <div style={{ background: 'var(--color-surface)', borderRadius: '14px', border: '1px solid var(--color-line)', padding: '24px 28px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em', marginBottom: '18px' }}>
          关键词匹配
        </h2>
        <KeywordCloud hit={diagnosis.keywords_hit} miss={diagnosis.keywords_miss} />
      </div>

      {diagnosis.suggestions.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em', marginBottom: '14px' }}>
            优化建议 ({diagnosis.suggestions.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {diagnosis.suggestions.map((suggestion, index) => (
              <SuggestionCard key={index} suggestion={suggestion} resumeId={diagnosis.resume_id} index={index} />
            ))}
          </div>
        </div>
      )}

      <JdSection jdText={diagnosis.jd_text} />
    </div>
  );
}