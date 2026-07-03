'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiConflictError } from '@/lib/api';
import type {
  Resume,
  Diagnosis,
  ProfessionGroup,
  ProfessionTier,
  DiagnosisStreamEvent,
  DiagnosisStreamStage,
  DiagnosisAnalysisPayload,
  ProfessionStandardResult,
} from '@/lib/types';
import { getScoreColor } from '@/lib/score-utils';
import { useDiagnosisResume, conflictDiagnosisId } from '@/lib/use-diagnosis-resume';
import {
  DiagnosisInProgressCard,
  DiagnosisFailedCard,
} from '@/components/diagnosis/resume-progress-card';
import { FileText, Plus, ChevronRight, Sparkles, Target, Gauge, Check } from 'lucide-react';

type Step = 'setup' | 'analyzing';

// 真实步骤状态:每个阶段从 pending → active(收到 step 事件)→ done(下一阶段开始或 analysis/done 到达)。
type StageStatus = 'pending' | 'active' | 'done';

const STAGE_ORDER: DiagnosisStreamStage[] = ['parsing', 'analyzing', 'suggesting'];

// 校招模式 analysis.payload 即 ProfessionStandardResult(带 total_score + dimensions[])。
// 用结构守卫从联合类型收窄(MatchDimensions 无 dimensions 数组与 total_score),不做不安全强转。
function asProfessionResult(
  payload: DiagnosisAnalysisPayload | null,
): ProfessionStandardResult | null {
  if (
    payload &&
    'dimensions' in payload &&
    Array.isArray(payload.dimensions) &&
    'total_score' in payload
  ) {
    return payload;
  }
  return null;
}

