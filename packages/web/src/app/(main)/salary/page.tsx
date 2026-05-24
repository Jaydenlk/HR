'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SalaryEntry } from '@/lib/types';
import { BarChart2, Plus, X, Loader2 } from 'lucide-react';

interface SalaryStats {
  count: number;
  median_total_comp: number | null;
  p25_total_comp: number | null;
  p75_total_comp: number | null;
  p90_total_comp: number | null;
  avg_total_comp: number | null;
}

function formatSalary(val: number | null | undefined): string {
  if (val == null) return '—';
  if (val >= 10000) return `${(val / 10000).toFixed(1)}w`;
  return `${val.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

interface SubmitFormData {
  company: string;
  role: string;
  location: string;
  base_salary: string;
  bonus: string;
  stock_value: string;
  total_comp: string;
  level: string;
}

function SubmitDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (data: SubmitFormData) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<SubmitFormData>({
    company: '',
    role: '',
    location: '',
    base_salary: '',
    bonus: '',
    stock_value: '',
    total_comp: '',
    level: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof SubmitFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company || !form.role || !form.base_salary || !form.total_comp) {
      setError('请填写公司、岗位、月薪和总包');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-line)',
    borderRadius: '8px',
    fontFamily: 'inherit',
    fontSize: '13.5px',
    color: 'var(--color-ink)',
    fontWeight: 500,
    boxSizing: 'border-box',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11.5px',
    fontWeight: 700,
    color: 'var(--color-ink-2)',
    letterSpacing: '0.03em',
    marginBottom: '5px',
    textTransform: 'uppercase',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: '18px',
          padding: '28px 28px 24px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 24px 56px rgba(0,0,0,0.16)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '22px',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: 'var(--color-ink)',
            }}
          >
            提交我的 Offer
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-ink-3)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
          >
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>公司 *</label>
              <input
                style={inputStyle}
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="字节跳动"
              />
            </div>
            <div>
              <label style={labelStyle}>岗位 *</label>
              <input
                style={inputStyle}
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                placeholder="前端工程师"
              />
            </div>
            <div>
              <label style={labelStyle}>城市</label>
              <input
                style={inputStyle}
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="上海"
              />
            </div>
            <div>
              <label style={labelStyle}>月薪（元）*</label>
              <input
                style={inputStyle}
                type="number"
                value={form.base_salary}
                onChange={(e) => set('base_salary', e.target.value)}
                placeholder="32000"
              />
            </div>
            <div>
              <label style={labelStyle}>年终奖（元）</label>
              <input
                style={inputStyle}
                type="number"
                value={form.bonus}
                onChange={(e) => set('bonus', e.target.value)}
                placeholder="64000"
              />
            </div>
            <div>
              <label style={labelStyle}>股票（元/年）</label>
              <input
                style={inputStyle}
                type="number"
                value={form.stock_value}
                onChange={(e) => set('stock_value', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label style={labelStyle}>总包（元/年）*</label>
              <input
                style={inputStyle}
                type="number"
                value={form.total_comp}
                onChange={(e) => set('total_comp', e.target.value)}
                placeholder="448000"
              />
            </div>
            <div>
              <label style={labelStyle}>职级</label>
              <input
                style={inputStyle}
                value={form.level}
                onChange={(e) => set('level', e.target.value)}
                placeholder="P5 / T3 / M1"
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--color-danger-soft)',
                color: 'var(--color-danger)',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '20px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: '1px solid var(--color-line)',
                background: 'transparent',
                color: 'var(--color-ink-2)',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: submitting ? 'var(--color-surface-3)' : 'var(--color-brand)',
                color: submitting ? 'var(--color-ink-3)' : '#fff',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  提交中…
                </>
              ) : (
                '提交'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SalaryPage() {
  const [entries, setEntries] = useState<SalaryEntry[]>([]);
  const [stats, setStats] = useState<SalaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [entriesData, statsData] = await Promise.all([
        api.get<SalaryEntry[]>('/salary'),
        api.get<SalaryStats>('/salary/stats'),
      ]);
      setEntries(entriesData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [entriesData, statsData] = await Promise.all([
          api.get<SalaryEntry[]>('/salary'),
          api.get<SalaryStats>('/salary/stats'),
        ]);
        setEntries(entriesData);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(data: SubmitFormData) {
    const payload = {
      company: data.company,
      role: data.role,
      location: data.location || undefined,
      base_salary: Number(data.base_salary),
      bonus: data.bonus ? Number(data.bonus) : undefined,
      stock_value: data.stock_value ? Number(data.stock_value) : undefined,
      total_comp: Number(data.total_comp),
      level: data.level || undefined,
    };
    await api.post<SalaryEntry>('/salary', payload);
    setDialogOpen(false);
    await fetchData();
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-line)',
    borderRadius: '18px',
    padding: '20px 24px',
  };

  return (
    <>
      {dialogOpen && (
        <SubmitDialog onSubmit={handleSubmit} onClose={() => setDialogOpen(false)} />
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          padding: '40px 32px 32px',
          gap: '16px',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
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
              薪资雷达
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
              真实 offer 数据 · 匿名共享 · 已脱敏
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
            }}
          >
            <Plus size={16} />
            提交我的 offer
          </button>
        </div>

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
        ) : error ? (
          <div
            style={{
              padding: '24px',
              background: 'var(--color-danger-soft)',
              borderRadius: '14px',
              color: 'var(--color-danger)',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            {error}
            <div style={{ marginTop: '12px' }}>
              <button
                onClick={fetchData}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-danger)',
                  background: 'transparent',
                  color: 'var(--color-danger)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                重新加载
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Stats section */}
            {stats && stats.count > 0 && (
              <div style={cardStyle}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.5fr',
                    gap: '32px',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-ink-3)',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        display: 'block',
                        marginBottom: '6px',
                      }}
                    >
                      全部岗位 · 共 {stats.count} 条数据
                    </span>
                    <div
                      style={{
                        fontSize: '48px',
                        fontWeight: 800,
                        color: 'var(--color-brand)',
                        letterSpacing: '-0.03em',
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '6px',
                      }}
                    >
                      {formatSalary(stats.median_total_comp)}
                      <span
                        style={{
                          fontSize: '16px',
                          color: 'var(--color-ink-3)',
                          fontWeight: 600,
                        }}
                      >
                        / 年 · 中位
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '12.5px',
                        color: 'var(--color-ink-3)',
                        fontWeight: 500,
                        marginTop: '6px',
                      }}
                    >
                      P25 {formatSalary(stats.p25_total_comp)} · P75{' '}
                      {formatSalary(stats.p75_total_comp)} · P90{' '}
                      {formatSalary(stats.p90_total_comp)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '8px',
                    }}
                  >
                    {[
                      { label: 'P25', val: stats.p25_total_comp },
                      { label: 'P50 · 中位', val: stats.median_total_comp },
                      { label: 'P75', val: stats.p75_total_comp },
                      { label: 'P90', val: stats.p90_total_comp },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          padding: '12px 14px',
                          background: 'var(--color-surface-2)',
                          borderRadius: '10px',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '17px',
                            fontWeight: 800,
                            color: 'var(--color-ink)',
                            letterSpacing: '-0.005em',
                            display: 'block',
                          }}
                        >
                          {formatSalary(item.val)}
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-ink-3)',
                            fontWeight: 600,
                            display: 'block',
                            marginTop: '3px',
                          }}
                        >
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Entry list */}
            {entries.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '64px 32px',
                  textAlign: 'center',
                  background: 'var(--color-surface)',
                  borderRadius: '16px',
                  border: '1.5px dashed var(--color-line-2)',
                  gap: '12px',
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
                  }}
                >
                  <BarChart2 size={26} color="var(--color-ink-4)" />
                </div>
                <p
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--color-ink-2)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  还没有薪资数据
                </p>
                <p style={{ fontSize: '13.5px', color: 'var(--color-ink-4)' }}>
                  提交你的第一个 offer，帮助更多人了解真实薪资
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
                  <Plus size={15} />
                  提交我的第一个 offer
                </button>
              </div>
            ) : (
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-line)',
                  borderRadius: '18px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '16px 22px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderBottom: '1px solid var(--color-line)',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 700,
                      letterSpacing: '-0.008em',
                    }}
                  >
                    Offer 数据
                  </h3>
                  <span
                    style={{
                      fontSize: '11.5px',
                      color: 'var(--color-ink-3)',
                      fontWeight: 500,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    共 {entries.length} 条
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '13px',
                    }}
                  >
                    <thead>
                      <tr>
                        {['公司', '岗位', '城市', '月薪', '年终奖', '股票/年', '总包/年', '职级', '时间'].map(
                          (h) => (
                            <th
                              key={h}
                              style={{
                                padding: '10px 18px',
                                textAlign: 'left',
                                fontSize: '10.5px',
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                                color: 'var(--color-ink-3)',
                                fontWeight: 700,
                                background: 'var(--color-surface-2)',
                                borderBottom: '1px solid var(--color-line)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id}>
                          <td
                            style={{
                              padding: '11px 18px',
                              borderBottom: '1px solid var(--color-line)',
                              color: 'var(--color-ink)',
                              fontWeight: 700,
                            }}
                          >
                            {entry.company}
                          </td>
                          <td
                            style={{
                              padding: '11px 18px',
                              borderBottom: '1px solid var(--color-line)',
                              color: 'var(--color-ink-2)',
                              fontWeight: 500,
                            }}
                          >
                            {entry.role}
                          </td>
                          <td
                            style={{
                              padding: '11px 18px',
                              borderBottom: '1px solid var(--color-line)',
                              color: 'var(--color-ink-3)',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 500,
                            }}
                          >
                            {entry.location ?? '—'}
                          </td>
                          <td
                            style={{
                              padding: '11px 18px',
                              borderBottom: '1px solid var(--color-line)',
                              color: 'var(--color-ink-2)',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 500,
                            }}
                          >
                            {entry.base_salary.toLocaleString()}
                          </td>
                          <td
                            style={{
                              padding: '11px 18px',
                              borderBottom: '1px solid var(--color-line)',
                              color: 'var(--color-ink-2)',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 500,
                            }}
                          >
                            {entry.bonus != null ? entry.bonus.toLocaleString() : '—'}
                          </td>
                          <td
                            style={{
                              padding: '11px 18px',
                              borderBottom: '1px solid var(--color-line)',
                              color: 'var(--color-ink-2)',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 500,
                            }}
                          >
                            {entry.stock_value != null ? entry.stock_value.toLocaleString() : '—'}
                          </td>
                          <td
                            style={{
                              padding: '11px 18px',
                              borderBottom: '1px solid var(--color-line)',
                              color: 'var(--color-brand)',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 800,
                              fontSize: '14px',
                            }}
                          >
                            {entry.total_comp.toLocaleString()}
                          </td>
                          <td
                            style={{
                              padding: '11px 18px',
                              borderBottom: '1px solid var(--color-line)',
                              color: 'var(--color-ink-3)',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 500,
                            }}
                          >
                            {entry.level ?? '—'}
                          </td>
                          <td
                            style={{
                              padding: '11px 18px',
                              borderBottom: '1px solid var(--color-line)',
                              color: 'var(--color-ink-4)',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11.5px',
                              fontWeight: 500,
                            }}
                          >
                            {formatDate(entry.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
