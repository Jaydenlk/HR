'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type {
  User,
  AdminUserRow,
  AdminInvite,
  AdminUsageOverview,
} from '@/lib/types';
import {
  Loader2,
  Shield,
  Users,
  Ticket,
  BarChart2,
  X,
  Coins,
  Activity,
  HeartPulse,
  ScrollText,
} from 'lucide-react';
import PlatformHealthTab from './_components/PlatformHealthTab';
import LogCenterTab from './_components/LogCenterTab';
import { UserActivityPanel } from './_components/UserActivityPanel';

// ─── Tab 定义 ─────────────────────────────────────────────────────────────────
// 页1 用户活跃与成功率(现有 用量/用户/邀请码 基座 + 单用户活动抽屉)
// 页2 平台健康(PlatformHealthTab)
// 页3 流水中心(LogCenterTab)
type AdminTab = 'activity' | 'health' | 'logs';

const TABS: { key: AdminTab; label: string; icon: typeof Activity }[] = [
  { key: 'activity', label: '用户活跃与成功率', icon: Activity },
  { key: 'health', label: '平台健康', icon: HeartPulse },
  { key: 'logs', label: '流水中心', icon: ScrollText },
];

// ─── 共享样式 ─────────────────────────────────────────────────────────────────
// 卡/面板外层统一用 className="lg"(单层玻璃),内部背景/边由 .lg 提供;cardStyle 仅留内边距。

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

// 相对时间(刚刚/N 分钟前/N 小时前/N 天前),超过 30 天回退绝对日期(本地格式)。
// 沿用全站各页局部 helper 的既有约定。
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

// 登录归属展示:内网登录后端记 province='内网';归属缺失显示「—」。
function loginRegion(u: AdminUserRow): string {
  if (u.last_login_province === '内网') return '内网';
  if (u.last_login_province && u.last_login_city)
    return `${u.last_login_province}·${u.last_login_city}`;
  return u.last_login_province ?? u.last_login_city ?? '—';
}

