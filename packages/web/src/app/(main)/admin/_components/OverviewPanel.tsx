'use client';

/**
 * 总面板(Overview)— 波3块D
 *
 * 数据来源(全部复用现有端点,零新增后端):
 *   KPI 用户总数        GET /admin/users
 *   KPI 今日活跃用户    GET /admin/usage
 *   KPI 邀请码使用率    GET /admin/invites
 *   KPI 平台健康 badge  GET /admin/health-snapshot
 *   KPI 今日 AI 成功率  GET /admin/success-stats?days=1
 *   KPI 今日诊断成功率  GET /admin/diagnosis-stats?days=1(单次诊断维度,独立于 AI 成功率)
 *   异常提醒条          GET /admin/success-stats?days=1 + GET /admin/error-stream?limit=1
 *   近 7 日趋势迷你图   GET /admin/usage (usage.daily)
 *
 * 设计:液态玻璃 + 复用 _shared.ts。无 mock 数据。
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type {
  AdminUserRow,
  AdminInvite,
  AdminUsageOverview,
  AdminHealthSnapshot,
  AdminSuccessStats,
  AdminDiagnosisStats,
  AdminOpsEvent,
} from '@/lib/types';
import {
  cardStyle,
  sectionTitleStyle,
  smallBtn,
} from './_shared';
import {
  Users,
  Ticket,
  HeartPulse,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Loader2,
  RefreshCw,
  BarChart2,
} from 'lucide-react';

// ─── 类型 ─────────────────────────────────────────────────────────────────────

interface OverviewData {
  users: AdminUserRow[];
  invites: AdminInvite[];
  usage: AdminUsageOverview;
  health: AdminHealthSnapshot;
  successStats: AdminSuccessStats[];        // days=1,取末行
  diagnosisStats: AdminDiagnosisStats[];    // days=1,取末行(单次诊断成功率,独立于 AI 成功率)
  recentError: AdminOpsEvent | null;        // error-stream?limit=1
}

// ─── props ────────────────────────────────────────────────────────────────────

interface OverviewPanelProps {
  /** 点击「查看流水中心」跳转回调 */
  onNavigate: (tab: string) => void;
}

// ─── 内联辅助 ─────────────────────────────────────────────────────────────────

/** 近 7 日条形图单根宽度百分比(基于最大值归一化) */
function sparkBarWidth(value: number, max: number): string {
  if (max === 0) return '0%';
  return `${Math.round((value / max) * 100)}%`;
}

/** 健康状态 badge 颜色 */
function healthColor(health: AdminHealthSnapshot): string {
  if (health.status === 'error') return 'var(--color-danger)';
  if (health.concurrency.under_pressure) return '#f59e0b';
  return 'var(--color-success)';
}

function healthLabel(health: AdminHealthSnapshot): string {
  if (health.status === 'error') return '异常';
  if (health.concurrency.under_pressure) return '有压力';
  return '正常';
}

function healthBg(health: AdminHealthSnapshot): string {
  if (health.status === 'error') return 'rgba(239,68,68,.08)';
  if (health.concurrency.under_pressure) return 'rgba(245,158,11,.08)';
  return 'rgba(34,197,94,.08)';
}

function healthBorder(health: AdminHealthSnapshot): string {
  if (health.status === 'error') return 'rgba(239,68,68,.25)';
  if (health.concurrency.under_pressure) return 'rgba(245,158,11,.25)';
  return 'rgba(34,197,94,.25)';
}

/** 成功率 → 颜色 */
function rateColor(rate: number | null): string {
  if (rate === null) return 'var(--color-ink-4)';
  if (rate >= 0.95) return 'var(--color-success)';
  if (rate >= 0.8) return '#f59e0b';
  return 'var(--color-danger)';
}

// ─── KPI 小卡子组件 ───────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accentColor?: string;
  badge?: { text: string; color: string; bg: string; border: string };
}

