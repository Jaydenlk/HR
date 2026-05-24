'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SalaryEntry } from '@/lib/types';
import { BarChart2, Plus, X, Loader2, ChevronDown, ChevronUp, Filter } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface SalaryStats {
  count: number;
  median_total_comp: number | null;
  p25_total_comp: number | null;
  p75_total_comp: number | null;
  p90_total_comp: number | null;
  avg_total_comp: number | null;
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

// Static market percentile data from seed JSON (frontend-embedded for instant display)
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
  if (!pcts) return null;

  const maxComp = pcts.P90.total_comp;
  const markers = [
    { label: 'P25', value: pcts.P25.total_comp, color: 'var(--color-ink-4)' },
    { label: 'P50', value: pcts.P50.total_comp, color: 'var(--color-ink-3)' },
    { label: 'P75', value: pcts.P75.total_comp, color: 'var(--color-brand)' },
    { label: 'P90', value: pcts.P90.total_comp, color: '#f59e0b' },
  ];

  // Determine user position
  let userPosition: string | null = null;
  if (userTotalComp != null) {
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
            2025-2026 · 应届校招 · 一线城市
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
                'linear-gradient(to right, var(--color-surface-3), var(--color-brand), #f59e0b)',
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
                  background: '#10b981',
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
              background: '#10b981',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '12.5px', color: '#10b981', fontWeight: 600 }}>
            你的定位 · {userPosition} 区间
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginLeft: 'auto' }}>
            总包 {formatSalary(userTotalComp)}/年
          </span>
        </div>
      )}
    </div>
  );
}

// ── Company Comparison Table ─────────────────────────────────────────────────

type SortKey = 'total_comp' | 'base_salary' | 'company';

function MarketTable({
  entries,
  roleFilter,
}: {
  entries: SalaryEntry[];
  roleFilter: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('total_comp');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterRole, setFilterRole] = useState(roleFilter);

  // Sync with external roleFilter prop
  useEffect(() => {
    setFilterRole(roleFilter);
  }, [roleFilter]);

  const marketEntries = entries.filter((e) => e.source === 'market');

  const filtered = filterRole
    ? marketEntries.filter((e) => e.role === filterRole)
    : marketEntries;

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'company') cmp = a.company.localeCompare(b.company);
    else cmp = (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
    return sortAsc ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setsSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }
  function setsSortAsc(v: boolean) { setSortAsc(v); }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
  };

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
              onClick={() => setFilterRole('')}
              style={{
                padding: '4px 10px',
                borderRadius: '16px',
                border: filterRole === '' ? 'none' : '1px solid var(--color-line)',
                background: filterRole === '' ? 'var(--color-brand)' : 'transparent',
                color: filterRole === '' ? '#fff' : 'var(--color-ink-3)',
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
                onClick={() => setFilterRole(r)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: filterRole === r ? 'none' : '1px solid var(--color-line)',
                  background: filterRole === r ? 'var(--color-brand)' : 'transparent',
                  color: filterRole === r ? '#fff' : 'var(--color-ink-3)',
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
            padding: '40px',
            textAlign: 'center',
            color: 'var(--color-ink-4)',
            fontSize: '13.5px',
          }}
        >
          暂无数据，请先运行 seed 脚本导入市场数据
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
                    公司 <SortIcon col="company" />
                  </span>
                </th>
                <th style={thStylePlain}>岗位</th>
                <th style={thStylePlain}>城市</th>
                <th style={thStylePlain}>等级</th>
                <th style={thStyle('base_salary')} onClick={() => toggleSort('base_salary')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    Base月薪 <SortIcon col="base_salary" />
                  </span>
                </th>
                <th style={thStyle('total_comp')} onClick={() => toggleSort('total_comp')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    总包年薪 <SortIcon col="total_comp" />
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

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SalaryPage() {
  const [entries, setEntries] = useState<SalaryEntry[]>([]);
  const [stats, setStats] = useState<SalaryStats | null>(null);
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
    fetchData();
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

            {/* Overall stats pill — only when there's data */}
            {stats && stats.count > 0 && (
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-line)',
                  borderRadius: '14px',
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--color-ink-4)', fontWeight: 600 }}>
                  全量数据 · {stats.count} 条
                </span>
                {[
                  { label: 'P25', val: stats.p25_total_comp },
                  { label: 'P50', val: stats.median_total_comp },
                  { label: 'P75', val: stats.p75_total_comp },
                  { label: 'P90', val: stats.p90_total_comp },
                ].map((item) => (
                  <span
                    key={item.label}
                    style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', fontWeight: 600 }}
                  >
                    <span style={{ color: 'var(--color-ink-4)', marginRight: '4px' }}>
                      {item.label}
                    </span>
                    {formatSalary(item.val)}
                  </span>
                ))}
              </div>
            )}

            {/* Market comparison table */}
            <MarketTable entries={entries} roleFilter={selectedRole} />

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
