'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type {
  Resume,
  Diagnosis,
  DiagnosisStreamEvent,
  DiagnosisStreamStage,
  DiagnosisAnalysisPayload,
} from '@/lib/types';
import { getScoreColor } from '@/lib/score-utils';
import { JdInput } from '@/components/diagnosis/jd-input';
import {
  useHandoffReception,
  HandoffConfirmDialog,
  ReturnToCoachBanner,
} from '@/components/chat/handoff-reception';
import { FileText, Plus, ChevronRight, Sparkles, Check } from 'lucide-react';

type Step = 'resume' | 'jd' | 'analyzing';

// 真实步骤状态:与校招诊断同一模型,按收到的 step 事件点亮。
type StageStatus = 'pending' | 'active' | 'done';

const STAGE_ORDER: DiagnosisStreamStage[] = ['parsing', 'analyzing', 'suggesting'];

// JD 匹配模式 analysis.payload 即 MatchDimensions(无顶层 total_score,综合分在 overall.score)。
// 用结构守卫从联合类型取综合分供就地展示;非匹配形态返回 null,不做不安全强转。
function matchOverallScore(payload: DiagnosisAnalysisPayload | null): number | null {
  if (
    payload &&
    'overall' in payload &&
    payload.overall &&
    typeof payload.overall.score === 'number'
  ) {
    return payload.overall.score;
  }
  return null;
}

