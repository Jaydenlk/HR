'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SalaryEntry, SalaryAnalysisResult, CityIndustryFitResult, FitMatrixItem } from '@/lib/types';
import { BarChart2, Plus, X, Loader2, ChevronDown, ChevronUp, Filter, Sparkles, AlertCircle, CheckCircle, MapPin } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

// 后端 /salary/stats 按公司×岗位聚合返回数组，每项含 count/avg_base/avg_total。
// 前端汇总展示：total count + 按 avg_total 排序后的前几项代表性数据。
interface SalaryStatRow {
  company: string;
  role: string;
  avg_base: number | null;
  avg_total: number | null;
  count: number;
}

interface PercentileData {
  base_salary: number;
  total_comp: number;
  description: string;
}

interface RolePercentiles {
  P25: PercentileData;
  P50: PercentileData;
  P75: PercentileData;
  P90: PercentileData;
}

// 参考基准数据（非实时 API 数据）：来自种子样本，仅供横向参考，不代表当前市场行情。
const MARKET_PERCENTILES: Record<string, RolePercentiles> = {
  前端工程师: {
    P25: { base_salary: 21000, total_comp: 340000, description: '二线厂/普通offer档，如网易普通、顺丰、去哪儿等' },
    P50: { base_salary: 26000, total_comp: 420000, description: '一线大厂普通offer档，如字节普通、腾讯普通、阿里普通' },
    P75: { base_salary: 30000, total_comp: 510000, description: '一线大厂SP档，如字节SP、腾讯SP、拼多多SP' },
    P90: { base_salary: 35000, total_comp: 600000, description: '一线大厂SSP档，如字节SSP、腾讯SSP、小红书SSP' },
  },
  后端工程师: {
    P25: { base_salary: 22000, total_comp: 360000, description: '二线厂/普通offer档，如百度普通、度小满、顺丰等' },
    P50: { base_salary: 27000, total_comp: 450000, description: '一线大厂普通offer档，如字节普通、腾讯普通、京东普通' },
    P75: { base_salary: 31000, total_comp: 560000, description: '一线大厂SP档，如字节SP、腾讯SP、拼多多SP' },
    P90: { base_salary: 36000, total_comp: 650000, description: '一线大厂SSP档，如拼多多SSP、腾讯SSP、京东SSP' },
  },
  算法工程师: {
    P25: { base_salary: 26000, total_comp: 420000, description: '中厂/普通offer档，如百度普通、网易普通等' },
    P50: { base_salary: 32000, total_comp: 540000, description: '一线大厂SP档，如字节SP、阿里SP' },
    P75: { base_salary: 38000, total_comp: 680000, description: '一线大厂SSP档，如腾讯SSP、阿里SSP' },
    P90: { base_salary: 45000, total_comp: 800000, description: '顶级SSP+/大模型方向，如拼多多SSP+、字节SSP+' },
  },
  数据工程师: {
    P25: { base_salary: 20000, total_comp: 330000, description: '二线厂/普通offer档' },
    P50: { base_salary: 26000, total_comp: 430000, description: '一线大厂普通/SP档，如字节普通、阿里普通' },
    P75: { base_salary: 30000, total_comp: 520000, description: '一线大厂SP档' },
    P90: { base_salary: 35000, total_comp: 620000, description: '一线大厂SSP档' },
  },
  产品经理: {
    P25: { base_salary: 16000, total_comp: 260000, description: '中小厂/普通offer档' },
    P50: { base_salary: 21000, total_comp: 350000, description: '一线大厂普通offer档，如字节普通、美团普通' },
    P75: { base_salary: 25000, total_comp: 430000, description: '一线大厂SP档' },
    P90: { base_salary: 30000, total_comp: 520000, description: '一线大厂SSP档' },
  },
};

