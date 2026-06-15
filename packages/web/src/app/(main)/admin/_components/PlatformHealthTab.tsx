'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import type { AdminHealthSnapshot, AdminSuccessStats, AdminOpsDailyStats } from '@/lib/types';
import { Loader2, Activity, Database, Cpu, TrendingDown, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

// ─── 共享样式(与 admin/page.tsx 对齐)────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  padding: '20px 22px',
};

const sectionTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontFamily: 'var(--serif)',
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--color-ink)',
  letterSpacing: '-0.01em',
  marginBottom: '16px',
};

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

// ─── 本地辅助 ─────────────────────────────────────────────────────────────────

/** 秒 → 可读形式：「X 天 Y 时 Z 分」 */
function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d} 天`);
  if (h > 0) parts.push(`${h} 时`);
  parts.push(`${m} 分`);
  return parts.join(' ');
}

/** 成功率 → 颜色语义 */
function rateColor(rate: number | null): string {
  if (rate === null) return 'var(--color-ink-4)';
  if (rate >= 0.95) return 'var(--color-success)';
  if (rate >= 0.8) return '#f59e0b'; // 警告色
  return 'var(--color-danger)';
}

/** 近 7 日成功/失败数据 → 简单横向条形图宽度百分比（基于最大值归一） */
function barWidth(value: number, max: number): string {
  if (max === 0) return '0%';
  return `${Math.round((value / max) * 100)}%`;
}

// ─── 组件入口 ─────────────────────────────────────────────────────────────────

export default function PlatformHealthTab() {
  const [health, setHealth] = useState<AdminHealthSnapshot | null>(null);
  const [stats, setStats] = useState<AdminSuccessStats[]>([]);
  const [opsStats, setOpsStats] = useState<AdminOpsDailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // refreshTick 是触发刷新的信号;点刷新按钮时递增,useEffect 监听它
  const refreshTick = useRef(0);
  const [tick, setTick] = useState(0);

  function triggerRefresh() {
    refreshTick.current += 1;
    setRefreshing(true);
    setTick(refreshTick.current);
  }

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      if (tick === 0) setLoading(true);
      setError(null);
      try {
        // 成功/失败/成功率 → success-stats（与 LogCenterTab/UserActivityPanel 同源）。
        // AI 降级/队列满每日计数 → ops-stats（DailyStats 按日聚合,稀疏数组）。
        const [h, s, ops] = await Promise.all([
          api.get<AdminHealthSnapshot>('/admin/health-snapshot'),
          api.get<AdminSuccessStats[]>('/admin/success-stats?days=7'),
          api.get<AdminOpsDailyStats[]>('/admin/ops-stats?days=7'),
        ]);
        if (cancelled) return;
        setHealth(h);
        setStats(s);
        setOpsStats(ops);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
    void fetchAll();
    return () => { cancelled = true; };
  }, [tick]);

  // ── 按日索引 ops-stats（降级/队列满每日计数,DailyStats 稀疏数组）────────────
  const opsByDate: Record<string, AdminOpsDailyStats> = {};
  for (const row of opsStats) {
    opsByDate[row.date] = row;
  }

  // 合并:以 success-stats（近 7 日、每天连续填充）为脊柱,按日期键并入 ops-stats 计数。
  // 成功/失败/成功率全部来自 success-stats;AI 降级 = AI_FAILOVER+AI_BOTH_DOWN+AI_CALL_FAILED;队列满 = QUEUE_FULL。
  const mergedRows = stats.map((s) => {
    const ops = opsByDate[s.date];
    return {
      date: s.date,
      success: s.success,
      failed: s.failed,
      success_rate: s.success_rate,
      failover: ops ? ops.AI_FAILOVER + ops.AI_BOTH_DOWN + ops.AI_CALL_FAILED : 0,
      queueFull: ops ? ops.QUEUE_FULL : 0,
    };
  });

  // 算条形图归一化基准
  const maxSuccess = Math.max(...mergedRows.map((r) => r.success), 1);

  if (loading) {
    return (
      <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-ink-3)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        style={{
          background: 'var(--color-danger-soft)',
          color: 'var(--color-danger)',
          borderRadius: '10px',
          padding: '14px 16px',
          fontSize: '13.5px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <XCircle size={16} />
        {error}
        <button
          type="button"
          onClick={triggerRefresh}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: '1px solid var(--color-danger)',
            borderRadius: '6px',
            color: 'var(--color-danger)',
            fontSize: '12px',
            padding: '4px 10px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── 刷新按钮 ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={triggerRefresh}
          disabled={refreshing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            background: 'rgba(47,143,255,.06)',
            border: '1px solid var(--hair)',
            borderRadius: 'var(--radius-default)',
            color: 'var(--color-ink)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: refreshing ? 'not-allowed' : 'pointer',
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? '刷新中…' : '刷新'}
        </button>
      </div>

      {/* ── 进程 + DB 探活概览 ── */}
      {health && (
        <div className="lg" style={cardStyle}>
          <div style={sectionTitleStyle}>
            <Activity size={17} /> 进程 &amp; 数据库状态
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>

            {/* 整体状态徽章 */}
            <div
              style={{
                flex: '0 0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                minWidth: '120px',
                padding: '16px 20px',
                background: health.status === 'ok'
                  ? 'rgba(34,197,94,.06)'
                  : 'rgba(239,68,68,.06)',
                borderRadius: '12px',
                border: `1px solid ${health.status === 'ok' ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)'}`,
              }}
            >
              {health.status === 'ok'
                ? <CheckCircle2 size={28} style={{ color: 'var(--color-success)' }} />
                : <XCircle size={28} style={{ color: 'var(--color-danger)' }} />}
              <span
                style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: health.status === 'ok' ? 'var(--color-success)' : 'var(--color-danger)',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                }}
              >
                {health.status === 'ok' ? '运行正常' : '异常'}
              </span>
            </div>

            {/* 指标格 */}
            <div
              style={{
                flex: '1 1 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '14px',
              }}
            >
              {/* Uptime */}
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-ink-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '4px',
                  }}
                >
                  进程 Uptime
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-ink)' }}>
                  {formatUptime(health.uptime)}
                </div>
              </div>

              {/* 版本 */}
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-ink-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '4px',
                  }}
                >
                  版本
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-ink)',
                  }}
                >
                  {health.version}
                </div>
              </div>

              {/* DB 探活 */}
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-ink-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Database size={11} /> 数据库
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {health.db === 'ok'
                    ? <CheckCircle2 size={15} style={{ color: 'var(--color-success)' }} />
                    : <XCircle size={15} style={{ color: 'var(--color-danger)' }} />}
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: health.db === 'ok' ? 'var(--color-success)' : 'var(--color-danger)',
                    }}
                  >
                    {health.db === 'ok' ? '连通' : '异常'}
                  </span>
                </div>
              </div>

              {/* 快照时间 */}
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-ink-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '4px',
                  }}
                >
                  快照时间
                </div>
                <div
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--color-ink-2)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {new Date(health.timestamp).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 并发护栏状态 ── */}
      {health && (
        <div className="lg" style={cardStyle}>
          <div style={sectionTitleStyle}>
            <Cpu size={17} /> 并发护栏
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
            {/* active */}
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--color-ink-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '4px',
                }}
              >
                活跃请求
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: health.concurrency.active > 0 ? 'var(--color-brand)' : 'var(--color-ink-3)',
                  lineHeight: 1,
                }}
              >
                {health.concurrency.active}
              </div>
            </div>
            {/* queued */}
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--color-ink-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '4px',
                }}
              >
                排队中
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: health.concurrency.queued > 0 ? 'var(--color-danger)' : 'var(--color-ink-3)',
                  lineHeight: 1,
                }}
              >
                {health.concurrency.queued}
              </div>
            </div>
            {/* 压力状态 */}
            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: health.concurrency.under_pressure
                  ? 'rgba(239,68,68,.06)'
                  : 'rgba(34,197,94,.06)',
                border: `1px solid ${health.concurrency.under_pressure ? 'rgba(239,68,68,.2)' : 'rgba(34,197,94,.2)'}`,
                fontSize: '13px',
                fontWeight: 700,
                color: health.concurrency.under_pressure ? 'var(--color-danger)' : 'var(--color-success)',
              }}
            >
              {health.concurrency.under_pressure
                ? <><XCircle size={14} /> 队列有压力</>
                : <><CheckCircle2 size={14} /> 无排队压力</>}
            </div>
          </div>
        </div>
      )}

      {/* ── 近 7 日 AI 成功/失败 + 降级/队列满趋势 ── */}
      <div className="lg" style={cardStyle}>
        <div style={sectionTitleStyle}>
          <TrendingDown size={17} /> 近 7 日 AI 成功率 / 降级 / 队列满趋势
        </div>

        {mergedRows.length === 0 ? (
          <div style={{ fontSize: '13.5px', color: 'var(--color-ink-4)', padding: '8px 0' }}>
            暂无数据（后端 /admin/success-stats 尚未返回记录）
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>日期</th>
                  <th style={thStyle}>成功</th>
                  <th style={{ ...thStyle, minWidth: '160px' }}>趋势（成功）</th>
                  <th style={thStyle}>失败</th>
                  <th style={thStyle}>成功率</th>
                  <th style={thStyle}>AI 降级次数</th>
                  <th style={thStyle}>队列满次数</th>
                </tr>
              </thead>
              <tbody>
                {mergedRows.map((row) => (
                  <tr key={row.date}>
                    <td
                      style={{
                        ...tdStyle,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12.5px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.date}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--color-ink)' }}>
                      {row.success}
                    </td>
                    {/* 内联小条形图 */}
                    <td style={tdStyle}>
                      <div
                        style={{
                          height: '8px',
                          borderRadius: '4px',
                          background: 'var(--color-line)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: barWidth(row.success, maxSuccess),
                            background: 'var(--color-brand)',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: row.failed > 0 ? 700 : undefined,
                        color: row.failed > 0 ? 'var(--color-danger)' : 'var(--color-ink-4)',
                      }}
                    >
                      {row.failed}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                        color: rateColor(row.success_rate),
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {row.success_rate === null
                        ? '—'
                        : `${(row.success_rate * 100).toFixed(1)}%`}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: row.failover > 0 ? 700 : undefined,
                        color: row.failover > 0 ? '#f59e0b' : 'var(--color-ink-4)',
                      }}
                    >
                      {row.failover > 0 ? row.failover : '—'}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: row.queueFull > 0 ? 700 : undefined,
                        color: row.queueFull > 0 ? 'var(--color-danger)' : 'var(--color-ink-4)',
                      }}
                    >
                      {row.queueFull > 0 ? row.queueFull : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 图例 */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid var(--color-line)',
          }}
        >
          {[
            { color: 'var(--color-brand)', label: '成功调用（ai_usage）' },
            { color: 'var(--color-danger)', label: '失败调用（ops_events AI 失败类）' },
            { color: '#f59e0b', label: 'AI 降级（AI_FAILOVER / AI_BOTH_DOWN / AI_CALL_FAILED）' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-ink-3)' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '3px',
                  background: color,
                  flexShrink: 0,
                }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
