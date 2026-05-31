'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type {
  Diagnosis,
  ProfessionStandardDiagnosis,
  Conversation,
  ProfessionStandardResult,
  ProfessionStandardDimension,
  ConventionCheck,
} from '@/lib/types';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Briefcase,
  MessageSquare,
  PlusCircle,
  GraduationCap,
  Check,
  AlertTriangle,
  X,
  Gauge,
} from 'lucide-react';
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

// ── 职业标尺模式专用组件 ──────────────────────────────────────────

// 单个能力维度卡片:维度名 + 得分条 + why(必显) + 命中证据(弱化) + 缺口
function ProfessionDimensionCard({ dim }: { dim: ProfessionStandardDimension }) {
  const pct = dim.max > 0 ? Math.round((dim.score / dim.max) * 100) : 0;
  const { color } = getScoreColor(pct);
  return (
    <div
      style={{
        padding: '18px',
        background: 'var(--color-surface-2)',
        borderRadius: '12px',
        border: '1px solid var(--color-line)',
      }}
    >
      {/* 维度名 + 分数 + 进度条 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)', flexShrink: 0 }}>
          {dim.name}
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
            fontFamily: 'var(--font-mono)',
            fontSize: '12.5px',
            fontWeight: 600,
            color: 'var(--color-ink-2)',
            flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
          }}
          aria-label={`${dim.name}得分 ${dim.score} 分，满分 ${dim.max} 分`}
        >
          {dim.score}/{dim.max}
        </div>
      </div>

      {/* why — 必显(信任铁律) */}
      <p style={{ fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.6, margin: '0 0 10px' }}>
        {dim.why}
      </p>

      {/* 命中证据 — 弱化呈现 */}
      {dim.evidenceFound.length > 0 && (
        <div style={{ marginBottom: dim.gap ? '10px' : 0 }}>
          <div
            style={{
              fontSize: '11.5px',
              fontWeight: 600,
              color: 'var(--color-ink-4)',
              marginBottom: '6px',
            }}
          >
            命中证据
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {dim.evidenceFound.map((ev, i) => (
              <span
                key={i}
                style={{
                  padding: '3px 8px',
                  background: 'var(--color-surface-3)',
                  color: 'var(--color-ink-3)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                {ev}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* gap — 缺口 + 如何补 */}
      {dim.gap && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 12px',
            background: 'var(--color-warn-soft)',
            borderRadius: '8px',
          }}
        >
          <AlertTriangle size={14} color="var(--color-warn)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.55 }}>
            <span style={{ fontWeight: 600, color: 'var(--color-warn)' }}>待补强：</span>
            {dim.gap}
          </div>
        </div>
      )}
    </div>
  );
}

// 本土核查行:status 用 图标 + 文字 + 颜色 三者表达(不只靠颜色)
function ConventionCheckRow({ check }: { check: ConventionCheck }) {
  const config =
    check.status === 'ok'
      ? { icon: <Check size={15} />, color: 'var(--color-success)', bg: 'var(--color-success-soft)', label: '符合' }
      : check.status === 'warn'
        ? { icon: <AlertTriangle size={15} />, color: 'var(--color-warn)', bg: 'var(--color-warn-soft)', label: '注意' }
        : { icon: <X size={15} />, color: 'var(--color-ink-3)', bg: 'var(--color-surface-3)', label: '缺失' };
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <span
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          borderRadius: '6px',
          background: config.bg,
          color: config.color,
          flexShrink: 0,
        }}
      >
        {config.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: config.color, marginRight: '8px' }}>
          {config.label}
        </span>
        <span style={{ fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.55 }}>{check.note}</span>
      </div>
    </div>
  );
}

