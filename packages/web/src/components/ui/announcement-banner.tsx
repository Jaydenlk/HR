'use client';

// ── 公告横幅 ─────────────────────────────────────────────────────────────────
// 挂在 (main)/layout.tsx 主区顶部(侧栏下方),展示 GET /announcements?placement=banner 返回的 active 公告。
// 只渲染 display_type='banner' 且 published_at 在 3 天窗口内的公告(后端已过滤,前端双保险)。
// modal 类型不在此渲染——由登录弹窗组件另行处理,两者互不干扰。
// 已读记录存 localStorage key = "coach_announce_dismissed"(Set 序列化为 JSON 数组)。
// 按 kind 配色:feature=品牌蓝 / fix=成功绿 / maintenance=警告橙;沿用玻璃风格。
// 静默降级:API 失败或无公告时不渲染任何内容。

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Announcement, AnnouncementKind } from '@/lib/types';
import { launchFeatureTour } from '@/lib/feature-tour';
import { X, Sparkles, Wrench, AlertTriangle, ArrowRight } from 'lucide-react';

// 3 天可见窗口(毫秒)——与后端 VISIBLE_WINDOW_MS 保持一致,前端二次过滤防脏数据。
const VISIBLE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function isWithinWindow(published_at: string | null): boolean {
  if (!published_at) return false;
  return Date.now() - new Date(published_at).getTime() <= VISIBLE_WINDOW_MS;
}

// ── 按 kind 的视觉配置 ──────────────────────────────────────────────────────
const KIND_META: Record<
  AnnouncementKind,
  {
    label: string;
    color: string;       // 前景/图标色(CSS 变量或字面量)
    bg: string;          // 背景
    border: string;      // 边框
    icon: React.ReactNode;
  }
> = {
  feature: {
    label: '新功能',
    color: 'var(--color-brand)',
    bg: 'var(--color-brand-soft)',
    border: 'color-mix(in srgb, var(--color-brand) 30%, transparent)',
    icon: <Sparkles size={14} />,
  },
  fix: {
    label: '修复',
    color: 'var(--color-success)',
    bg: 'var(--color-success-soft)',
    border: 'color-mix(in srgb, var(--color-success) 30%, transparent)',
    icon: <Wrench size={14} />,
  },
  maintenance: {
    label: '维护',
    color: 'var(--color-warn)',
    bg: 'var(--color-warn-soft)',
    border: 'color-mix(in srgb, var(--color-warn) 30%, transparent)',
    icon: <AlertTriangle size={14} />,
  },
};

// ── localStorage 读/写工具函数 ──────────────────────────────────────────────
const LS_KEY = 'coach_announce_dismissed';

function readDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr as string[]);
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
  } catch {
    // 存储已满或无痕模式:静默忽略
  }
}

// ── 单条公告横幅 ─────────────────────────────────────────────────────────────
function AnnouncementItem({
  item,
  onDismiss,
  onCta,
}: {
  item: Announcement;
  onDismiss: (id: string) => void;
  onCta: (item: Announcement) => void;
}) {
  const meta = KIND_META[item.kind];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '10px 14px',
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        borderRadius: 'var(--radius-default)',
        fontSize: '13.5px',
        lineHeight: 1.45,
        // 玻璃感:轻微毛玻璃
        WebkitBackdropFilter: 'blur(8px)',
        backdropFilter: 'blur(8px)',
      }}
      role="status"
      aria-label={`公告: ${item.title}`}
    >
      {/* 图标 + 种类标签 */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          color: meta.color,
          fontWeight: 600,
          flexShrink: 0,
          marginTop: '1px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
        }}
      >
        {meta.icon}
        {meta.label}
      </span>

      {/* 正文 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '-0.003em',
          }}
        >
          {item.title}
        </span>
        {item.body && (
          <span
            style={{
              marginLeft: '6px',
              color: 'var(--color-ink-2)',
              fontWeight: 400,
            }}
          >
            {item.body}
          </span>
        )}
        {/* CTA:紧凑内联链接(在正文之后)。仅 cta_label + cta_href 同时有值才渲染。 */}
        {item.cta_label && item.cta_href && (
          <button
            type="button"
            onClick={() => onCta(item)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              marginLeft: '8px',
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: meta.color,
              fontWeight: 600,
              fontSize: '13px',
              fontFamily: 'inherit',
              letterSpacing: '-0.003em',
              verticalAlign: 'baseline',
            }}
          >
            {item.cta_label}
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* 关闭按钮 */}
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="关闭公告"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-ink-3)',
          display: 'flex',
          alignItems: 'center',
          padding: '2px',
          borderRadius: '6px',
          flexShrink: 0,
          marginTop: '1px',
          transition: 'color 0.1s, background 0.1s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--color-ink)';
          e.currentTarget.style.background = 'rgba(0,0,0,0.06)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--color-ink-3)';
          e.currentTarget.style.background = 'none';
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ── 主组件 ──────────────────────────────────────────────────────────────────
export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  // useState 惰性初始化:组件首次挂载时同步从 localStorage 读取,避免在 effect 里 setState。
  const [dismissed, setDismissed] = useState<Set<string>>(readDismissed);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  // 初始加载:拉接口,传 placement=banner 让后端只返横幅类型,前端再双保险过滤。
  useEffect(() => {
    api
      .get<Announcement[]>('/announcements?placement=banner')
      .then((data) => {
        // 仅展示 display_type='banner' 且在 3 天窗口内的——后端已过滤,前端二次保险。
        setItems(
          data.filter(
            (a) => a.active && a.display_type === 'banner' && isWithinWindow(a.published_at),
          ),
        );
        setLoaded(true);
      })
      .catch(() => {
        // 失败静默:不渲染
        setLoaded(true);
      });
  }, []);

  function handleDismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeDismissed(next);
      return next;
    });
  }

  // 点击 CTA:跳站内路径;有 cta_tour_id 则派发功能导览事件(目标页 onboarding-tour 监听启动)。
  // 横幅不因点击 CTA 而消失(用户可能想保留可见),与 modal「点后关闭」语义不同。
  function handleCta(item: Announcement) {
    if (!item.cta_href) return;
    router.push(item.cta_href);
    if (item.cta_tour_id) launchFeatureTour(item.cta_tour_id);
  }

  // 未加载完或无可见公告:不占位
  const visible = items.filter((a) => !dismissed.has(a.id));
  if (!loaded || visible.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '12px 24px 0',
      }}
      aria-label="站内公告"
    >
      {visible.map((item) => (
        <AnnouncementItem
          key={item.id}
          item={item}
          onDismiss={handleDismiss}
          onCta={handleCta}
        />
      ))}
    </div>
  );
}
