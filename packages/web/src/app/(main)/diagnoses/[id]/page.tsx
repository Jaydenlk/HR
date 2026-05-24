'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Diagnosis } from '@/lib/types';
import { ScoreRing } from '@/components/diagnosis/score-ring';
import { DimensionBars } from '@/components/diagnosis/dimension-bars';
import { KeywordCloud } from '@/components/diagnosis/keyword-cloud';
import { SuggestionCard } from '@/components/diagnosis/suggestion-card';
import { FileText, Building2, ChevronRight, AlertCircle, Plus } from 'lucide-react';

// IDs are only known at runtime; the page fetches data client-side.
export function generateStaticParams() {
  return [];
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        <h2
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--color-ink-3)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );
}

export default function DiagnosisResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .get<Diagnosis>(`/diagnoses/${id}`)
      .then((data) => {
        if (cancelled) return;
        setDiagnosis(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '加载诊断失败');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '400px',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '3px solid var(--color-line)',
            borderTopColor: 'var(--color-brand)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ fontSize: '14px', color: 'var(--color-ink-4)', margin: 0 }}>
          加载诊断结果…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          maxWidth: '560px',
          margin: '80px auto',
          padding: '0 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'var(--color-danger-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <AlertCircle size={28} color="var(--color-danger)" />
        </div>
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            marginBottom: '8px',
          }}
        >
          诊断结果不可用
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', marginBottom: '24px' }}>
          {error}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <a
            href="/diagnoses/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              background: 'var(--color-brand)',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Plus size={14} />
            新建诊断
          </a>
        </div>
      </div>
    );
  }

  // Not found
  if (!diagnosis) {
    return (
      <div
        style={{
          maxWidth: '560px',
          margin: '80px auto',
          padding: '0 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'var(--color-surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <FileText size={28} color="var(--color-ink-4)" />
        </div>
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            marginBottom: '8px',
          }}
        >
          诊断记录不存在
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', marginBottom: '24px' }}>
          该诊断记录可能已被删除或链接有误
        </p>
        <a
          href="/diagnoses/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 18px',
            background: 'var(--color-brand)',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <Plus size={14} />
          新建诊断
        </a>
      </div>
    );
  }

  const scoreLabel =
    diagnosis.score >= 80
      ? '匹配优秀'
      : diagnosis.score >= 65
        ? '匹配良好'
        : diagnosis.score >= 50
          ? '基本匹配'
          : '匹配不足';

  const scoreLabelColor =
    diagnosis.score >= 80
      ? 'var(--color-success)'
      : diagnosis.score >= 65
        ? 'var(--color-brand)'
        : diagnosis.score >= 50
          ? 'var(--color-warn)'
          : 'var(--color-danger)';

  const scoreLabelBg =
    diagnosis.score >= 80
      ? 'var(--color-success-soft)'
      : diagnosis.score >= 65
        ? 'var(--color-brand-soft)'
        : diagnosis.score >= 50
          ? 'var(--color-warn-soft)'
          : 'var(--color-danger-soft)';

  const diagnosisDate = new Date(diagnosis.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      style={{
        maxWidth: '780px',
        margin: '0 auto',
        padding: '40px 24px 80px',
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px',
        }}
      >
        <a
          href="/"
          style={{
            fontSize: '13px',
            color: 'var(--color-ink-4)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          首页
        </a>
        <ChevronRight size={13} color="var(--color-ink-4)" />
        <a
          href="/diagnoses/new"
          style={{
            fontSize: '13px',
            color: 'var(--color-ink-4)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          诊断
        </a>
        <ChevronRight size={13} color="var(--color-ink-4)" />
        <span style={{ fontSize: '13px', color: 'var(--color-ink-2)', fontWeight: 500 }}>
          {diagnosis.jd_role ?? '诊断结果'}
        </span>
      </div>

      {/* Hero / Header */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-line)',
          borderRadius: '20px',
          padding: '28px',
          marginBottom: '20px',
          display: 'flex',
          gap: '28px',
          alignItems: 'center',
        }}
      >
        {/* Score ring */}
        <div style={{ flexShrink: 0 }}>
          <ScoreRing score={diagnosis.score} size={120} strokeWidth={10} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: scoreLabelColor,
                background: scoreLabelBg,
                padding: '2px 10px',
                borderRadius: '6px',
              }}
            >
              {scoreLabel}
            </span>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--color-ink-4)',
                fontWeight: 500,
              }}
            >
              {diagnosisDate}
            </span>
          </div>

          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.3px',
              marginBottom: '8px',
              lineHeight: 1.2,
            }}
          >
            {diagnosis.jd_role ? diagnosis.jd_role : '职位诊断'}
            {diagnosis.jd_company && (
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  color: 'var(--color-ink-3)',
                  marginLeft: '10px',
                }}
              >
                · {diagnosis.jd_company}
              </span>
            )}
          </h1>

          {/* Resume & company meta */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {diagnosis.resume && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  color: 'var(--color-ink-3)',
                }}
              >
                <FileText size={13} color="var(--color-ink-4)" />
                {diagnosis.resume.title}
              </div>
            )}
            {diagnosis.jd_company && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  color: 'var(--color-ink-3)',
                }}
              >
                <Building2 size={13} color="var(--color-ink-4)" />
                {diagnosis.jd_company}
              </div>
            )}
          </div>
        </div>

        {/* New diagnosis CTA */}
        <div style={{ flexShrink: 0 }}>
          <a
            href="/diagnoses/new"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-line-2)',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-ink-2)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={14} />
            新建诊断
          </a>
        </div>
      </div>

      {/* Content sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Dimension bars */}
        <SectionCard title="维度得分">
          <DimensionBars dimensions={diagnosis.dimensions} />
        </SectionCard>

        {/* Keywords */}
        <SectionCard title="关键词分析">
          <KeywordCloud
            hit={diagnosis.keywords_hit}
            miss={diagnosis.keywords_miss}
          />
        </SectionCard>

        {/* Suggestions */}
        {diagnosis.suggestions.length > 0 && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <h2
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--color-ink-3)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  margin: 0,
                }}
              >
                优化建议 ({diagnosis.suggestions.length})
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {diagnosis.suggestions.map((suggestion, i) => (
                <SuggestionCard
                  key={i}
                  suggestion={suggestion}
                  resumeId={diagnosis.resume_id}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

        {/* No suggestions fallback */}
        {diagnosis.suggestions.length === 0 && (
          <div
            style={{
              padding: '32px 24px',
              textAlign: 'center',
              background: 'var(--color-success-soft)',
              border: '1px solid rgba(52, 199, 89, 0.2)',
              borderRadius: '14px',
            }}
          >
            <p
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--color-success)',
                marginBottom: '4px',
              }}
            >
              简历与 JD 高度匹配
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-3)', margin: 0 }}>
              暂无需要优化的建议，可直接投递
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
