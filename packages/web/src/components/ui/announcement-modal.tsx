'use client';

// ── 登录大公告弹窗 ───────────────────────────────────────────────────────────
// 挂在 (main)/layout.tsx 主区:登录后/进 App 时,把 display_type='modal' 的公告弹一个大弹窗。
// 数据源:GET /announcements?placement=modal —— 后端已只返 active 且发布后 ≤3 天的 modal 公告。
// 已读记录存 localStorage key = "coach_announce_modal_seen"(与横幅的 dismissed 分开互不干扰):
//   关掉一条就把它的 id 写进 seen,3 天窗口内不再弹;但窗口内出现的新公告仍会弹。
// 多条:按后端返回顺序(published_at 倒序=最新在前)逐条弹,关一条进下一条。
// 设计语言:沿用全站「液态玻璃 / Night Atelier」居中弹层(.lg + scrim + pop-in),按 kind 配色。
// 静默降级:API 失败 / 无未读 modal 公告时不渲染任何内容。

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Announcement, AnnouncementKind } from '@/lib/types';
import { launchFeatureTour, restartTour, RESTART_TOUR_SENTINEL } from '@/lib/feature-tour';
import { X, Sparkles, Wrench, AlertTriangle, ArrowRight } from 'lucide-react';

// ── 按 kind 的视觉配置(与横幅同源色板,弹窗用更大图标/更醒目的色块)──────────
const KIND_META: Record<
  AnnouncementKind,
  {
    label: string;
    color: string; // 前景/图标色
    bg: string; // 图标徽章背景
    border: string; // 顶部强调条与图标徽章边框
    icon: React.ReactNode;
  }
> = {
  feature: {
    label: '新功能',
    color: 'var(--color-brand)',
    bg: 'var(--color-brand-soft)',
    border: 'color-mix(in srgb, var(--color-brand) 32%, transparent)',
    icon: <Sparkles size={20} />,
  },
  fix: {
    label: '修复',
    color: 'var(--color-success)',
    bg: 'var(--color-success-soft)',
    border: 'color-mix(in srgb, var(--color-success) 32%, transparent)',
    icon: <Wrench size={20} />,
  },
  maintenance: {
    label: '维护',
    color: 'var(--color-warn)',
    bg: 'var(--color-warn-soft)',
    border: 'color-mix(in srgb, var(--color-warn) 32%, transparent)',
    icon: <AlertTriangle size={20} />,
  },
};

// ── localStorage 读/写工具函数(modal 专用 key,与横幅 dismissed 互不影响)──────
const LS_KEY = 'coach_announce_modal_seen';

function readSeen(): Set<string> {
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

function writeSeen(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
  } catch {
    // 存储已满或无痕模式:静默忽略
  }
}

