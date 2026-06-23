'use client';

// onboarding-spotlight.tsx — 画布内聚光灯(挖洞/脉冲 + 跟随气泡)。
// 在主导览画布(rootRef)内按 [data-guide=key] 定位锚点,挖洞 + 描边 + 自动 placement 放气泡。
// 锚点定位用相对 root 的缩放无关算法(对齐 ver3.1):root 缩放时仍准。
// centered=true(welcome / 收尾 / 移动降级)走居中卡,不挖洞。
// pulse=true 用轻脉冲(演示「点这里」)而非满屏挖洞,锚点四周呼吸。

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** 锚点相对 root 的局部矩形(缩放无关)。
 * 注:洞画在 root 内未缩放的 spot-layer 上,坐标取自锚点的真实 viewport 矩形 —— 即便舞台内层被
 * FitStage 等比缩放,锚点 getBoundingClientRect 已反映缩放后位置,洞自动跟随到正确视觉位置。 */
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

/** 在 root 内定位锚点:优先取「当前层」(排除正在出场的 .ob-stage-exit 旧层),
 * 避免切章瞬间量到旧层位置导致聚光洞从上一章滑过来(第2点·消抖)。 */
function findAnchor(root: HTMLElement, key: string): Element | null {
  const all = root.querySelectorAll(`[data-guide="${key}"]`);
  for (const el of all) {
    if (!el.closest('.ob-stage-exit')) return el;
  }
  return all[0] ?? null;
}

interface CanvasSpotlightProps {
  rootRef: RefObject<HTMLDivElement | null>;
  targetKey: string | null;
  /** @deprecated 气泡已固定右下角稳定锚位,不再按 placement 跟随锚点(保留以兼容调用处)。 */
  placement?: 'left' | 'right' | 'below' | 'above';
  pulse?: boolean;
  centered?: boolean;
  bubble: ReactNode;
}

const BUBBLE_W = 320;
const PAD = 6;

