'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import type { Diagnosis } from '@/lib/types';
import { ScoreRing } from '@/components/diagnosis/score-ring';
import { DimensionBars } from '@/components/diagnosis/dimension-bars';
import { KeywordCloud } from '@/components/diagnosis/keyword-cloud';
import { SuggestionCard } from '@/components/diagnosis/suggestion-card';

export default function DiagnosisDetailPage({ params }: { params: { id: string } }) {
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Diagnosis>(`/diagnoses/${params.id}`)
      .then(setDiagnosis)
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-ink-3)', fontSize: '14px' }}>
        加载中…
      </div>
    );
  }

  if (error || !diagnosis) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
        <p style={{ color: 'var(--color-danger)', fontSize: '14px' }}>{error ?? '诊断记录不存在'}</p>
        <a href="/resumes" style={{ color: 'var(--color-brand)', fontSize: '13px', textDecoration: 'none' }}>返回简历库</a>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <a href="/resumes" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-ink-3)', fontSize: '13px', textDecoration: 'none', marginBottom: '16px' }}>
          <ArrowLeft size={14} />
          返回
        </a>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.3px', margin: 0 }}>
              {diagnosis.jd_company ?? '未知公司'} · {diagnosis.jd_role ?? '未知岗位'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '13px', color: 'var(--color-ink-3)' }}>
              <FileText size={14} />
              <span>{diagnosis.resume?.title ?? '简历'}</span>
              <span>·</span>
              <span>{new Date(diagnosis.created_at).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
          <ScoreRing score={diagnosis.score} size={100} />
        </div>
      </div>

      {/* Dimensions */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px' }}>能力维度</h2>
        <DimensionBars dimensions={diagnosis.dimensions} />
      </div>

      {/* Keywords */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px' }}>关键词匹配</h2>
        <KeywordCloud hit={diagnosis.keywords_hit} miss={diagnosis.keywords_miss} />
      </div>

      {/* Suggestions */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px' }}>改写建议</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {diagnosis.suggestions.map((s, i) => (
            <SuggestionCard key={i} suggestion={s} />
          ))}
        </div>
        {diagnosis.suggestions.length === 0 && (
          <p style={{ color: 'var(--color-ink-3)', fontSize: '14px' }}>暂无改写建议</p>
        )}
      </div>
    </div>
  );
}
