'use client';

/**
 * 流水中心 Tab(页3)
 *
 * tabA — 报错流水
 *   上半:AI失败/扣点失败倒序翻页(GET /admin/error-stream?type=&limit=&offset=)
 *   下半:每日成功 vs 失败分层(GET /admin/success-stats?days=)
 *
 * tabB — 管理操作审计(GET /admin/error-stream?type=ADMIN_ACTION)
 *
 * 沿用玻璃 UI(.lg/cardStyle/thStyle),无 mock。
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AdminOpsEvent, AdminSuccessStats, OpsEventType } from '@/lib/types';
import { AlertTriangle, ClipboardList, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

// ─── 共享样式(与 page.tsx 保持一致)────────────────────────────────────────────

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

// ─── 常量 ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// tabA type 过滤器选项
const ERROR_FILTER_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '全部报错', value: '' },
  { label: 'AI 调用失败', value: 'AI_CALL_FAILED' },
  { label: 'AI 降级', value: 'AI_FAILOVER' },
  { label: 'AI 全挂', value: 'AI_BOTH_DOWN' },
  { label: '扣点失败', value: 'CREDIT_CONSUME_FAILED' },
];

// ─── 辅助函数 ────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

function eventTypeBadge(type: OpsEventType): React.ReactElement {
  const colorMap: Partial<Record<OpsEventType, { bg: string; color: string; label: string }>> = {
    AI_CALL_FAILED: { bg: 'var(--color-danger-soft)', color: 'var(--color-danger)', label: 'AI失败' },
    AI_FAILOVER: { bg: 'rgba(255,160,0,.12)', color: '#e08800', label: 'AI降级' },
    AI_BOTH_DOWN: { bg: 'var(--color-danger-soft)', color: 'var(--color-danger)', label: 'AI全挂' },
    CREDIT_CONSUME_FAILED: { bg: 'rgba(120,0,255,.08)', color: 'var(--color-brand)', label: '扣点失败' },
    ADMIN_ACTION: { bg: 'rgba(47,143,255,.10)', color: 'var(--color-brand)', label: '管理操作' },
    QUEUE_FULL: { bg: 'rgba(255,160,0,.12)', color: '#e08800', label: '队列满' },
  };
  const cfg = colorMap[type] ?? { bg: 'var(--color-surface)', color: 'var(--color-ink-3)', label: type };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 700,
        background: cfg.bg,
        color: cfg.color,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}

/** detail 对象展示为键值对列表（detail 已由后端白名单过滤） */
function DetailCell({ detail }: { detail: Record<string, unknown> | null }): React.ReactElement {
  if (!detail || Object.keys(detail).length === 0) {
    return <span style={{ color: 'var(--color-ink-4)' }}>—</span>;
  }
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--color-ink-3)',
        lineHeight: 1.6,
        maxWidth: '340px',
        wordBreak: 'break-all',
      }}
    >
      {Object.entries(detail).map(([k, v]) => (
        <div key={k}>
          <span style={{ color: 'var(--color-ink-2)', fontWeight: 600 }}>{k}</span>
          {': '}
          <span>{String(v ?? '')}</span>
        </div>
      ))}
    </div>
  );
}

// ─── 成功 vs 失败每日分层图 ──────────────────────────────────────────────────

