'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Interview } from '@/lib/types';
import { ScoreRadar } from '@/components/interview/score-radar';
import { QuestionCard } from '@/components/interview/question-card';
import { PredictionCard } from '@/components/interview/prediction-card';
import { ArrowLeft, Calendar, Clock, User, Sparkles, RefreshCw } from 'lucide-react';

function gradeColors(grade: string | null): { bg: string; text: string } {
  if (!grade) return { bg: 'var(--color-ink-4)', text: '#fff' };
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return { bg: 'var(--color-success)', text: '#fff' };
  if (g.startsWith('B')) return { bg: 'var(--color-ink)', text: '#fff' };
  if (g.startsWith('C')) return { bg: 'var(--color-warn)', text: '#fff' };
  return { bg: 'var(--color-danger)', text: '#fff' };
}

function LoadingState() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[80, 160, 200, 160, 240].map((h, i) => (
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

interface DebriefDetailProps {
  params: Promise<{ id: string }>;
}

export function DebriefDetail({ params }: DebriefDetailProps) {
  const { id } = use(params);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    api
      .get<Interview>(`/interviews/${id}`)
      .then((data) => {
        setInterview(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败');
        setLoading(false);
      });
  }, [id]);

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const updated = await api.post<Interview>(`/interviews/${id}/analyze`, {});
      setInterview(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : '分析失败，请重试');
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) return <LoadingState />;

  if (error || !interview) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 32px' }}>
        <Link
          href="/debrief"
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
          返回复盘列表
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
          {error ?? '面试记录不存在'}
        </div>
      </div>
    );
  }

  const iv = interview;
  const { bg: gradeBg, text: gradeText } = gradeColors(iv.overall_grade);
  const hasAnalysis = iv.scores && iv.scores.length > 0;

  const dateStr = iv.interview_at
    ? new Date(iv.interview_at).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date(iv.created_at).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 32px' }}>
      {/* Back */}
      <Link
        href="/debrief"
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
        返回复盘列表
      </Link>

      {/* Header card */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: '16px',
          border: '1px solid var(--color-line)',
          padding: '24px 28px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '24px',
        }}
      >
        {/* Grade block */}
        <div
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '20px',
            background: gradeBg,
            color: gradeText,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>
            {iv.overall_grade ?? '?'}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              opacity: 0.7,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginTop: '4px',
            }}
          >
            综合
          </span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.02em',
              margin: 0,
              marginBottom: '8px',
            }}
          >
            {iv.company ?? '未知公司'}
            {iv.role && (
              <span style={{ color: 'var(--color-ink-3)', fontWeight: 600 }}>
                {' · '}{iv.role}
              </span>
            )}
          </h1>

          {/* Meta row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            {/* Round badge */}
            <span
              style={{
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                background: 'var(--color-ink)',
                color: '#fff',
              }}
            >
              {iv.round}
            </span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12.5px',
                color: 'var(--color-ink-3)',
              }}
            >
              <Calendar size={12} />
              {dateStr}
            </span>
            {iv.duration_min && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12.5px',
                  color: 'var(--color-ink-3)',
                }}
              >
                <Clock size={12} />
                {iv.duration_min} 分钟
              </span>
            )}
            {iv.interviewer && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12.5px',
                  color: 'var(--color-ink-3)',
                }}
              >
                <User size={12} />
                {iv.interviewer}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* AI overall note */}
      {iv.overall_note && (
        <div
          style={{
            background: 'var(--color-brand-soft)',
            borderRadius: '14px',
            border: '1px solid var(--color-brand)',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <Sparkles size={15} color="var(--color-brand)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p
            style={{
              fontSize: '13.5px',
              color: 'var(--color-ink-2)',
              lineHeight: 1.6,
              margin: 0,
              fontWeight: 500,
            }}
          >
            {iv.overall_note}
          </p>
        </div>
      )}

      {/* No analysis state */}
      {!hasAnalysis && (
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: '14px',
            border: '1px solid var(--color-line)',
            padding: '40px',
            textAlign: 'center',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--color-ink-2)',
              marginBottom: '8px',
            }}
          >
            提交面试记录后，AI 将自动生成复盘分析
          </div>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--color-ink-3)',
              marginBottom: '20px',
            }}
          >
            包含能力维度评分、逐题点评、以及下一轮预测
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '10px 22px',
              background: 'var(--color-brand)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: analyzing ? 'not-allowed' : 'pointer',
              opacity: analyzing ? 0.7 : 1,
              letterSpacing: '-0.005em',
            }}
          >
            <RefreshCw size={14} />
            {analyzing ? '分析中…' : '手动分析'}
          </button>
        </div>
      )}

      {/* Score bars */}
      {iv.scores && iv.scores.length > 0 && (
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: '14px',
            border: '1px solid var(--color-line)',
            padding: '22px 24px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
              能力分布 · {iv.scores.length} 个维度
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-ink-3)', fontWeight: 500 }}>
              基于转写 + 题库对比
            </div>
          </div>
          <ScoreRadar scores={iv.scores} />
        </div>
      )}

      {/* Questions */}
      {iv.questions && iv.questions.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '14px',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
              逐题复盘 · {iv.questions.length} 道
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-ink-3)', fontWeight: 500 }}>
              {iv.questions.filter((q) => q.tone === 'good').length} 亮点 ·{' '}
              {iv.questions.filter((q) => q.tone === 'warn').length} 可改 ·{' '}
              {iv.questions.filter((q) => q.tone === 'bad').length} 盲点
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {iv.questions.map((q, i) => (
              <QuestionCard key={q.n} question={q} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Prediction */}
      {iv.prediction && <PredictionCard prediction={iv.prediction} />}
    </div>
  );
}
