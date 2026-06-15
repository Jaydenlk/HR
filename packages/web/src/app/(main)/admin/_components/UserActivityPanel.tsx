'use client';

/**
 * UserActivityPanel — 单用户活动明细抽屉
 *
 * 隐私铁律：只展示计数级数据（各端点调用次数、成功率），
 * 绝不展示任何正文（简历原文/对话内容/转写/JD 原文）。
 *
 * 数据来源：
 *   GET /admin/user-activity?userId=&from=&to=  → AdminUserActivity
 *   GET /admin/success-stats?days=              → AdminSuccessStats[]
 */

import { useEffect, useState } from 'react';
import { X, Activity, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import type { AdminUserActivity, AdminSuccessStats } from '@/lib/types';

// ─── 样式常量(对齐 page.tsx 玻璃 UI 体系)────────────────────────────────────

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: '11.5px',
  fontWeight: 700,
  color: 'var(--color-ink-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  padding: '8px 10px',
  borderBottom: '1px solid var(--color-line)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--color-ink-2)',
  padding: '10px',
  borderBottom: '1px solid var(--color-line)',
  verticalAlign: 'middle',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11.5px',
  fontWeight: 700,
  color: 'var(--color-ink-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '6px',
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-line)',
  borderRadius: '8px',
  fontFamily: 'inherit',
  fontSize: '13px',
  color: 'var(--color-ink)',
  fontWeight: 500,
  outline: 'none',
  boxSizing: 'border-box',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--color-ink)',
  marginBottom: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

// ─── 成功率颜色映射 ────────────────────────────────────────────────────────────

function rateColor(rate: number | null): string {
  if (rate === null) return 'var(--color-ink-4)';
  if (rate >= 0.95) return 'var(--color-success)';
  if (rate >= 0.8) return 'var(--color-warning, #f59e0b)';
  return 'var(--color-danger)';
}

