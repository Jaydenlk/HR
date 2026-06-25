'use client';

/**
 * UserManagementPanel — 详细 · 用户管理面板(液态玻璃)
 *
 * 从原 page.tsx 的「用量卡 + 用户表」抽出并增强:
 *   - 搜索:按 email / name 子串(前端过滤,20 人规模够用,不新增后端搜索端点)
 *   - 筛选:全部 / 正常 / 已封禁 / 管理员
 *   - 排序:注册时间 / 余额 / 累计用量(前端排序,升降序切换)
 *   - 新增 created_at 列
 *   - 点击行「详情」打开 UserDetailDrawer(注册时间/地区/充值历史/趋势/角色变更)
 *
 * 数据来源(自取,不依赖 page.tsx reloadAll):
 *   GET /admin/users  → AdminUserRow[]
 *   GET /admin/usage  → AdminUsageOverview
 *
 * 写操作(充值/角色/封禁)全部下沉到 UserDetailDrawer;本面板仅做读 + 调度抽屉,
 * 抽屉 onMutated 回调触发本面板 reload 保持列表余额/角色一致。
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  Users,
  BarChart2,
  Search,
  ArrowUpDown,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AdminUserRow, AdminUsageOverview } from '@/lib/types';
import {
  cardStyle,
  sectionTitleStyle,
  inputStyle,
  smallBtn,
  relativeTime,
  loginRegion,
} from './_shared';
import { UserDetailDrawer } from './UserDetailDrawer';
import { RollerList } from './RollerList';

type StatusFilter = 'all' | 'active' | 'banned' | 'admin';
type SortKey = 'created_at' | 'credit_balance' | 'usage_total';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '正常' },
  { key: 'banned', label: '已封禁' },
  { key: 'admin', label: '管理员' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'created_at', label: '注册时间' },
  { key: 'credit_balance', label: '余额' },
  { key: 'usage_total', label: '累计用量' },
];

export interface UserManagementPanelProps {
  /** 当前登录管理员自己的 ID(禁止对自己降权/封禁) */
  selfId: string;
}

