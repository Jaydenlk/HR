'use client';

// 主页功能发现区 —— 让 ASR / TTS / 机会中心等能力被新用户看见。
// - 数据单一真相源:DISCOVER_ITEMS(discover-items.ts),此文件只负责渲染。
// - 玻璃卡网格:沿用全站「液态玻璃 / Night Atelier」设计语言,不引入新色板。
// - 折叠逻辑:新手(清单未全完成)默认展开;老用户默认折叠为一行,localStorage 记忆。
// - 全连真实路由,无死链;移动端单列,桌面双列(auto-fill minmax)。

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DISCOVER_ITEMS } from './discover-items';

const COLLAPSED_KEY = 'coach_discover_collapsed';

interface DiscoverCardsProps {
  /** 启动清单是否全部完成(由 today 页统一请求后透传,避免重复 GET)。 */
  starterAllDone: boolean;
}

export default function DiscoverCards({ starterAllDone }: DiscoverCardsProps) {
  const [mounted, setMounted] = useState(false);
  // 老用户(清单已全完成)默认折叠;新手默认展开。
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    // Defer 避免 set-state-in-effect 同步 cascade(对齐 mock/page.tsx 既有写法)。
    const t = setTimeout(() => {
      setMounted(true);
      const stored = localStorage.getItem(COLLAPSED_KEY);
      if (stored !== null) {
        // 用户曾手动操作过:尊重本地记忆
        setCollapsed(stored === '1');
      } else {
        // 初次:新手展开,老用户折叠
        setCollapsed(starterAllDone);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [starterAllDone]);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
  }

  // SSR / 首帧前不渲染,避免 localStorage 读写导致 hydration mismatch
  if (!mounted) return null;

  return (
    <div
      className="lg"
      style={{ padding: '18px 20px' }}
    >
      {/* 区块标题行 */}
      <button
        type="button"
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
          fontFamily: 'inherit',
          gap: '8px',
        }}
        aria-expanded={!collapsed}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--serif)',
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            探索 Coach 能帮你做什么
          </span>
          {collapsed && (
            <span
              style={{
                fontSize: '12.5px',
                color: 'var(--color-ink-4)',
                fontWeight: 500,
              }}
            >
              探索更多能力
            </span>
          )}
          {!collapsed && (
            <span
              style={{
                fontSize: '12.5px',
                color: 'var(--color-ink-4)',
                fontWeight: 500,
              }}
            >
              不用记功能在哪,从这儿点开就能用
            </span>
          )}
        </div>
        <span
          style={{
            color: 'var(--color-ink-3)',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* 卡片网格 */}
      {!collapsed && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '12px',
            marginTop: '16px',
          }}
        >
          {DISCOVER_ITEMS.map((item) => (
            <DiscoverCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 单张卡片 ──────────────────────────────────────────────────────────────────

import type { DiscoverItem } from './discover-items';

function DiscoverCard({ item }: { item: DiscoverItem }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      style={{
        display: 'block',
        padding: '14px 16px',
        background: 'rgba(47,143,255,.05)',
        border: '1px solid var(--hair)',
        borderRadius: 'var(--radius-default)',
        textDecoration: 'none',
        position: 'relative',
        transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = 'var(--color-brand)';
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = '0 6px 18px -8px var(--au-blue-glow)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = 'var(--hair)';
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'none';
      }}
    >
      {/* Badge */}
      {item.badge && (
        <span
          style={{
            position: 'absolute',
            top: '10px',
            right: '12px',
            padding: '2px 7px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '10.5px',
            fontWeight: 700,
            letterSpacing: '0.01em',
            background:
              item.badge === 'Beta'
                ? 'rgba(255,111,0,.9)'
                : 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
            color: '#fff',
          }}
        >
          {item.badge}
        </span>
      )}

      {/* 图标 */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-default)',
          background: 'var(--color-brand-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-brand)',
          marginBottom: '12px',
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </div>

      {/* 标题 */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--color-ink)',
          letterSpacing: '-0.005em',
          lineHeight: 1.3,
          marginBottom: '6px',
          paddingRight: item.badge ? '40px' : 0,
        }}
      >
        {item.title}
      </div>

      {/* 一句话描述 */}
      <div
        style={{
          fontSize: '12.5px',
          color: 'var(--color-ink-3)',
          lineHeight: 1.5,
          fontWeight: 400,
        }}
      >
        {item.desc}
      </div>
    </Link>
  );
}
