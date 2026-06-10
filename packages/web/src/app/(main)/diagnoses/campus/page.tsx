'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Resume, Diagnosis, ProfessionGroup, ProfessionTier } from '@/lib/types';
import { FileText, Plus, ChevronRight, Sparkles, Target, Gauge } from 'lucide-react';

type Step = 'setup' | 'analyzing';

function AnalyzingScreen({ profession }: { profession: string }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
        gap: '24px',
        textAlign: 'center',
      }}
    >
      {/* Animated ring */}
      <div
        style={{
          position: 'relative',
          width: '80px',
          height: '80px',
        }}
      >
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
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            letterSpacing: '-0.3px',
            marginBottom: '8px',
          }}
        >
          正在按校招标尺评估{dots}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', margin: 0 }}>
          AI 将分三步深度评估，预计需要 1-2 分钟，请勿关闭页面
        </p>
      </div>

      {/* Progress steps — 对应后端三次串行 AI 调用 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-line)',
          borderRadius: '14px',
          padding: '20px 28px',
          minWidth: '280px',
        }}
      >
        {['正在解析简历…', `正在按${profession}校招标尺评估…`, '正在生成改写建议…'].map((label, i) => (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13.5px',
              color: 'var(--color-ink-2)',
            }}
          >
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'var(--color-brand-soft)',
                border: '1.5px solid var(--color-brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: 'var(--color-brand)',
                  animation: `pulse 1.2s ease-in-out ${i * 0.3}s infinite`,
                }}
              />
            </div>
            {label}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
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

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitError(null);
    setStep('analyzing');

    // 180 秒超时:AI 三次串行调用在慢网络下可能超 2 分钟,超时后告知用户重试。
    const TIMEOUT_MS = 180_000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS),
    );

    try {
      const diagnosis = await Promise.race([
        api.post<Diagnosis>('/diagnoses/campus', {
          resume_id: selectedResumeId,
          profession,
          tier: effectiveTier,
          jd_text: trimmedJd || undefined,
        }),
        timeoutPromise,
      ]);
      router.push(`/diagnoses/${diagnosis.id}`);
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === 'TIMEOUT';
      setSubmitError(
        isTimeout
          ? '诊断超时（已等待 3 分钟），服务器可能繁忙，请稍后重试。'
          : err instanceof Error
            ? `诊断失败：${err.message}`
            : '诊断失败，请稍后重试。',
      );
      setStep('setup');
    }
  }

  if (step === 'analyzing') {
    return <AnalyzingScreen profession={profession} />;
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
            href="/diagnoses"
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
            校招诊断
          </span>
        </div>

        <h1
          style={{
            fontSize: '26px',
            fontWeight: 700,
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
              background: 'var(--color-surface)',
              borderRadius: '14px',
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
                background: 'var(--color-brand)',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 600,
                textDecoration: 'none',
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
                    background: selected ? 'var(--color-brand-soft)' : 'var(--color-surface)',
                    border: `2px solid ${selected ? 'var(--color-brand)' : 'var(--color-line)'}`,
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
                      background: selected ? 'var(--color-brand)' : 'var(--color-surface-2)',
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
                background: 'var(--color-surface)',
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
                  background: 'var(--color-surface-2)',
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
                          background: active ? 'var(--color-brand-soft)' : 'var(--color-surface)',
                          border: `2px solid ${active ? 'var(--color-brand)' : 'var(--color-line)'}`,
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
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minHeight: '46px',
            padding: '12px 24px',
            background: canSubmit ? 'var(--color-brand)' : 'var(--color-surface-3)',
            color: canSubmit ? '#fff' : 'var(--color-ink-4)',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'default',
            transition: 'background 0.15s',
          }}
        >
          <Sparkles size={16} />
          开始校招诊断
        </button>
      </div>
    </div>
  );
}