// 改写建议卡片(jd_match 与 profession_standard 共用)
function SuggestionCard({
  suggestion,
}: {
  suggestion: Diagnosis['suggestions'][number];
}) {
  const s = suggestion;
  const isGap = s.type === 'gap_advice'; // 建议补充类:非现成简历句,警示样式且不可直接粘贴
  return (
    <div
      style={{
        padding: '16px',
        background: isGap ? 'var(--color-warn-soft)' : 'var(--color-surface-2)',
        borderRadius: '10px',
        border: isGap ? '1px solid var(--color-warn)' : '1px solid var(--color-line)',
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
        <span style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', fontWeight: 500 }}>{s.section}</span>
      </div>
      {s.original && (
        <div style={{ fontSize: '13px', color: 'var(--color-ink-2)', marginBottom: '6px' }}>
          <span style={{ fontWeight: 600 }}>原文：</span>
          {s.original}
        </div>
      )}
      <div style={{ fontSize: '13px', color: 'var(--color-ink)', marginBottom: '6px' }}>
        <span style={{ fontWeight: 600, color: isGap ? 'var(--color-warn)' : 'var(--color-brand)' }}>
          {isGap ? '⚠️ 建议补充（勿直接粘贴，需真实具备后再写入）：' : '建议：'}
        </span>
        {s.suggested}
      </div>
      {s.reason && <div style={{ fontSize: '12px', color: 'var(--color-ink-4)' }}>{s.reason}</div>}
    </div>
  );
}

// 职业标尺模式结果页主体
function ProfessionStandardView({
  diagnosis,
  result,
  date,
  onAskCoach,
  chatLoading,
}: {
  diagnosis: ProfessionStandardDiagnosis;
  result: ProfessionStandardResult;
  date: string;
  onAskCoach: () => void;
  chatLoading: boolean;
}) {
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

      {/* L0 概览:职业镜头 + 总分 */}
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
          flexWrap: 'wrap',
        }}
      >
        <ScoreBadge score={result.total_score} />
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '10px',
              flexWrap: 'wrap',
            }}
          >
            <GraduationCap size={18} color="var(--color-brand)" />
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--color-ink)',
                letterSpacing: '-0.3px',
                margin: 0,
              }}
            >
              {diagnosis.profession ?? '职业标尺'} · 校招
            </h1>
            {/* 难度档标识:凭后端持久化的 tier 字段判定,非 preset_id 字符串硬匹配 */}
            {diagnosis.tier === 'pressure' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--color-warn)',
                  background: 'var(--color-warn-soft)',
                  border: '1px solid var(--color-warn)',
                }}
              >
                <Gauge size={12} aria-hidden="true" />
                压力版 · 高标准
              </span>
            )}
          </div>
          <span
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--color-ink-3)' }}
          >
            <Calendar size={13} />
            {date}
          </span>
        </div>
        <button
          onClick={onAskCoach}
          disabled={chatLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            minHeight: '44px',
            padding: '9px 16px',
            background: 'var(--color-brand)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontWeight: 600,
            cursor: chatLoading ? 'not-allowed' : 'pointer',
            opacity: chatLoading ? 0.7 : 1,
            letterSpacing: '-0.005em',
            transition: 'opacity 0.12s',
            flexShrink: 0,
          }}
        >
          <MessageSquare size={14} />
          {chatLoading ? '跳转中…' : '问 Coach'}
        </button>
      </div>

      {/* L1 细节:各维度(score/max + why + 证据 + 缺口) */}
      {result.dimensions.length > 0 && (
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: '14px',
            border: '1px solid var(--color-line)',
            padding: '24px',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 16px' }}>
            各维度评估（{result.dimensions.length}）
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {result.dimensions.map((dim) => (
              <ProfessionDimensionCard key={dim.key} dim={dim} />
            ))}
          </div>
        </div>
      )}

      {/* 本土核查 */}
      {result.conventionChecks.length > 0 && (
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: '14px',
            border: '1px solid var(--color-line)',
            padding: '24px',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 16px' }}>
            本土简历核查
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {result.conventionChecks.map((check) => (
              <ConventionCheckRow key={check.key} check={check} />
            ))}
          </div>
        </div>
      )}

      {/* 改写示范 */}
      {diagnosis.suggestions.length > 0 && (
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: '14px',
            border: '1px solid var(--color-line)',
            padding: '24px',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 16px' }}>
            改写示范（{diagnosis.suggestions.length}）
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {diagnosis.suggestions.map((s, i) => (
              <SuggestionCard key={i} suggestion={s} />
            ))}
          </div>
        </div>
      )}

      {/* 面试追问预演 */}
      {result.interviewHooks && result.interviewHooks.length > 0 && (
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: '14px',
            border: '1px solid var(--color-line)',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 4px' }}>
            面试追问预演（{result.interviewHooks.length}）
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--color-ink-3)', margin: '0 0 16px' }}>
            面试官大概率会就以下薄弱点追问，提前准备
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {result.interviewHooks.map((hook, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--color-brand-soft)',
                  borderRadius: '10px',
                  border: '1px solid var(--color-line)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-ink-2)', letterSpacing: '0.02em' }}>
                    简历命中点
                  </span>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-ink)' }}>
                    {hook.resumeHit}
                  </p>
                </div>
                <div style={{ height: '1px', background: 'var(--color-line)' }} />
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-ink-2)', letterSpacing: '0.02em' }}>
                    面试官很可能追问
                  </span>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-ink)', fontWeight: 600 }}>
                    {hook.interviewQuestion}
                  </p>
                </div>
                <div style={{ height: '1px', background: 'var(--color-line)' }} />
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-ink-2)', letterSpacing: '0.02em' }}>
                    建议准备方向
                  </span>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-ink-3)' }}>
                    {hook.prepDirection}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DiagnosisDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyDone, setApplyDone] = useState(false);

  async function handleCreateApplication() {
    if (!diagnosis) return;
    setApplyLoading(true);
    try {
      await api.post('/applications', {
        company: diagnosis.jd_company ?? '',
        role: diagnosis.jd_role ?? '',
        stage: 'wishlist',
        diagnosis_id: diagnosis.id,
      });
      setApplyDone(true);
      // Brief feedback then redirect
      setTimeout(() => {
        window.location.href = '/applications';
      }, 1200);
    } catch {
      setApplyLoading(false);
      alert('创建投递失败，请重试');
    }
  }

  async function handleAskCoach() {
    if (!diagnosis) return;
    setChatLoading(true);
    try {
      const conversation = await api.post<Conversation>('/conversations', {
        context_type: 'diagnosis',
        context_id: id,
        title: '诊断: ' + (diagnosis.jd_role || '简历诊断'),
      });
      window.location.href = '/chat/' + conversation.id;
    } catch {
      setChatLoading(false);
    }
  }

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

  // 职业标尺模式:走独立渲染分支(L0 概览 + L1 维度 + 本土核查 + 改写示范)
  if (diagnosis.mode === 'profession_standard') {
    return (
      <ProfessionStandardView
        diagnosis={diagnosis}
        result={diagnosis.dimensions}
        date={date}
        onAskCoach={handleAskCoach}
        chatLoading={chatLoading}
      />
    );
  }

  // 以下为 JD 匹配模式(jd_match)原有渲染,保持不变。
  // TS 按 mode 收窄后 dimensions 为 MatchDimensions | undefined。
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
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={handleCreateApplication}
            disabled={applyLoading || applyDone}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              background: applyDone ? 'var(--color-success)' : 'var(--color-surface-2)',
              color: applyDone ? '#fff' : 'var(--color-ink-2)',
              border: '1px solid var(--color-line)',
              borderRadius: '10px',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: applyLoading || applyDone ? 'not-allowed' : 'pointer',
              opacity: applyLoading ? 0.7 : 1,
              letterSpacing: '-0.005em',
              transition: 'background 0.15s, color 0.15s, opacity 0.12s',
            }}
          >
            <PlusCircle size={14} />
            {applyDone ? '已添加到投递追踪' : applyLoading ? '创建中…' : '创建投递'}
          </button>
          <button
            onClick={handleAskCoach}
            disabled={chatLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              background: 'var(--color-brand)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: chatLoading ? 'not-allowed' : 'pointer',
              opacity: chatLoading ? 0.7 : 1,
              letterSpacing: '-0.005em',
              transition: 'opacity 0.12s',
            }}
          >
            <MessageSquare size={14} />
            {chatLoading ? '跳转中…' : '问 Coach'}
          </button>
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
