'use client';

// onboarding-spotlight.tsx — 画布内聚光灯(挖洞/脉冲 + 跟随气泡)。
// 在主导览画布(rootRef)内按 [data-guide=key] 定位锚点,挖洞 + 描边 + 自动 placement 放气泡。
// 锚点定位用相对 root 的缩放无关算法(对齐 ver3.1):root 缩放时仍准。
// centered=true(welcome / 收尾 / 移动降级)走居中卡,不挖洞。
// pulse=true 用轻脉冲(演示「点这里」)而非满屏挖洞,锚点四周呼吸。

import { useCallback, useLayoutEffect, useState, type ReactNode, type RefObject } from 'react';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** 锚点相对 root 的局部矩形(缩放无关)。 */
function localRect(el: Element, root: HTMLElement): Rect {
  const er = el.getBoundingClientRect();
  const rr = root.getBoundingClientRect();
  const scale = rr.width / root.offsetWidth || 1;
  return {
    top: (er.top - rr.top) / scale,
    left: (er.left - rr.left) / scale,
    width: er.width / scale,
    height: er.height / scale,
  };
}

interface CanvasSpotlightProps {
  rootRef: RefObject<HTMLDivElement | null>;
  targetKey: string | null;
  placement?: 'left' | 'right' | 'below' | 'above';
  pulse?: boolean;
  centered?: boolean;
  bubble: ReactNode;
}

const BUBBLE_W = 320;
const PAD = 6;

export function CanvasSpotlight({ rootRef, targetKey, placement = 'below', pulse = false, centered = false, bubble }: CanvasSpotlightProps) {
  const [rect, setRect] = useState<Rect | null>(null);
  // root 尺寸进 state(不在 render 里读 ref):用于气泡定位的视口边界。
  const [rootSize, setRootSize] = useState<{ w: number; h: number }>({ w: 1440, h: 900 });

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) {
      setRect(null);
      return;
    }
    setRootSize({ w: root.offsetWidth, h: root.offsetHeight });
    if (!targetKey || centered) {
      setRect(null);
      return;
    }
    const el = root.querySelector(`[data-guide="${targetKey}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    setRect(localRect(el, root));
  }, [rootRef, targetKey, centered]);

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(measure);
    const t = window.setTimeout(measure, 90);
    const ro = new ResizeObserver(measure);
    if (rootRef.current) ro.observe(rootRef.current);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, rootRef]);

  const RW = rootSize.w;
  const RH = rootSize.h;
  const hole = rect ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 } : null;

  // 气泡定位
  let bx = RW / 2 - BUBBLE_W / 2;
  let by = RH / 2 - 90;
  const isCentered = centered || !hole;
  if (hole) {
    const rightRoom = RW - (hole.left + hole.width) - 24;
    const leftRoom = hole.left;
    if (placement === 'right' || (placement !== 'left' && placement !== 'above' && placement !== 'below' && rightRoom >= BUBBLE_W)) {
      bx = hole.left + hole.width + 18;
      by = Math.min(Math.max(hole.top - 6, 16), RH - 220);
    } else if (placement === 'left' || (placement === undefined && leftRoom >= BUBBLE_W + 24)) {
      bx = hole.left - BUBBLE_W - 18;
      by = Math.min(Math.max(hole.top - 6, 16), RH - 220);
    } else if (placement === 'above') {
      bx = Math.min(Math.max(hole.left, 16), RW - BUBBLE_W - 16);
      by = Math.max(hole.top - 220, 16);
    } else {
      // below(默认)
      bx = Math.min(Math.max(hole.left, 16), RW - BUBBLE_W - 16);
      by = hole.top + hole.height + 220 > RH ? Math.max(hole.top - 220, 16) : hole.top + hole.height + 16;
    }
    // right/left 显式时再兜底空间不足
    if (placement === 'right' && rightRoom < BUBBLE_W) {
      bx = Math.min(Math.max(hole.left, 16), RW - BUBBLE_W - 16);
      by = hole.top + hole.height + 16;
    }
    if (placement === 'left' && leftRoom < BUBBLE_W + 24) {
      bx = Math.min(Math.max(hole.left, 16), RW - BUBBLE_W - 16);
      by = hole.top + hole.height + 16;
    }
  }

  return (
    <div className="ob-spot-layer" style={{ position: 'absolute', inset: 0, zIndex: 40, animation: 'ob-fade .3s var(--ob-ease)' }}>
      {hole ? (
        pulse ? (
          <>
            <div className="ob-spot-scrim" style={{ position: 'absolute' }} />
            <div className="ob-pulse" style={{ position: 'absolute', top: hole.top, left: hole.left, width: hole.width, height: hole.height }} />
          </>
        ) : (
          <div className="ob-spot-hole" style={{ position: 'absolute', top: hole.top, left: hole.left, width: hole.width, height: hole.height }} />
        )
      ) : (
        <div className="ob-spot-scrim" style={{ position: 'absolute' }} />
      )}

      <div
        className="lg ob-bubble"
        style={
          isCentered
            ? { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 392, maxWidth: 'calc(100% - 32px)', padding: 22, pointerEvents: 'auto' }
            : { position: 'absolute', top: by, left: bx, width: BUBBLE_W, padding: 18, pointerEvents: 'auto' }
        }
      >
        {bubble}
      </div>
    </div>
  );
}
