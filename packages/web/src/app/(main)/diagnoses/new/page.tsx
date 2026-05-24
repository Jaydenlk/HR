'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Resume, Diagnosis } from '@/lib/types';
import { JdInput } from '@/components/diagnosis/jd-input';
import { FileText, Plus, ChevronRight, Sparkles } from 'lucide-react';

type Step = 'resume' | 'jd' | 'analyzing';

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
                    : 'var(--color-surface-3)',
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

function AnalyzingScreen() {
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
          正在分析{dots}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', margin: 0 }}>
          AI 正在对比简历与 JD，通常需要 5–15 秒
        </p>
      </div>

      {/* Progress steps */}
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
        {[
          '解析职位描述',
          '提取关键技能要求',
          '匹配简历内容',
          '生成优化建议',
        ].map((step, i) => (
          <div
            key={step}
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
            {step}
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

export default function NewDiagnosisPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('resume');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [jdText, setJdText] = useState('');
  const [jdError, setJdError] = useState<string | null>(null);
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

  function handleResumeNext() {
    if (!selectedResumeId) return;
    setStep('jd');
  }

  async function handleSubmit() {
    if (jdText.trim().length < 10) {
      setJdError('职位描述至少需要 10 个字符');
      return;
    }
    setJdError(null);
    setSubmitError(null);
    setStep('analyzing');

    try {
      const diagnosis = await api.post<Diagnosis>('/diagnoses', {
        resume_id: selectedResumeId,
        jd_text: jdText.trim(),
      });
      router.push(`/diagnoses/${diagnosis.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '创建诊断失败，请重试');
      setStep('jd');
    }
  }

  if (step === 'analyzing') {
    return <AnalyzingScreen />;
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
          <a
            href="/diagnoses"
            style={{
              fontSize: '13px',
              color: 'var(--color-ink-4)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            诊断
          </a>
          <ChevronRight size={14} color="var(--color-ink-4)" />
          <span style={{ fontSize: '13px', color: 'var(--color-ink-2)', fontWeight: 500 }}>
            新建诊断
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
                  <a
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
                  </a>
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
                            : 'var(--color-surface)',
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
                            background: selected
                              ? 'var(--color-brand)'
                              : 'var(--color-surface-2)',
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
                  <a
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
                    <span style={{ fontSize: '13.5px', fontWeight: 500 }}>
                      上传新简历
                    </span>
                  </a>
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
                  background: selectedResumeId ? 'var(--color-ink)' : 'var(--color-surface-3)',
                  color: selectedResumeId ? '#fff' : 'var(--color-ink-4)',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: selectedResumeId ? 'pointer' : 'default',
                  transition: 'background 0.15s',
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

            <button
              onClick={handleSubmit}
              disabled={jdText.trim().length < 10}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 24px',
                background:
                  jdText.trim().length >= 10 ? 'var(--color-brand)' : 'var(--color-surface-3)',
                color: jdText.trim().length >= 10 ? '#fff' : 'var(--color-ink-4)',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: jdText.trim().length >= 10 ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
            >
              <Sparkles size={16} />
              开始诊断
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
