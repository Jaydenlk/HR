'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Diagnosis } from '@/lib/types';
import { ArrowLeft, Building2, Calendar, Briefcase } from 'lucide-react';
import { getScoreColor } from '@/lib/score-utils';

function LoadingState() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 32px' }}>
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
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const { color, bg } = getScoreColor(score);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderRadius: '8px',
        fontSize: '20px',
        fontWeight: 700,
        color,
        background: bg,
      }}
    >
      {score}分
    </span>
  );
}

function DimensionRow({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  const { color } = getScoreColor(pct);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '80px', fontSize: '12.5px', color: 'var(--color-ink-3)', flexShrink: 0 }}>
        {label}
      </div>
      <div
        style={{
          flex: 1,
          height: '6px',
          background: 'var(--color-surface-3)',
          borderRadius: '99px',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '99px' }} />
      </div>
      <div
        style={{
          width: '36px',
          textAlign: 'right',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--color-ink-2)',
          flexShrink: 0,
        }}
      >
        {score}/{max}
      </div>
    </div>
  );
}

export function DiagnosisDetailClient({ params }: { params: Promise<{ id: string }> }) {
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

  if (loading) return <LoadingState />;

  if (error || !diagnosis) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 32px' }}>
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

  const dim = diagnosis.dimensions;

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 32px' }}>
      {/* Back */}
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
          }}
        >
          <ArrowLeft size={15} />
          返回简历
        </Link>
      )}

      {/* Header */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: '16px',
          border: '1px solid var(--color-line)',
          padding: '28px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '28px',
        }}
      >
        <ScoreBadge score={diagnosis.score} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.3px',
              marginBottom: '10px',
            }}
          >
            {diagnosis.jd_role ?? '职位匹配诊断'}
          </h1>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {diagnosis.jd_company && (
              <span
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--color-ink-3)' }}
              >
                <Building2 size={13} />
                {diagnosis.jd_company}
              </span>
            )}
            <span
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--color-ink-3)' }}
            >
              <Calendar size={13} />
              {date}
            </span>
          </div>
        </div>
      </div>

      {/* Dimensions */}
      {dim && (
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: '14px',
            border: '1px solid var(--color-line)',
            padding: '24px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '4px' }}>
            各维度得分
          </div>
          <DimensionRow label="技能匹配" score={dim.skills.score} max={dim.skills.max} />
          <DimensionRow label="工作经验" score={dim.experience.score} max={dim.experience.max} />
          <DimensionRow label="学历背景" score={dim.education.score} max={dim.education.max} />
          <DimensionRow label="关键词" score={dim.keywords.score} max={dim.keywords.max} />
          <DimensionRow label="综合" score={dim.overall.score} max={dim.overall.max} />
        </div>
      )}

      {/* Keywords hit/miss */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            background: 'var(--color-success-soft)',
            borderRadius: '14px',
            border: '1px solid var(--color-success)',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-success)', marginBottom: '10px' }}>
            命中关键词 ({diagnosis.keywords_hit.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {diagnosis.keywords_hit.slice(0, 12).map((k) => (
              <span
                key={k}
                style={{
                  padding: '3px 8px',
                  background: 'var(--color-success)',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                {k}
              </span>
            ))}
          </div>
        </div>
        <div
          style={{
            background: 'var(--color-danger-soft)',
            borderRadius: '14px',
            border: '1px solid var(--color-danger)',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-danger)', marginBottom: '10px' }}>
            缺失关键词 ({diagnosis.keywords_miss.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {diagnosis.keywords_miss.slice(0, 12).map((k) => (
              <span
                key={k}
                style={{
                  padding: '3px 8px',
                  background: 'var(--color-danger)',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {diagnosis.suggestions.length > 0 && (
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: '14px',
            border: '1px solid var(--color-line)',
            padding: '24px',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '16px' }}>
            改进建议 ({diagnosis.suggestions.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {diagnosis.suggestions.map((s, i) => (
              <div
                key={i}
                style={{
                  padding: '16px',
                  background: 'var(--color-surface-2)',
                  borderRadius: '10px',
                  border: '1px solid var(--color-line)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background:
                        s.priority === 'high'
                          ? 'var(--color-danger)'
                          : s.priority === 'medium'
                            ? 'var(--color-warn)'
                            : 'var(--color-ink-4)',
                      color: '#fff',
                    }}
                  >
                    {s.priority === 'high' ? '高优先' : s.priority === 'medium' ? '中优先' : '低优先'}
                  </span>
                  <span style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', fontWeight: 500 }}>
                    {s.section}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-ink-2)', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600 }}>原文：</span>
                  {s.original}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-ink)', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-brand)' }}>建议：</span>
                  {s.suggested}
                </div>
                {s.reason && (
                  <div style={{ fontSize: '12px', color: 'var(--color-ink-4)' }}>{s.reason}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall analysis */}
      {dim?.overall.analysis && (
        <div
          style={{
            marginTop: '20px',
            background: 'var(--color-brand-soft)',
            borderRadius: '14px',
            border: '1px solid var(--color-brand)',
            padding: '20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Briefcase size={15} color="var(--color-brand)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-brand-ink)' }}>综合分析</span>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--color-ink-2)', lineHeight: 1.6, margin: 0 }}>
            {dim.overall.analysis}
          </p>
        </div>
      )}
    </div>
  );
}