function SuccessFailedChart({ rows }: { rows: AdminSuccessStats[] }): React.ReactElement {
  if (rows.length === 0) {
    return (
      <div style={{ fontSize: '13px', color: 'var(--color-ink-4)', padding: '8px 0' }}>
        暂无数据
      </div>
    );
  }

  const maxTotal = Math.max(...rows.map((r) => r.success + r.failed), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* 图例 */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-ink-3)' }}>
          <span
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              background: 'var(--color-success, #22c55e)',
            }}
          />
          成功
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-ink-3)' }}>
          <span
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              background: 'var(--color-danger, #ef4444)',
            }}
          />
          失败
        </div>
      </div>

      {/* 每日横向堆叠条 */}
      {[...rows].reverse().map((r) => {
        const total = r.success + r.failed;
        const successPct = total === 0 ? 0 : (r.success / maxTotal) * 100;
        const failedPct = total === 0 ? 0 : (r.failed / maxTotal) * 100;
        const rate =
          r.success_rate !== null ? `${(r.success_rate * 100).toFixed(1)}%` : '—';

        return (
          <div key={r.date} style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '26px' }}>
            {/* 日期 */}
            <div
              style={{
                width: '86px',
                fontSize: '12px',
                color: 'var(--color-ink-3)',
                flexShrink: 0,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {r.date.slice(5)} {/* MM-DD */}
            </div>

            {/* 堆叠条轨道 */}
            <div
              style={{
                flex: 1,
                height: '14px',
                borderRadius: '7px',
                background: 'var(--color-line)',
                overflow: 'hidden',
                display: 'flex',
              }}
            >
              {total > 0 && (
                <>
                  <div
                    style={{
                      width: `${successPct}%`,
                      background: 'var(--color-success, #22c55e)',
                      opacity: 0.85,
                      transition: 'width .3s ease',
                    }}
                  />
                  <div
                    style={{
                      width: `${failedPct}%`,
                      background: 'var(--color-danger, #ef4444)',
                      opacity: 0.75,
                      transition: 'width .3s ease',
                    }}
                  />
                </>
              )}
            </div>

            {/* 数值 */}
            <div
              style={{
                width: '112px',
                fontSize: '12px',
                color: 'var(--color-ink-3)',
                flexShrink: 0,
                textAlign: 'right',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span style={{ color: 'var(--color-success, #22c55e)', fontWeight: 700 }}>{r.success}</span>
              {' / '}
              <span style={{ color: 'var(--color-danger, #ef4444)', fontWeight: 700 }}>{r.failed}</span>
              {' '}
              <span style={{ color: 'var(--color-ink-4)' }}>({rate})</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── tabA 报错流水 ────────────────────────────────────────────────────────────

function ErrorStreamTab(): React.ReactElement {
  const [events, setEvents] = useState<AdminOpsEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const [stats, setStats] = useState<AdminSuccessStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);
  const [statsDays, setStatsDays] = useState(7);

  // 首次加载 + 过滤器/翻页变化时重新拉取
  const fetchEvents = useCallback(
    async (currentOffset: number, currentType: string) => {
      setLoadingEvents(true);
      setErrorEvents(null);
      try {
        // 拼接请求参数:type 有值时传入单个值(后端 @IsIn 只接受单值);
        // 无值(全部)时不传 type——后端不带 type 参数即返回全部失败类,绝不传多个 type
        const params = new URLSearchParams();
        params.set('limit', String(PAGE_SIZE));
        params.set('offset', String(currentOffset));
        if (currentType) {
          params.set('type', currentType);
        }
        // typeFilter='' 时不 append 任何 type 参数,后端返回所有失败类
        const raw = await api.get<AdminOpsEvent[] | { items: AdminOpsEvent[]; total: number }>(
          `/admin/error-stream?${params.toString()}`,
        );
        // 后端可能返回数组或 {items, total}
        if (Array.isArray(raw)) {
          setEvents(raw);
          // 满页才可能有下一页;不满页或空页则 hasMore=false
          setHasMore(raw.length === PAGE_SIZE);
          setTotalCount(null);
        } else {
          setEvents(raw.items);
          setTotalCount(raw.total);
          setHasMore(currentOffset + raw.items.length < raw.total);
        }
      } catch (e) {
        setErrorEvents(e instanceof Error ? e.message : '加载失败');
      } finally {
        setLoadingEvents(false);
      }
    },
    [],
  );

  const fetchStats = useCallback(async (days: number) => {
    setLoadingStats(true);
    setErrorStats(null);
    try {
      const data = await api.get<AdminSuccessStats[]>(`/admin/success-stats?days=${days}`);
      setStats(data);
    } catch (e) {
      setErrorStats(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // 翻页或过滤器变化时重新拉取;typeFilter 变化由 handleTypeChange 先 reset offset=0,
  // 统一由 (offset, typeFilter) 这一个 effect 驱动,避免双重触发
  useEffect(() => {
    const run = async () => { await fetchEvents(offset, typeFilter); };
    void run();
  }, [offset, typeFilter, fetchEvents]);

  useEffect(() => {
    const run = async () => { await fetchStats(statsDays); };
    void run();
  }, [statsDays, fetchStats]);

  function handleTypeChange(v: string) {
    // 先重置 offset 到 0,再更新 typeFilter;两者都是同步 setState,
    // React 会批处理成一次渲染,effect 以 offset=0 + 新 typeFilter 拉一次数据
    setOffset(0);
    setTypeFilter(v);
  }

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  // ─── 计算总页数:total已知就用total,否则基于hasMore粗估 ────────────────────
  const totalPages = totalCount !== null ? Math.ceil(totalCount / PAGE_SIZE) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── 报错流水表 ── */}
      <div className="lg" style={cardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '14px',
          }}
        >
          <div style={{ ...sectionTitleStyle, marginBottom: 0 }}>
            <AlertTriangle size={17} /> 报错流水
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* 类型过滤 */}
            <select
              value={typeFilter}
              onChange={(e) => handleTypeChange(e.target.value)}
              style={{
                padding: '6px 10px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-line)',
                borderRadius: '8px',
                fontSize: '12.5px',
                color: 'var(--color-ink)',
                fontFamily: 'inherit',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {ERROR_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* 刷新 */}
            <button
              type="button"
              onClick={() => void fetchEvents(offset, typeFilter)}
              disabled={loadingEvents}
              title="刷新"
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid var(--hair)',
                background: 'rgba(47,143,255,.05)',
                color: 'var(--color-ink)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: loadingEvents ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RefreshCw size={13} className={loadingEvents ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {errorEvents && (
          <div
            role="alert"
            style={{
              background: 'var(--color-danger-soft)',
              color: 'var(--color-danger)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '13px',
              marginBottom: '12px',
              fontWeight: 500,
            }}
          >
            {errorEvents}
          </div>
        )}

        {loadingEvents && events.length === 0 ? (
          <div style={{ padding: '30px', display: 'flex', justifyContent: 'center' }}>
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-ink-3)' }} />
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>时间</th>
                    <th style={thStyle}>类型</th>
                    <th style={thStyle}>详情</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-ink-4)', padding: '24px' }}>
                        暂无报错记录
                      </td>
                    </tr>
                  ) : (
                    events.map((ev) => (
                      <tr key={ev.id}>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                            {new Date(ev.created_at).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-ink-4)', marginTop: '2px' }}>
                            {relativeTime(ev.created_at)}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                          {eventTypeBadge(ev.type)}
                        </td>
                        <td style={tdStyle}>
                          <DetailCell detail={ev.detail} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 翻页控件 */}
            {(hasMore || offset > 0) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '14px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--color-ink-4)' }}>
                  第 {currentPage} 页
                  {totalPages !== null ? ` / 共 ${totalPages} 页（${totalCount} 条）` : ''}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={offset === 0 || loadingEvents}
                    onClick={() => setOffset((p) => Math.max(0, p - PAGE_SIZE))}
                    style={{
                      padding: '5px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--hair)',
                      background: 'rgba(47,143,255,.05)',
                      color: 'var(--color-ink)',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: offset === 0 || loadingEvents ? 'not-allowed' : 'pointer',
                      opacity: offset === 0 ? 0.4 : 1,
                    }}
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    disabled={!hasMore || loadingEvents}
                    onClick={() => setOffset((p) => p + PAGE_SIZE)}
                    style={{
                      padding: '5px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--hair)',
                      background: 'rgba(47,143,255,.05)',
                      color: 'var(--color-ink)',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: !hasMore || loadingEvents ? 'not-allowed' : 'pointer',
                      opacity: !hasMore ? 0.4 : 1,
                    }}
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 每日成功 vs 失败分层 ── */}
      <div className="lg" style={cardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '14px',
          }}
        >
          <div style={{ ...sectionTitleStyle, marginBottom: 0 }}>
            <BarChartIcon size={17} /> 每日 AI 成功 vs 失败
          </div>

          {/* 日期范围选择 */}
          <select
            value={statsDays}
            onChange={(e) => setStatsDays(Number(e.target.value))}
            style={{
              padding: '6px 10px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-line)',
              borderRadius: '8px',
              fontSize: '12.5px',
              color: 'var(--color-ink)',
              fontFamily: 'inherit',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <option value={7}>近 7 天</option>
            <option value={14}>近 14 天</option>
            <option value={30}>近 30 天</option>
          </select>
        </div>

        {errorStats && (
          <div
            role="alert"
            style={{
              background: 'var(--color-danger-soft)',
              color: 'var(--color-danger)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '13px',
              marginBottom: '12px',
              fontWeight: 500,
            }}
          >
            {errorStats}
          </div>
        )}

        {loadingStats ? (
          <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-ink-3)' }} />
          </div>
        ) : (
          <SuccessFailedChart rows={stats} />
        )}
      </div>
    </div>
  );
}

// ─── tabB 管理操作审计 ────────────────────────────────────────────────────────

function AdminAuditTab(): React.ReactElement {
  const [events, setEvents] = useState<AdminOpsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const fetchAudit = useCallback(async (currentOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: 'ADMIN_ACTION',
        limit: String(PAGE_SIZE),
        offset: String(currentOffset),
      });
      const raw = await api.get<AdminOpsEvent[] | { items: AdminOpsEvent[]; total: number }>(
        `/admin/error-stream?${params.toString()}`,
      );
      if (Array.isArray(raw)) {
        setEvents(raw);
        setHasMore(raw.length === PAGE_SIZE);
        setTotalCount(null);
      } else {
        setEvents(raw.items);
        setTotalCount(raw.total);
        setHasMore(currentOffset + raw.items.length < raw.total);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => { await fetchAudit(offset); };
    void run();
  }, [offset, fetchAudit]);

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = totalCount !== null ? Math.ceil(totalCount / PAGE_SIZE) : null;

  return (
    <div className="lg" style={cardStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '14px',
        }}
      >
        <div style={{ ...sectionTitleStyle, marginBottom: 0 }}>
          <ShieldCheck size={17} /> 管理操作审计
        </div>
        <button
          type="button"
          onClick={() => { setOffset(0); void fetchAudit(0); }}
          disabled={loading}
          title="刷新"
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid var(--hair)',
            background: 'rgba(47,143,255,.05)',
            color: 'var(--color-ink)',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--color-danger-soft)',
            color: 'var(--color-danger)',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '13px',
            marginBottom: '12px',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {loading && events.length === 0 ? (
        <div style={{ padding: '30px', display: 'flex', justifyContent: 'center' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-ink-3)' }} />
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>时间</th>
                  <th style={thStyle}>操作</th>
                  <th style={thStyle}>详情（actor / target / op）</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-ink-4)', padding: '24px' }}
                    >
                      暂无管理操作记录
                    </td>
                  </tr>
                ) : (
                  events.map((ev) => (
                    <tr key={ev.id}>
                      <td
                        style={{
                          ...tdStyle,
                          whiteSpace: 'nowrap',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                          {new Date(ev.created_at).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-ink-4)', marginTop: '2px' }}>
                          {relativeTime(ev.created_at)}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        {eventTypeBadge(ev.type)}
                      </td>
                      <td style={tdStyle}>
                        <AdminActionDetail detail={ev.detail} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {(hasMore || offset > 0) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '14px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--color-ink-4)' }}>
                第 {currentPage} 页
                {totalPages !== null ? ` / 共 ${totalPages} 页（${totalCount} 条）` : ''}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  disabled={offset === 0 || loading}
                  onClick={() => setOffset((p) => Math.max(0, p - PAGE_SIZE))}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--hair)',
                    background: 'rgba(47,143,255,.05)',
                    color: 'var(--color-ink)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: offset === 0 || loading ? 'not-allowed' : 'pointer',
                    opacity: offset === 0 ? 0.4 : 1,
                  }}
                >
                  上一页
                </button>
                <button
                  type="button"
                  disabled={!hasMore || loading}
                  onClick={() => setOffset((p) => p + PAGE_SIZE)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--hair)',
                    background: 'rgba(47,143,255,.05)',
                    color: 'var(--color-ink)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: !hasMore || loading ? 'not-allowed' : 'pointer',
                    opacity: !hasMore ? 0.4 : 1,
                  }}
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** 管理操作详情:突出展示 actor/target/op 字段,其余降调 */
function AdminActionDetail({ detail }: { detail: Record<string, unknown> | null }): React.ReactElement {
  if (!detail || Object.keys(detail).length === 0) {
    return <span style={{ color: 'var(--color-ink-4)' }}>—</span>;
  }

  const { actor, target, op, ...rest } = detail as {
    actor?: unknown;
    target?: unknown;
    op?: unknown;
    [k: string]: unknown;
  };

  return (
    <div style={{ fontSize: '12.5px', lineHeight: 1.65 }}>
      {actor !== undefined && (
        <div>
          <span style={{ color: 'var(--color-ink-3)', fontWeight: 600 }}>操作者: </span>
          <span style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            {String(actor)}
          </span>
        </div>
      )}
      {target !== undefined && (
        <div>
          <span style={{ color: 'var(--color-ink-3)', fontWeight: 600 }}>目标: </span>
          <span style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            {String(target)}
          </span>
        </div>
      )}
      {op !== undefined && (
        <div>
          <span style={{ color: 'var(--color-ink-3)', fontWeight: 600 }}>操作: </span>
          <span style={{ color: 'var(--color-brand)', fontWeight: 700 }}>{String(op)}</span>
        </div>
      )}
      {Object.keys(rest).length > 0 && (
        <div
          style={{
            marginTop: '3px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-ink-4)',
          }}
        >
          {Object.entries(rest).map(([k, v]) => (
            <span key={k} style={{ marginRight: '10px' }}>
              {k}={String(v ?? '')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 内联图标(避免从 lucide-react 引入不存在的名称)────────────────────────────

function BarChartIcon({ size }: { size: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="12" width="4" height="8" rx="1" />
      <rect x="9" y="7" width="4" height="13" rx="1" />
      <rect x="15" y="3" width="4" height="17" rx="1" />
    </svg>
  );
}

// ─── 主导出组件 ───────────────────────────────────────────────────────────────

/** 流水中心 Tab(波3 页3):tabA 报错流水 + tabB 管理操作审计 */
export default function LogCenterTab(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'errors' | 'audit'>('errors');

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 18px',
    borderRadius: '8px',
    border: 'none',
    background: active ? 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))' : 'transparent',
    color: active ? '#fff' : 'var(--color-ink-3)',
    fontSize: '13px',
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    transition: 'background .15s, color .15s',
    ...(active
      ? {
          boxShadow: '0 8px 22px -12px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
        }
      : {}),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Tab 切换 ── */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '4px',
          borderRadius: '12px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-line)',
          alignSelf: 'flex-start',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('errors')}
          style={tabBtnStyle(activeTab === 'errors')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} /> 报错流水
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          style={tabBtnStyle(activeTab === 'audit')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ClipboardList size={14} /> 管理操作审计
          </span>
        </button>
      </div>

      {/* ── Tab 内容 ── */}
      {activeTab === 'errors' ? <ErrorStreamTab /> : <AdminAuditTab />}
    </div>
  );
}
