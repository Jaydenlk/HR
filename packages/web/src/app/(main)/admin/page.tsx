'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';
import {
  Loader2,
  Shield,
  LayoutDashboard,
  Users,
  Ticket,
  HeartPulse,
  ScrollText,
  Plug,
  Gauge,
} from 'lucide-react';
import OverviewPanel from './_components/OverviewPanel';
import { UserManagementPanel } from './_components/UserManagementPanel';
import InviteCodePanel from './_components/InviteCodePanel';
import PlatformHealthTab from './_components/PlatformHealthTab';
import LogCenterTab from './_components/LogCenterTab';
import ApiManagementPanel from './_components/ApiManagementPanel';
import PerfReportLibrary from './_components/PerfReportLibrary';

// ─── Tab 定义 ─────────────────────────────────────────────────────────────────
// 总面板 → 用户管理 → 邀请码 → 平台健康 → 流水中心 → API 管理(两层结构:总面板看总体,各详细侧独立 fetch)
type AdminTab = 'overview' | 'users' | 'invites' | 'health' | 'perf' | 'logs' | 'api';

const TABS: { key: AdminTab; label: string; icon: typeof Shield }[] = [
  { key: 'overview', label: '总面板', icon: LayoutDashboard },
  { key: 'users', label: '用户管理', icon: Users },
  { key: 'invites', label: '邀请码', icon: Ticket },
  { key: 'health', label: '平台健康', icon: HeartPulse },
  { key: 'perf', label: '性能测试', icon: Gauge },
  { key: 'logs', label: '流水中心', icon: ScrollText },
  { key: 'api', label: 'API 管理', icon: Plug },
];

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [me, setMe] = useState<User | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);

  // 当前激活的子页(tab),默认总面板
  const [tab, setTab] = useState<AdminTab>('overview');

  useEffect(() => {
    api
      .get<User>('/auth/me')
      .then((u) => setMe(u))
      .catch(() => setMe(null))
      .finally(() => setMeLoaded(true));
  }, []);

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
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '32px 28px 60px' }}>
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
        总面板 · 用户管理 · 邀请码 · 平台健康 · 性能测试 · 流水中心 · API 管理
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
          flexWrap: 'wrap',
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

      {/* ── 各面板(各自 fetch 自己的数据,无统一 reloadAll)── */}
      {tab === 'overview' && <OverviewPanel onNavigate={(t) => setTab(t as AdminTab)} />}
      {tab === 'users' && <UserManagementPanel selfId={me.id} />}
      {tab === 'invites' && <InviteCodePanel />}
      {tab === 'health' && <PlatformHealthTab />}
      {tab === 'perf' && <PerfReportLibrary />}
      {tab === 'logs' && <LogCenterTab />}
      {tab === 'api' && <ApiManagementPanel />}
    </div>
  );
}
