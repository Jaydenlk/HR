'use client';

/**
 * UserDetailDrawer — 单用户详情右侧抽屉(液态玻璃)
 *
 * 由 UserActivityPanel 重构而来。在原「仅计数活动明细」基础上扩为完整用户详情:
 *   头部:邮箱 / 注册时间 / 登录地区 / 余额
 *   操作:充值(POST /admin/users/:id/credits)、角色提权降权 / 封禁解封(PATCH /admin/users/:id)
 *   近 7 日使用趋势迷你图(GET /admin/users/:id 的 daily_usage)
 *   积分变动历史(GET /admin/users/:id/credit-history,分页)
 *   AI 调用 / credit 消耗计数(GET /admin/user-activity,保留原逻辑)
 *
 * 隐私铁律:仅展示计数级 / 账务级数据,绝不展示任何正文
 * (简历原文 / 对话内容 / 转写 / JD 原文)。
 *
 * 数据来源:
 *   GET  /admin/users/:id                       → AdminUserDetail
 *   GET  /admin/users/:id/credit-history?limit=&offset= → AdminCreditHistory
 *   GET  /admin/user-activity?userId=&from=&to= → AdminUserActivity
 *   POST /admin/users/:id/credits               → { credit_balance }
 *   PATCH /admin/users/:id                       → User
 */

import { useEffect, useState } from 'react';
import {
  X,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Coins,
  Shield,
  ShieldOff,
  Ban,
  CheckCircle2,
  UserCog,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  AdminUserDetail,
  AdminCreditHistory,
  AdminUserActivity,
} from '@/lib/types';
import {
  thStyle,
  tdStyle,
  inputStyle,
  smallBtn,
  relativeTime,
} from './_shared';

// 积分历史每页条数(对齐 LogCenterTab 的 PAGE_SIZE 模式)。
const CREDIT_PAGE_SIZE = 20;