function ProgressDots({ step }: { step: Step }) {
  const steps: Step[] = ['resume', 'jd', 'analyzing'];
  const idx = steps.indexOf(step);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {steps.slice(0, 2).map((s, i) => (
        <div
          key={s}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background:
                i < idx
                  ? 'var(--color-success)'
                  : i === idx
                    ? 'var(--color-brand)'
                    : 'rgba(47,143,255,.05)',
              border: i <= idx ? 'none' : '1px solid var(--hair)',
              color:
                i <= idx ? '#fff' : 'var(--color-ink-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              transition: 'background 0.2s',
            }}
          >
            {i < idx ? '✓' : i + 1}
          </div>
          {i < 1 && (
            <div
              style={{
                width: '32px',
                height: '2px',
                background:
                  i < idx - 1
                    ? 'var(--color-success)'
                    : 'var(--color-line)',
                borderRadius: '1px',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// 真实进度评估屏:步骤按收到的 step 事件点亮(非装饰脉冲);收到 analysis 即就地展示总分。
function AnalyzingScreen({
  stageStatus,
  stageLabels,
  analysis,
}: {
  stageStatus: Record<DiagnosisStreamStage, StageStatus>;
  stageLabels: Record<DiagnosisStreamStage, string>;
  analysis: DiagnosisAnalysisPayload | null;
}) {
  const defaultLabels: Record<DiagnosisStreamStage, string> = {
    parsing: '解析简历与职位描述',
    analyzing: '匹配简历与 JD',
    suggesting: '生成优化建议',
  };
  const overallScore = matchOverallScore(analysis);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        gap: '24px',
        textAlign: 'center',
      }}
    >
      {/* Animated ring */}
      <div style={{ position: 'relative', width: '80px', height: '80px' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid var(--color-line)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: 'var(--color-brand)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '20px',
            borderRadius: '50%',
            background: 'var(--color-brand-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles size={20} color="var(--color-brand)" />
        </div>
      </div>

      <div>
        <h2
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '-0.3px',
            marginBottom: '8px',
          }}
        >
          正在对比简历与 JD
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', margin: 0 }}>
          每完成一步会实时点亮，分数一出立即呈现，请勿关闭页面
        </p>
      </div>

      {/* Progress steps — 真实反映后端三步串行,按 step 事件点亮 */}
      <div
        className="lg"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '20px 28px',
          minWidth: '300px',
        }}
      >
        {STAGE_ORDER.map((stage) => {
          const status = stageStatus[stage];
          const label = stageLabels[stage] || defaultLabels[stage];
          return (
            <div
              key={stage}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13.5px',
                fontWeight: status === 'active' ? 600 : 500,
                color:
                  status === 'pending'
                    ? 'var(--color-ink-4)'
                    : status === 'active'
                      ? 'var(--color-ink)'
                      : 'var(--color-ink-2)',
                transition: 'color 0.2s',
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background:
                    status === 'done'
                      ? 'var(--color-success)'
                      : status === 'active'
                        ? 'var(--color-brand-soft)'
                        : 'rgba(47,143,255,.05)',
                  border:
                    status === 'pending'
                      ? '1.5px solid var(--hair)'
                      : status === 'active'
                        ? '1.5px solid var(--color-brand)'
                        : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 0.2s, border-color 0.2s',
                }}
              >
                {status === 'done' ? (
                  <Check size={11} color="#fff" strokeWidth={3} />
                ) : status === 'active' ? (
                  <div
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: 'var(--color-brand)',
                      animation: 'pulse 1.1s ease-in-out infinite',
                    }}
                  />
                ) : null}
              </div>
              <span>
                {label}
                {status === 'active' && '…'}
              </span>
            </div>
          );
        })}
      </div>

      {/* analysis 到达:就地展示匹配综合分(核心价值前置,建议生成中) */}
      {overallScore !== null && (
        <div
          className="lg"
          style={{
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            textAlign: 'left',
            animation: 'fadeInUp 0.35s ease',
          }}
        >
          {(() => {
            const { color, bg } = getScoreColor(overallScore);
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
                  flexShrink: 0,
                }}
              >
                {overallScore}分
              </span>
            );
          })()}
          <div style={{ fontSize: '13px', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>
            匹配分数已生成，优化建议生成中，稍候即可查看完整报告。
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function NewDiagnosisPage() {
  return (
    <Suspense fallback={null}>
      <NewDiagnosisPageInner />
    </Suspense>
  );
}

function NewDiagnosisPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handoffId = searchParams.get('handoff');
  const { handoffState, handoffData, onAccept, onDismiss } = useHandoffReception(handoffId);
  const [showReturn, setShowReturn] = useState(false);
  const activeHandoffId = handoffId;
  const activeConvId = handoffData?.conversation_id ?? null;

  const [step, setStep] = useState<Step>('resume');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [jdText, setJdText] = useState('');
  const [jdError, setJdError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── 流式诊断进度状态 ──────────────────────────────────────────────────────
  const [stageStatus, setStageStatus] = useState<Record<DiagnosisStreamStage, StageStatus>>({
    parsing: 'pending',
    analyzing: 'pending',
    suggesting: 'pending',
  });
  const [stageLabels, setStageLabels] = useState<Record<DiagnosisStreamStage, string>>({
    parsing: '',
    analyzing: '',
    suggesting: '',
  });
  const [analysisPreview, setAnalysisPreview] = useState<DiagnosisAnalysisPayload | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    api
      .get<Resume[]>('/resumes')
      .then((data) => {
        setResumes(data);
        // Pre-select primary resume
        const primary = data.find((r) => r.is_primary);
        if (primary) setSelectedResumeId(primary.id);
        setLoadingResumes(false);
      })
      .catch(() => {
        setResumeError('加载简历列表失败，请刷新重试');
        setLoadingResumes(false);
      });
  }, []);

  // handoff 接待:accepted 后预填 JD 字段并跳到 jd 步骤
  // Defer via setTimeout 避免 set-state-in-effect 同步 cascade 问题。
  const handoffApplied = useRef(false);
  useEffect(() => {
    if (handoffState === 'accepted' && handoffData && !handoffApplied.current) {
      handoffApplied.current = true;
      const payload = handoffData.payload;
      setTimeout(() => {
        if (payload.jd_text) setJdText(String(payload.jd_text));
        setStep('jd');
      }, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoffState]);

  function handleResumeNext() {
    if (!selectedResumeId) return;
    setStep('jd');
  }

  function goToDiagnosis(id: string) {
    window.dispatchEvent(new Event('coach:credit-refresh'));
    if (activeHandoffId && activeConvId) {
      setShowReturn(true);
    }
    router.push(`/diagnoses/${id}`);
  }

  // 兜底②:流断且没拿到 diagnosisId 时,查最近一条本简历、晚于本次提交的诊断,跳过去。
  async function findRecentDiagnosis(
    resumeId: string,
    submittedAt: number,
  ): Promise<string | null> {
    try {
      const list = await api.get<Diagnosis[]>('/diagnoses');
      const match = list.find(
        (d) =>
          d.resume_id === resumeId &&
          new Date(d.created_at).getTime() >= submittedAt - 10_000,
      );
      return match?.id ?? null;
    } catch {
      return null;
    }
  }

  async function handleSubmit() {
    if (jdText.trim().length < 10) {
      setJdError('职位描述至少需要 10 个字符');
      return;
    }
    if (!selectedResumeId) return;
    setJdError(null);
    setSubmitError(null);
    setStep('analyzing');
    setStageStatus({ parsing: 'pending', analyzing: 'pending', suggesting: 'pending' });
    setStageLabels({ parsing: '', analyzing: '', suggesting: '' });
    setAnalysisPreview(null);
    setQueuePosition(null);

    const resumeId = selectedResumeId;
    const submittedAt = Date.now();
    const controller = new AbortController();
    abortRef.current = controller;

    let knownId: string | null = null;
    let navigated = false;
    let handledError = false;

    function markStageActive(stage: DiagnosisStreamStage, label: string) {
      const idx = STAGE_ORDER.indexOf(stage);
      setStageStatus((prev) => {
        const next = { ...prev };
        STAGE_ORDER.forEach((s, i) => {
          if (i < idx) next[s] = 'done';
          else if (i === idx) next[s] = 'active';
        });
        return next;
      });
      if (label) setStageLabels((prev) => ({ ...prev, [stage]: label }));
    }

    try {
      for await (const evt of api.postStreamRaw<DiagnosisStreamEvent>(
        '/diagnoses/stream',
        { resume_id: resumeId, jd_text: jdText.trim() },
        controller.signal,
      )) {
        if (!mountedRef.current) break;
        if (evt.type === 'queue') {
          setQueuePosition(evt.position);
        } else if (evt.type === 'step') {
          setQueuePosition(null);
          markStageActive(evt.stage, evt.label);
        } else if (evt.type === 'analysis') {
          knownId = evt.diagnosisId;
          setAnalysisPreview(evt.payload);
          setStageStatus((prev) => ({
            ...prev,
            parsing: 'done',
            analyzing: 'done',
            suggesting: prev.suggesting === 'pending' ? 'active' : prev.suggesting,
          }));
        } else if (evt.type === 'done') {
          navigated = true;
          goToDiagnosis(evt.diagnosisId);
        } else if (evt.type === 'error') {
          handledError = true;
          if (knownId) {
            navigated = true;
            goToDiagnosis(knownId);
          } else {
            setSubmitError(evt.message || '创建诊断失败，请重试');
            setStep('jd');
          }
        }
      }

      if (!navigated && !handledError && mountedRef.current) {
        if (knownId) {
          goToDiagnosis(knownId);
        } else {
          const recovered = await findRecentDiagnosis(resumeId, submittedAt);
          if (recovered) {
            goToDiagnosis(recovered);
          } else {
            setSubmitError('诊断连接中断，但结果可能已生成，请到「我的诊断」查看或重试。');
            setStep('jd');
          }
        }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof Error && err.name === 'AbortError') return;
      if (handledError || navigated) return;

      if (knownId) {
        goToDiagnosis(knownId);
        return;
      }
      const recovered = await findRecentDiagnosis(resumeId, submittedAt);
      if (recovered && mountedRef.current) {
        goToDiagnosis(recovered);
        return;
      }
      if (mountedRef.current) {
        setSubmitError(err instanceof Error ? err.message : '创建诊断失败，请重试');
        setStep('jd');
      }
    } finally {
      if (mountedRef.current && !navigated) {
        setQueuePosition(null);
      }
    }
  }

  if (step === 'analyzing') {
    return (
      <>
        {queuePosition !== null && queuePosition > 0 && (
          <div
            style={{
              maxWidth: '520px',
              margin: '24px auto 0',
              padding: '10px 16px',
              borderRadius: 'var(--radius-default)',
              background: 'rgba(47,143,255,.05)',
              border: '1px solid var(--hair)',
              color: 'var(--color-ink-2)',
              fontSize: '13px',
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            当前使用人数较多，正在排队，前面还有 {queuePosition} 个请求…
          </div>
        )}
        <AnalyzingScreen
          stageStatus={stageStatus}
          stageLabels={stageLabels}
          analysis={analysisPreview}
        />
      </>
    );
  }

  return (
    <>
      {handoffState === 'confirming' && handoffData && (
        <HandoffConfirmDialog
          target={handoffData.target}
          payload={handoffData.payload}
          onAccept={() => void onAccept()}
          onDismiss={() => void onDismiss()}
        />
      )}
      {showReturn && activeHandoffId && activeConvId && (
        <ReturnToCoachBanner
          conversationId={activeConvId}
          handoffId={activeHandoffId}
          onClose={() => setShowReturn(false)}
        />
      )}
    <div
      style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '48px 24px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Link
            href="/diagnoses/campus"
            style={{
              fontSize: '13px',
              color: 'var(--color-ink-4)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            诊断
          </Link>
          <ChevronRight size={14} color="var(--color-ink-4)" />
          <span style={{ fontSize: '13px', color: 'var(--color-ink-2)', fontWeight: 500 }}>
            新建诊断
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '26px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '-0.4px',
            marginBottom: '6px',
          }}
        >
          简历 JD 匹配诊断
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', marginBottom: '20px' }}>
          粘贴目标职位的 JD，AI 将分析你的简历匹配度并给出优化建议
        </p>

        <ProgressDots step={step} />
      </div>

      {/* Step 1: Resume selection */}
      {step === 'resume' && (
        <div>
          <h2
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              marginBottom: '16px',
            }}
          >
            第一步：选择诊断简历
          </h2>

          {loadingResumes ? (
            <div
              style={{
                padding: '32px',
                textAlign: 'center',
                color: 'var(--color-ink-4)',
                fontSize: '14px',
              }}
            >
              加载简历中…
            </div>
          ) : resumeError ? (
            <div
              style={{
                padding: '24px',
                background: 'var(--color-danger-soft)',
                borderRadius: '12px',
                color: 'var(--color-danger)',
                fontSize: '14px',
              }}
            >
              {resumeError}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {resumes.length === 0 ? (
                <div
                  style={{
                    padding: '32px 24px',
                    textAlign: 'center',
                    background: 'rgba(47,143,255,.05)',
                    borderRadius: 'var(--radius-default)',
                    border: '1px dashed var(--color-line-2)',
                  }}
                >
                  <FileText
                    size={36}
                    color="var(--color-ink-4)"
                    style={{ margin: '0 auto 12px', display: 'block' }}
                  />
                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--color-ink-2)',
                      marginBottom: '6px',
                    }}
                  >
                    还没有简历
                  </p>
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-ink-4)',
                      marginBottom: '20px',
                    }}
                  >
                    请先上传简历，再进行诊断
                  </p>
                  <Link
                    href="/resumes"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 18px',
                      background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
                    }}
                  >
                    上传简历
                  </Link>
                </div>
              ) : (
                <>
                  {resumes.map((resume) => {
                    const selected = selectedResumeId === resume.id;
                    return (
                      <button
                        key={resume.id}
                        onClick={() => setSelectedResumeId(resume.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          padding: '16px 18px',
                          background: selected
                            ? 'var(--color-brand-soft)'
                            : 'rgba(47,143,255,.05)',
                          border: `2px solid ${selected ? 'var(--color-brand)' : 'var(--hair)'}`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                      >
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: selected
                              ? 'var(--color-brand)'
                              : 'rgba(47,143,255,.05)',
                            border: selected ? 'none' : '1px solid var(--hair)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'background 0.15s',
                          }}
                        >
                          <FileText
                            size={18}
                            color={selected ? '#fff' : 'var(--color-ink-3)'}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: selected
                                ? 'var(--color-brand-ink)'
                                : 'var(--color-ink)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {resume.title}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--color-ink-4)',
                              marginTop: '2px',
                            }}
                          >
                            更新于{' '}
                            {new Date(resume.updated_at).toLocaleDateString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        </div>
                        {resume.is_primary && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: 'var(--color-brand)',
                              background: 'var(--color-brand-soft)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              flexShrink: 0,
                              border: '1px solid rgba(10, 132, 255, 0.2)',
                            }}
                          >
                            主版本
                          </span>
                        )}
                        {selected && (
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: 'var(--color-brand)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>
                              ✓
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* Upload new */}
                  <Link
                    href="/resumes"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 18px',
                      background: 'rgba(47,143,255,.05)',
                      border: '1.5px dashed var(--color-line-2)',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      color: 'var(--color-ink-3)',
                      transition: 'border-color 0.15s',
                      marginTop: '4px',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(47,143,255,.05)',
                        border: '1px solid var(--hair)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Plus size={18} color="var(--color-ink-4)" />
                    </div>
                    <span style={{ fontSize: '13.5px', fontWeight: 500 }}>
                      上传新简历
                    </span>
                  </Link>
                </>
              )}
            </div>
          )}

          {resumes.length > 0 && (
            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleResumeNext}
                disabled={!selectedResumeId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 24px',
                  background: selectedResumeId ? 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))' : 'rgba(47,143,255,.05)',
                  color: selectedResumeId ? '#fff' : 'var(--color-ink-4)',
                  border: selectedResumeId ? 'none' : '1px solid var(--hair)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: selectedResumeId ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                  boxShadow: selectedResumeId ? '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)' : 'none',
                }}
              >
                下一步：粘贴 JD
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: JD input */}
      {step === 'jd' && (
        <div>
          <h2
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              marginBottom: '6px',
            }}
          >
            第二步：粘贴职位描述
          </h2>

          {/* Selected resume reminder */}
          {selectedResumeId && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: 'var(--color-brand-soft)',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid rgba(10, 132, 255, 0.15)',
              }}
            >
              <FileText size={14} color="var(--color-brand)" />
              <span style={{ fontSize: '13px', color: 'var(--color-brand-ink)', fontWeight: 500 }}>
                诊断简历：{resumes.find((r) => r.id === selectedResumeId)?.title ?? '—'}
              </span>
              <button
                onClick={() => setStep('resume')}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: 'var(--color-brand)',
                  fontWeight: 600,
                  padding: '0',
                }}
              >
                更换
              </button>
            </div>
          )}

          <JdInput
            value={jdText}
            onChange={setJdText}
            error={jdError}
            disabled={false}
          />

          {submitError && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px 16px',
                background: 'var(--color-danger-soft)',
                borderRadius: '10px',
                color: 'var(--color-danger)',
                fontSize: '13.5px',
              }}
            >
              {submitError}
            </div>
          )}

          <div
            style={{
              marginTop: '28px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <button
              onClick={() => setStep('resume')}
              style={{
                padding: '11px 20px',
                background: 'none',
                border: '1px solid var(--color-line-2)',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-ink-3)',
                cursor: 'pointer',
              }}
            >
              上一步
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <button
                onClick={handleSubmit}
                disabled={jdText.trim().length < 10}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 24px',
                  background:
                    jdText.trim().length >= 10 ? 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))' : 'rgba(47,143,255,.05)',
                  color: jdText.trim().length >= 10 ? '#fff' : 'var(--color-ink-4)',
                  border: jdText.trim().length >= 10 ? 'none' : '1px solid var(--hair)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: jdText.trim().length >= 10 ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                  boxShadow: jdText.trim().length >= 10 ? '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)' : 'none',
                }}
              >
                <Sparkles size={16} />
                开始诊断
              </button>
              <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>消耗 1 点</span>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
