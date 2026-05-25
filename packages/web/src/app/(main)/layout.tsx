'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import type { User, Conversation, Interview, Application } from '@/lib/types';
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
  Send,
  Map,
  Target,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  dot?: boolean;
}

function buildMainNav(interviewCount: number): NavItem[] {
  return [
    { id: 'today', label: '今天', href: '/today', icon: <CalendarDays size={16} />, dot: true },
    { id: 'monthly', label: '月刊·面经', href: '/newspaper', icon: <BookOpen size={16} /> },
    {
      id: 'debrief',
      label: '面试复盘',
      href: '/debrief',
      icon: <Mic size={16} />,
      ...(interviewCount > 0 ? { badge: String(interviewCount) } : {}),
    },
    { id: 'overview', label: '求职总览', href: '/overview', icon: <LayoutDashboard size={16} /> },
  ];
}

function buildToolNav(applicationCount: number): NavItem[] {
  return [
    { id: 'opportunities', label: '机会中心', href: '/opportunities', icon: <Target size={16} /> },
    { id: 'resumes', label: '简历馆', href: '/resumes', icon: <FileText size={16} /> },
    { id: 'mock', label: '模拟面试', href: '/mock', icon: <Play size={16} /> },
    { id: 'salary', label: '薪资雷达', href: '/salary', icon: <BarChart2 size={16} /> },
    {
      id: 'tracker',
      label: '投递追踪',
      href: '/applications',
      icon: <Briefcase size={16} />,
      ...(applicationCount > 0 ? { badge: String(applicationCount) } : {}),
    },
    { id: 'cover-letter', label: '求职信', href: '/cover-letter', icon: <Send size={16} /> },
    { id: 'career', label: '职业地图', href: '/career', icon: <Map size={16} /> },
  ];
}

// Recent threads will be fetched from API when chat feature is built.

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [interviewCount, setInterviewCount] = useState(0);
  const [applicationCount, setApplicationCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    api
      .get<User>('/auth/me')
      .then((u) => setUser(u))
      .catch(() => {
        window.location.href = '/login';
      });
    api
      .get<Conversation[]>('/conversations')
      .then((data) => setConversations(data.slice(0, 5)))
      .catch(() => {});
    api
      .get<Interview[]>('/interviews')
      .then((data) => setInterviewCount(data.length))
      .catch(() => {});
    api
      .get<Application[]>('/applications')
      .then((data) => setApplicationCount(data.length))
      .catch(() => {});
  }, []);

  // Close sidebar on route change (mobile)
  // Track previous pathname to detect navigation and reset sidebar
  const [lastPathname, setLastPathname] = useState(pathname);
  if (isMobile && pathname !== lastPathname) {
    setLastPathname(pathname);
    setSidebarOpen(false);
  }

  const initial = user?.name?.[0]?.toUpperCase() ?? '…';

  function isActive(item: NavItem): boolean {
    if (item.href === '/today') return pathname === '/today' || pathname === '/';
    return pathname?.startsWith(item.href) ?? false;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '248px 1fr',
        height: '100vh',
      }}
    >
      {/* ── Mobile top bar ───────────────────────────────────────────── */}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '52px',
            background: 'var(--color-surface-2)',
            borderBottom: '1px solid var(--color-line)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '12px',
            zIndex: 200,
          }}
        >
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-ink)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="切换侧边栏"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.3px',
            }}
          >
            Coach
          </span>
        </div>
      )}

      {/* ── Backdrop (mobile overlay) ─────────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 210,
          }}
        />
      )}

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
          ...(isMobile
            ? {
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: '248px',
                zIndex: 220,
                transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.22s ease',
              }
            : {}),
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
        </Link>

        {/* Main nav */}
        {buildMainNav(interviewCount).map((item) => {
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

        {buildToolNav(applicationCount).map((item) => {
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

        {/* Recent conversations */}
        {conversations.length > 0 && (
          <>
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
              最近对话
            </div>
            {conversations.map((conv) => {
              const active = pathname?.startsWith(`/chat/${conv.id}`) ?? false;
              return (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '7px 12px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: active ? 'var(--color-ink)' : 'var(--color-ink-2)',
                    fontWeight: active ? 600 : 400,
                    background: active ? 'var(--color-surface)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'background 0.1s, color 0.1s',
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: active ? 'var(--color-ink)' : 'var(--color-ink-3)',
                      flexShrink: 0,
                    }}
                  >
                    <MessageSquare size={14} />
                  </span>
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {conv.title ?? '对话'}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-ink-4)',
                      flexShrink: 0,
                    }}
                  >
                    {formatRelativeTime(conv.updated_at)}
                  </span>
                </Link>
              );
            })}
          </>
        )}

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
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────── */}
      <main
        style={{
          overflowY: 'auto',
          minHeight: 0,
          background: 'var(--color-bg)',
          ...(isMobile ? { paddingTop: '52px' } : {}),
        }}
      >
        {children}
      </main>
    </div>
  );
}
