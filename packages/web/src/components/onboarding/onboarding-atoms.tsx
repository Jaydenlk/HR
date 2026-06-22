'use client';

// onboarding-atoms.tsx — 引导演示的共享原子:合规标注 / Coach 头像 / 分数环 / 计数 hook / reveal。
// 颜色一律走主题令牌(var(--color-*)),双主题自动跟随,无硬编码暗色。

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** 合规标注:每处演示固定可见,文案为定稿口径(不可改)。 */
export function AITag({ style }: { style?: React.CSSProperties }) {
  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 10.5,
        fontWeight: 600,
        color: 'var(--color-ink-3)',
        background: 'var(--color-brand-soft)',
        border: '1px dashed var(--color-line-2)',
        borderRadius: 999,
        padding: '4px 10px',
        fontFamily: 'var(--font-mono)',
        ...style,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-warn)' }} />
      AI 生成 / 仅供演示 / 非真实参考案例
    </span>
  );
}

/** Coach 头像标记(纯 SVG,主题无关黑底白脸,小尺寸气泡用)。 */
export function CoachMark({ size = 32, ring }: { size?: number; ring?: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--color-ink)',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxShadow: ring ? `0 0 0 3px ${ring}` : '0 4px 14px -6px rgba(0,0,0,.5)',
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r="32" fill="var(--color-bg)" />
        <rect x="22" y="32" width="56" height="4" rx="1" fill="var(--color-ink)" />
        <polygon points="22,32 78,32 50,22" fill="var(--color-ink)" />
        <circle cx="42" cy="52" r="2.4" fill="var(--color-ink)" />
        <circle cx="58" cy="52" r="2.4" fill="var(--color-ink)" />
        <path d="M 42 62 Q 50 68 58 62" stroke="var(--color-ink)" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** 数字滚动:从当前值缓动到 target;reduced-motion 直接落定。 */
export function useCountTo(target: number, dur = 900): number {
  const [val, setVal] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    const from = cur.current;
    const to = target;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      // reduced-motion:跳过缓动,首帧即落定(setState 在 rAF 回调内,非 effect 同步体内)。
      const p = reduce ? 1 : Math.min((t - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (to - from) * e);
      cur.current = v;
      setVal(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return val;
}

const scoreColor = (pct: number) =>
  pct >= 70 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warn)' : 'var(--color-danger)';

/** 动画分数环。show=false 时显示占位「—」。 */
export function ScoreRing({ target, show, size = 120, sw = 10 }: { target: number; show: boolean; size?: number; sw?: number }) {
  const r = (size - sw) / 2;
  const C = 2 * Math.PI * r;
  const val = useCountTo(show ? target : 0, 950);
  const pct = Math.max(0, Math.min(100, val));
  const col = scoreColor(pct);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block', position: 'relative', zIndex: 1 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={sw} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C - (pct / 100) * C}
          style={{ transition: 'stroke-dashoffset .25s linear, stroke .5s var(--ob-ease)', filter: `drop-shadow(0 0 7px ${col})` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>
          {show ? val : '—'}
        </span>
        <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-ink-4)', fontFamily: 'var(--font-mono)' }}>
          / 100
        </span>
      </div>
    </div>
  );
}

/** reveal 包装:show 触发错峰升起。dir 控制初始位移方向。 */
export function Reveal({
  show,
  dir = 'up',
  delay = 0,
  className = '',
  style = {},
  children,
}: {
  show: boolean;
  dir?: 'up' | 'right' | 'scale';
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={`ob-rv ${dir} ${show ? 'in' : ''} ${className}`}
      style={{ transitionDelay: show ? `calc(${delay}s * var(--ob-spd))` : '0s', ...style }}
    >
      {children}
    </div>
  );
}
