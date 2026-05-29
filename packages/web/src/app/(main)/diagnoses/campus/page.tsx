'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Resume, Diagnosis } from '@/lib/types';
import { FileText, Plus, ChevronRight, Sparkles, Target } from 'lucide-react';

// MVP 暂用常量职业列表;未来从后端 /profession-presets 拉取可选职业。
const PROFESSIONS: { value: string; label: string }[] = [
  { value: '互联网产品经理', label: '产品经理 · 校招' },
];

type Step = 'setup' | 'analyzing';

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
        {['正在解析简历…', '正在按产品经理校招标尺评估…', '正在生成改写建议…'].map((label, i) => (
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

  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [profession, setProfession] = useState<string>(PROFESSIONS[0].value);
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

  const trimmedJd = jdText.trim();
  // JD 可选;若填写则后端要求至少 50 字,故此处同步校验给出即时反馈。
  const jdTooShort = trimmedJd.length > 0 && trimmedJd.length < 50;
  const canSubmit = !!selectedResumeId && !!profession && !jdTooShort;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitError(null);
    setStep('analyzing');

    try {
      const diagnosis = await api.post<Diagnosis>('/diagnoses/campus', {
        resume_id: selectedResumeId,
        profession,
        jd_text: trimmedJd || undefined,
      });
      router.push(`/diagnoses/${diagnosis.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? `诊断失败：${err.message}`
          : '诊断失败，请稍后重试。',
      );
      setStep('setup');
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
            onChange={(e) => setProfession(e.target.value)}
            aria-label="目标职业"
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
            {PROFESSIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
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
          将按该职业的校招通用能力标尺评估，目前开放产品经理，更多职业陆续上线
        </p>
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
