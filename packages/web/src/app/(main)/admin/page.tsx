'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type {
  User,
  AdminUserRow,
  AdminInvite,
  AdminUsageOverview,
} from '@/lib/types';
import { Loader2, Shield, Users, Ticket, BarChart2 } from 'lucide-react';

// ─── 共享样式 ─────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-line)',
  borderRadius: '18px',
  padding: '20px 22px',
};

const sectionTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
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
  const bg =
    variant === 'primary'
      ? 'var(--color-brand)'
      : variant === 'danger'
        ? 'var(--color-danger)'
        : 'var(--color-surface-3)';
  const color = variant === 'neutral' ? 'var(--color-ink)' : '#fff';
  return {
    padding: '6px 12px',
    borderRadius: '8px',
    border: variant === 'neutral' ? '1px solid var(--color-line)' : 'none',
    background: bg,
    color,
    fontSize: '12.5px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [me, setMe] = useState<User | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [usage, setUsage] = useState<AdminUsageOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 配额输入暂存:userId → 输入框当前值(字符串,空串表示清除覆盖)。
  const [quotaDraft, setQuotaDraft] = useState<Record<string, string>>({});
  const [savingUser, setSavingUser] = useState<string | null>(null);

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
      setQuotaDraft(
        Object.fromEntries(
          u.map((row) => [row.id, row.daily_quota_override === null ? '' : String(row.daily_quota_override)]),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function patchUser(
    id: string,
    body: { status?: 'active' | 'banned'; role?: 'user' | 'admin'; daily_quota_override?: number | null },
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

  function saveQuota(id: string) {
    const raw = (quotaDraft[id] ?? '').trim();
    if (raw === '') {
      void patchUser(id, { daily_quota_override: null });
      return;
    }
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) {
      setError('配额需为 0 或正整数');
      return;
    }
    void patchUser(id, { daily_quota_override: n });
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
      <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)', marginBottom: '24px' }}>
        用户管理 · 邀请码 · 用量监控
      </p>

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
            <div style={cardStyle}>
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
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>
              <Users size={17} /> 用户管理（{users.length}）
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>邮箱</th>
                    <th style={thStyle}>姓名</th>
                    <th style={thStyle}>角色</th>
                    <th style={thStyle}>状态</th>
                    <th style={thStyle}>今日 / 累计</th>
                    <th style={thStyle}>最近登录</th>
                    <th style={thStyle}>配额覆盖</th>
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
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                              type="number"
                              min={0}
                              value={quotaDraft[u.id] ?? ''}
                              onChange={(e) =>
                                setQuotaDraft((prev) => ({ ...prev, [u.id]: e.target.value }))
                              }
                              placeholder="全局"
                              style={{ ...inputStyle, width: '72px' }}
                            />
                            <button
                              type="button"
                              onClick={() => saveQuota(u.id)}
                              disabled={saving}
                              style={smallBtn('neutral')}
                            >
                              保存
                            </button>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '6px' }}>
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
          <div style={cardStyle}>
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
    </div>
  );
}
