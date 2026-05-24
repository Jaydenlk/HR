'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { CoverLetter } from '@/lib/types';
import { RefreshCw, Copy, FileText, Loader2, Plus } from 'lucide-react';

const TONES = [
  { value: '专业克制', label: '专业克制' },
  { value: '真诚热情', label: '真诚热情' },
  { value: '简短直接', label: '简短直接' },
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

export default function CoverLetterPage() {
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [currentLetter, setCurrentLetter] = useState<CoverLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [tone, setTone] = useState('真诚热情');
  const [lengthWords, setLengthWords] = useState(350);
  const [jdText, setJdText] = useState('');

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
    setError(null);
    setGenerating(true);
    try {
      const letter = await api.post<CoverLetter>('/cover-letters', {
        company,
        role,
        tone,
        length_words: lengthWords,
        jd_text: jdText || undefined,
      });
      setCurrentLetter(letter);
      setLetters((prev) => [letter, ...prev]);
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
      setLetters((prev) => prev.map((l) => (l.id === letter.id ? letter : l)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '重新生成失败');
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    if (!currentLetter) return;
    navigator.clipboard.writeText(currentLetter.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-line)',
    borderRadius: '18px',
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
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
            针对 JD 量身定制 · 三种语气可选
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {currentLetter && (
            <>
              <button
                onClick={handleRegenerate}
                disabled={generating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-line)',
                  background: 'var(--color-surface)',
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
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-line)',
                  background: 'var(--color-surface)',
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
          <div style={cardStyle}>
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
                  background: 'var(--color-surface-2)',
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
                      border: 'none',
                      cursor: 'pointer',
                      background: tone === t.value ? 'var(--color-surface)' : 'transparent',
                      color: tone === t.value ? 'var(--color-ink)' : 'var(--color-ink-3)',
                      boxShadow: tone === t.value ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
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
                  background: 'var(--color-surface-2)',
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
                      border: 'none',
                      cursor: 'pointer',
                      background: lengthWords === l.value ? 'var(--color-surface)' : 'transparent',
                      color: lengthWords === l.value ? 'var(--color-ink)' : 'var(--color-ink-3)',
                      boxShadow: lengthWords === l.value ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
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
              <label style={labelStyle}>JD 原文（可选）</label>
              <textarea
                style={{
                  ...inputStyle,
                  height: '100px',
                  resize: 'vertical' as const,
                  lineHeight: '1.55',
                }}
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="粘贴职位描述，AI 将针对性定制内容…"
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
                background: generating ? 'var(--color-surface-3)' : 'var(--color-brand)',
                color: generating ? 'var(--color-ink-3)' : '#fff',
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
          </div>

          {/* History */}
          {letters.length > 0 && (
            <div style={cardStyle}>
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
                          : 'var(--color-surface-2)',
                      border:
                        currentLetter?.id === letter.id
                          ? '1px solid rgba(10,132,255,0.24)'
                          : '1px solid transparent',
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
                        v{letter.version} · {letter.tone}
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
              style={{
                flex: 1,
                overflowY: 'auto',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-line)',
                borderRadius: '18px',
                padding: '32px 38px',
                fontSize: '14px',
                lineHeight: '1.75',
                color: 'var(--color-ink)',
                fontWeight: 500,
                whiteSpace: 'pre-wrap' as const,
                position: 'relative' as const,
              }}
            >
              {generating && (
                <div
                  style={{
                    position: 'absolute' as const,
                    inset: 0,
                    background: 'rgba(255,255,255,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '18px',
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
                background: 'var(--color-surface)',
                border: '1.5px dashed var(--color-line-2)',
                borderRadius: '18px',
                padding: '48px 32px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'var(--color-surface-2)',
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

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