// 真实进度评估屏:步骤按收到的 step 事件点亮(非装饰脉冲);收到 analysis 即就地展示总分+维度。
function AnalyzingScreen({
  profession,
  stageStatus,
  stageLabels,
  analysis,
}: {
  profession: string;
  stageStatus: Record<DiagnosisStreamStage, StageStatus>;
  stageLabels: Record<DiagnosisStreamStage, string>;
  analysis: DiagnosisAnalysisPayload | null;
}) {
  // 默认文案(step 事件未携带 label 时回退);analyzing 阶段嵌入目标职业。
  const defaultLabels: Record<DiagnosisStreamStage, string> = {
    parsing: '解析简历',
    analyzing: `按${profession}校招标尺评估`,
    suggesting: '生成改写建议',
  };
  const result = asProfessionResult(analysis);
  const dims = result?.dimensions ?? [];

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
          正在按校招标尺评估
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

      {/* analysis 到达:就地展示总分 + 各维度(核心价值前置,suggesting 仍在跑) */}
      {result && (
        <div
          className="lg"
          style={{
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            textAlign: 'left',
            animation: 'fadeInUp 0.35s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: dims.length > 0 ? '18px' : 0,
            }}
          >
            {(() => {
              const { color, bg } = getScoreColor(result.total_score);
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
                  {result.total_score}分
                </span>
              );
            })()}
            <div style={{ fontSize: '13px', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>
              评估分数已生成，改写建议生成中，稍候即可查看完整报告。
            </div>
          </div>

          {dims.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dims.map((dim) => {
                const pct = dim.max > 0 ? Math.round((dim.score / dim.max) * 100) : 0;
                const { color } = getScoreColor(pct);
                return (
                  <div key={dim.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '88px',
                        fontSize: '12.5px',
                        color: 'var(--color-ink-3)',
                        flexShrink: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {dim.name}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: '6px',
                        background: 'var(--hair)',
                        borderRadius: 'var(--radius-pill)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: color,
                          borderRadius: 'var(--radius-pill)',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        width: '44px',
                        textAlign: 'right',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-ink-2)',
                        flexShrink: 0,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {dim.score}/{dim.max}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

export default function CampusDiagnosisPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('setup');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const [groups, setGroups] = useState<ProfessionGroup[]>([]);
  const [loadingProfessions, setLoadingProfessions] = useState(true);
  const [professionError, setProfessionError] = useState<string | null>(null);

  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [profession, setProfession] = useState<string>('');
  const [tier, setTier] = useState<ProfessionTier>('standard');
  const [jdText, setJdText] = useState('');
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

  // 职业清单数据化:由后端 list() 决定可选职业及各自难度档,前端不再硬编码。
  useEffect(() => {
    api
      .get<ProfessionGroup[]>('/diagnoses/campus/professions')
      .then((data) => {
        setGroups(data);
        const first = data[0]?.options[0];
        if (first) setProfession(first.profession);
        setLoadingProfessions(false);
      })
      .catch(() => {
        setProfessionError('加载职业列表失败，请刷新重试');
        setLoadingProfessions(false);
      });
  }, []);

  // 扁平化分组,供选中项查找与计数(分组仅用于下拉 optgroup 展示)
  const professions = groups.flatMap((g) => g.options);
  const selectedOption = professions.find((p) => p.profession === profession) ?? null;
  // 仅当该职业提供 pressure 档时显示难度开关;否则隐藏(单档职业无需选择)。
  const hasPressureTier = !!selectedOption?.tiers.some((t) => t.tier === 'pressure');
  // 提交时以是否支持 pressure 收敛档位:无 pressure 档则一律按 standard,避免提交无效档位。
  const effectiveTier: ProfessionTier = hasPressureTier ? tier : 'standard';

  // 切换职业:回到默认标准档,避免上一职业的压力版选择残留到不支持该档的职业。
  function handleProfessionChange(next: string) {
    setProfession(next);
    setTier('standard');
  }

  const trimmedJd = jdText.trim();
  // JD 可选;若填写则后端要求至少 50 字,故此处同步校验给出即时反馈。
  const jdTooShort = trimmedJd.length > 0 && trimmedJd.length < 50;
  const canSubmit = !!selectedResumeId && !!profession && !jdTooShort;

  function goToDiagnosis(id: string) {
    window.dispatchEvent(new Event('coach:credit-refresh'));
    router.push(`/diagnoses/${id}`);
  }

  // S0「回来可见 / 防重复」:mount 时查进行中校招诊断,有则轮询至终态;409 冲突亦转入此视图。
  const { resumingId, resumeFailed, beginResume, dismissResume } = useDiagnosisResume(
    'profession_standard',
    goToDiagnosis,
  );

  // 从进行中/失败态返回表单:清空恢复态,并把评估屏复位到表单步骤。
  function backToForm() {
    dismissResume();
    setStep('setup');
    setSubmitError(null);
  }

  // 兜底②:流断且没拿到 diagnosisId 时,查最近一条本简历、晚于本次提交的诊断,跳过去。
  // 后端 analysis 事件发出前已落库,故即便整条流断了,结果通常已存在。
  async function findRecentDiagnosis(
    resumeId: string,
    submittedAt: number,
  ): Promise<string | null> {
    try {
      const list = await api.get<Diagnosis[]>('/diagnoses');
      // 列表已按 created_at DESC;留 10s 时钟偏移容差,匹配本简历最近一条。
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
    if (!canSubmit || !selectedResumeId) return;
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

    // 已从 analysis 事件拿到的 diagnosisId:即便后续流断,也能直接跳到已落库的结果(兜底①)。
    let knownId: string | null = null;
    let navigated = false;
    let handledError = false;

    // 收到某阶段 step → 该阶段 active,且其之前的阶段一律标记 done。
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
        '/diagnoses/campus/stream',
        {
          resume_id: resumeId,
          profession,
          tier: effectiveTier,
          jd_text: trimmedJd || undefined,
        },
        controller.signal,
      )) {
        if (!mountedRef.current) break;
        if (evt.type === 'queue') {
          setQueuePosition(evt.position);
        } else if (evt.type === 'step') {
          setQueuePosition(null);
          markStageActive(evt.stage, evt.label);
        } else if (evt.type === 'analysis') {
          // 分析已落库:记下 id(断流兜底①)并就地展示分数;analyzing 阶段收尾。
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
          // 后端显式 error:若分析已落库(有 id)→ 直接跳过去看结果(结果永不丢);否则报错可重试。
          handledError = true;
          if (knownId) {
            navigated = true;
            goToDiagnosis(knownId);
          } else {
            setSubmitError(evt.message || '诊断失败，请稍后重试。');
            setStep('setup');
          }
        }
      }

      // 流自然结束但既没 done 也没显式 error(中途断开):走结果兜底。
      if (!navigated && !handledError && mountedRef.current) {
        if (knownId) {
          goToDiagnosis(knownId);
        } else {
          const recovered = await findRecentDiagnosis(resumeId, submittedAt);
          if (recovered) {
            goToDiagnosis(recovered);
          } else {
            setSubmitError('诊断连接中断，但结果可能已生成，请到「我的诊断」查看或重试。');
            setStep('setup');
          }
        }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      // 用户主动 abort(卸载/重提):静默退出。
      if (err instanceof Error && err.name === 'AbortError') return;
      if (handledError || navigated) return;

      // 409 防重复:后端检测到同类型进行中诊断,未发起新流水线、未扣费。转入「进行中」视图轮询既有诊断。
      if (err instanceof ApiConflictError) {
        const conflictId = conflictDiagnosisId(err.body);
        if (conflictId) {
          beginResume(conflictId);
          return;
        }
      }

      // 流异常(首帧前 HTTP 错误 / 网络中断):先按已知 id 跳,再查最近落库,最后报可重试错误。
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
        setSubmitError(
          err instanceof Error ? `诊断失败：${err.message}` : '诊断失败，请稍后重试。',
        );
        setStep('setup');
      }
    } finally {
      if (mountedRef.current && !navigated) {
        setQueuePosition(null);
      }
    }
  }

  // S0 恢复视图优先于评估屏与表单:有进行中诊断 → 进行中卡片;轮询到 failed → 失败卡片(可返回重试)。
  if (resumingId) {
    return (
      <DiagnosisInProgressCard note="你有一个校招诊断正在生成，完成后会自动展示结果，请稍候…" />
    );
  }
  if (resumeFailed) {
    return <DiagnosisFailedCard message={resumeFailed} onRetry={backToForm} />;
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
          profession={profession}
          stageStatus={stageStatus}
          stageLabels={stageLabels}
          analysis={analysisPreview}
        />
      </>
    );
  }

  return (
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
            href="/"
            style={{
              fontSize: '13px',
              color: 'var(--color-ink-4)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            首页
          </Link>
          <ChevronRight size={14} color="var(--color-ink-4)" />
          <span style={{ fontSize: '13px', color: 'var(--color-ink-2)', fontWeight: 500 }}>
            校招诊断
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
          校招职业标尺诊断
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', margin: 0 }}>
          按目标职业的校招通用标尺评估你的简历，给出每个维度的得分、理由与补强方向
        </p>
      </div>

      {/* Step 1: Resume selection */}
      <div style={{ marginBottom: '32px' }}>
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
        ) : resumes.length === 0 ? (
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                    background: selected ? 'var(--color-brand-soft)' : 'rgba(47,143,255,.05)',
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
                      background: selected ? 'var(--color-brand)' : 'rgba(47,143,255,.05)',
                      border: selected ? 'none' : '1px solid var(--hair)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'background 0.15s',
                    }}
                  >
                    <FileText size={18} color={selected ? '#fff' : 'var(--color-ink-3)'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: selected ? 'var(--color-brand-ink)' : 'var(--color-ink)',
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
                      <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>✓</span>
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
              <span style={{ fontSize: '13.5px', fontWeight: 500 }}>上传新简历</span>
            </Link>
          </div>
        )}
      </div>

      {/* Step 2: Profession selection */}
      <div style={{ marginBottom: '32px' }}>
        <h2
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            marginBottom: '16px',
          }}
        >
          第二步：选择目标职业
        </h2>
        {loadingProfessions ? (
          <div
            style={{
              minHeight: '46px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-line-2)',
              borderRadius: '12px',
              color: 'var(--color-ink-4)',
              fontSize: '14px',
            }}
          >
            加载职业列表中…
          </div>
        ) : professionError ? (
          <div
            style={{
              padding: '14px 16px',
              background: 'var(--color-danger-soft)',
              borderRadius: '12px',
              color: 'var(--color-danger)',
              fontSize: '13.5px',
            }}
          >
            {professionError}
          </div>
        ) : professions.length === 0 ? (
          <div
            style={{
              padding: '14px 16px',
              background: 'var(--color-surface)',
              border: '1px dashed var(--color-line-2)',
              borderRadius: '12px',
              color: 'var(--color-ink-3)',
              fontSize: '13.5px',
            }}
          >
            暂未开放可诊断职业，更多职业陆续上线
          </div>
        ) : (
          <>
            <div style={{ position: 'relative' }}>
              <Target
                size={16}
                color="var(--color-ink-3)"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
              <select
                value={profession}
                onChange={(e) => handleProfessionChange(e.target.value)}
                aria-label="目标职业"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-brand)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,132,255,0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-line-2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                style={{
                  width: '100%',
                  minHeight: '46px',
                  padding: '12px 40px 12px 40px',
                  background: 'var(--color-surface)',
                  border: '1.5px solid var(--color-line-2)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-ink)',
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '-0.003em',
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  appearance: 'none',
                }}
              >
                {groups.map((g) => (
                  <optgroup key={g.category} label={g.category}>
                    {g.options.map((p) => (
                      <option key={p.profession} value={p.profession}>
                        {p.profession}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronRight
                size={16}
                color="var(--color-ink-4)"
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%) rotate(90deg)',
                  pointerEvents: 'none',
                }}
              />
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--color-ink-4)', margin: '8px 0 0' }}>
              将按该职业的校招通用能力标尺评估，更多职业陆续上线
            </p>

            {/* 难度档开关:仅当该职业提供压力版时显示;默认标准 */}
            {hasPressureTier && (
              <fieldset
                style={{
                  border: 'none',
                  padding: 0,
                  margin: '20px 0 0',
                }}
              >
                <legend
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: 'var(--color-ink)',
                    padding: 0,
                    marginBottom: '10px',
                  }}
                >
                  <Gauge size={15} color="var(--color-ink-3)" />
                  诊断强度
                </legend>
                <div
                  role="radiogroup"
                  aria-label="诊断强度"
                  style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
                >
                  {(
                    [
                      { value: 'standard', label: '标准' },
                      { value: 'pressure', label: '压力版 · 高标准' },
                    ] as const
                  ).map((opt) => {
                    const active = tier === opt.value;
                    return (
                      <label
                        key={opt.value}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          minHeight: '44px',
                          padding: '10px 16px',
                          flex: '1 1 160px',
                          background: active ? 'var(--color-brand-soft)' : 'rgba(47,143,255,.05)',
                          border: `2px solid ${active ? 'var(--color-brand)' : 'var(--hair)'}`,
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color: active ? 'var(--color-brand-ink)' : 'var(--color-ink-2)',
                          transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                          boxSizing: 'border-box',
                        }}
                      >
                        <input
                          type="radio"
                          name="tier"
                          value={opt.value}
                          checked={active}
                          onChange={() => setTier(opt.value)}
                          style={{ accentColor: 'var(--color-brand)', cursor: 'pointer' }}
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--color-ink-4)', margin: '10px 0 0' }}>
                  压力版按资深面试官的高标准评估，更严更犀利
                </p>
              </fieldset>
            )}
          </>
        )}
      </div>

      {/* Step 3: Optional JD */}
      <div style={{ marginBottom: '8px' }}>
        <h2
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            marginBottom: '6px',
          }}
        >
          第三步：补充目标 JD（可选）
        </h2>
        <p style={{ fontSize: '12.5px', color: 'var(--color-ink-4)', margin: '0 0 12px' }}>
          可不填；不填则按该职业校招通用标尺评估。填写则结合该岗位要求做针对性分析（至少 50 字）。
        </p>
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          rows={8}
          placeholder="可选：粘贴目标岗位 JD 全文，包括职位要求、任职资格等…"
          aria-label="目标职位描述（可选）"
          style={{
            width: '100%',
            padding: '14px 16px',
            background: 'var(--color-surface)',
            border: `1.5px solid ${jdTooShort ? 'var(--color-danger)' : 'var(--color-line-2)'}`,
            borderRadius: '12px',
            fontSize: '13.5px',
            color: 'var(--color-ink)',
            lineHeight: 1.6,
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            letterSpacing: '-0.003em',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
        />
        {jdTooShort && (
          <p style={{ fontSize: '12.5px', color: 'var(--color-danger)', margin: '6px 0 0' }}>
            JD 如填写则至少需要 50 字；如不需要可清空此处。
          </p>
        )}
      </div>

      {submitError && (
        <div
          style={{
            marginTop: '20px',
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

      {/* Submit */}
      <div
        style={{
          marginTop: '28px',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minHeight: '46px',
              padding: '12px 24px',
              background: canSubmit ? 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))' : 'rgba(47,143,255,.05)',
              color: canSubmit ? '#fff' : 'var(--color-ink-4)',
              border: canSubmit ? 'none' : '1px solid var(--hair)',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: canSubmit ? 'pointer' : 'default',
              transition: 'background 0.15s',
              boxShadow: canSubmit ? '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)' : 'none',
            }}
          >
            <Sparkles size={16} />
            开始校招诊断
          </button>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>
            消耗 1 点
          </span>
        </div>
      </div>
    </div>
  );
}
