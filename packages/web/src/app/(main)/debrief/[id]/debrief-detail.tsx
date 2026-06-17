'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Interview, LabeledSegment, TranscribeStatusResponse } from '@/lib/types';
import { ScoreRadar } from '@/components/interview/score-radar';
import { QuestionCard } from '@/components/interview/question-card';
import { PredictionCard } from '@/components/interview/prediction-card';
import { AudioUploader } from '@/components/interview/audio-uploader';
import { TranscriptProgress } from '@/components/interview/transcript-progress';
import { useTranscribeStatusPolling } from '@/components/interview/use-transcribe-status-polling';
import { SpeakerLabelSection } from '@/components/interview/speaker-label-section';
import { ArrowLeft, Calendar, Clock, User, Sparkles, RefreshCw, Mic, Zap, Info, Trash2, AlertTriangle } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

function gradeColors(grade: string | null): { bg: string; text: string } {
  if (!grade) return { bg: 'var(--color-ink-4)', text: '#fff' };
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return { bg: 'var(--color-success)', text: '#fff' };
  if (g.startsWith('B')) return { bg: 'var(--color-brand)', text: '#fff' };
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
              borderRadius: 'var(--radius-default)',
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

interface DebriefDetailProps {
  params: Promise<{ id: string }>;
}

export function DebriefDetail({ params }: DebriefDetailProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  // 复盘记录删除:inline 两态确认(镜像 resume-detail 的删除模式)。
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 录音转写态:taskId 为当前活动任务(轮询中);segments 为待确认标注。
  const [showUploader, setShowUploader] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [transcribeStatus, setTranscribeStatus] = useState<TranscribeStatusResponse | null>(null);
  const [segments, setSegments] = useState<LabeledSegment[] | null>(null);

  useEffect(() => {
    api
      .get<Interview>(`/interviews/${id}`)
      .then((data) => {
        setInterview(data);
        setLoading(false);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : '加载失败';
        // 404 = 记录不存在或无权访问,属确定性结果而非 AI/服务异常,单独走中文兜底。
        if (/(^|\D)404(\D|$)/.test(message)) {
          setNotFound(true);
        } else {
          setError(message);
        }
        setLoading(false);
      });
  }, [id]);

  // 页面级「守望轮询」:从挂载起持续轮询转写状态,使桌面端无需手动刷新即可自动推进
  //   待上传 → 已收到/转写中 → 待确认/完成/失败。
  // 既覆盖「进入页面时已有进行中/待确认任务」(首拍即拿到,避免刷新丢进度),也覆盖
  //   「进入时尚无任务、随后手机扫码上传」(持续轮询直到任务出现)。
  // 所有权交接:一旦发现进行中任务并 setTaskId,本钩子即 enabled=false 停轮询,改由
  //   TranscriptProgress 自身轮询接管(详见下方渲染),避免同一端点被并发重复轮询。
  // 安全阀(在钩子内):连续 404 熔断 + 总墙钟上限,杜绝用户始终不传时的无谓长轮询。
  const handleWatchStatus = useCallback((data: TranscribeStatusResponse) => {
    if (data.status === 'completed') return; // 已完成:走 interview.scores 渲染,不接管轮询。
    setTaskId(data.taskId);
    setTranscribeStatus(data);
    if (data.status === 'awaiting_confirm' && data.segmentsJson) {
      setSegments(data.segmentsJson);
    }
  }, []);
  useTranscribeStatusPolling({
    interviewId: id,
    // 仅在「尚无活动任务」时由页面级守望;一旦 taskId 落定即交接给 TranscriptProgress,防并发重复轮询。
    enabled: !taskId,
    onStatus: handleWatchStatus,
  });

  // ?upload=1 直达:从列表页主入口或首页发现卡跳来时,interview 加载完成后自动弹上传框,
  // 让"点一下就能传录音"对用户透明。仅在无活动转写任务时触发一次,避免打断进行中的转写。
  // 用 ref 保证整个生命周期只自动弹一次:用户关掉后、或转写确认后重拉 interview,都不再被拉起。
  const autoUploadDone = useRef(false);
  useEffect(() => {
    if (autoUploadDone.current) return;
    if (!interview) return;
    if (searchParams.get('upload') !== '1') return;
    if (taskId) return; // 已有进行中/待确认任务:不自动弹,交给进度区。
    autoUploadDone.current = true;
    // Defer 避免 set-state-in-effect 同步 cascade(对齐 mock/page.tsx 既有写法)。
    const t = setTimeout(() => setShowUploader(true), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview, taskId]);

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

  // 上传被后端接受(202):记录 taskId 启动轮询;清空旧标注。
  function handleTranscribeStarted(newTaskId: string) {
    setShowUploader(false);
    setTaskId(newTaskId);
    setTranscribeStatus(null);
    setSegments(null);
  }

  // 每次轮询拿到状态:更新进度;awaiting_confirm 时填充待确认标注。
  function handleStatusUpdate(resp: TranscribeStatusResponse) {
    setTranscribeStatus(resp);
    if (resp.status === 'awaiting_confirm' && resp.segmentsJson) {
      setSegments(resp.segmentsJson);
    }
  }

  // 确认并生成分析成功后:停轮询、清转写态、重拉 interview(此刻 scores 已非空)。
  async function handleConfirmed() {
    setTaskId(null);
    setSegments(null);
    setTranscribeStatus(null);
    try {
      const updated = await api.get<Interview>(`/interviews/${id}`);
      setInterview(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : '刷新失败，请手动刷新页面');
    }
  }

  // 失败态「重新上传」:任务已由 TranscriptProgress 清掉,这里清转写态并重开上传弹层。
  function handleRetryReupload() {
    setTaskId(null);
    setTranscribeStatus(null);
    setSegments(null);
    setShowUploader(true);
  }

  // 失败态「删除记录」:任务已由 TranscriptProgress 清掉,这里回到上传前态。
  function handleDeleteTask() {
    setTaskId(null);
    setTranscribeStatus(null);
    setSegments(null);
  }

  // 删除整条复盘记录(镜像 resume-detail:两态确认 → DELETE → 跳回列表)。
  async function handleDeleteInterview() {
    setDeleting(true);
    try {
      await api.delete(`/interviews/${id}`);
      router.push('/debrief');
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败，请稍后重试');
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  if (loading) return <LoadingState />;

  if (notFound || error || !interview) {
    // notFound:确定性结果(记录不存在/无权访问),非异常,用中性文案。
    // error:真实加载/服务异常,展示后端返回的具体原因,不武断归因 AI。
    const isNotFound = notFound || !error;
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
            background: isNotFound ? 'rgba(47,143,255,.05)' : 'var(--color-danger-soft)',
            border: isNotFound ? '1px solid var(--hair)' : 'none',
            borderRadius: 'var(--radius-default)',
            color: isNotFound ? 'var(--color-ink-3)' : 'var(--color-danger)',
            fontSize: '14px',
          }}
        >
          {isNotFound ? '面试记录不存在，或你没有访问权限。' : error}
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
        className="lg"
        style={{
          borderRadius: 'var(--radius-default)',
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
              fontFamily: 'var(--serif)',
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
                borderRadius: 'var(--radius-pill)',
                fontSize: '12px',
                fontWeight: 600,
                background: 'var(--color-brand-soft)',
                color: 'var(--color-brand-ink)',
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

        {/* Delete debrief record (镜像 resume-detail 的 inline 两态确认)。 */}
        <div style={{ flexShrink: 0 }}>
          {deleteConfirm ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              <span
                style={{
                  fontSize: '12.5px',
                  color: 'var(--color-ink-3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  textAlign: 'right',
                }}
              >
                <AlertTriangle size={13} color="var(--color-warn)" style={{ flexShrink: 0 }} />
                删除此复盘记录？此操作不可撤销。
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '7px',
                    border: '1.5px solid var(--color-line)',
                    background: 'transparent',
                    color: 'var(--color-ink-3)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: deleting ? 'not-allowed' : 'pointer',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={() => void handleDeleteInterview()}
                  disabled={deleting}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '7px',
                    border: 'none',
                    background: 'var(--color-danger)',
                    color: '#fff',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  {deleting ? '删除中…' : '确认删除'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(true)}
              title="删除此复盘记录"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '9px',
                border: '1.5px solid var(--color-line)',
                background: 'transparent',
                color: 'var(--color-ink-3)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-danger)';
                e.currentTarget.style.color = 'var(--color-danger)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-line)';
                e.currentTarget.style.color = 'var(--color-ink-3)';
              }}
            >
              <Trash2 size={14} />
              删除
            </button>
          )}
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

      {/* 已分析也能再传:轻量「重新上传录音」次级入口(放宽原 !hasAnalysis 门控)。
          仅当已有分析且当前无进行中转写任务时显示,换一段录音重跑复盘。 */}
      {hasAnalysis && !taskId && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button
            onClick={() => setShowUploader(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: 'transparent',
              color: 'var(--color-ink-3)',
              border: '1.5px solid var(--color-line)',
              borderRadius: 'var(--radius-default)',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '-0.005em',
            }}
          >
            <Mic size={13} />
            重新上传录音
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--color-ink-4)', fontWeight: 500 }}>
              <Zap size={10} />
              成功才扣 7 点
            </span>
          </button>
        </div>
      )}

      {/* Transcribe progress (active task, not yet awaiting confirm) —
          有进行中任务即显示进度,不再受 !hasAnalysis 限制(支持已分析后重新上传重跑)。 */}
      {taskId && transcribeStatus?.status !== 'awaiting_confirm' && (
        <div style={{ marginBottom: '20px' }}>
          <TranscriptProgress
            interviewId={id}
            taskId={taskId}
            onStatusUpdate={handleStatusUpdate}
            onRetryReupload={handleRetryReupload}
            onDeleteTask={handleDeleteTask}
          />
        </div>
      )}

      {/* Speaker label confirm section (awaiting_confirm with segments) —
          同上,有待确认任务即显示,支持已分析后重新上传重跑。 */}
      {taskId && transcribeStatus?.status === 'awaiting_confirm' && segments && (
        <div style={{ marginBottom: '20px' }}>
          <SpeakerLabelSection
            interviewId={id}
            taskId={taskId}
            segments={segments}
            onConfirmed={handleConfirmed}
          />
        </div>
      )}

      {/* No analysis state — show entry actions only when no active transcribe task */}
      {!hasAnalysis && !taskId && (
        <div
          className="lg"
          style={{
            borderRadius: 'var(--radius-default)',
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
            上传面试录音自动转写，或直接生成复盘分析
          </div>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--color-ink-3)',
              marginBottom: '20px',
            }}
          >
            上传后立即返回——后台自动转写（约 30–120 秒），完成后在此确认角色标注，再生成能力评分与逐题点评
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setShowUploader(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '10px 22px',
                      background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-default)',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      letterSpacing: '-0.005em',
                      boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
                      position: 'relative',
                    }}
                  >
                    <Mic size={14} />
                    上传录音转写
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
                  <Tooltip
                    content="支持 1 对 1 面试录音(MP3/WAV 等)。传上来约 1-2 分钟变成文字。"
                    triggerRender={<span />}
                    side="bottom"
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        color: 'var(--color-ink-4)',
                        cursor: 'help',
                      }}
                      aria-label="上传录音说明"
                    >
                      <Info size={13} />
                    </span>
                  </Tooltip>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>
                  <Zap size={10} />
                  消耗 7 点（成功才扣）
                </span>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '10px 22px',
                  background: 'transparent',
                  color: 'var(--color-ink-2)',
                  border: '1.5px solid var(--color-line)',
                  borderRadius: 'var(--radius-default)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: analyzing ? 'not-allowed' : 'pointer',
                  opacity: analyzing ? 0.7 : 1,
                  letterSpacing: '-0.005em',
                }}
              >
                <RefreshCw size={14} />
                {analyzing ? '分析中…' : '直接分析文字记录'}
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>文字分析各消耗 1 点</span>
          </div>
        </div>
      )}

      {/* Audio uploader modal */}
      <AudioUploader
        interviewId={id}
        open={showUploader}
        onClose={() => setShowUploader(false)}
        onStarted={handleTranscribeStarted}
      />

      {/* Score bars */}
      {iv.scores && iv.scores.length > 0 && (
        <div
          className="lg"
          style={{
            borderRadius: 'var(--radius-default)',
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
            <div style={{ fontFamily: 'var(--serif)', fontSize: '15px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
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
            <div style={{ fontFamily: 'var(--serif)', fontSize: '15px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
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
              <QuestionCard key={i} question={q} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Prediction */}
      {iv.prediction && <PredictionCard prediction={iv.prediction} />}
    </div>
  );
}