export function UserManagementPanel({ selfId }: UserManagementPanelProps) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usage, setUsage] = useState<AdminUsageOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 抽屉目标用户 ID。
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  // 搜索 / 筛选 / 排序。
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    void reload();
  }, []);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [u, usg] = await Promise.all([
        api.get<AdminUserRow[]>('/admin/users'),
        api.get<AdminUsageOverview>('/admin/usage'),
      ]);
      setUsers(u);
      setUsage(usg);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  // 过滤 + 排序结果(前端,20 人规模无性能压力)。
  const visibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = users.filter((u) => {
      if (q && !u.email.toLowerCase().includes(q) && !u.name.toLowerCase().includes(q)) {
        return false;
      }
      if (statusFilter === 'active') return u.status === 'active';
      if (statusFilter === 'banned') return u.status === 'banned';
      if (statusFilter === 'admin') return u.role === 'admin';
      return true;
    });
    list = [...list].sort((a, b) => {
      let cmp: number;
      if (sortKey === 'created_at') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortKey === 'credit_balance') {
        cmp = a.credit_balance - b.credit_balance;
      } else {
        cmp = a.usage_total - b.usage_total;
      }
      return sortDesc ? -cmp : cmp;
    });
    return list;
  }, [users, query, statusFilter, sortKey, sortDesc]);

  if (loading) {
    return (
      <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-ink-3)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--color-danger-soft)',
            color: 'var(--color-danger)',
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '13.5px',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {/* ── 用量卡片 ── */}
      {usage && (
        <div className="lg" style={cardStyle}>
          <div style={sectionTitleStyle}>
            <BarChart2 size={17} /> 用量监控
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
            <div style={{ flex: '1 1 280px' }}>
              <div style={miniLabel}>近 7 日每日总调用</div>
              {usage.daily.map((d) => (
                <div key={d.date} style={miniRow}>
                  <span style={{ color: 'var(--color-ink-3)' }}>{d.date}</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{d.count}</span>
                </div>
              ))}
            </div>
            <div style={{ flex: '1 1 280px' }}>
              <div style={miniLabel}>今日各用户明细</div>
              {usage.today_by_user.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--color-ink-4)', padding: '5px 0' }}>
                  今日暂无调用
                </div>
              ) : (
                usage.today_by_user.map((row) => (
                  <div key={row.user_id} style={miniRow}>
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

        {/* 搜索 / 筛选 / 排序工具条 */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-ink-4)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索邮箱 / 姓名"
              style={{ ...inputStyle, width: '100%', paddingLeft: '30px' }}
            />
          </div>

          {/* 筛选标签 */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {STATUS_FILTERS.map((f) => {
              const active = statusFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  style={{
                    padding: '6px 11px',
                    borderRadius: 'var(--radius-default)',
                    border: active ? '1px solid var(--color-brand)' : '1px solid var(--hair)',
                    background: active ? 'rgba(47,143,255,.1)' : 'transparent',
                    color: active ? 'var(--color-brand)' : 'var(--color-ink-3)',
                    fontSize: '12.5px',
                    fontWeight: active ? 700 : 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* 排序 */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              style={{ ...inputStyle, padding: '7px 8px', cursor: 'pointer' }}
              aria-label="排序字段"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  按{o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSortDesc((v) => !v)}
              style={{
                ...smallBtn('neutral'),
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title={sortDesc ? '当前降序,点击切升序' : '当前升序,点击切降序'}
            >
              <ArrowUpDown size={13} /> {sortDesc ? '降序' : '升序'}
            </button>
          </div>
        </div>

        {visibleUsers.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: 'var(--color-ink-4)',
              fontSize: '13px',
            }}
          >
            无匹配用户
          </div>
        ) : (
          <RollerList
            items={visibleUsers}
            keyOf={(u) => u.id}
            pageSize={10}
            label="用户管理"
            renderItem={(u) => <UserRowCard u={u} onDetail={() => setDetailUserId(u.id)} />}
          />
        )}
      </div>

      {/* ── 用户详情抽屉 ──
          key=detailUserId:切换用户时重挂载,抽屉内 useState(表单/分页/折叠)自然回初值,
          避免在 effect 里 setState 触发级联渲染。null 时不渲染由抽屉内部处理。 */}
      <UserDetailDrawer
        key={detailUserId ?? 'none'}
        userId={detailUserId}
        selfId={selfId}
        onClose={() => setDetailUserId(null)}
        onMutated={() => void reload()}
      />
    </div>
  );
}

// ─── 用户行卡片(滚筒 / 平铺 共用的单项展示,保留原表格全部字段)──────────────────

function UserRowCard({ u, onDetail }: { u: AdminUserRow; onDetail: () => void }): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* 第一行:邮箱 + 姓名 + 角色/状态徽标 + 详情钮 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', wordBreak: 'break-all' }}>
            {u.email}
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', marginTop: '2px' }}>{u.name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '6px',
              background: u.role === 'admin' ? 'rgba(47,143,255,.1)' : 'var(--color-surface)',
              color: u.role === 'admin' ? 'var(--color-brand)' : 'var(--color-ink-3)',
            }}
          >
            {u.role === 'admin' ? '管理员' : '用户'}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '6px',
              background: u.status === 'banned' ? 'var(--color-danger-soft)' : 'rgba(34,197,94,.1)',
              color: u.status === 'banned' ? 'var(--color-danger)' : 'var(--color-success)',
            }}
          >
            {u.status === 'banned' ? '已封禁' : '正常'}
          </span>
          <button
            type="button"
            onClick={onDetail}
            style={{
              ...smallBtn('neutral'),
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="查看详情 / 充值 / 角色管理"
          >
            详情 <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* 第二行:指标网格(今日/累计、余额、注册时间、最近登录)*/}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px 16px',
          fontSize: '12.5px',
        }}
      >
        <CardField label="今日 / 累计" value={`${u.usage_today} / ${u.usage_total}`} />
        <CardField
          label="余额(点)"
          value={
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-ink)' }}>
              {u.credit_balance}
            </span>
          }
        />
        <CardField label="注册时间" value={relativeTime(u.created_at)} />
        <CardField
          label="最近登录"
          value={
            u.last_login_ip === null ? (
              <span style={{ color: 'var(--color-ink-4)' }}>—</span>
            ) : (
              <span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--color-ink-2)' }}>
                  {u.last_login_ip}
                </span>
                <span style={{ color: 'var(--color-ink-4)', marginLeft: '6px' }}>
                  {loginRegion(u)}
                  {u.last_login_at !== null && ` · ${relativeTime(u.last_login_at)}`}
                </span>
              </span>
            )
          }
        />
      </div>
    </div>
  );
}

function CardField({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
      <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-ink-4)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label}
      </span>
      <span style={{ color: 'var(--color-ink-2)' }}>{value}</span>
    </div>
  );
}

// ─── 局部小样式 ────────────────────────────────────────────────────────────────

const miniLabel: React.CSSProperties = {
  fontSize: '11.5px',
  fontWeight: 700,
  color: 'var(--color-ink-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '8px',
};

const miniRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '13px',
  padding: '5px 0',
  borderBottom: '1px solid var(--color-line)',
};
