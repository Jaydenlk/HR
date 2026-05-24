'use client';

// Root home page — "/" — includes the shell layout inline since this
// page is not inside the (main) route group.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import type { Diagnosis, User } from '@/lib/types';
import {
  CalendarDays,
  BookOpen,
  Mic,
  LayoutDashboard,
  FileText,
  Play,
  BarChart2,
  Briefcase,
  MessageSquare,
  MoreHorizontal,
  Plus,
  ArrowRight,
} from 'lucide-react';

// ── Sidebar nav config ────────────────────────────────────────────────
interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  dot?: boolean;
}

const mainNav: NavItem[] = [
  { id: 'today', label: '今天', href: '/', icon: <CalendarDays size={16} />, dot: true },
  { id: 'monthly', label: '月刊·面经', href: '/digest', icon: <BookOpen size={16} /> },
  { id: 'debrief', label: '面试复盘', href: '/debrief', icon: <Mic size={16} /> },
  { id: 'overview', label: '求职总览', href: '/overview', icon: <LayoutDashboard size={16} /> },
];

const toolNav: NavItem[] = [
  { id: 'resumes', label: '简历馆', href: '/resumes', icon: <FileText size={16} /> },
  { id: 'mock', label: '模拟面试', href: '/mock', icon: <Play size={16} /> },
  { id: 'salary', label: '薪资雷达', href: '/salary', icon: <BarChart2 size={16} /> },
  { id: 'tracker', label: '投递追踪', href: '/applications', icon: <Briefcase size={16} /> },
];

// ── Sub-components ────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'var(--color-success)'
      : score >= 60
        ? 'var(--color-warn)'
        : 'var(--color-danger)';
  const bg =
    score >= 80
      ? 'var(--color-success-soft)'
      : score >= 60
        ? 'var(--color-warn-soft)'
        : 'var(--color-danger-soft)';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 700,
        color,
        background: bg,
      }}
    >
      {score}分
    </span>
  );
}