export function AnnouncementModal() {
  // 待弹队列:已过滤掉已读、仅剩 modal 类型,按后端顺序(最新在前)。
  const [queue, setQueue] = useState<Announcement[]>([]);
  // 当前展示的下标。关一条 +1,越界即全部弹完、卸载。
  const [index, setIndex] = useState(0);
  const router = useRouter();

  // 初始加载:只拉 modal 公告,本地再剔除已读(seen)。
  useEffect(() => {
    api
      .get<Announcement[]>('/announcements?placement=modal')
      .then((data) => {
        const seen = readSeen();
        const pending = data.filter(
          (a) => a.active && a.display_type === 'modal' && !seen.has(a.id),
        );
        setQueue(pending);
      })
      .catch(() => {
        // 失败静默:不渲染
      });
  }, []);

  const current = queue[index];

  // Esc 关闭当前条(等同点关闭)。仅在有当前条时挂监听。
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissCurrent();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // dismissCurrent 依赖 current.id;current 变更即重挂。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // 关闭当前条:写入 seen,前进到下一条。
  function dismissCurrent() {
    if (!current) return;
    const seen = readSeen();
    seen.add(current.id);
    writeSeen(seen);
    setIndex((i) => i + 1);
  }

  // 点击 CTA:先把当前条记为已读关掉,再跳站内路径;有 cta_tour_id 则派发功能导览事件,
  // 目标页的 onboarding-tour 监听到即启动该 mini-tour。
  function handleCta() {
    if (!current || !current.cta_href) return;
    const { cta_href, cta_tour_id } = current;
    // 防御兜底:仅放行站内相对路径(单个 / 开头,排除 // 协议相对与外链),与后端 DTO/admin 同口径。
    // 不依赖写入时校验,杜绝任何未来未校验写入路径导致的开放跳转。校验失败则整体 no-op(不关、不跳)。
    if (!/^\/(?!\/)/.test(cta_href)) return;
    dismissCurrent();
    router.push(cta_href);
    // 哨兵:新手引导按钮 → 重看完整首登引导;否则按既有逻辑启动功能 mini-tour。
    if (cta_tour_id === RESTART_TOUR_SENTINEL) restartTour();
    else if (cta_tour_id) launchFeatureTour(cta_tour_id);
  }

  // 队列空 / 已全部弹完:不占位。
  if (!current) return null;

  const meta = KIND_META[current.kind];
  // 多条时给个「第 n / 共 m」轻提示,让用户知道后面还有。
  const total = queue.length;
  const position = index + 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`公告: ${current.title}`}
      data-announce-modal
      onClick={dismissCurrent}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 330,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflowY: 'auto',
        background: 'var(--am-scrim)',
        animation: 'am-fade-in 0.2s ease',
      }}
    >
      <style>{`
        [data-announce-modal] { --am-scrim: rgba(5, 6, 12, 0.46); }
        html[data-theme="light"] [data-announce-modal] { --am-scrim: rgba(17, 19, 28, 0.26); }
        @keyframes am-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes am-pop-in {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        className="lg"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '460px',
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          padding: '0',
          animation: 'am-pop-in 0.28s ease',
        }}
      >
        {/* 顶部强调色条:按 kind 着色,弹窗比横幅更醒目的第一信号 */}
        <div
          style={{
            height: '4px',
            background: meta.color,
            borderTopLeftRadius: 'inherit',
            borderTopRightRadius: 'inherit',
          }}
        />

        <div style={{ padding: '24px 26px 22px' }}>
          {/* 关闭按钮 */}
          <button
            type="button"
            onClick={dismissCurrent}
            aria-label="关闭公告"
            style={{
              position: 'absolute',
              top: '18px',
              right: '16px',
              width: '32px',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--color-ink-3)',
              transition: 'color 0.12s, background 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-ink)';
              e.currentTarget.style.background = 'var(--color-surface-3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-ink-3)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={18} />
          </button>

          {/* 图标徽章 + 种类标签 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: meta.bg,
                border: `1px solid ${meta.border}`,
                color: meta.color,
                flexShrink: 0,
              }}
            >
              {meta.icon}
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: meta.color,
                letterSpacing: '0.02em',
              }}
            >
              {meta.label}
            </span>
          </div>

          {/* 标题 */}
          <h2
            style={{
              margin: '0 0 10px',
              fontSize: '19px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.01em',
              lineHeight: 1.35,
              paddingRight: '28px',
            }}
          >
            {current.title}
          </h2>

          {/* 正文:保留换行(运营文案可能多段) */}
          {current.body && (
            <p
              style={{
                margin: '0 0 4px',
                fontSize: '14px',
                lineHeight: 1.65,
                color: 'var(--color-ink-2)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {current.body}
            </p>
          )}

          {/* CTA:整宽 secondary 按钮(在「知道了」之上)。仅 cta_label + cta_href 同时有值才渲染。 */}
          {current.cta_label && current.cta_href && (
            <button
              type="button"
              onClick={handleCta}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                marginTop: '20px',
                padding: '11px 18px',
                borderRadius: '10px',
                border: '1px solid var(--color-brand)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'inherit',
                letterSpacing: '-0.003em',
                color: 'var(--color-brand)',
                background: 'var(--color-brand-soft)',
                transition: 'background 0.12s',
              }}
            >
              {current.cta_label}
              <ArrowRight size={15} />
            </button>
          )}

          {/* 底部操作区 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginTop: '22px',
            }}
          >
            {/* 多条进度提示;只有一条时不显示 */}
            {total > 1 ? (
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--color-ink-4)',
                  fontWeight: 500,
                }}
              >
                {position} / {total}
              </span>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={dismissCurrent}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '9px 20px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13.5px',
                fontWeight: 600,
                fontFamily: 'inherit',
                letterSpacing: '-0.003em',
                color: '#fff',
                background:
                  'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                boxShadow:
                  '0 8px 22px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.35)',
                transition: 'opacity 0.12s, transform 0.12s',
              }}
            >
              {total > 1 && position < total ? '下一条' : '知道了'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
