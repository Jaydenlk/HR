'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { CoverLetter, CoverLetterTone } from '@/lib/types';
import { RefreshCw, Copy, FileText, Loader2, Plus } from 'lucide-react';
import { ReferralPanel } from './_referral';
import {
  useHandoffReception,
  HandoffConfirmDialog,
  ReturnToCoachBanner,
} from '@/components/chat/handoff-reception';

// ─── Top-level tab ────────────────────────────────────────────────────────────

type PageTab = 'cover-letter' | 'referral';

// ─── Constants ────────────────────────────────────────────────────────────────

const TONE_LABELS: Record<CoverLetterTone, string> = {
  professional: '专业克制',
  warm: '真诚热情',
  direct: '简短直接',
};

const TONES: Array<{ value: CoverLetterTone; label: string }> = [
  { value: 'professional', label: TONE_LABELS.professional },
  { value: 'warm', label: TONE_LABELS.warm },
  { value: 'direct', label: TONE_LABELS.direct },
];

const LENGTHS = [
  { value: 200, label: '200 字' },
  { value: 350, label: '350 字' },
  { value: 500, label: '500 字' },
];

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

// ─── Cover-letter tab content ─────────────────────────────────────────────────

function CoverLetterTab() {
  const searchParams = useSearchParams();
  const handoffId = searchParams.get('handoff');
  const { handoffState, handoffData, onAccept, onDismiss } = useHandoffReception(handoffId);
  const [showReturn, setShowReturn] = useState(false);
  const activeHandoffId = handoffId;
  const activeConvId = handoffData?.conversation_id ?? null;

  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [currentLetter, setCurrentLetter] = useState<CoverLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [tone, setTone] = useState<CoverLetterTone>('warm');
  const [lengthWords, setLengthWords] = useState(350);
  const [jdText, setJdText] = useState('');

  // handoff 接待:accepted 后预填字段。
  // Defer via setTimeout 避免 set-state-in-effect 同步 cascade 问题。
  const prevHandoffAccepted = useRef(false);
  useEffect(() => {
    if (handoffState === 'accepted' && handoffData && !prevHandoffAccepted.current) {
      prevHandoffAccepted.current = true;
      const payload = handoffData.payload;
      setTimeout(() => {
        if (payload.company) setCompany(String(payload.company));
        if (payload.role) setRole(String(payload.role));
        if (payload.tone && ['professional', 'warm', 'direct'].includes(String(payload.tone))) {
          setTone(payload.tone as CoverLetterTone);
        }
        if (payload.jd_text) setJdText(String(payload.jd_text));
      }, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoffState]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await api.get<CoverLetter[]>('/cover-letters');
        setLetters(data);
        if (data.length > 0) {
          setCurrentLetter(data[0]);
        }
      } catch {
        // no letters yet is fine
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleGenerate() {
    if (!company.trim() || !role.trim()) {
      setError('请填写目标公司和岗位');
      return;
    }
    if (jdText.trim().length < 50) {
      setError('请粘贴 JD 原文（至少 50 字，含岗位职责与要求）——没有 JD，AI 无法针对性撰写');
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      // TODO(#103): 求职信目前仅基于 JD + 公司/岗位/语气生成，尚未接入用户简历。
      // 待后端开放简历上下文入参后，在此追加 resume 字段实现"简历 × JD"双向定制。
      const letter = await api.post<CoverLetter>('/cover-letters', {
        company,
        role,
        tone,
        length_words: lengthWords,
        jd_text: jdText.trim(),
      });
      setCurrentLetter(letter);
      setLetters((prev) => [letter, ...prev]);
      window.dispatchEvent(new Event('coach:credit-refresh'));
      if (activeHandoffId && activeConvId) {
        setShowReturn(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerate() {
    if (!currentLetter) return;
    setGenerating(true);
    setError(null);
    try {
      const letter = await api.post<CoverLetter>(`/cover-letters/${currentLetter.id}/regenerate`, {});
      setCurrentLetter(letter);
      setLetters((prev) => [letter, ...prev]);
      window.dispatchEvent(new Event('coach:credit-refresh'));
    } catch (err) {
      setError(err instanceof Error ? err.message : '重新生成失败');
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    if (!currentLetter) return;
    if (!navigator.clipboard) {
      setError('当前环境不支持一键复制，请手动选中正文复制');
      return;
    }
    navigator.clipboard
      .writeText(currentLetter.content)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        setError('复制失败，请手动选中正文复制');
      });
  }

  // 外层数据卡:单层玻璃(.lg)+ 仅留内边距,圆角/底色/描边/阴影由 .lg 提供。
  const cardStyle: React.CSSProperties = {
    padding: '20px 22px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11.5px',
    fontWeight: 700,
    color: 'var(--color-ink-2)',
    letterSpacing: '0.04em',
    marginBottom: '6px',
    textTransform: 'uppercase' as const,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-line)',
    borderRadius: '10px',
    fontFamily: 'inherit',
    fontSize: '13.5px',
    color: 'var(--color-ink)',
    fontWeight: 500,
    boxSizing: 'border-box' as const,
    outline: 'none',
  };

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
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: '0',
        overflow: 'hidden',
      }}
    >
      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '16px',
          flexShrink: 0,
          gap: '8px',
        }}
      >
        {currentLetter && (
          <>
            <button
              onClick={handleRegenerate}
              disabled={generating}
              className="lg-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '10px',
                color: 'var(--color-ink)',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.6 : 1,
              }}
            >
              <RefreshCw size={14} />
              重新生成
            </button>
            <button
              onClick={handleCopy}
              className="lg-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '10px',
                color: copied ? 'var(--color-success)' : 'var(--color-ink)',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Copy size={14} />
              {copied ? '已复制' : '复制全文'}
            </button>
          </>
        )}
      </div>

      {/* Main grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr',
          gap: '14px',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Left: form */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: 0,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          <div className="lg" style={cardStyle}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>目标公司</label>
              <input
                style={inputStyle}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="字节跳动"
              />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>目标岗位</label>
              <input
                style={inputStyle}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="资深前端工程师"
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>语气</label>
              <div
                style={{
                  display: 'flex',
                  gap: '0',
                  background: 'rgba(47,143,255,.05)',
                  border: '1px solid var(--hair)',
                  borderRadius: '10px',
                  padding: '3px',
                }}
              >
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: tone === t.value ? '1px solid var(--hair-2)' : '1px solid transparent',
                      cursor: 'pointer',
                      background: tone === t.value ? 'var(--color-surface)' : 'transparent',
                      color: tone === t.value ? 'var(--color-ink)' : 'var(--color-ink-3)',
                      boxShadow: tone === t.value ? 'var(--glass-sh)' : 'none',
                      fontFamily: 'inherit',
                      transition: 'all 0.12s',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>长度</label>
              <div
                style={{
                  display: 'flex',
                  gap: '0',
                  background: 'rgba(47,143,255,.05)',
                  border: '1px solid var(--hair)',
                  borderRadius: '10px',
                  padding: '3px',
                }}
              >
                {LENGTHS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLengthWords(l.value)}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: lengthWords === l.value ? '1px solid var(--hair-2)' : '1px solid transparent',
                      cursor: 'pointer',
                      background: lengthWords === l.value ? 'var(--color-surface)' : 'transparent',
                      color: lengthWords === l.value ? 'var(--color-ink)' : 'var(--color-ink-3)',
                      boxShadow: lengthWords === l.value ? 'var(--glass-sh)' : 'none',
                      fontFamily: 'inherit',
                      transition: 'all 0.12s',
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>JD 原文（必填 · ≥50 字）</label>
                <span
                  style={{
                    fontSize: '11px',
                    color: jdText.length > 8000 ? 'var(--color-danger)' : 'var(--color-ink-4)',
                    fontWeight: 500,
                  }}
                >
                  {jdText.length} / 8000
                </span>
              </div>
              <textarea
                style={{
                  ...inputStyle,
                  height: '100px',
                  resize: 'vertical' as const,
                  lineHeight: '1.55',
                  borderColor: jdText.length > 8000 ? 'var(--color-danger)' : undefined,
                }}
                value={jdText}
                maxLength={8000}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="粘贴完整职位描述（含岗位职责与要求，≥50 字），AI 将针对性定制内容…"
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--color-danger-soft)',
                  color: 'var(--color-danger)',
                  fontSize: '13px',
                  fontWeight: 500,
                  marginBottom: '12px',
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 0',
                borderRadius: '10px',
                border: 'none',
                background: generating
                  ? 'var(--color-surface-3)'
                  : 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                color: generating ? 'var(--color-ink-3)' : '#fff',
                boxShadow: generating
                  ? 'none'
                  : '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
                fontSize: '14px',
                fontWeight: 700,
                cursor: generating ? 'not-allowed' : 'pointer',
                letterSpacing: '-0.01em',
                transition: 'background 0.12s',
              }}
            >
              {generating ? (
                <>
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  生成中…
                </>
              ) : (
                <>
                  <Plus size={15} />
                  生成求职信
                </>
              )}
            </button>
            <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500, marginTop: '4px' }}>
              消耗 1 点
            </div>
          </div>

          {/* History */}
          {letters.length > 0 && (
            <div className="lg" style={cardStyle}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--color-ink-2)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '10px',
                }}
              >
                历史版本
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {letters.map((letter) => (
                  <button
                    key={letter.id}
                    onClick={() => setCurrentLetter(letter)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: '10px',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background:
                        currentLetter?.id === letter.id
                          ? 'var(--color-brand-soft)'
                          : 'rgba(47,143,255,.05)',
                      border:
                        currentLetter?.id === letter.id
                          ? '1px solid var(--color-brand)'
                          : '1px solid var(--hair)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--color-ink)',
                        }}
                      >
                        v{letter.version} · {TONE_LABELS[letter.tone] ?? letter.tone}
                        {letter.length_words ? ` · ${letter.length_words} 字` : ''}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-ink-3)',
                          marginTop: '2px',
                        }}
                      >
                        {letter.company} {letter.role && `· ${letter.role}`} ·{' '}
                        {formatRelativeTime(letter.created_at)}
                      </div>
                    </div>
                    {currentLetter?.id === letter.id && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--color-brand)',
                          background: 'transparent',
                          padding: '2px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--color-brand)',
                          whiteSpace: 'nowrap' as const,
                        }}
                      >
                        当前
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: letter preview */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {loading ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-ink-3)',
                fontSize: '14px',
                gap: '8px',
              }}
            >
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              加载中…
            </div>
          ) : currentLetter ? (
            <div
              className="lg"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '32px 38px',
                fontSize: '14px',
                lineHeight: '1.75',
                color: 'var(--color-ink)',
                fontWeight: 500,
                whiteSpace: 'pre-wrap' as const,
              }}
            >
              {generating && (
                <div
                  style={{
                    position: 'absolute' as const,
                    inset: 0,
                    zIndex: 2,
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(var(--glass-blur)) saturate(160%)',
                    WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(160%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '22px',
                    gap: '8px',
                    color: 'var(--color-ink-3)',
                    fontSize: '14px',
                  }}
                >
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  AI 正在生成…
                </div>
              )}
              {currentLetter.content}
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                background: 'transparent',
                border: '1.5px dashed var(--color-line-2)',
                borderRadius: '22px',
                padding: '48px 32px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'rgba(47,143,255,.05)',
                  border: '1px solid var(--hair)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={24} color="var(--color-ink-4)" />
              </div>
              <p
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--color-ink-2)',
                  letterSpacing: '-0.01em',
                }}
              >
                还没有求职信
              </p>
              <p style={{ fontSize: '13.5px', color: 'var(--color-ink-4)' }}>
                填写左侧表单，点击「生成求职信」
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CoverLetterPage() {
  const [activeTab, setActiveTab] = useState<PageTab>('cover-letter');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '40px 32px 24px',
        gap: '0',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          marginBottom: '20px',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            letterSpacing: '-0.4px',
            marginBottom: '4px',
          }}
        >
          求职信
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
          基于 JD 针对性撰写 · 三种语气可选
        </p>
      </div>

      {/* Top-level tab bar */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '4px',
          background: 'rgba(47,143,255,.05)',
          border: '1px solid var(--hair)',
          borderRadius: '12px',
          marginBottom: '20px',
          flexShrink: 0,
          width: 'fit-content',
        }}
      >
        <button
          onClick={() => setActiveTab('cover-letter')}
          style={{
            padding: '8px 20px',
            borderRadius: '9px',
            border: activeTab === 'cover-letter' ? '1px solid var(--hair-2)' : '1px solid transparent',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: activeTab === 'cover-letter' ? 700 : 500,
            background: activeTab === 'cover-letter' ? 'var(--color-surface)' : 'transparent',
            color: activeTab === 'cover-letter' ? 'var(--color-ink)' : 'var(--color-ink-3)',
            boxShadow: activeTab === 'cover-letter' ? 'var(--glass-sh)' : 'none',
            fontFamily: 'inherit',
            transition: 'all 0.12s',
          }}
        >
          求职信
        </button>
        <button
          onClick={() => setActiveTab('referral')}
          style={{
            padding: '8px 20px',
            borderRadius: '9px',
            border: activeTab === 'referral' ? '1px solid var(--hair-2)' : '1px solid transparent',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: activeTab === 'referral' ? 700 : 500,
            background: activeTab === 'referral' ? 'var(--color-surface)' : 'transparent',
            color: activeTab === 'referral' ? 'var(--color-ink)' : 'var(--color-ink-3)',
            boxShadow: activeTab === 'referral' ? 'var(--glass-sh)' : 'none',
            fontFamily: 'inherit',
            transition: 'all 0.12s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          内推推测
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 'var(--radius-pill)',
              background: activeTab === 'referral'
                ? 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))'
                : 'rgba(47,143,255,.05)',
              border: activeTab === 'referral' ? 'none' : '1px solid var(--hair)',
              color: activeTab === 'referral' ? '#fff' : 'var(--color-ink-3)',
              letterSpacing: '0.02em',
              lineHeight: '1.6',
            }}
          >
            Beta
          </span>
        </button>
      </div>

      {/* Tab content — #52: render both tabs, hide inactive with display:none to preserve state */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: activeTab === 'cover-letter' ? 'block' : 'none' }}>
        <Suspense fallback={null}>
          <CoverLetterTab />
        </Suspense>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: activeTab === 'referral' ? 'block' : 'none' }}>
        <ReferralPanel />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