const ROLES = ['前端工程师', '后端工程师', '算法工程师', '数据工程师', '产品经理'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatSalary(val: number | null | undefined): string {
  if (val == null) return '—';
  if (val >= 10000) return `${(val / 10000).toFixed(1)}w`;
  return `${val.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

// ── Submit Dialog ─────────────────────────────────────────────────────────────

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

    // #56 — number legitimacy + positive + consistency validation
    const baseSalary = Number(form.base_salary);
    const totalComp = Number(form.total_comp);
    const bonus = form.bonus ? Number(form.bonus) : null;
    const stockValue = form.stock_value ? Number(form.stock_value) : null;

    if (!Number.isFinite(baseSalary) || !Number.isFinite(totalComp)) {
      setError('月薪和总包必须为有效数字');
      return;
    }
    if (baseSalary <= 0) {
      setError('月薪必须为正数（元/月）');
      return;
    }
    if (totalComp <= 0) {
      setError('总包必须为正数（元/年）');
      return;
    }
    if (baseSalary > 500000) {
      setError('月薪超出合理范围（最大 500,000 元/月）');
      return;
    }
    if (totalComp > 10000000) {
      setError('总包超出合理范围（最大 10,000,000 元/年）');
      return;
    }
    // 月薪 × 12 不应超过总包（总包 = 月薪 × N + 奖金 + 股票，月薪已是最低底数）
    if (baseSalary * 12 > totalComp) {
      setError('月薪 × 12 不能超过总包年薪，请检查数值是否填错');
      return;
    }
    if (bonus !== null && (!Number.isFinite(bonus) || bonus < 0)) {
      setError('年终奖必须为非负数');
      return;
    }
    if (stockValue !== null && (!Number.isFinite(stockValue) || stockValue < 0)) {
      setError('股票价值必须为非负数');
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

// ── Market Benchmark Section ─────────────────────────────────────────────────

function MarketBenchmark({
  selectedRole,
  onRoleChange,
  userTotalComp,
}: {
  selectedRole: string;
  onRoleChange: (role: string) => void;
  userTotalComp: number | null;
}) {
  const pcts = MARKET_PERCENTILES[selectedRole];

  const maxComp = pcts ? pcts.P90.total_comp : 0;
  const markers = pcts
    ? [
        { label: 'P25', value: pcts.P25.total_comp, color: 'var(--color-ink-4)' },
        { label: 'P50', value: pcts.P50.total_comp, color: 'var(--color-ink-3)' },
        { label: 'P75', value: pcts.P75.total_comp, color: 'var(--color-brand)' },
        { label: 'P90', value: pcts.P90.total_comp, color: 'var(--color-warn, #f59e0b)' },
      ]
    : [];

  // Determine user position
  let userPosition: string | null = null;
  if (pcts && userTotalComp != null) {
    if (userTotalComp >= pcts.P90.total_comp) userPosition = 'P90+';
    else if (userTotalComp >= pcts.P75.total_comp) userPosition = 'P75-P90';
    else if (userTotalComp >= pcts.P50.total_comp) userPosition = 'P50-P75';
    else if (userTotalComp >= pcts.P25.total_comp) userPosition = 'P25-P50';
    else userPosition = 'P25以下';
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: '18px',
        padding: '22px 24px',
      }}
    >
      {/* Header + role tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '18px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '-0.008em',
              color: 'var(--color-ink)',
            }}
          >
            市场薪资基准
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--color-ink-4)' }}>
            整理参考基准（非实时 API 数据）· 2025-2026 · 应届校招 · 一线城市
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => onRoleChange(r)}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                border: selectedRole === r ? 'none' : '1px solid var(--color-line)',
                background: selectedRole === r ? 'var(--color-brand)' : 'transparent',
                color: selectedRole === r ? '#fff' : 'var(--color-ink-3)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {r.replace('工程师', '').replace('经理', 'PM')}
            </button>
          ))}
        </div>
      </div>

      {!pcts ? (
        /* Placeholder — selectedRole 为空或未知（如点击「全部」），仍保留上方角色 tab 供用户回到具体岗位 */
        <div
          style={{
            padding: '28px 20px',
            background: 'var(--color-surface-2)',
            borderRadius: '12px',
            border: '1px dashed var(--color-line)',
            textAlign: 'center',
            color: 'var(--color-ink-3)',
            fontSize: '13px',
            fontWeight: 500,
            lineHeight: 1.6,
          }}
        >
          选择上方岗位查看薪资基准
        </div>
      ) : (
        <>
      {/* Percentile cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          marginBottom: '18px',
        }}
      >
        {markers.map((m) => {
          const pctKey = m.label as keyof RolePercentiles;
          const desc = pcts[pctKey].description;
          return (
            <div
              key={m.label}
              style={{
                padding: '14px 14px 12px',
                background: 'var(--color-surface-2)',
                borderRadius: '12px',
                borderTop: `3px solid ${m.color}`,
              }}
            >
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: m.color,
                  letterSpacing: '0.04em',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                {m.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--color-ink)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                }}
              >
                {formatSalary(m.value)}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--color-ink-4)',
                  marginTop: '4px',
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                月薪 {(pcts[pctKey].base_salary / 1000).toFixed(0)}k
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--color-ink-4)',
                  marginTop: '4px',
                  lineHeight: 1.4,
                }}
              >
                {desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual bar */}
      <div>
        <div
          style={{
            position: 'relative',
            height: '8px',
            background: 'var(--color-surface-2)',
            borderRadius: '4px',
            overflow: 'visible',
          }}
        >
          {/* Gradient fill */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '100%',
              background:
                'linear-gradient(to right, var(--color-surface-3), var(--color-brand), var(--color-warn, #f59e0b))',
              borderRadius: '4px',
            }}
          />
          {/* Marker ticks */}
          {markers.map((m) => {
            const pct = (m.value / maxComp) * 100;
            return (
              <div
                key={m.label}
                style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  top: '-4px',
                  bottom: '-4px',
                  width: '2px',
                  background: 'var(--color-surface)',
                  transform: 'translateX(-50%)',
                }}
              />
            );
          })}
          {/* User indicator */}
          {userTotalComp != null && (
            <div
              style={{
                position: 'absolute',
                left: `${Math.min((userTotalComp / maxComp) * 100, 100)}%`,
                top: '-6px',
                transform: 'translateX(-50%)',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: 'var(--color-success, #10b981)',
                  border: '2px solid var(--color-surface)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }}
              />
            </div>
          )}
        </div>
        {/* Scale labels */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '6px',
          }}
        >
          {markers.map((m) => (
            <span
              key={m.label}
              style={{
                fontSize: '10px',
                color: 'var(--color-ink-4)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}
            >
              {formatSalary(m.value)}
            </span>
          ))}
        </div>
      </div>

      {/* User position badge */}
      {userPosition && (
        <div
          style={{
            marginTop: '14px',
            padding: '9px 14px',
            background: 'rgba(16,185,129,0.08)',
            borderRadius: '8px',
            border: '1px solid rgba(16,185,129,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--color-success, #10b981)',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '12.5px', color: 'var(--color-success, #10b981)', fontWeight: 600 }}>
            你的定位 · {userPosition} 区间
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginLeft: 'auto' }}>
            总包 {formatSalary(userTotalComp)}/年
          </span>
        </div>
      )}
        </>
      )}
    </div>
  );
}

// ── Company Comparison Table ─────────────────────────────────────────────────

type SortKey = 'total_comp' | 'base_salary' | 'company';

function SortIcon({ col, sortKey, sortAsc }: { col: SortKey; sortKey: SortKey; sortAsc: boolean }) {
  if (sortKey !== col) return null;
  return sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
}

function MarketTable({
  entries,
  roleFilter,
  onRoleFilterChange,
  onSubmitOffer,
}: {
  entries: SalaryEntry[];
  roleFilter: string;
  onRoleFilterChange: (role: string) => void;
  onSubmitOffer: () => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('total_comp');
  const [sortAsc, setSortAsc] = useState(false);

  const marketEntries = entries.filter((e) => e.source === 'market');

  const filtered = roleFilter
    ? marketEntries.filter((e) => e.role === roleFilter)
    : marketEntries;

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'company') cmp = a.company.localeCompare(b.company);
    else cmp = (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
    return sortAsc ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  const thStyle = (col: SortKey): React.CSSProperties => ({
    padding: '10px 16px',
    textAlign: 'left',
    fontSize: '10.5px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: sortKey === col ? 'var(--color-brand)' : 'var(--color-ink-3)',
    fontWeight: 700,
    background: 'var(--color-surface-2)',
    borderBottom: '1px solid var(--color-line)',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
  });

  const thStylePlain: React.CSSProperties = {
    padding: '10px 16px',
    textAlign: 'left',
    fontSize: '10.5px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'var(--color-ink-3)',
    fontWeight: 700,
    background: 'var(--color-surface-2)',
    borderBottom: '1px solid var(--color-line)',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: '18px',
        overflow: 'hidden',
      }}
    >
      {/* Table header */}
      <div
        style={{
          padding: '16px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--color-line)',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '-0.008em',
            }}
          >
            市场 Offer 对比
          </h3>
          <span
            style={{
              fontSize: '11.5px',
              color: 'var(--color-ink-3)',
              fontWeight: 500,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {sorted.length} 条
          </span>
        </div>
        {/* Role filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={12} color="var(--color-ink-4)" />
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onRoleFilterChange('')}
              style={{
                padding: '4px 10px',
                borderRadius: '16px',
                border: roleFilter === '' ? 'none' : '1px solid var(--color-line)',
                background: roleFilter === '' ? 'var(--color-brand)' : 'transparent',
                color: roleFilter === '' ? '#fff' : 'var(--color-ink-3)',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              全部
            </button>
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => onRoleFilterChange(r)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: roleFilter === r ? 'none' : '1px solid var(--color-line)',
                  background: roleFilter === r ? 'var(--color-brand)' : 'transparent',
                  color: roleFilter === r ? '#fff' : 'var(--color-ink-3)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {r.replace('工程师', '').replace('经理', 'PM')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div
          style={{
            padding: '36px 40px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-ink-3)', fontWeight: 600 }}>
            暂无{roleFilter ? `「${roleFilter}」的` : ''}市场 offer 数据
          </p>
          <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-ink-4)', lineHeight: 1.5 }}>
            提交你的 offer，帮助补全这一岗位的真实薪资样本
          </p>
          <button
            onClick={onSubmitOffer}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--color-brand)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginTop: '4px',
            }}
          >
            <Plus size={14} />
            提交我的 offer
          </button>
        </div>
      ) : (
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
                <th style={thStyle('company')} onClick={() => toggleSort('company')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    公司 <SortIcon col="company" sortKey={sortKey} sortAsc={sortAsc} />
                  </span>
                </th>
                <th style={thStylePlain}>岗位</th>
                <th style={thStylePlain}>城市</th>
                <th style={thStylePlain}>等级</th>
                <th style={thStyle('base_salary')} onClick={() => toggleSort('base_salary')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    Base月薪 <SortIcon col="base_salary" sortKey={sortKey} sortAsc={sortAsc} />
                  </span>
                </th>
                <th style={thStyle('total_comp')} onClick={() => toggleSort('total_comp')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    总包年薪 <SortIcon col="total_comp" sortKey={sortKey} sortAsc={sortAsc} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry) => (
                <tr key={entry.id} style={{ transition: 'background 0.1s' }}>
                  <td
                    style={{
                      padding: '11px 16px',
                      borderBottom: '1px solid var(--color-line)',
                      color: 'var(--color-ink)',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.company}
                  </td>
                  <td
                    style={{
                      padding: '11px 16px',
                      borderBottom: '1px solid var(--color-line)',
                      color: 'var(--color-ink-2)',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.role}
                  </td>
                  <td
                    style={{
                      padding: '11px 16px',
                      borderBottom: '1px solid var(--color-line)',
                      color: 'var(--color-ink-3)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {entry.location ?? '—'}
                  </td>
                  <td
                    style={{
                      padding: '11px 16px',
                      borderBottom: '1px solid var(--color-line)',
                      color: 'var(--color-ink-3)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11.5px',
                    }}
                  >
                    {entry.level ?? '—'}
                  </td>
                  <td
                    style={{
                      padding: '11px 16px',
                      borderBottom: '1px solid var(--color-line)',
                      color: 'var(--color-ink-2)',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                    }}
                  >
                    {entry.base_salary.toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: '11px 16px',
                      borderBottom: '1px solid var(--color-line)',
                      color: 'var(--color-brand)',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatSalary(entry.total_comp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── User Offers Table ─────────────────────────────────────────────────────────

function UserOffersTable({ entries }: { entries: SalaryEntry[] }) {
  const userEntries = entries.filter((e) => e.source !== 'market');
  if (userEntries.length === 0) return null;

  return (
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
          我的 Offer
        </h3>
        <span
          style={{
            fontSize: '11.5px',
            color: 'var(--color-ink-3)',
            fontWeight: 500,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {userEntries.length} 条
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
            {userEntries.map((entry) => (
              <tr key={entry.id}>
                <td style={{ padding: '11px 18px', borderBottom: '1px solid var(--color-line)', color: 'var(--color-ink)', fontWeight: 700 }}>
                  {entry.company}
                </td>
                <td style={{ padding: '11px 18px', borderBottom: '1px solid var(--color-line)', color: 'var(--color-ink-2)', fontWeight: 500 }}>
                  {entry.role}
                </td>
                <td style={{ padding: '11px 18px', borderBottom: '1px solid var(--color-line)', color: 'var(--color-ink-3)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                  {entry.location ?? '—'}
                </td>
                <td style={{ padding: '11px 18px', borderBottom: '1px solid var(--color-line)', color: 'var(--color-ink-2)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                  {entry.base_salary.toLocaleString()}
                </td>
                <td style={{ padding: '11px 18px', borderBottom: '1px solid var(--color-line)', color: 'var(--color-ink-2)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                  {entry.bonus != null ? entry.bonus.toLocaleString() : '—'}
                </td>
                <td style={{ padding: '11px 18px', borderBottom: '1px solid var(--color-line)', color: 'var(--color-ink-2)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                  {entry.stock_value != null ? entry.stock_value.toLocaleString() : '—'}
                </td>
                <td style={{ padding: '11px 18px', borderBottom: '1px solid var(--color-line)', color: 'var(--color-brand)', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '14px' }}>
                  {entry.total_comp.toLocaleString()}
                </td>
                <td style={{ padding: '11px 18px', borderBottom: '1px solid var(--color-line)', color: 'var(--color-ink-3)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                  {entry.level ?? '—'}
                </td>
                <td style={{ padding: '11px 18px', borderBottom: '1px solid var(--color-line)', color: 'var(--color-ink-4)', fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 500 }}>
                  {formatDate(entry.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── AI Salary Analysis Section ───────────────────────────────────────────────

interface AnalysisFormData {
  role: string;
  city: string;
  company: string;
}

type AnalysisState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'insufficient'; questions: string[]; missing: string[] }
  | { kind: 'result'; data: SalaryAnalysisResult };

function gradeColor(grade: string): string {
  if (grade === 'A') return 'var(--color-success, #10b981)';
  if (grade === 'B') return 'var(--color-brand)';
  if (grade === 'C') return 'var(--color-warn, #f59e0b)';
  return 'var(--color-ink-4)';
}

function confidenceLabel(c: string): string {
  const map: Record<string, string> = {
    high: '高置信度',
    medium: '中置信度',
    low: '低置信度（历史数据）',
    insufficient: '数据不足',
  };
  return map[c] ?? c;
}

function AiAnalysisSection() {
  const [form, setForm] = useState<AnalysisFormData>({ role: '', city: '', company: '' });
  const [state, setState] = useState<AnalysisState>({ kind: 'idle' });

  function setField(key: keyof AnalysisFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!form.role.trim()) {
      setState({ kind: 'error', message: '请填写岗位名称' });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const payload: Record<string, string> = { role: form.role.trim() };
      if (form.city.trim()) payload.city = form.city.trim();
      if (form.company.trim()) payload.company = form.company.trim();

      const result = await api.post<SalaryAnalysisResult>('/salary/analyze', payload);

      if (result.confidence === 'insufficient') {
        setState({
          kind: 'insufficient',
          questions: result.follow_up_questions,
          missing: result.cannot_determine,
        });
        return;
      }
      setState({ kind: 'result', data: result });
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : '分析失败，请稍后重试',
      });
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
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: '18px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 22px',
          borderBottom: '1px solid var(--color-line)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Sparkles size={16} color="var(--color-brand)" />
        <h3
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 700,
            letterSpacing: '-0.008em',
            color: 'var(--color-ink)',
          }}
        >
          AI 对标分析
        </h3>
        <span
          style={{
            fontSize: '11.5px',
            color: 'var(--color-ink-4)',
            marginLeft: '4px',
            fontWeight: 500,
          }}
        >
          输入岗位/城市，获取实时薪资对标
        </span>
      </div>

      <div style={{ padding: '20px 22px' }}>
        {/* Form */}
        <form onSubmit={handleAnalyze}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>岗位 *</label>
              <input
                style={inputStyle}
                value={form.role}
                onChange={(e) => setField('role', e.target.value)}
                placeholder="后端工程师"
                disabled={state.kind === 'loading'}
              />
            </div>
            <div>
              <label style={labelStyle}>城市</label>
              <input
                style={inputStyle}
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                placeholder="北京"
                disabled={state.kind === 'loading'}
              />
            </div>
            <div>
              <label style={labelStyle}>公司（可选）</label>
              <input
                style={inputStyle}
                value={form.company}
                onChange={(e) => setField('company', e.target.value)}
                placeholder="字节跳动"
                disabled={state.kind === 'loading'}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={state.kind === 'loading'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 20px',
              borderRadius: '10px',
              border: 'none',
              background: state.kind === 'loading' ? 'var(--color-surface-3)' : 'var(--color-brand)',
              color: state.kind === 'loading' ? 'var(--color-ink-3)' : '#fff',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: state.kind === 'loading' ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {state.kind === 'loading' ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                分析中…
              </>
            ) : (
              <>
                <Sparkles size={14} />
                开始分析
              </>
            )}
          </button>
        </form>

        {/* States */}
        {state.kind === 'error' && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'var(--color-danger-soft)',
              color: 'var(--color-danger)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={14} />
            {state.message}
          </div>
        )}

        {state.kind === 'insufficient' && (
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-line)',
            }}
          >
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 700,
                color: 'var(--color-ink-2)',
                marginBottom: '10px',
              }}
            >
              需要更多信息才能完成分析
            </div>
            {state.missing.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                {state.missing.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--color-ink-3)',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px',
                    }}
                  >
                    <span style={{ color: 'var(--color-warn, #f59e0b)', flexShrink: 0 }}>•</span>
                    {m}
                  </div>
                ))}
              </div>
            )}
            {state.questions.map((q, i) => (
              <div
                key={i}
                style={{
                  fontSize: '13px',
                  color: 'var(--color-brand)',
                  fontWeight: 600,
                  marginTop: '6px',
                }}
              >
                {q}
              </div>
            ))}
          </div>
        )}

        {state.kind === 'result' && (
          <AnalysisResultPanel data={state.data} />
        )}
      </div>
    </div>
  );
}

function AnalysisResultPanel({ data }: { data: SalaryAnalysisResult }) {
  return (
    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Summary + confidence */}
      <div
        style={{
          padding: '14px 16px',
          background: 'var(--color-surface-2)',
          borderRadius: '12px',
          border: '1px solid var(--color-line)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '20px',
              background:
                data.confidence === 'high'
                  ? 'rgba(16,185,129,0.1)'
                  : data.confidence === 'medium'
                    ? 'rgba(99,102,241,0.1)'
                    : 'rgba(245,158,11,0.1)',
              color:
                data.confidence === 'high'
                  ? 'var(--color-success, #10b981)'
                  : data.confidence === 'medium'
                    ? 'var(--color-brand)'
                    : 'var(--color-warn, #f59e0b)',
              letterSpacing: '0.02em',
            }}
          >
            {confidenceLabel(data.confidence)}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 600 }}>
            {data.data_freshness === 'fresh'
              ? '实时数据'
              : data.data_freshness === 'stale'
                ? '历史知识库（非实时，仅供参考）'
                : '数据暂不可用'}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.6 }}>
          {data.summary}
        </p>
      </div>

      {/* Salary range */}
      {data.salary_range && (
        <div
          style={{
            padding: '16px',
            background: 'var(--color-surface)',
            borderRadius: '12px',
            border: '1px solid var(--color-line)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink-2)' }}>
              薪资区间 · {data.salary_range.city} · {data.salary_range.role}
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '20px',
                background: `${gradeColor(data.salary_range.grade)}22`,
                color: gradeColor(data.salary_range.grade),
                fontWeight: 700,
              }}
            >
              {data.salary_range.grade} 级数据
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { label: 'P25', value: data.salary_range.p25, color: 'var(--color-ink-4)' },
              { label: 'P50 (中位数)', value: data.salary_range.p50, color: 'var(--color-brand)' },
              { label: 'P75', value: data.salary_range.p75, color: 'var(--color-warn, #f59e0b)' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: '12px',
                  background: 'var(--color-surface-2)',
                  borderRadius: '10px',
                  borderTop: `3px solid ${item.color}`,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: item.color,
                    letterSpacing: '0.04em',
                    marginBottom: '6px',
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--color-ink)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatSalary(item.value)}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--color-ink-4)', marginTop: '3px' }}>
                  {data.salary_range!.unit === 'annual_rmb' ? '元/年' : '元/月'}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--color-ink-4)' }}>
            数据年份：{data.salary_range.year} ·{' '}
            {data.salary_range.freshness === 'stale' ? '历史数据，非实时' : '实时数据'}
          </div>
        </div>
      )}

      {/* Breakdown */}
      {data.breakdown && Object.keys(data.breakdown).length > 0 && (
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--color-surface)',
            borderRadius: '12px',
            border: '1px solid var(--color-line)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink-3)', marginBottom: '10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            薪资组成分解
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {data.breakdown.base_monthly != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-ink-3)' }}>月基本工资</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-ink)' }}>
                  {data.breakdown.base_monthly.toLocaleString()} 元
                </span>
              </div>
            )}
            {data.breakdown.months_per_year != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-ink-3)' }}>年薪月数</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-ink)' }}>
                  {data.breakdown.months_per_year} 薪
                </span>
              </div>
            )}
            {data.breakdown.annual_bonus && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-ink-3)' }}>年终奖</span>
                <span style={{ fontWeight: 600, color: 'var(--color-ink-2)' }}>{data.breakdown.annual_bonus}</span>
              </div>
            )}
            {data.breakdown.equity && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-ink-3)' }}>股权/期权</span>
                <span style={{ fontWeight: 600, color: 'var(--color-ink-2)' }}>{data.breakdown.equity}（建议核实）</span>
              </div>
            )}
            {data.breakdown.social_insurance && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-ink-3)' }}>社保公积金</span>
                <span style={{ fontWeight: 600, color: 'var(--color-ink-2)' }}>{data.breakdown.social_insurance}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data sources */}
      {data.data_sources.length > 0 && (
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--color-surface)',
            borderRadius: '12px',
            border: '1px solid var(--color-line)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink-3)', marginBottom: '10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            数据来源 · 置信度
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {data.data_sources.map((src, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    fontSize: '10.5px',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: `${gradeColor(src.grade)}20`,
                    color: gradeColor(src.grade),
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {src.grade}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--color-ink-2)', fontWeight: 500 }}>
                  {src.source_name}
                </span>
                {src.date && (
                  <span style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', marginLeft: 'auto' }}>
                    {src.date}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison */}
      {data.comparison.length > 0 && (
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--color-surface)',
            borderRadius: '12px',
            border: '1px solid var(--color-line)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink-3)', marginBottom: '10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            横向对比
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.comparison.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-ink-3)' }}>{c.dimension}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{c.value}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: `${gradeColor(c.grade)}20`,
                      color: gradeColor(c.grade),
                      fontWeight: 700,
                    }}
                  >
                    {c.grade}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {data.recommendations.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                background: 'rgba(16,185,129,0.06)',
                borderRadius: '10px',
                border: '1px solid rgba(16,185,129,0.15)',
                fontSize: '13px',
                color: 'var(--color-ink-2)',
              }}
            >
              <CheckCircle size={13} color="var(--color-success, #10b981)" style={{ flexShrink: 0, marginTop: '2px' }} />
              {r}
            </div>
          ))}
        </div>
      )}

      {/* Next actions */}
      {data.next_actions.length > 0 && (
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--color-surface)',
            borderRadius: '12px',
            border: '1px solid var(--color-line)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink-3)', marginBottom: '10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            下一步行动
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.next_actions.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.5 }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'var(--color-surface-3)',
                    color: 'var(--color-ink-3)',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    marginTop: '1px',
                  }}
                >
                  {i + 1}
                </span>
                {a}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── City × Industry Fit Section ──────────────────────────────────────────────

interface CityFitFormData {
  skills: string;
  current_role: string;
  years_of_experience: string;
  industry_background: string;
  location: string;
  salary_expectation: string;
}

type CityFitState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'insufficient'; questions: string[]; missing: string[] }
  | { kind: 'result'; data: CityIndustryFitResult };

function fitScoreColor(score: number): string {
  if (score >= 75) return 'var(--color-success, #10b981)';
  if (score >= 55) return 'var(--color-brand)';
  if (score >= 35) return 'var(--color-warn, #f59e0b)';
  return 'var(--color-ink-4)';
}

function FitMatrixCard({ item }: { item: FitMatrixItem }) {
  const color = fitScoreColor(item.fit_score);
  const breakdown = [
    { label: '技能匹配', value: item.fit_breakdown.skill_match, weight: '40%' },
    { label: '职业天花板', value: item.fit_breakdown.career_ceiling, weight: '30%' },
    { label: '成本可持续', value: item.fit_breakdown.cost_sustainability, weight: '20%' },
    { label: '约束满足', value: item.fit_breakdown.constraint_satisfaction, weight: '10%' },
  ];

  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--color-surface-2)',
        borderRadius: '14px',
        border: `2px solid ${color}33`,
      }}
    >
      {/* City × Industry header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)' }}>
            {item.city}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-ink-3)', margin: '0 6px' }}>×</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
            {item.industry}
          </span>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '22px',
            fontWeight: 900,
            color,
            letterSpacing: '-0.03em',
          }}
        >
          {item.fit_score}
        </div>
      </div>

      {/* Breakdown bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
        {breakdown.map((b) => (
          <div key={b.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-ink-3)', fontWeight: 600 }}>
                {b.label} <span style={{ color: 'var(--color-ink-4)', fontWeight: 400 }}>({b.weight})</span>
              </span>
              <span style={{ fontSize: '11px', color: fitScoreColor(b.value), fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {b.value}
              </span>
            </div>
            <div
              style={{
                height: '4px',
                background: 'var(--color-surface-3)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${b.value}%`,
                  background: fitScoreColor(b.value),
                  borderRadius: '2px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Evidence basis */}
      {item.evidence_basis.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {item.evidence_basis.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
              <span style={{ color: color, fontSize: '10px', flexShrink: 0, marginTop: '2px' }}>▸</span>
              <span style={{ fontSize: '11px', color: 'var(--color-ink-3)', lineHeight: 1.4 }}>{e}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CityFitResultPanel({ data }: { data: CityIndustryFitResult }) {
  const inputStyle: React.CSSProperties = {
    fontSize: '11.5px',
    fontWeight: 700,
    color: data.confidence === 'high'
      ? 'var(--color-success, #10b981)'
      : data.confidence === 'medium'
        ? 'var(--color-brand)'
        : 'var(--color-warn, #f59e0b)',
    padding: '2px 8px',
    borderRadius: '20px',
    background: data.confidence === 'high'
      ? 'rgba(16,185,129,0.1)'
      : data.confidence === 'medium'
        ? 'rgba(99,102,241,0.1)'
        : 'rgba(245,158,11,0.1)',
    letterSpacing: '0.02em',
  };

  const confidenceLabel = { high: '高置信度', medium: '中置信度', low: '低置信度', insufficient: '数据不足' };

  return (
    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Summary */}
      <div
        style={{
          padding: '14px 16px',
          background: 'var(--color-surface-2)',
          borderRadius: '12px',
          border: '1px solid var(--color-line)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={inputStyle}>{confidenceLabel[data.confidence] ?? data.confidence}</span>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.6 }}>
          {data.summary}
        </p>
      </div>

      {/* Recommendation highlight */}
      {data.recommendation && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <CheckCircle size={14} color="var(--color-success, #10b981)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span style={{ fontSize: '13.5px', color: 'var(--color-ink)', fontWeight: 600, lineHeight: 1.5 }}>
            {data.recommendation}
          </span>
        </div>
      )}

      {/* Fit matrix */}
      {data.fit_matrix.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink-3)', marginBottom: '10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            适配矩阵
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {[...data.fit_matrix]
              .sort((a, b) => b.fit_score - a.fit_score)
              .map((item, i) => (
                <FitMatrixCard key={i} item={item} />
              ))}
          </div>
        </div>
      )}

      {/* Cost of living */}
      {data.cost_of_living_impact.length > 0 && (
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--color-surface)',
            borderRadius: '12px',
            border: '1px solid var(--color-line)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink-3)', marginBottom: '10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            生活成本分析
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.cost_of_living_impact.map((c, i) => (
              <div key={i} style={{ paddingBottom: '12px', borderBottom: i < data.cost_of_living_impact.length - 1 ? '1px solid var(--color-line)' : 'none' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-ink)', marginBottom: '6px' }}>{c.city}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-ink-2)' }}>
                    <span style={{ color: 'var(--color-ink-4)', fontWeight: 600 }}>薪资范围：</span>{c.typical_salary_range}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-ink-2)' }}>
                    <span style={{ color: 'var(--color-ink-4)', fontWeight: 600 }}>住房成本：</span>{c.housing_cost_note}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-ink-2)' }}>
                    <span style={{ color: 'var(--color-ink-4)', fontWeight: 600 }}>购买力：</span>{c.purchasing_power_note}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Industry hub */}
      {data.industry_hub_analysis.length > 0 && (
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--color-surface)',
            borderRadius: '12px',
            border: '1px solid var(--color-line)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink-3)', marginBottom: '10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            产业集群分析
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.industry_hub_analysis.map((h, i) => (
              <div key={i} style={{ paddingBottom: '12px', borderBottom: i < data.industry_hub_analysis.length - 1 ? '1px solid var(--color-line)' : 'none' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-ink)', marginBottom: '6px' }}>{h.city}</div>
                {h.key_companies.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                    {h.key_companies.map((c, j) => (
                      <span key={j} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-line)', color: 'var(--color-ink-2)', fontWeight: 600 }}>
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: 'var(--color-ink-3)', lineHeight: 1.5, marginBottom: '4px' }}>{h.cluster_effect}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--color-ink-4)', fontWeight: 600 }}>天花板：</span>{h.career_ceiling}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations & risks */}
      {(data.recommendations.length > 0 || data.risks.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {data.recommendations.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.recommendations.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', padding: '9px 12px', background: 'rgba(16,185,129,0.06)', borderRadius: '9px', border: '1px solid rgba(16,185,129,0.15)', fontSize: '12.5px', color: 'var(--color-ink-2)' }}>
                  <CheckCircle size={12} color="var(--color-success, #10b981)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  {r}
                </div>
              ))}
            </div>
          )}
          {data.risks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.risks.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', padding: '9px 12px', background: 'rgba(245,158,11,0.06)', borderRadius: '9px', border: '1px solid rgba(245,158,11,0.15)', fontSize: '12.5px', color: 'var(--color-ink-2)' }}>
                  <AlertCircle size={12} color="var(--color-warn, #f59e0b)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CityIndustryFitSection() {
  const [form, setForm] = useState<CityFitFormData>({
    skills: '',
    current_role: '',
    years_of_experience: '',
    industry_background: '',
    location: '',
    salary_expectation: '',
  });
  const [state, setState] = useState<CityFitState>({ kind: 'idle' });

  function setField(key: keyof CityFitFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!form.skills.trim() && !form.current_role.trim()) {
      setState({ kind: 'error', message: '请至少填写核心技能或当前岗位' });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const profile: Record<string, unknown> = {};
      if (form.skills.trim()) {
        profile.skills = form.skills.split(/[,，、\s]+/).map((s) => s.trim()).filter(Boolean);
      }
      if (form.current_role.trim()) profile.current_role = form.current_role.trim();
      if (form.years_of_experience.trim()) profile.years_of_experience = form.years_of_experience.trim();
      if (form.industry_background.trim()) profile.industry_background = form.industry_background.trim();
      const constraints: Record<string, string> = {};
      if (form.location.trim()) constraints.location = form.location.trim();
      if (form.salary_expectation.trim()) constraints.salary_expectation = form.salary_expectation.trim();
      if (Object.keys(constraints).length > 0) profile.constraints = constraints;

      const result = await api.post<CityIndustryFitResult>('/salary/city-industry-fit', { profile });

      if (result.confidence === 'insufficient') {
        setState({
          kind: 'insufficient',
          questions: result.follow_up_questions,
          missing: result.cannot_determine,
        });
        return;
      }
      setState({ kind: 'result', data: result });
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : '分析失败，请稍后重试',
      });
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
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: '18px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 22px',
          borderBottom: '1px solid var(--color-line)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <MapPin size={16} color="var(--color-brand)" />
        <h3
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 700,
            letterSpacing: '-0.008em',
            color: 'var(--color-ink)',
          }}
        >
          城市 × 行业适配
        </h3>
        <span
          style={{
            fontSize: '11.5px',
            color: 'var(--color-ink-4)',
            marginLeft: '4px',
            fontWeight: 500,
          }}
        >
          基于 profile 分析最适合你的城市×行业组合
        </span>
      </div>

      <div style={{ padding: '20px 22px' }}>
        {/* Form */}
        <form onSubmit={handleAnalyze}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>核心技能（逗号分隔）</label>
              <input
                style={inputStyle}
                value={form.skills}
                onChange={(e) => setField('skills', e.target.value)}
                placeholder="Java, Spring Boot, MySQL, Redis"
                disabled={state.kind === 'loading'}
              />
            </div>
            <div>
              <label style={labelStyle}>当前/目标岗位</label>
              <input
                style={inputStyle}
                value={form.current_role}
                onChange={(e) => setField('current_role', e.target.value)}
                placeholder="后端工程师"
                disabled={state.kind === 'loading'}
              />
            </div>
            <div>
              <label style={labelStyle}>工作年限</label>
              <input
                style={inputStyle}
                value={form.years_of_experience}
                onChange={(e) => setField('years_of_experience', e.target.value)}
                placeholder="3年"
                disabled={state.kind === 'loading'}
              />
            </div>
            <div>
              <label style={labelStyle}>城市偏好（可选）</label>
              <input
                style={inputStyle}
                value={form.location}
                onChange={(e) => setField('location', e.target.value)}
                placeholder="北京、上海"
                disabled={state.kind === 'loading'}
              />
            </div>
            <div>
              <label style={labelStyle}>薪资期望（可选）</label>
              <input
                style={inputStyle}
                value={form.salary_expectation}
                onChange={(e) => setField('salary_expectation', e.target.value)}
                placeholder="30k-40k"
                disabled={state.kind === 'loading'}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={state.kind === 'loading'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 20px',
              borderRadius: '10px',
              border: 'none',
              background: state.kind === 'loading' ? 'var(--color-surface-3)' : 'var(--color-brand)',
              color: state.kind === 'loading' ? 'var(--color-ink-3)' : '#fff',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: state.kind === 'loading' ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {state.kind === 'loading' ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                分析中…
              </>
            ) : (
              <>
                <MapPin size={14} />
                开始适配分析
              </>
            )}
          </button>
        </form>

        {/* States */}
        {state.kind === 'error' && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'var(--color-danger-soft)',
              color: 'var(--color-danger)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={14} />
            {state.message}
          </div>
        )}

        {state.kind === 'insufficient' && (
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-line)',
            }}
          >
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 700,
                color: 'var(--color-ink-2)',
                marginBottom: '10px',
              }}
            >
              需要更多信息才能完成适配分析
            </div>
            {state.missing.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                {state.missing.map((m, i) => (
                  <div
                    key={i}
                    style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', marginBottom: '4px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}
                  >
                    <span style={{ color: 'var(--color-warn, #f59e0b)', flexShrink: 0 }}>•</span>
                    {m}
                  </div>
                ))}
              </div>
            )}
            {state.questions.map((q, i) => (
              <div key={i} style={{ fontSize: '13px', color: 'var(--color-brand)', fontWeight: 600, marginTop: '6px' }}>
                {q}
              </div>
            ))}
          </div>
        )}

        {state.kind === 'result' && (
          <CityFitResultPanel data={state.data} />
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SalaryPage() {
  const [entries, setEntries] = useState<SalaryEntry[]>([]);
  const [statsRows, setStatsRows] = useState<SalaryStatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('后端工程师');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [entriesData, statsData] = await Promise.all([
        api.get<SalaryEntry[]>('/salary'),
        api.get<SalaryStatRow[]>('/salary/stats'),
      ]);
      setEntries(entriesData);
      setStatsRows(Array.isArray(statsData) ? statsData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchData();
    })();
  }, [fetchData]);

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

  // Find user's total_comp for the selected role (first self entry matching role)
  const userOffer = entries.find(
    (e) => e.source !== 'market' && e.role === selectedRole,
  );
  const userTotalComp = userOffer?.total_comp ?? null;

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
            {/* Market Benchmark — always shown */}
            <MarketBenchmark
              selectedRole={selectedRole}
              onRoleChange={setSelectedRole}
              userTotalComp={userTotalComp}
            />

            {/* AI 对标分析 */}
            <AiAnalysisSection />

            {/* 城市 × 行业适配 */}
            <CityIndustryFitSection />

            {/* Overall stats pill — only when there's data (按公司×岗位聚合行渲染) */}
            {statsRows.length > 0 && (
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-line)',
                  borderRadius: '14px',
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--color-ink-4)', fontWeight: 600 }}>
                  全量数据 · {statsRows.reduce((s, r) => s + r.count, 0)} 条
                </span>
                {statsRows
                  .filter((r) => r.avg_total != null)
                  .sort((a, b) => (b.avg_total ?? 0) - (a.avg_total ?? 0))
                  .slice(0, 5)
                  .map((r) => (
                    <span
                      key={`${r.company}-${r.role}`}
                      style={{ fontSize: '12px', color: 'var(--color-ink-2)', fontWeight: 600 }}
                    >
                      <span style={{ color: 'var(--color-ink-4)', marginRight: '4px' }}>
                        {r.company} · {r.role}
                      </span>
                      均 {formatSalary(r.avg_total)}/年
                    </span>
                  ))}
              </div>
            )}

            {/* Market comparison table */}
            <MarketTable
              entries={entries}
              roleFilter={selectedRole}
              onRoleFilterChange={setSelectedRole}
              onSubmitOffer={() => setDialogOpen(true)}
            />

            {/* User's own offers — only shown if they've submitted any */}
            <UserOffersTable entries={entries} />

            {/* Empty state for user — when no self entries exist */}
            {entries.filter((e) => e.source !== 'market').length === 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '36px 32px',
                  textAlign: 'center',
                  background: 'var(--color-surface)',
                  borderRadius: '16px',
                  border: '1.5px dashed var(--color-line-2)',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'var(--color-surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BarChart2 size={22} color="var(--color-ink-4)" />
                </div>
                <p
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--color-ink-2)',
                    letterSpacing: '-0.01em',
                    margin: 0,
                  }}
                >
                  提交你的 offer，看看市场定位
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-ink-4)', margin: 0 }}>
                  匿名提交，帮助更多人了解真实薪资
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
                    marginTop: '4px',
                  }}
                >
                  <Plus size={15} />
                  提交我的第一个 offer
                </button>
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
