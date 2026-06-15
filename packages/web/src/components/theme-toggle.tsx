'use client';

// theme-toggle.tsx — 日/月主题切换 + 轻量 useTheme hook。
//
// 主题三态:
//   - 默认跟随系统(无 localStorage 时由 layout.tsx 的预水合脚本按 prefers-color-scheme 定)。
//   - 防闪烁:首帧前脚本已写好 html data-theme + (dark 时).dark class,本组件只镜像/切换。
//   - 持久化:切换时写 localStorage['coach_theme']。
//
// 无 hydration mismatch:SSR/首帧 useState 初值固定 'dark'(与脚本默认兜底一致),
// 真实值在挂载后由 rAF 从 documentElement.dataset.theme 读回(landing 已验证的模式)。

import { useState, useEffect, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';

export type Theme = 'light' | 'dark';

/** 写入 DOM:data-theme + .dark class(与 globals.css 的 @custom-variant dark 对齐)。 */
function applyTheme(t: Theme) {
  const el = document.documentElement;
  el.dataset.theme = t;
  el.classList.toggle('dark', t === 'dark');
}

/**
 * useTheme — 读取/切换主题。
 * 初值 'dark'(SSR 安全),挂载后 rAF 镜像真实 DOM 值;toggle 同步 state + DOM + localStorage。
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    const raf = requestAnimationFrame(() => setTheme(current === 'light' ? 'light' : 'dark'));
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try {
        localStorage.setItem('coach_theme', next);
      } catch {
        // localStorage 不可用(隐私模式)——本会话内仍生效。
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}

/** ThemeToggle — 玻璃圆钮,日/月图标随主题切换。供侧边栏等外壳复用。 */
export function ThemeToggle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      className={`lg-sm ${className ?? ''}`}
      aria-label={isDark ? '切换到日间模式' : '切换到夜间模式'}
      title={isDark ? '日间模式' : '夜间模式'}
      style={{
        width: '34px',
        height: '34px',
        borderRadius: 'var(--radius-pill)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--color-ink-2)',
        flexShrink: 0,
        transition: 'color 0.18s ease, transform 0.18s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--color-ink)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--color-ink-2)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