function KpiCard({ icon, label, value, accentColor, badge }: KpiCardProps) {
  return (
    <div
      className="lg"
      style={{
        ...cardStyle,
        flex: '1 1 160px',
        minWidth: '150px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--color-ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {icon}
        {label}
      </div>
      {badge ? (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 10px',
            borderRadius: '8px',
            background: badge.bg,
            border: `1px solid ${badge.border}`,
            color: badge.color,
            fontSize: '13px',
            fontWeight: 700,
            alignSelf: 'flex-start',
          }}
        >
          {badge.text}
        </div>
      ) : (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '28px',
            fontWeight: 800,
            color: accentColor ?? 'var(--color-ink)',
            lineHeight: 1,
          }}
        >
          {value}
        </div>
      )}
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function OverviewPanel({ onNavigate }: OverviewPanelProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // 触发刷新的信号:递增即重拉(setState 留在用户事件里,effect 内不同步 setState)。
  const [tick, setTick] = useState(0);

  // 拉取数据:effect 内联,cancelled 守卫防卸载后 setState。
  // setLoading 放在 finally(await 之后),避免 react-hooks/set-state-in-effect。
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setError(null);
      try {
        const [users, invites, usage, health, successStats, diagnosisStats, errorStream] =
          await Promise.all([
            api.get<AdminUserRow[]>('/admin/users'),
            api.get<AdminInvite[]>('/admin/invites'),
            api.get<AdminUsageOverview>('/admin/usage'),
            api.get<AdminHealthSnapshot>('/admin/health-snapshot'),
            api.get<AdminSuccessStats[]>('/admin/success-stats?days=1'),
            api.get<AdminDiagnosisStats[]>('/admin/diagnosis-stats?days=1'),
            api.get<AdminOpsEvent[]>('/admin/error-stream?limit=1'),
          ]);
        if (cancelled) return;
        setData({
          users,
          invites,
          usage,
          health,
          successStats,
          diagnosisStats,
          recentError: errorStream.length > 0 ? errorStream[0] : null,
        });
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
    void run();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  // 手动刷新 / 重试:用户事件里 setState(允许),递增 tick 触发重拉。
  function refetch(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setTick((t) => t + 1);
  }

  // ── 加载态 ──
  if (loading) {
    return (
      <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-ink-3)' }} />
      </div>
    );
  }

  // ── 错误态 ──
  if (error || !data) {
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
        {error ?? '加载失败'}
        <button
          type="button"
          onClick={() => refetch()}
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

  // ── 衍生计算 ──

  // KPI:邀请码使用率
  const totalMaxUses = data.invites.reduce((s, i) => s + i.max_uses, 0);
  const totalUsed = data.invites.reduce((s, i) => s + i.used_count, 0);
  const inviteRate =
    totalMaxUses > 0 ? Math.round((totalUsed / totalMaxUses) * 100) : null;

  // KPI:今日成功率(取 days=1 末行)
  const todayStat =
    data.successStats.length > 0
      ? data.successStats[data.successStats.length - 1]
      : null;

  // KPI:今日诊断成功率(取 days=1 末行)——单次诊断维度,独立于上面的 AI 调用成功率。
  const todayDiagStat =
    data.diagnosisStats.length > 0
      ? data.diagnosisStats[data.diagnosisStats.length - 1]
      : null;

  // 异常提醒条:今日 failed>0 或近 24h 有 AI_BOTH_DOWN/AI_CALL_FAILED
  const todayFailed = todayStat?.failed ?? 0;
  const recentCritical =
    data.recentError !== null &&
    (data.recentError.type === 'AI_BOTH_DOWN' ||
      data.recentError.type === 'AI_CALL_FAILED');
  const showAlert = todayFailed > 0 || recentCritical;

  // 近 7 日趋势迷你图数据
  const sparkData = data.usage.daily;
  const sparkMax = Math.max(...sparkData.map((d) => d.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── 刷新按钮 ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => refetch(true)}
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

      {/* ── 异常提醒条(仅有异常时渲染)── */}
      {showAlert && (
        <div
          role="alert"
          style={{
            background: 'var(--color-danger-soft)',
            color: 'var(--color-danger)',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '13.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>
            {todayFailed > 0
              ? `今日有 ${todayFailed} 次 AI 调用失败`
              : '近期有严重 AI 异常事件'}
            ，点此查看流水中心
          </span>
          <button
            type="button"
            onClick={() => onNavigate('logs')}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: '1px solid var(--color-danger)',
              borderRadius: '6px',
              color: 'var(--color-danger)',
              fontSize: '12px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            查看流水中心
          </button>
        </div>
      )}

      {/* ── KPI 一览行 ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>

        {/* 用户总数 */}
        <KpiCard
          icon={<Users size={13} />}
          label="用户总数"
          value={data.users.length}
          accentColor="var(--color-ink)"
        />

        {/* 今日活跃用户 */}
        <KpiCard
          icon={<Activity size={13} />}
          label="今日活跃用户"
          value={data.usage.today_by_user.length}
          accentColor="var(--color-brand)"
        />

        {/* 邀请码使用率 */}
        <KpiCard
          icon={<Ticket size={13} />}
          label="邀请码使用率"
          value={inviteRate !== null ? `${inviteRate}%` : '—'}
          accentColor="var(--color-ink)"
        />

        {/* 平台健康 badge */}
        <KpiCard
          icon={<HeartPulse size={13} />}
          label="平台健康"
          value={null}
          badge={{
            text: healthLabel(data.health),
            color: healthColor(data.health),
            bg: healthBg(data.health),
            border: healthBorder(data.health),
          }}
        />

        {/* 今日 AI 成功率(AI 调用维度:ai_usage vs ops 失败) */}
        <KpiCard
          icon={<TrendingUp size={13} />}
          label="今日 AI 成功率"
          value={
            todayStat === null || todayStat.success_rate === null
              ? '—'
              : `${(todayStat.success_rate * 100).toFixed(1)}%`
          }
          accentColor={rateColor(todayStat?.success_rate ?? null)}
        />

        {/* 今日诊断成功率(单次诊断维度:diagnoses.status;与 AI 成功率独立、不并计) */}
        <KpiCard
          icon={<Activity size={13} />}
          label="今日诊断成功率"
          value={
            todayDiagStat === null || todayDiagStat.success_rate === null
              ? '—'
              : `${(todayDiagStat.success_rate * 100).toFixed(1)}%`
          }
          accentColor={rateColor(todayDiagStat?.success_rate ?? null)}
        />
      </div>

      {/* ── 近 7 日调用趋势迷你图 ── */}
      <div className="lg" style={cardStyle}>
        <div style={sectionTitleStyle}>
          <BarChart2 size={17} /> 近 7 日调用趋势
        </div>

        {sparkData.length === 0 ? (
          <div style={{ fontSize: '13.5px', color: 'var(--color-ink-4)', padding: '8px 0' }}>
            暂无数据
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {sparkData.map((d) => (
              <div
                key={d.date}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                {/* 日期标签 */}
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11.5px',
                    color: 'var(--color-ink-3)',
                    whiteSpace: 'nowrap',
                    minWidth: '88px',
                  }}
                >
                  {d.date}
                </span>
                {/* 条形图轨道 */}
                <div
                  style={{
                    flex: 1,
                    height: '8px',
                    borderRadius: '4px',
                    background: 'var(--color-line)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: sparkBarWidth(d.count, sparkMax),
                      background: 'var(--color-brand)',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                {/* 计数 */}
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: 'var(--color-ink)',
                    minWidth: '28px',
                    textAlign: 'right',
                  }}
                >
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 快捷入口区 ── */}
      <div className="lg" style={cardStyle}>
        <div style={sectionTitleStyle}>
          <CheckCircle2 size={17} /> 快捷入口
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {(
            [
              { key: 'users', label: '用户管理' },
              { key: 'invites', label: '邀请码' },
              { key: 'health', label: '平台健康' },
              { key: 'logs', label: '流水中心' },
              { key: 'api', label: 'API 管理' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              style={smallBtn('neutral')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
