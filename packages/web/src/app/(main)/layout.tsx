'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';
import {
  CalendarDays,
  BookOpen,
  Mic,
  LayoutDashboard,
  FileText,
  Play,
  BarChart2,
  Briefcase,
  Globe,
  MessageSquare,
  MoreHorizontal,
  Pin,
} from 'lucide-react';

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
  { id: 'debrief', label: '面试复盘', href: '/debrief', icon: <Mic size={16} />, badge: '3' },
  { id: 'overview', label: '求职总览', href: '/overview', icon: <LayoutDashboard size={16} /> },
];

const toolNav: NavItem[] = [
  { id: 'resumes', label: '简历馆', href: '/resumes', icon: <FileText size={16} /> },
  { id: 'mock', label: '模拟面试', href: '/mock', icon: <Play size={16} /> },
  { id: 'salary', label: '薪资雷达', href: '/salary', icon: <BarChart2 size={16} /> },
  { id: 'tracker', label: '投递追踪', href: '/applications', icon: <Briefcase size={16} />, badge: '18' },
];

const recentThreads = [
  { id: '1', title: '我的简历主版本', pinned: true, ago: '' },
  { id: '2', title: '改简历 · 字节前端', pinned: false, ago: '2m' },
  { id: '3', title: '美团二面复盘', pinned: false, ago: '1h' },
  { id: '4', title: 'Offer 比较 · 字节 vs Shopee', pinned: false, ago: '2d' },
];

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    api
      .get<User>('/auth/me')
      .then((u) => setUser(u))
      .catch(() => {
        window.location.href = '/login';
      });
  }, []);

  const initial = user?.name?.[0]?.toUpperCase() ?? '…';

  function isActive(item: NavItem): boolean {
    if (item.href === '/') return pathname === '/';
    return pathname?.startsWith(item.href) ?? false;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '248px 1fr', height: '100vh', overflow: 'hidden' }}>
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
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
            {/* Avatar */}
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

        {/* CTA — "问 Coach" */}
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
            letterSpacing: '-0.005em',
            textDecoration: 'none',
            transition: 'opacity 0.12s',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={15} />
            问 Coach
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
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
                transition: 'background 0.1s, color 0.1s',
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
                    fontFamily: 'var(--font-mono)',
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

        {/* Tools section */}
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
                transition: 'background 0.1s, color 0.1s',
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
              {item.badge && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
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

        {/* Recent threads */}
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
          最近
        </div>

        {recentThreads.map((thread) => (
          <Link
            key={thread.id}
            href={`/chat/${thread.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              color: 'var(--color-ink-2)',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'background 0.1s',
            }}
          >
            {thread.pinned && (
              <Pin size={11} style={{ color: 'var(--color-ink-4)', flexShrink: 0 }} />
            )}
            <span
              style={{
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '-0.003em',
              }}
            >
              {thread.title}
            </span>
            {thread.ago && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--color-ink-4)',
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {thread.ago}
              </span>
            )}
          </Link>
        ))}

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
          <span
            style={{
              fontSize: '12px',
              color: 'var(--color-ink-3)',
              fontWeight: 500,
            }}
          >
            Coach v 4
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
                fontSize: '12px',
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
                fontSize: '12px',
              }}
            >
              EN
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          background: 'var(--color-bg)',
        }}
      >
        {children}
      </main>
    </div>
  );
}