function DiagnosisCard({ d }: { d: Diagnosis }) {
  const date = new Date(d.created_at).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
  return (
    <a
      href={`/diagnoses/${d.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        background: 'var(--color-surface)',
        borderRadius: '12px',
        border: '1px solid var(--color-line)',
        textDecoration: 'none',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'var(--color-brand-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <FileText size={18} color="var(--color-brand)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '13.5px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {d.jd_role ?? '职位诊断'}
          {d.jd_company ? ` · ${d.jd_company}` : ''}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-ink-4)', marginTop: '2px' }}>
          {date}
        </div>
      </div>
      <ScoreBadge score={d.score} />
      <ArrowRight size={15} color="var(--color-ink-4)" />
    </a>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────
function Sidebar({ user, pathname }: { user: User | null; pathname: string }) {
  const initial = user?.name?.[0]?.toUpperCase() ?? '…';

  function isActive(item: NavItem): boolean {
    if (item.href === '/') return pathname === '/';
    return pathname?.startsWith(item.href) ?? false;
  }

  return (
    <aside
      style={{
        background: 'var(--color-surface-2)',
        borderRight: '1px solid var(--color-line)',
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 14px',
        gap: '2px',
        overflowY: 'auto',
        overflowX: 'hidden',
        width: '248px',
        flexShrink: 0,
      }}
    >
      {/* User row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 6px 16px',
          marginBottom: '6px',
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--color-brand-soft)',
              color: 'var(--color-brand-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-ink)',
                letterSpacing: '-0.005em',
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.name ?? '···'}
            </div>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-ink-3)',
                fontWeight: 500,
                display: 'block',
                marginTop: '1px',
              }}
            >
              {user?.email ?? ''}
            </span>
          </div>
        </div>
        <button
          onClick={() => {}}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-ink-3)',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* CTA */}
      <Link
        href="/chat"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'var(--color-ink)',
          color: '#fff',
          borderRadius: '12px',
          fontSize: '13.5px',
          fontWeight: 600,
          margin: '8px 0 16px',
          textDecoration: 'none',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={15} />
          问 Coach
        </span>
        <span
          style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.55)',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.12)',
            padding: '1px 6px',
            borderRadius: '4px',
            letterSpacing: '0.04em',
            fontWeight: 500,
          }}
        >
          ⌘ K
        </span>
      </Link>

      {/* Main nav */}
      {mainNav.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.id}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
              padding: '8px 12px',
              borderRadius: '10px',
              fontSize: '13.5px',
              color: active ? 'var(--color-ink)' : 'var(--color-ink-2)',
              fontWeight: active ? 600 : 500,
              background: active ? 'var(--color-surface)' : 'transparent',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
              textDecoration: 'none',
              letterSpacing: '-0.003em',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '18px',
                justifyContent: 'center',
                color: active ? 'var(--color-ink)' : 'var(--color-ink-3)',
                flexShrink: 0,
              }}
            >
              {item.icon}
            </span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.dot && (
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: 'var(--color-brand)',
                  flexShrink: 0,
                }}
              />
            )}
            {item.badge && (
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--color-ink-3)',
                  background: 'var(--color-surface-3)',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}

      {/* Tools */}
      <div
        style={{
          fontSize: '11px',
          color: 'var(--color-ink-4)',
          fontWeight: 600,
          margin: '14px 10px 4px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        工具
      </div>

      {toolNav.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.id}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
              padding: '8px 12px',
              borderRadius: '10px',
              fontSize: '13.5px',
              color: active ? 'var(--color-ink)' : 'var(--color-ink-2)',
              fontWeight: active ? 600 : 500,
              background: active ? 'var(--color-surface)' : 'transparent',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
              textDecoration: 'none',
              letterSpacing: '-0.003em',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '18px',
                justifyContent: 'center',
                color: active ? 'var(--color-ink)' : 'var(--color-ink-3)',
                flexShrink: 0,
              }}
            >
              {item.icon}
            </span>
            <span style={{ flex: 1 }}>{item.label}</span>
          </Link>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 10px 4px',
          borderTop: '1px solid var(--color-line)',
          marginTop: '8px',
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--color-ink-3)', fontWeight: 500 }}>
          Coach v4
        </span>
        <div
          style={{
            display: 'flex',
            border: '1px solid var(--color-line)',
            borderRadius: '8px',
            overflow: 'hidden',
            fontSize: '12px',
          }}
        >
          <button
            style={{
              padding: '3px 9px',
              fontWeight: 600,
              background: 'var(--color-ink)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            中
          </button>
          <button
            style={{
              padding: '3px 9px',
              fontWeight: 500,
              background: 'transparent',
              color: 'var(--color-ink-3)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            EN
          </button>
        </div>
      </div>
    </aside>
  );
}

// ── Home page content ─────────────────────────────────────────────────
function HomeContent({ user }: { user: User | null }) {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loadingDiag, setLoadingDiag] = useState(true);
  const [errorDiag, setErrorDiag] = useState(false);

  useEffect(() => {
    api
      .get<Diagnosis[]>('/diagnoses')
      .then((data) => {
        setDiagnoses(data);
        setLoadingDiag(false);
      })
      .catch(() => {
        setErrorDiag(true);
        setLoadingDiag(false);
      });
  }, []);

  const recentDiagnoses = diagnoses.slice(0, 5);

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px' }}>
      <h1
        style={{
          fontSize: '26px',
          fontWeight: 700,
          color: 'var(--color-ink)',
          letterSpacing: '-0.4px',
          marginBottom: '6px',
        }}
      >
        {user ? `欢迎回来，${user.name}` : '欢迎回来'}
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', marginBottom: '36px' }}>
        今天想做什么？
      </p>

      {/* Quick actions */}
      <section style={{ marginBottom: '40px' }}>
        <h2
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-ink-4)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          快速入口
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            {
              label: '上传简历',
              desc: '解析 PDF / Word，建立简历档案',
              href: '/resumes',
              icon: <FileText size={20} color="var(--color-ink-2)" />,
            },
            {
              label: '新建诊断',
              desc: '粘贴 JD，获取匹配分析',
              href: '/diagnoses/new',
              icon: <Plus size={20} color="var(--color-ink-2)" />,
            },
          ].map((card) => (
            <a
              key={card.href}
              href={card.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '20px',
                background: 'var(--color-surface)',
                borderRadius: '14px',
                border: '1px solid var(--color-line)',
                textDecoration: 'none',
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--color-surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
                  {card.label}
                </div>
                <div
                  style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', marginTop: '3px' }}
                >
                  {card.desc}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Recent diagnoses */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <h2
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-ink-4)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            最近诊断
          </h2>
          {diagnoses.length > 0 && (
            <a
              href="/diagnoses"
              style={{
                fontSize: '13px',
                color: 'var(--color-brand)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              查看全部
            </a>
          )}
        </div>

        {loadingDiag ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--color-ink-4)',
              fontSize: '14px',
            }}
          >
            加载中…
          </div>
        ) : errorDiag ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--color-danger)',
              fontSize: '14px',
              background: 'var(--color-danger-soft)',
              borderRadius: '12px',
            }}
          >
            加载失败，请刷新重试
          </div>
        ) : recentDiagnoses.length === 0 ? (
          <div
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              background: 'var(--color-surface)',
              borderRadius: '14px',
              border: '1px dashed var(--color-line-2)',
            }}
          >
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <FileText size={36} color="var(--color-ink-4)" />
            </div>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--color-ink-2)',
                marginBottom: '6px',
              }}
            >
              还没有诊断记录
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-4)', marginBottom: '20px' }}>
              上传简历开始第一次诊断
            </p>
            <a
              href="/resumes"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                background: 'var(--color-brand)',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              上传简历
              <ArrowRight size={14} />
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentDiagnoses.map((d) => (
              <DiagnosisCard key={d.id} d={d} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Root page ─────────────────────────────────────────────────────────
export default function RootHomePage() {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    api
      .get<User>('/auth/me')
      .then(setUser)
      .catch(() => {
        window.location.href = '/login';
      });
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '248px 1fr', height: '100vh', overflow: 'hidden' }}>
      <Sidebar user={user} pathname={pathname ?? '/'} />
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg)' }}>
        <HomeContent user={user} />
      </main>
    </div>
  );
}