function fmtRate(rate: number | null): string {
  if (rate === null) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface UserActivityPanelProps {
  /** 被查询的用户 ID（UUID）；传 null 则收起抽屉 */
  userId: string | null;
  /** 用于标题展示的用户邮箱/姓名，纯标签，不上传后端 */
  userLabel?: string;
  onClose: () => void;
}

// ─── 组件 ──────────────────────────────────────────────────────────────────────

export function UserActivityPanel({ userId, userLabel, onClose }: UserActivityPanelProps) {
  // ── 查询参数 ──
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statsDays, setStatsDays] = useState(7);

  // ── 数据 ──
  const [activity, setActivity] = useState<AdminUserActivity | null>(null);
  const [stats, setStats] = useState<AdminSuccessStats[] | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [errorActivity, setErrorActivity] = useState<string | null>(null);
  const [errorStats, setErrorStats] = useState<string | null>(null);

  // ── UI 折叠 ──
  const [collapseAI, setCollapseAI] = useState(false);
  const [collapseCredit, setCollapseCredit] = useState(false);

  // userId 变化时重置并重新拉取
  useEffect(() => {
    if (!userId) return;
    void fetchActivity(userId, fromDate, toDate);
    void fetchStats(statsDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function fetchActivity(uid: string, from: string, to: string) {
    setLoadingActivity(true);
    setErrorActivity(null);
    try {
      const params = new URLSearchParams({ userId: uid });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const data = await api.get<AdminUserActivity>(`/admin/user-activity?${params.toString()}`);
      setActivity(data);
    } catch (err) {
      setErrorActivity(err instanceof Error ? err.message : '加载活动数据失败');
    } finally {
      setLoadingActivity(false);
    }
  }

  async function fetchStats(days: number) {
    setLoadingStats(true);
    setErrorStats(null);
    try {
      const data = await api.get<AdminSuccessStats[]>(`/admin/success-stats?days=${days}`);
      setStats(data);
    } catch (err) {
      setErrorStats(err instanceof Error ? err.message : '加载成功率数据失败');
    } finally {
      setLoadingStats(false);
    }
  }

  function handleFilter() {
    if (!userId) return;
    void fetchActivity(userId, fromDate, toDate);
  }

  function handleStatsQuery() {
    void fetchStats(statsDays);
  }

  // 抽屉未打开时不渲染
  if (!userId) return null;

  return (
    // 遮罩层，点击空白关闭
    <div
      role="dialog"
      aria-modal="true"
      aria-label="用户活动明细"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 500,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* 抽屉主体 */}
      <div
        className="lg"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '540px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
          overflow: 'hidden',
        }}
      >
        {/* ── 标题栏 ── */}
        <div
          style={{
            padding: '20px 22px 16px',
            borderBottom: '1px solid var(--color-line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} style={{ color: 'var(--color-brand)' }} />
            <div>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  letterSpacing: '-0.01em',
                }}
              >
                用户活动明细
              </div>
              {userLabel && (
                <div style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginTop: '2px' }}>
                  {userLabel}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
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

        {/* ── 滚动主体 ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 32px' }}>

          {/* ── 隐私声明横幅 ── */}
          <div
            style={{
              background: 'rgba(47,143,255,0.07)',
              border: '1px solid rgba(47,143,255,0.18)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '12.5px',
              color: 'var(--color-ink-3)',
              marginBottom: '20px',
              lineHeight: 1.6,
            }}
          >
            本面板仅展示<strong style={{ color: 'var(--color-ink-2)' }}>计数级数据</strong>，不含任何简历/对话/转写/JD 正文。
          </div>

          {/* ── 时间筛选 ── */}
          <div
            className="lg"
            style={{
              padding: '16px 18px',
              marginBottom: '20px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'flex-end',
            }}
          >
            <div style={{ flex: '1 1 140px' }}>
              <label style={labelStyle}>开始日期</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <label style={labelStyle}>结束日期</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>
            <button
              type="button"
              onClick={handleFilter}
              disabled={loadingActivity}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-default)',
                border: 'none',
                background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loadingActivity ? 'not-allowed' : 'pointer',
                opacity: loadingActivity ? 0.7 : 1,
                whiteSpace: 'nowrap',
                boxShadow: '0 8px 22px -12px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
                flexShrink: 0,
              }}
            >
              {loadingActivity ? '查询中…' : '筛选'}
            </button>
          </div>

          {/* ── 活动明细区块 ── */}
          {errorActivity && (
            <ErrorBanner message={errorActivity} />
          )}

          {loadingActivity ? (
            <LoadingRow />
          ) : activity ? (
            <>
              {/* 统计摘要 */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                  marginBottom: '20px',
                }}
              >
                <StatCard label="AI 调用总次数" value={activity.aiCallsTotal} />
                <StatCard label="积分消耗总次数" value={activity.creditConsumeTotal} />
              </div>

              {/* AI 调用按端点 */}
              <CollapsibleSection
                title="AI 调用次数（按端点）"
                count={activity.aiCallsByEndpoint.length}
                collapsed={collapseAI}
                onToggle={() => setCollapseAI((v) => !v)}
              >
                {activity.aiCallsByEndpoint.length === 0 ? (
                  <EmptyHint text="该时段无 AI 调用记录" />
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>端点</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>调用次数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.aiCallsByEndpoint.map((row) => (
                          <tr key={row.endpoint}>
                            <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                              {row.endpoint}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--color-ink)' }}>
                              {row.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CollapsibleSection>

              {/* 积分消耗按端点 */}
              <CollapsibleSection
                title="积分消耗次数（按端点）"
                count={activity.creditConsumeByEndpoint.length}
                collapsed={collapseCredit}
                onToggle={() => setCollapseCredit((v) => !v)}
              >
                {activity.creditConsumeByEndpoint.length === 0 ? (
                  <EmptyHint text="该时段无积分消耗记录" />
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>端点</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>消耗次数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.creditConsumeByEndpoint.map((row, idx) => (
                          <tr key={row.endpoint ?? `__null_${idx}`}>
                            <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                              {row.endpoint ?? <span style={{ color: 'var(--color-ink-4)' }}>（未记录端点）</span>}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--color-ink)' }}>
                              {row.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CollapsibleSection>
            </>
          ) : null}

          {/* ── 分割线 ── */}
          <div style={{ height: '1px', background: 'var(--color-line)', margin: '24px 0' }} />

          {/* ── 全平台成功率区块 ── */}
          <div style={{ ...sectionTitle }}>
            全平台 AI 成功率（近 N 日）
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-end',
              marginBottom: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '0 0 120px' }}>
              <label style={labelStyle}>统计天数</label>
              <input
                type="number"
                min={1}
                max={90}
                value={statsDays}
                onChange={(e) => setStatsDays(Math.max(1, Math.min(90, Number(e.target.value))))}
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>
            <button
              type="button"
              onClick={handleStatsQuery}
              disabled={loadingStats}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-default)',
                border: '1px solid var(--hair)',
                background: 'rgba(47,143,255,.05)',
                color: 'var(--color-ink)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loadingStats ? 'not-allowed' : 'pointer',
                opacity: loadingStats ? 0.7 : 1,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {loadingStats ? '查询中…' : '查询'}
            </button>
          </div>

          {errorStats && (
            <ErrorBanner message={errorStats} />
          )}

          {loadingStats ? (
            <LoadingRow />
          ) : stats && stats.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>日期</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>成功</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>失败</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>成功率</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((row) => (
                    <tr key={row.date}>
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {row.date}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-success)', fontWeight: 600 }}>
                        {row.success}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: row.failed > 0 ? 'var(--color-danger)' : 'var(--color-ink-4)', fontWeight: row.failed > 0 ? 600 : 400 }}>
                        {row.failed}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'right',
                          fontWeight: 700,
                          color: rateColor(row.success_rate),
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12.5px',
                        }}
                      >
                        {fmtRate(row.success_rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : stats && stats.length === 0 ? (
            <EmptyHint text="该时段无 AI 调用记录" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── 子组件 ────────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="lg"
      style={{
        flex: '1 1 140px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  count,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 0 10px 0',
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {title}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-ink-4)',
              background: 'var(--color-line)',
              borderRadius: '10px',
              padding: '1px 7px',
            }}
          >
            {count}
          </span>
        </span>
        {collapsed ? (
          <ChevronDown size={15} style={{ color: 'var(--color-ink-3)' }} />
        ) : (
          <ChevronUp size={15} style={{ color: 'var(--color-ink-3)' }} />
        )}
      </button>
      {!collapsed && <div>{children}</div>}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        background: 'var(--color-danger-soft)',
        color: 'var(--color-danger)',
        borderRadius: '8px',
        padding: '10px 12px',
        fontSize: '13px',
        marginBottom: '16px',
        fontWeight: 500,
      }}
    >
      <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
      {message}
    </div>
  );
}

function LoadingRow() {
  return (
    <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
      <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-ink-3)' }} />
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div style={{ fontSize: '13px', color: 'var(--color-ink-4)', padding: '10px 0' }}>
      {text}
    </div>
  );
}