function smallBtn(variant: 'primary' | 'danger' | 'neutral'): React.CSSProperties {
  // primary:品牌渐变主操作钮(第二色标用 --color-brand-deep,带蓝光柔阴影+内高光)。
  // danger:语义危险色。neutral:微染玻璃感按钮(发丝边,暗色不再黑卡)。
  const bg =
    variant === 'primary'
      ? 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))'
      : variant === 'danger'
        ? 'var(--color-danger)'
        : 'rgba(47,143,255,.05)';
  const color = variant === 'neutral' ? 'var(--color-ink)' : '#fff';
  return {
    padding: '6px 12px',
    borderRadius: 'var(--radius-default)',
    border: variant === 'neutral' ? '1px solid var(--hair)' : 'none',
    background: bg,
    color,
    fontSize: '12.5px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    ...(variant === 'primary'
      ? {
          boxShadow:
            '0 8px 22px -12px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
        }
      : {}),
  };
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [me, setMe] = useState<User | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);

  // 当前激活的子页(tab)
  const [tab, setTab] = useState<AdminTab>('activity');

  // 单用户活动明细抽屉:点击用户行「活动」按钮时设为该用户,null 收起
  const [activityTarget, setActivityTarget] = useState<AdminUserRow | null>(null);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [usage, setUsage] = useState<AdminUsageOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savingUser, setSavingUser] = useState<string | null>(null);

  // 充值弹窗状态
  const [chargeTarget, setChargeTarget] = useState<AdminUserRow | null>(null);
  const [chargeDelta, setChargeDelta] = useState('');
  const [chargeNote, setChargeNote] = useState('');
  const [charging, setCharging] = useState(false);

  // 邀请码新建表单
  const [newCode, setNewCode] = useState('');
  const [newMaxUses, setNewMaxUses] = useState('1');
  const [creatingInvite, setCreatingInvite] = useState(false);

  useEffect(() => {
    api
      .get<User>('/auth/me')
      .then((u) => setMe(u))
      .catch(() => setMe(null))
      .finally(() => setMeLoaded(true));
  }, []);

  // me 确认为 admin 后再拉管理数据。
  useEffect(() => {
    if (!me || me.role !== 'admin') return;
    void reloadAll();
  }, [me]);

  async function reloadAll() {
    setLoading(true);
    setError(null);
    try {
      const [u, inv, usg] = await Promise.all([
        api.get<AdminUserRow[]>('/admin/users'),
        api.get<AdminInvite[]>('/admin/invites'),
        api.get<AdminUsageOverview>('/admin/usage'),
      ]);
      setUsers(u);
      setInvites(inv);
      setUsage(usg);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function patchUser(
    id: string,
    body: { status?: 'active' | 'banned'; role?: 'user' | 'admin' },
  ) {
    setSavingUser(id);
    setError(null);
    try {
      await api.patch<User>(`/admin/users/${id}`, body);
      await reloadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setSavingUser(null);
    }
  }

  async function submitCharge() {
    if (!chargeTarget) return;
    const n = Number(chargeDelta.trim());
    if (!Number.isInteger(n) || n <= 0) {
      setError('充值点数需为正整数');
      return;
    }
    setCharging(true);
    setError(null);
    try {
      const { credit_balance } = await api.post<{ credit_balance: number }>(`/admin/users/${chargeTarget.id}/credits`, {
        delta: n,
        ...(chargeNote.trim() ? { note: chargeNote.trim() } : {}),
      });
      // 行内更新余额:使用后端返回的 credit_balance,而非乐观 +n,避免并发漂移
      setUsers((prev) =>
        prev.map((u) =>
          u.id === chargeTarget.id ? { ...u, credit_balance } : u,
        ),
      );
      setChargeTarget(null);
      setChargeDelta('');
      setChargeNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '充值失败');
    } finally {
      setCharging(false);
    }
  }

  async function createInvite() {
    const max = Number(newMaxUses);
    if (!Number.isInteger(max) || max < 1) {
      setError('可用次数需为正整数');
      return;
    }
    setCreatingInvite(true);
    setError(null);
    try {
      await api.post<AdminInvite>('/admin/invites', {
        ...(newCode.trim() ? { code: newCode.trim() } : {}),
        max_uses: max,
      });
      setNewCode('');
      setNewMaxUses('1');
      await reloadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreatingInvite(false);
    }
  }

  async function toggleInvite(inv: AdminInvite) {
    setError(null);
    try {
      await api.patch<AdminInvite>(`/admin/invites/${inv.id}`, { disabled: !inv.disabled });
      await reloadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    }
  }

  // ── me 未加载:占位 ──
  if (!meLoaded) {
    return (
      <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-ink-3)' }} />
      </div>
    );
  }

  // ── 非 admin:无权限空态 ──
  if (!me || me.role !== 'admin') {
    return (
      <div
        style={{
          padding: '80px 40px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Shield size={40} style={{ color: 'var(--color-ink-4)' }} />
        <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-ink)' }}>无权限</div>
        <div style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
          该页面仅限管理员访问
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '32px 28px 60px' }}>
      <h1
        style={{
          fontFamily: 'var(--serif)',
          fontSize: '24px',
          fontWeight: 800,
          color: 'var(--color-ink)',
          letterSpacing: '-0.02em',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <Shield size={22} /> 管理后台
      </h1>
      <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)', marginBottom: '20px' }}>
        用户活跃 · 邀请码 · 平台健康 · 流水中心
      </p>

      {/* ── Tab 栏 ── */}
      <div
        role="tablist"
        aria-label="管理后台子页"
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                background: 'none',
                border: 'none',
                borderBottom: active
                  ? '2px solid var(--color-brand)'
                  : '2px solid transparent',
                marginBottom: '-1px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '13.5px',
                fontWeight: active ? 700 : 600,
                color: active ? 'var(--color-brand)' : 'var(--color-ink-3)',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── 页2 平台健康 ── */}
      {tab === 'health' && <PlatformHealthTab />}

      {/* ── 页3 流水中心 ── */}
      {tab === 'logs' && <LogCenterTab />}

      {/* ── 页1 用户活跃与成功率(用量/用户/邀请码 基座)── */}
      {tab === 'activity' && (
        <>
          {error && (
            <div
              role="alert"
              style={{
                background: 'var(--color-danger-soft)',
                color: 'var(--color-danger)',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '13.5px',
                marginBottom: '20px',
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
        <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-ink-3)' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* ── 用量卡片 ── */}
          {usage && (
            <div className="lg" style={cardStyle}>
              <div style={sectionTitleStyle}>
                <BarChart2 size={17} /> 用量监控
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                <div style={{ flex: '1 1 280px' }}>
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: 'var(--color-ink-3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '8px',
                    }}
                  >
                    近 7 日每日总调用
                  </div>
                  {usage.daily.map((d) => (
                    <div
                      key={d.date}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        padding: '5px 0',
                        borderBottom: '1px solid var(--color-line)',
                      }}
                    >
                      <span style={{ color: 'var(--color-ink-3)' }}>{d.date}</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{d.count}</span>
                    </div>
                  ))}
                </div>
                <div style={{ flex: '1 1 280px' }}>
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: 'var(--color-ink-3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '8px',
                    }}
                  >
                    今日各用户明细
                  </div>
                  {usage.today_by_user.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--color-ink-4)', padding: '5px 0' }}>
                      今日暂无调用
                    </div>
                  ) : (
                    usage.today_by_user.map((row) => (
                      <div
                        key={row.user_id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '13px',
                          padding: '5px 0',
                          borderBottom: '1px solid var(--color-line)',
                        }}
                      >
                        <span style={{ color: 'var(--color-ink-2)' }}>{row.email}</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{row.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── 用户表 ── */}
          <div className="lg" style={cardStyle}>
            <div style={sectionTitleStyle}>
              <Users size={17} /> 用户管理（{users.length}）
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>邮箱</th>
                    <th style={thStyle}>姓名</th>
                    <th style={thStyle}>角色</th>
                    <th style={thStyle}>状态</th>
                    <th style={thStyle}>今日 / 累计</th>
                    <th style={thStyle}>最近登录</th>
                    <th style={thStyle}>余额（点）</th>
                    <th style={thStyle}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u.id === me.id;
                    const saving = savingUser === u.id;
                    return (
                      <tr key={u.id}>
                        <td style={tdStyle}>{u.email}</td>
                        <td style={tdStyle}>{u.name}</td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: u.role === 'admin' ? 'var(--color-brand)' : 'var(--color-ink-3)',
                            }}
                          >
                            {u.role === 'admin' ? '管理员' : '用户'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: u.status === 'banned' ? 'var(--color-danger)' : 'var(--color-success)',
                            }}
                          >
                            {u.status === 'banned' ? '已封禁' : '正常'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {u.usage_today} / {u.usage_total}
                        </td>
                        <td style={tdStyle}>
                          {/* 上行 IP(等宽小号),下行「归属 · 相对时间」;从未登录(无 IP)整格「—」 */}
                          {u.last_login_ip === null ? (
                            <span style={{ color: 'var(--color-ink-4)' }}>—</span>
                          ) : (
                            <div style={{ whiteSpace: 'nowrap' }}>
                              <div
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '11.5px',
                                  color: 'var(--color-ink-2)',
                                }}
                              >
                                {u.last_login_ip}
                              </div>
                              <div
                                style={{
                                  fontSize: '11.5px',
                                  color: 'var(--color-ink-4)',
                                  marginTop: '2px',
                                }}
                              >
                                {loginRegion(u)}
                                {u.last_login_at !== null &&
                                  ` · ${relativeTime(u.last_login_at)}`}
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '14px',
                                fontWeight: 700,
                                color: 'var(--color-ink)',
                                minWidth: '28px',
                              }}
                            >
                              {u.credit_balance}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setChargeTarget(u);
                                setChargeDelta('');
                                setChargeNote('');
                              }}
                              disabled={saving}
                              style={{
                                ...smallBtn('primary'),
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Coins size={12} /> 充值
                            </button>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setActivityTarget(u)}
                              style={{
                                ...smallBtn('neutral'),
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="查看活动明细（仅计数）"
                            >
                              <Activity size={12} /> 活动
                            </button>
                            {u.status === 'banned' ? (
                              <button
                                type="button"
                                onClick={() => patchUser(u.id, { status: 'active' })}
                                disabled={saving}
                                style={smallBtn('primary')}
                              >
                                解封
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => patchUser(u.id, { status: 'banned' })}
                                disabled={saving || isSelf}
                                style={{
                                  ...smallBtn('danger'),
                                  ...(isSelf ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
                                }}
                                title={isSelf ? '不能封禁自己' : '封禁'}
                              >
                                封禁
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 邀请码表 ── */}
          <div className="lg" style={cardStyle}>
            <div style={sectionTitleStyle}>
              <Ticket size={17} /> 邀请码（{invites.length}）
            </div>

            {/* 新建表单 */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="自定义码（留空随机 8 位）"
                style={{ ...inputStyle, flex: '1 1 200px' }}
              />
              <input
                type="number"
                min={1}
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
                placeholder="可用次数"
                style={{ ...inputStyle, width: '120px' }}
              />
              <button
                type="button"
                onClick={createInvite}
                disabled={creatingInvite}
                style={smallBtn('primary')}
              >
                {creatingInvite ? '创建中…' : '新建邀请码'}
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>邀请码</th>
                    <th style={thStyle}>已用 / 上限</th>
                    <th style={thStyle}>状态</th>
                    <th style={thStyle}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {inv.code}
                      </td>
                      <td style={tdStyle}>
                        {inv.used_count} / {inv.max_uses}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: inv.disabled ? 'var(--color-danger)' : 'var(--color-success)',
                          }}
                        >
                          {inv.disabled ? '已停用' : '可用'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() => toggleInvite(inv)}
                          style={inv.disabled ? smallBtn('primary') : smallBtn('neutral')}
                        >
                          {inv.disabled ? '启用' : '停用'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* ── 单用户活动明细抽屉(只计数,无正文)── */}
      <UserActivityPanel
        userId={activityTarget?.id ?? null}
        userLabel={
          activityTarget ? `${activityTarget.name}（${activityTarget.email}）` : undefined
        }
        onClose={() => setActivityTarget(null)}
      />

      {/* ── 充值弹窗 ── */}
      {chargeTarget && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setChargeTarget(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            className="lg"
            style={{
              padding: '28px 28px 24px',
              width: '100%',
              maxWidth: '420px',
            }}
          >
            {/* 标题行 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Coins size={17} style={{ color: 'var(--color-brand)' }} />
                充值点数
              </h3>
              <button
                type="button"
                onClick={() => setChargeTarget(null)}
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

            {/* 目标用户 */}
            <div style={{ fontSize: '13px', color: 'var(--color-ink-3)', marginBottom: '16px' }}>
              用户：
              <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
                {chargeTarget.name}（{chargeTarget.email}）
              </span>
              <br />
              当前余额：
              <span style={{ color: 'var(--color-brand)', fontWeight: 700 }}>
                {chargeTarget.credit_balance} 点
              </span>
            </div>

            {/* 充值表单 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--color-ink-3)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  充值点数（正整数）
                </label>
                <input
                  type="number"
                  min={1}
                  value={chargeDelta}
                  onChange={(e) => setChargeDelta(e.target.value)}
                  placeholder="例如：50"
                  style={{ ...inputStyle, width: '100%' }}
                  autoFocus
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--color-ink-3)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  备注（可选）
                </label>
                <input
                  type="text"
                  value={chargeNote}
                  onChange={(e) => setChargeNote(e.target.value)}
                  placeholder="例如：2026-06 充值"
                  style={{ ...inputStyle, width: '100%' }}
                />
              </div>
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
                  marginTop: '12px',
                  fontWeight: 500,
                }}
              >
                {error}
              </div>
            )}

            {/* 按钮行 */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setChargeTarget(null)}
                style={smallBtn('neutral')}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void submitCharge()}
                disabled={charging}
                style={smallBtn('primary')}
              >
                {charging ? '充值中…' : '确认充值'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