const labelStyle: React.CSSProperties = {
  fontSize: '11.5px',
  fontWeight: 700,
  color: 'var(--color-ink-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '6px',
  display: 'block',
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

// 登录归属:与 _shared.loginRegion 同口径,但作用于详情 DTO(无 AdminUserRow 形态)。
function detailRegion(d: AdminUserDetail): string {
  if (d.last_login_province === '内网') return '内网';
  if (d.last_login_province && d.last_login_city)
    return `${d.last_login_province}·${d.last_login_city}`;
  return d.last_login_province ?? d.last_login_city ?? '—';
}

// 流水类型中文标签(对齐后端 CreditTransactionType:signup_grant / admin_grant / consume)。
function txTypeLabel(type: string): string {
  switch (type) {
    case 'admin_grant':
      return '管理员充值';
    case 'consume':
      return '消耗';
    case 'signup_grant':
      return '注册赠送';
    default:
      return type;
  }
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface UserDetailDrawerProps {
  /** 被查看的用户 ID(UUID);传 null 收起抽屉 */
  userId: string | null;
  /** 当前登录管理员自己的 ID,用于禁止对自己降权/封禁 */
  selfId: string;
  /** 抽屉关闭回调 */
  onClose: () => void;
  /**
   * 用户数据发生写操作(充值 / 改角色 / 封禁)后回调,
   * 携带最新余额便于父表行内同步;父组件据此 reload 列表。
   */
  onMutated: () => void;
}

// ─── 组件 ──────────────────────────────────────────────────────────────────────

export function UserDetailDrawer({
  userId,
  selfId,
  onClose,
  onMutated,
}: UserDetailDrawerProps) {
  // ── 用户详情 ──
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // ── 活动计数(沿用 user-activity 端点)──
  const [activity, setActivity] = useState<AdminUserActivity | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [errorActivity, setErrorActivity] = useState<string | null>(null);

  // ── 积分历史(分页)──
  const [history, setHistory] = useState<AdminCreditHistory | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorHistory, setErrorHistory] = useState<string | null>(null);

  // ── 充值表单 ──
  const [chargeDelta, setChargeDelta] = useState('');
  const [chargeNote, setChargeNote] = useState('');
  const [charging, setCharging] = useState(false);
  const [chargeError, setChargeError] = useState<string | null>(null);

  // ── 角色 / 封禁操作 ──
  const [savingRole, setSavingRole] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── 折叠 ──
  const [collapseActivity, setCollapseActivity] = useState(true);

  // userId 变化时拉取所有区块。表单/分页等本地状态的重置不在 effect 里 setState
  // (避免级联渲染 lint),而是借助下方 key=userId 让抽屉内容随用户切换而重挂载,
  // 本组件内 useState 自然回到初值。
  useEffect(() => {
    if (!userId) return;
    void fetchDetail(userId);
    void fetchActivity(userId);
    void fetchHistory(userId, 0);
  }, [userId]);

  // 翻页:显式 setState + 拉取,不走 effect。
  function goToPage(page: number) {
    if (!userId) return;
    setHistoryPage(page);
    void fetchHistory(userId, page);
  }

  async function fetchDetail(uid: string) {
    setLoadingDetail(true);
    setErrorDetail(null);
    try {
      const data = await api.get<AdminUserDetail>(`/admin/users/${uid}`);
      setDetail(data);
    } catch (err) {
      setErrorDetail(err instanceof Error ? err.message : '加载用户详情失败');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function fetchActivity(uid: string) {
    setLoadingActivity(true);
    setErrorActivity(null);
    try {
      const data = await api.get<AdminUserActivity>(
        `/admin/user-activity?userId=${encodeURIComponent(uid)}`,
      );
      setActivity(data);
    } catch (err) {
      setErrorActivity(err instanceof Error ? err.message : '加载活动数据失败');
    } finally {
      setLoadingActivity(false);
    }
  }

  async function fetchHistory(uid: string, page: number) {
    setLoadingHistory(true);
    setErrorHistory(null);
    try {
      const offset = page * CREDIT_PAGE_SIZE;
      const data = await api.get<AdminCreditHistory>(
        `/admin/users/${uid}/credit-history?limit=${CREDIT_PAGE_SIZE}&offset=${offset}`,
      );
      setHistory(data);
    } catch (err) {
      setErrorHistory(err instanceof Error ? err.message : '加载积分历史失败');
    } finally {
      setLoadingHistory(false);
    }
  }

  async function submitCharge() {
    if (!detail) return;
    const n = Number(chargeDelta.trim());
    if (!Number.isInteger(n) || n <= 0) {
      setChargeError('充值点数需为正整数');
      return;
    }
    setCharging(true);
    setChargeError(null);
    try {
      const { credit_balance } = await api.post<{ credit_balance: number }>(
        `/admin/users/${detail.id}/credits`,
        {
          delta: n,
          ...(chargeNote.trim() ? { note: chargeNote.trim() } : {}),
        },
      );
      setDetail((prev) => (prev ? { ...prev, credit_balance } : prev));
      setChargeDelta('');
      setChargeNote('');
      // 刷新历史首页(把刚充值的记录顶上)+ 通知父表同步余额。
      setHistoryPage(0);
      void fetchHistory(detail.id, 0);
      onMutated();
    } catch (err) {
      setChargeError(err instanceof Error ? err.message : '充值失败');
    } finally {
      setCharging(false);
    }
  }

  async function patchUser(body: {
    status?: 'active' | 'banned';
    role?: 'user' | 'admin';
  }) {
    if (!detail) return;
    setSavingRole(true);
    setActionError(null);
    try {
      await api.patch(`/admin/users/${detail.id}`, body);
      // 用返回前更新本地视图:重拉详情拿权威值。
      await fetchDetail(detail.id);
      onMutated();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setSavingRole(false);
    }
  }

  // 抽屉未打开时不渲染。
  if (!userId) return null;

  const isSelf = detail?.id === selfId;
  const totalPages = history
    ? Math.max(1, Math.ceil(history.total / CREDIT_PAGE_SIZE))
    : 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="用户详情"
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
      <div
        className="lg"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
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
            <UserCog size={18} style={{ color: 'var(--color-brand)' }} />
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
                用户详情
              </div>
              {detail && (
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-ink-3)',
                    marginTop: '2px',
                  }}
                >
                  {detail.name}（{detail.email}）
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
            本面板仅展示
            <strong style={{ color: 'var(--color-ink-2)' }}>
              计数级 / 账务级数据
            </strong>
            ,不含任何简历/对话/转写/JD 正文。
          </div>

          {errorDetail && <ErrorBanner message={errorDetail} />}

          {loadingDetail && !detail ? (
            <LoadingRow />
          ) : detail ? (
            <>
              {/* ── 基本信息 ── */}
              <div
                className="lg"
                style={{
                  padding: '16px 18px',
                  marginBottom: '20px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px 24px',
                }}
              >
                <InfoItem
                  label="角色"
                  value={detail.role === 'admin' ? '管理员' : '用户'}
                  color={
                    detail.role === 'admin'
                      ? 'var(--color-brand)'
                      : 'var(--color-ink)'
                  }
                />
                <InfoItem
                  label="状态"
                  value={detail.status === 'banned' ? '已封禁' : '正常'}
                  color={
                    detail.status === 'banned'
                      ? 'var(--color-danger)'
                      : 'var(--color-success)'
                  }
                />
                <InfoItem
                  label="余额（点）"
                  value={String(detail.credit_balance)}
                  color="var(--color-ink)"
                  mono
                />
                <InfoItem
                  label="注册时间"
                  value={relativeTime(detail.created_at)}
                />
                <InfoItem label="登录归属" value={detailRegion(detail)} />
                <InfoItem
                  label="最近登录"
                  value={
                    detail.last_login_at
                      ? relativeTime(detail.last_login_at)
                      : '从未登录'
                  }
                />
                <InfoItem
                  label="今日 / 累计调用"
                  value={`${detail.usage_today} / ${detail.usage_total}`}
                  mono
                />
                {detail.last_login_ip && (
                  <InfoItem
                    label="最近登录 IP"
                    value={detail.last_login_ip}
                    mono
                  />
                )}
              </div>

              {/* ── 近 7 日使用趋势 ── */}
              <div style={sectionTitle}>近 7 日使用趋势</div>
              <Sparkline data={detail.daily_usage} />

              {/* ── 操作:角色 / 封禁 ── */}
              <div style={{ height: '1px', background: 'var(--color-line)', margin: '24px 0' }} />
              <div style={sectionTitle}>账号操作</div>
              {actionError && <ErrorBanner message={actionError} />}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {detail.role === 'admin' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`确认取消「${detail.name}」的管理员权限?`)) {
                        void patchUser({ role: 'user' });
                      }
                    }}
                    disabled={savingRole || isSelf}
                    style={{
                      ...smallBtn('neutral'),
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      ...(isSelf ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
                    }}
                    title={isSelf ? '不能降低自己的权限' : '取消管理员'}
                  >
                    <ShieldOff size={13} /> 取消管理员
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`确认将「${detail.name}」设为管理员?管理员可访问全量用户数据。`)) {
                        void patchUser({ role: 'admin' });
                      }
                    }}
                    disabled={savingRole}
                    style={{
                      ...smallBtn('neutral'),
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="设为管理员"
                  >
                    <Shield size={13} /> 设为管理员
                  </button>
                )}

                {detail.status === 'banned' ? (
                  <button
                    type="button"
                    onClick={() => void patchUser({ status: 'active' })}
                    disabled={savingRole}
                    style={{
                      ...smallBtn('primary'),
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCircle2 size={13} /> 解封
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`确认封禁「${detail.name}」?封禁后该用户无法登录使用。`)) {
                        void patchUser({ status: 'banned' });
                      }
                    }}
                    disabled={savingRole || isSelf}
                    style={{
                      ...smallBtn('danger'),
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      ...(isSelf ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
                    }}
                    title={isSelf ? '不能封禁自己' : '封禁'}
                  >
                    <Ban size={13} /> 封禁
                  </button>
                )}
                {savingRole && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                    style={{ color: 'var(--color-ink-3)', alignSelf: 'center' }}
                  />
                )}
              </div>

              {/* ── 充值 ── */}
              <div style={sectionTitle}>
                <Coins size={15} style={{ color: 'var(--color-brand)' }} /> 充值点数
              </div>
              {chargeError && <ErrorBanner message={chargeError} />}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  alignItems: 'flex-end',
                  marginBottom: '24px',
                }}
              >
                <div style={{ flex: '0 0 120px' }}>
                  <label style={labelStyle}>点数(正整数)</label>
                  <input
                    type="number"
                    min={1}
                    value={chargeDelta}
                    onChange={(e) => setChargeDelta(e.target.value)}
                    placeholder="例如:50"
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>
                <div style={{ flex: '1 1 160px' }}>
                  <label style={labelStyle}>备注(可选)</label>
                  <input
                    type="text"
                    value={chargeNote}
                    onChange={(e) => setChargeNote(e.target.value)}
                    placeholder="例如:2026-06 充值"
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void submitCharge()}
                  disabled={charging}
                  style={{
                    ...smallBtn('primary'),
                    padding: '8px 16px',
                    ...(charging ? { opacity: 0.7, cursor: 'not-allowed' } : {}),
                  }}
                >
                  {charging ? '充值中…' : '确认充值'}
                </button>
              </div>

              {/* ── 积分变动历史 ── */}
              <div style={{ height: '1px', background: 'var(--color-line)', margin: '24px 0' }} />
              <div style={sectionTitle}>
                积分变动历史
                {history && (
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
                    {history.total}
                  </span>
                )}
              </div>
              {errorHistory && <ErrorBanner message={errorHistory} />}
              {loadingHistory && !history ? (
                <LoadingRow />
              ) : history && history.items.length > 0 ? (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>时间</th>
                          <th style={thStyle}>类型</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>变动</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>余额</th>
                          <th style={thStyle}>备注</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.items.map((tx) => (
                          <tr key={tx.id}>
                            <td
                              style={{
                                ...tdStyle,
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11.5px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {relativeTime(tx.created_at)}
                            </td>
                            <td style={tdStyle}>{txTypeLabel(tx.type)}</td>
                            <td
                              style={{
                                ...tdStyle,
                                textAlign: 'right',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                color:
                                  tx.delta >= 0
                                    ? 'var(--color-success)'
                                    : 'var(--color-danger)',
                              }}
                            >
                              {tx.delta >= 0 ? `+${tx.delta}` : tx.delta}
                            </td>
                            <td
                              style={{
                                ...tdStyle,
                                textAlign: 'right',
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--color-ink)',
                              }}
                            >
                              {tx.balance_after}
                            </td>
                            <td
                              style={{
                                ...tdStyle,
                                fontSize: '12px',
                                color: 'var(--color-ink-3)',
                                maxWidth: '160px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={tx.note ?? undefined}
                            >
                              {tx.note ?? (
                                <span style={{ color: 'var(--color-ink-4)' }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 分页(对齐 LogCenterTab 上/下一页模式)*/}
                  {totalPages > 1 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        marginTop: '14px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => goToPage(Math.max(0, historyPage - 1))}
                        disabled={historyPage === 0 || loadingHistory}
                        style={{
                          ...smallBtn('neutral'),
                          ...(historyPage === 0 || loadingHistory
                            ? { opacity: 0.4, cursor: 'not-allowed' }
                            : {}),
                        }}
                      >
                        上一页
                      </button>
                      <span style={{ fontSize: '12.5px', color: 'var(--color-ink-3)' }}>
                        {historyPage + 1} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          goToPage(Math.min(totalPages - 1, historyPage + 1))
                        }
                        disabled={historyPage >= totalPages - 1 || loadingHistory}
                        style={{
                          ...smallBtn('neutral'),
                          ...(historyPage >= totalPages - 1 || loadingHistory
                            ? { opacity: 0.4, cursor: 'not-allowed' }
                            : {}),
                        }}
                      >
                        下一页
                      </button>
                    </div>
                  )}
                </>
              ) : history ? (
                <EmptyHint text="该用户暂无积分变动记录" />
              ) : null}

              {/* ── AI 调用 / credit 消耗计数(沿用 user-activity)── */}
              <div style={{ height: '1px', background: 'var(--color-line)', margin: '24px 0' }} />
              <button
                type="button"
                onClick={() => setCollapseActivity((v) => !v)}
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
                <span style={{ ...sectionTitle, marginBottom: 0 }}>
                  调用明细(按端点计数)
                </span>
                {collapseActivity ? (
                  <ChevronDown size={15} style={{ color: 'var(--color-ink-3)' }} />
                ) : (
                  <ChevronUp size={15} style={{ color: 'var(--color-ink-3)' }} />
                )}
              </button>
              {!collapseActivity && (
                <>
                  {errorActivity && <ErrorBanner message={errorActivity} />}
                  {loadingActivity ? (
                    <LoadingRow />
                  ) : activity ? (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          gap: '12px',
                          flexWrap: 'wrap',
                          marginBottom: '16px',
                        }}
                      >
                        <StatCard label="AI 调用总次数" value={activity.aiCallsTotal} />
                        <StatCard
                          label="积分消耗总次数"
                          value={activity.creditConsumeTotal}
                        />
                      </div>
                      {activity.aiCallsByEndpoint.length > 0 && (
                        <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={thStyle}>端点</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>
                                  调用次数
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {activity.aiCallsByEndpoint.map((row) => (
                                <tr key={row.endpoint}>
                                  <td
                                    style={{
                                      ...tdStyle,
                                      fontFamily: 'var(--font-mono)',
                                      fontSize: '12px',
                                    }}
                                  >
                                    {row.endpoint}
                                  </td>
                                  <td
                                    style={{
                                      ...tdStyle,
                                      textAlign: 'right',
                                      fontWeight: 700,
                                      color: 'var(--color-ink)',
                                    }}
                                  >
                                    {row.count}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  ) : null}
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── 子组件 ────────────────────────────────────────────────────────────────────

function InfoItem({
  label,
  value,
  color,
  mono,
}: {
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
}) {
  return (
    <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
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
        {label}
      </div>
      <div
        style={{
          fontSize: '13.5px',
          fontWeight: 600,
          color: color ?? 'var(--color-ink-2)',
          ...(mono ? { fontFamily: 'var(--font-mono)' } : {}),
          wordBreak: 'break-all',
        }}
      >
        {value}
      </div>
    </div>
  );
}

// 近 7 日使用趋势条形迷你图。data 来自 detail.daily_usage(date + count)。
function Sparkline({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) {
    return <EmptyHint text="近 7 日无调用记录" />;
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '6px',
        height: '80px',
        padding: '0 2px',
      }}
    >
      {data.map((d) => {
        const h = Math.round((d.count / max) * 64) + 2; // 至少 2px 可见
        return (
          <div
            key={d.date}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
            title={`${d.date}:${d.count} 次`}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-ink-3)',
              }}
            >
              {d.count}
            </span>
            <div
              style={{
                width: '100%',
                height: `${h}px`,
                borderRadius: '3px 3px 0 0',
                background:
                  d.count > 0
                    ? 'linear-gradient(180deg, var(--color-brand), var(--color-brand-deep))'
                    : 'var(--color-line)',
              }}
            />
            <span
              style={{
                fontSize: '9.5px',
                color: 'var(--color-ink-4)',
                whiteSpace: 'nowrap',
              }}
            >
              {d.date.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

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
      <div
        style={{
          fontSize: '11.5px',
          fontWeight: 700,
          color: 'var(--color-ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '26px',
          fontWeight: 800,
          color: 'var(--color-ink)',
          fontFamily: 'var(--font-mono)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
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
      <Loader2
        size={18}
        className="animate-spin"
        style={{ color: 'var(--color-ink-3)' }}
      />
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