export function CanvasSpotlight({ rootRef, targetKey, pulse = false, centered = false, bubble }: CanvasSpotlightProps) {
  const [rect, setRect] = useState<Rect | null>(null);
  // root 尺寸进 state(不在 render 里读 ref):用于气泡定位的视口边界。
  const [rootSize, setRootSize] = useState<{ w: number; h: number }>({ w: 1440, h: 900 });
  // 切章瞬移消抖(第2点):targetKey 一变就先 jump=true(洞禁 transition、瞬落新位),
  // 同章微调时 jump=false(洞用 CSS transition 平滑跟随 resize / 布局稳定校准)。
  const [jump, setJump] = useState(true);
  const lastKeyRef = useRef<string | null>(targetKey);

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
    const el = findAnchor(root, targetKey);
    if (!el) {
      // 切章过渡瞬间新锚点可能尚未布局完成:保留旧 hole 不闪空,等下一帧/定时器重测就位。
      return;
    }
    setRect(localRect(el, root));
  }, [rootRef, targetKey, centered]);

  useLayoutEffect(() => {
    // 第2点·消抖:targetKey 变(跨章)→ jump=true,洞绘制前同步量当前层新锚点并瞬落新位,
    // 不再带 0.42s transition 从上一章位置滑过来(那正是用户看到的「抖一下/像在定位」)。
    // 测量在浏览器绘制前完成(useLayoutEffect 同步);raf + 短 timeout 仅作入场 transform 稳定后的
    // 校准兜底。校准这一帧把 jump 复位为 false,以便后续 resize / FitStage 缩放时洞平滑跟随。
    const keyChanged = lastKeyRef.current !== targetKey;
    lastKeyRef.current = targetKey;
    if (keyChanged) setJump(true);

    measure();
    const raf = requestAnimationFrame(() => {
      measure();
      setJump(false);
    });
    const t = window.setTimeout(measure, 90);
    const ro = new ResizeObserver(measure);
    if (rootRef.current) {
      ro.observe(rootRef.current);
      // 同章内锚点内容撑高(如 chat-acts 拍 demo1→demo2 同 targetKey actcards 多出行动卡)→
      // root 尺寸不变、useLayoutEffect 依赖不重触发,洞会定格在矮高度切掉行动卡。额外观察锚点
      // 元素本身,内容撑高即触发 measure 重测,洞跟随到稳定高度。锚点是 root 后代,切章瞬间可
      // 能尚未就位 → observe 前判空。
      if (!centered && targetKey) {
        const anchorEl = findAnchor(rootRef.current, targetKey);
        if (anchorEl) ro.observe(anchorEl);
      }
    }
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, rootRef, targetKey, centered]);

  const RW = rootSize.w;
  const RH = rootSize.h;
  const hole = rect ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 } : null;

  // ── 气泡定位:紧贴聚光洞落位,纯几何确定性选边(治「文字框钉死右下角、脱离目标」)──
  // 用一条固定优先级规则(右→左→下→上),对同一 hole 永远算出同一侧,绝不随空间忽左忽右漂移;
  // gap=16 紧贴目标,顶部对齐洞顶竖直靠近;clamp 兜底防出界但始终贴着目标、不甩远角。
  // welcome/handoff/移动降级走居中卡(isCentered)。
  const isCentered = centered || !hole;
  const EDGE = 24;
  const BUBBLE_EST_H = 200;
  const GAP = 16;
  let bx = RW - BUBBLE_W - EDGE;
  let by = RH - BUBBLE_EST_H - EDGE;
  if (hole) {
    const holeRight = hole.left + hole.width;
    const holeBottom = hole.top + hole.height;
    if (holeRight + GAP + BUBBLE_W <= RW - EDGE) {
      // ① 右侧:洞右边放得下气泡。顶部对齐洞顶。
      bx = holeRight + GAP;
      by = hole.top;
    } else if (hole.left - GAP - BUBBLE_W >= EDGE) {
      // ② 左侧:右边放不下、左边放得下。
      bx = hole.left - GAP - BUBBLE_W;
      by = hole.top;
    } else if (holeBottom + GAP + BUBBLE_EST_H <= RH - EDGE) {
      // ③ 下方:洞横向占满、下方放得下。
      by = holeBottom + GAP;
      bx = hole.left;
    } else {
      // ④ 上方:下方也放不下。
      by = hole.top - GAP - BUBBLE_EST_H;
      bx = hole.left;
    }
    // clamp 兜底防出界。
    bx = Math.min(Math.max(bx, EDGE), RW - BUBBLE_W - EDGE);
    by = Math.min(Math.max(by, EDGE), RH - BUBBLE_EST_H - EDGE);
  }

  return (
    <div className="ob-spot-layer" style={{ position: 'absolute', inset: 0, zIndex: 40, animation: 'ob-fade .3s var(--ob-ease)' }}>
      {hole ? (
        pulse ? (
          <>
            <div className="ob-spot-scrim" style={{ position: 'absolute' }} />
            <div className="ob-pulse" style={{ position: 'absolute', top: hole.top, left: hole.left, width: hole.width, height: hole.height, transition: jump ? 'none' : undefined }} />
          </>
        ) : (
          // jump=true(刚切章)→ transition:none,洞瞬落新锚点不从上一章滑行(消抖);稳定后恢复 CSS transition。
          <div className="ob-spot-hole" style={{ position: 'absolute', top: hole.top, left: hole.left, width: hole.width, height: hole.height, transition: jump ? 'none' : undefined }} />
        )
      ) : (
        <div className="ob-spot-scrim" style={{ position: 'absolute' }} />
      )}

      {isCentered ? (
        // 居中卡(welcome / 收尾 / 移动降级):居中职责交给无动画的 flex 外层(首帧即居中,与视口
        // 一致、不依赖会被入场动画覆盖的 transform);.ob-bubble 的 ob-pop 入场动画只作用在内层卡片,
        // 其 translateY/scale 是相对自身居中位的浮入,与居中互不干扰 —— 根治「首帧偏右下再 snap 居中」。
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div className="lg ob-bubble" style={{ width: 392, maxWidth: 'calc(100% - 32px)', padding: 22, pointerEvents: 'auto' }}>
            {bubble}
          </div>
        </div>
      ) : (
        <div className="lg ob-bubble" style={{ position: 'absolute', top: by, left: bx, width: BUBBLE_W, padding: 18, pointerEvents: 'auto' }}>
          {bubble}
        </div>
      )}
    </div>
  );
}
