'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Interview } from '@/lib/types';
import { InterviewCard } from '@/components/interview/interview-card';
import { InterviewForm } from '@/components/interview/interview-form';
import { Plus, Mic, Zap } from 'lucide-react';

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
      className="lg"
      style={{
        borderRadius: 'var(--radius-default)',
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

function CaptureBanner({
  onUpload,
  uploadBusy,
}: {
  onUpload: () => void;
  uploadBusy: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '14px 20px',
        background: 'rgba(47,143,255,.05)',
        border: '1.5px dashed var(--hair-2)',
        borderRadius: 'var(--radius-default)',
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
            趁记忆新鲜把录音传上来，自动转文字 + 逐题复盘 · 成功才扣 7 点
          </div>
        </div>
      </div>
      <button
        onClick={onUpload}
        disabled={uploadBusy}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '9px 16px',
          background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-default)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: uploadBusy ? 'not-allowed' : 'pointer',
          opacity: uploadBusy ? 0.7 : 1,
          letterSpacing: '-0.005em',
          flexShrink: 0,
          boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
        }}
      >
        <Mic size={14} />
        {uploadBusy ? '准备中…' : '上传面试录音'}
        <span
          style={{
            position: 'absolute',
            top: '-7px',
            right: '-7px',
            padding: '1px 6px',
            borderRadius: '999px',
            background: 'rgba(255,111,0,.9)',
            fontSize: '9.5px',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '0.03em',
            lineHeight: 1.5,
          }}
        >
          Beta
        </span>
      </button>
    </div>
  );
}

// ── 上传录音主按钮(品牌渐变 + Mic + Beta + 「成功才扣 7 点」副字)──────────────
// 列表页常驻主入口:点击先建空白 interview 容器,跳详情页 ?upload=1 自动弹上传框。

function UploadRecordingButton({
  onUpload,
  busy,
}: {
  onUpload: () => void;
  busy: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <button
        onClick={onUpload}
        disabled={busy}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '10px 18px',
          background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-default)',
          fontSize: '13.5px',
          fontWeight: 600,
          cursor: busy ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.7 : 1,
          letterSpacing: '-0.005em',
          flexShrink: 0,
          boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
        }}
      >
        <Mic size={15} />
        {busy ? '准备中…' : '上传面试录音'}
        <span
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            padding: '1px 6px',
            borderRadius: '999px',
            background: 'rgba(255,111,0,.9)',
            fontSize: '10px',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '0.03em',
            lineHeight: 1.5,
          }}
        >
          Beta
        </span>
      </button>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          color: 'var(--color-ink-4)',
          fontWeight: 500,
        }}
      >
        <Zap size={10} />
        自动转文字 + 逐题复盘 · 成功才扣 7 点
      </span>
    </div>
  );
}

function EmptyState({ onNew, onUpload, uploadBusy }: { onNew: () => void; onUpload: () => void; uploadBusy: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '72px 32px',
        textAlign: 'center',
        gap: '18px',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(47,143,255,.05)',
          border: '1px solid var(--hair)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Mic size={28} color="var(--color-brand)" />
      </div>
      <div style={{ maxWidth: '440px' }}>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            letterSpacing: '-0.01em',
            marginBottom: '8px',
          }}
        >
          把面试录音变成复盘
        </div>
        <div style={{ fontSize: '13.5px', color: 'var(--color-ink-3)', fontWeight: 500, lineHeight: 1.7 }}>
          面完了别让记忆溜走。把录音传上来，我帮你把对话转成文字，再逐题告诉你哪答得好、哪可以更好。
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onUpload}
          disabled={uploadBusy}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '11px 24px',
            background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-default)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: uploadBusy ? 'not-allowed' : 'pointer',
            opacity: uploadBusy ? 0.7 : 1,
            letterSpacing: '-0.005em',
            boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
          }}
        >
          <Mic size={16} />
          {uploadBusy ? '准备中…' : '上传第一段面试录音'}
          <span
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              padding: '1px 6px',
              borderRadius: '999px',
              background: 'rgba(255,111,0,.9)',
              fontSize: '10px',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.03em',
              lineHeight: 1.5,
            }}
          >
            Beta
          </span>
        </button>
        <button
          onClick={onNew}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 8px',
            background: 'transparent',
            color: 'var(--color-ink-3)',
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <Plus size={13} />
          或手动录入面试（粘贴文字记录）
        </button>
      </div>
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
  // useSearchParams 需 Suspense 边界(Next.js App Router 约定,对齐 mock/page.tsx)。
  return (
    <Suspense fallback={null}>
      <DebriefListInner />
    </Suspense>
  );
}

function DebriefListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  // 「上传面试录音」主入口:点击先建空白 interview 容器再跳详情页弹上传框。
  // creatingContainer 兼作防抖标记,避免重复点击建出多个空草稿(每次建容器扣 1 点)。
  const [creatingContainer, setCreatingContainer] = useState(false);
  const handledUploadParam = useRef(false);

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

  // 「上传面试录音」主路径:建一个最小空白 interview 容器(round 给中性默认值,
  // 避免 round 必填校验 400),拿到 id 后跳详情页 ?upload=1,详情页自动弹上传框。
  // 计费提示:POST /interviews 会扣 1 点(草稿),转写成功再扣 7 点;故做 loading 防抖防重复建容器。
  async function startUploadFlow() {
    if (creatingContainer) return;
    setCreatingContainer(true);
    try {
      const created = await api.post<Interview>('/interviews', { round: '面试' });
      router.push(`/debrief/${created.id}?upload=1`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败，请重试');
      setCreatingContainer(false);
    }
    // 成功时不复位 creatingContainer:页面即将跳走,保持禁用态防二次点击。
  }

  // 发现卡 /debrief?upload=1 直达:列表页加载后检测到该参数即走同一「建空白→跳详情?upload=1」流程,
  // 对用户表现为一键弹上传框。用 ref 保证只触发一次,避免 re-render 重复建容器。
  useEffect(() => {
    if (handledUploadParam.current) return;
    if (loading) return;
    if (searchParams.get('upload') === '1') {
      handledUploadParam.current = true;
      // Defer 避免 set-state-in-effect 同步 cascade(对齐 mock/page.tsx 既有写法)。
      setTimeout(() => { void startUploadFlow(); }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searchParams]);

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
              fontFamily: 'var(--serif)',
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
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flexShrink: 0 }}>
          {/* 常驻主入口:上传面试录音(无论有无历史记录都在)。 */}
          <UploadRecordingButton onUpload={startUploadFlow} busy={creatingContainer} />
          {/* 次级入口:手动录入(粘贴文字记录)。 */}
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '10px 16px',
              background: 'transparent',
              color: 'var(--color-ink-2)',
              border: '1.5px solid var(--color-line)',
              borderRadius: 'var(--radius-default)',
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
                borderRadius: 'var(--radius-default)',
                background: 'rgba(47,143,255,.05)',
                border: '1px solid var(--hair)',
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
        <EmptyState
          onNew={() => setShowForm(true)}
          onUpload={startUploadFlow}
          uploadBusy={creatingContainer}
        />
      )}

      {/* Capture banner + filter + grid */}
      {!loading && !error && interviews.length > 0 && (
        <>
          <CaptureBanner onUpload={startUploadFlow} uploadBusy={creatingContainer} />

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid',
                  borderColor: filter === key ? 'var(--color-brand)' : 'var(--hair)',
                  background: filter === key ? 'var(--color-brand-soft)' : 'rgba(47,143,255,.05)',
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
              className="lg"
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                color: 'var(--color-ink-4)',
                fontSize: '13.5px',
                borderRadius: 'var(--radius-default)',
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
