'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { MockSession } from '@/lib/types';
import { MockSessionCard } from '@/components/mock/mock-session-card';
import { Play, X } from 'lucide-react';

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: '80px',
            borderRadius: '14px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-line)',
            opacity: 0.7,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}

interface NewSessionForm {
  company: string;
  role: string;
  jd_text: string;
}

export default function MockPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<MockSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NewSessionForm>({ company: '', role: '', jd_text: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // company_known: null=未查, true=命中, false=未命中
  const [companyKnown, setCompanyKnown] = useState<boolean | null>(null);
  // latest-wins: 每次发起新请求时中止上一次未完成的请求
  const checkAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    api
      .get<MockSession[]>('/mock-sessions')
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败');
        setLoading(false);
      });
  }, []);

  async function checkCompany(name: string) {
    if (!name.trim()) { setCompanyKnown(null); return; }
    // latest-wins: 中止上一次未完成的请求，防止旧响应覆盖新状态
    checkAbortRef.current?.abort();
    const controller = new AbortController();
    checkAbortRef.current = controller;
    try {
      const res = await api.get<{ company_known: boolean }>(
        `/mock-sessions/company-check?name=${encodeURIComponent(name.trim())}`,
        { signal: controller.signal },
      );
      setCompanyKnown(res.company_known);
    } catch {
      // AbortError 属正常取消，其余失败静默不阻断创建流程
      setCompanyKnown(null);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      const payload: Record<string, string> = {};
      if (form.company.trim()) payload.company = form.company.trim();
      if (form.role.trim()) payload.role = form.role.trim();
      if (form.jd_text.trim()) payload.jd_text = form.jd_text.trim();

      const session = await api.post<MockSession & { company_known: boolean }>('/mock-sessions', payload);
      setDialogOpen(false);
      setForm({ company: '', role: '', jd_text: '' });
      setCompanyKnown(null);
      router.push(`/mock/${session.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '创建失败');
      setCreating(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.4; }
        }
        .mock-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45);
          z-index: 400; display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .mock-dialog {
          background: var(--color-surface);
          border-radius: 20px;
          border: 1px solid var(--color-line);
          padding: 32px;
          width: 100%; max-width: 500px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18);
        }
      `}</style>

      {/* New session dialog */}
      {dialogOpen && (
        <div
          className="mock-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setDialogOpen(false); }}
        >
          <div className="mock-dialog">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
              }}
            >
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                开始新模拟
              </h2>
              <button
                onClick={() => setDialogOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-ink-3)',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-ink-3)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  公司（选填）
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, company: e.target.value }));
                    if (!e.target.value.trim()) setCompanyKnown(null);
                  }}
                  placeholder="如：字节跳动"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1.5px solid var(--color-line)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: 'var(--color-ink)',
                    background: 'var(--color-bg)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand)'; }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-line)';
                    void checkCompany(form.company);
                  }}
                />
                {companyKnown === false && (
                  <p style={{
                    margin: '6px 0 0',
                    fontSize: '12px',
                    color: 'var(--color-ink-3)',
                    lineHeight: 1.5,
                  }}>
                    该公司不在资料库，将以通用面试+JD 驱动出题，不会假装了解这家公司
                  </p>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-ink-3)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  岗位（必填）
                </label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="如：产品经理"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1.5px solid var(--color-line)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: 'var(--color-ink)',
                    background: 'var(--color-bg)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-line)'; }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-ink-3)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  职位描述 JD（选填）
                </label>
                <textarea
                  value={form.jd_text}
                  onChange={(e) => setForm((f) => ({ ...f, jd_text: e.target.value }))}
                  placeholder="粘贴 JD 以获得更精准的题目定制…"
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1.5px solid var(--color-line)',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    color: 'var(--color-ink)',
                    background: 'var(--color-bg)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    lineHeight: 1.6,
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-line)'; }}
                />
              </div>

              {createError && (
                <div
                  style={{
                    padding: '12px 16px',
                    background: 'var(--color-danger-soft)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: 'var(--color-danger)',
                    fontWeight: 500,
                  }}
                >
                  {createError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                <button
                  onClick={() => void handleCreate()}
                  disabled={creating || !form.role.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: 'var(--color-brand)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: creating || !form.role.trim() ? 'not-allowed' : 'pointer',
                    opacity: creating || !form.role.trim() ? 0.7 : 1,
                    transition: 'opacity 0.12s',
                  }}
                >
                  <Play size={16} />
                  {creating ? '正在生成题目…' : '开始模拟面试'}
                </button>
                <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>
                  本场约消耗 7 点（出题 1 点 + 每题作答 1 点 × 5 + 总评 1 点）
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          maxWidth: '760px',
          margin: '0 auto',
          padding: '48px 32px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
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
              模拟面试
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
              AI 实时反馈，提升面试表达
            </p>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--color-brand)',
              color: '#fff',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.12s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <Play size={16} />
            开始新模拟
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              background: 'var(--color-danger-soft)',
              borderRadius: '14px',
              color: 'var(--color-danger)',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        ) : sessions.length === 0 ? (
          <div
            style={{
              padding: '64px 32px',
              textAlign: 'center',
              background: 'var(--color-surface)',
              borderRadius: '16px',
              border: '1.5px dashed var(--color-line-2)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'var(--color-surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Play size={26} color="var(--color-ink-4)" />
            </div>
            <p
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--color-ink-2)',
                marginBottom: '8px',
                letterSpacing: '-0.01em',
              }}
            >
              还没有模拟记录
            </p>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--color-ink-4)',
                marginBottom: '24px',
              }}
            >
              开始你的第一次模拟面试，AI 实时打分并给出反馈
            </p>
            <button
              onClick={() => setDialogOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: 'var(--color-brand)',
                color: '#fff',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Play size={15} />
              开始第一次模拟
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sessions.map((session) => (
              <MockSessionCard
                key={session.id}
                session={session}
                onClick={() => router.push(`/mock/${session.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
