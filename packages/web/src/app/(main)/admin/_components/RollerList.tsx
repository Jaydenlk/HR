'use client';

/**
 * RollerList — admin 长列表「滚筒(2.5D 卷轴)/平铺」双视图复用组件
 *
 * 只换"展示层":调用方照旧 fetch 数据进 state,把原本 rows.map 成 table/list 的那一段
 * 换成 <RollerList items={rows} renderItem={(row)=>卡片} keyOf={(row)=>id} />。
 * 不碰数据加载/外层分页/过滤——renderItem 内部保留行原有的全部字段与交互(详情钮等)。
 *
 * 两种视图:
 *   - flat(平铺,默认):一页 pageSize 条 + 翻页器(可由 paged=false 关掉,交给外层分页)。
 *   - roller(滚筒):2.5D 纵深卷轴。焦点项居中最清晰最大最正,越往上下越后仰+变暗+缩小+淡出。
 *     鼠标滚轮平滑驱动焦点(rAF 合并,连续插值,不一格一跳)。上下 fade mask。
 *
 * 无障碍:prefers-reduced-motion: reduce 时,滚筒退化为普通纵向滚动列表(无透视/无动画)。
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Layers,
} from 'lucide-react';

// ─── prefers-reduced-motion 订阅(外部 store,用 useSyncExternalStore 合规读取)──

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReduceMotion(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getReduceMotionSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(REDUCE_QUERY).matches;
}

function useReduceMotion(): boolean {
  // 服务端快照恒为 false(无动画偏好),客户端订阅真实媒体查询。
  return useSyncExternalStore(subscribeReduceMotion, getReduceMotionSnapshot, () => false);
}

export interface RollerListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyOf: (item: T, index: number) => string;
  /** 平铺模式每页条数(默认 10) */
  pageSize?: number;
  /**
   * 平铺模式是否启用内置翻页(默认 true)。
   * 外层已做后端分页的列表传 false,只让本组件切展示层、不抢分页。
   */
  paged?: boolean;
  /** 初始视图(默认 flat 稳妥) */
  defaultMode?: 'flat' | 'roller';
  /** 切换钮无障碍标签前缀(如「报错流水」) */
  label?: string;
}

// ─── 滚筒几何参数 ────────────────────────────────────────────────────────────

const VIEWPORT_H = 380; // 滚筒可视窗口高
const ITEM_SLOT = 92; // 每项纵向槽位高(焦点态)
const VISIBLE_RADIUS = 3; // 焦点上下各渲染几项(虚拟化窗口)
const WHEEL_SENSITIVITY = 0.004; // 滚轮 deltaY(px)→ 焦点位移(项):100px≈0.4 项,多次滚动平滑推进

// 按"与焦点的距离 d(float)"计算单项 3D 变换
function slotTransform(d: number): { transform: string; opacity: number; zIndex: number } {
  const abs = Math.abs(d);
  const rotateX = Math.max(-58, Math.min(58, -d * 22)); // 越远越后仰
  const translateY = d * ITEM_SLOT; // 纵向铺开
  const translateZ = -abs * 46; // 越远越往里推
  const scale = Math.max(0.74, 1 - abs * 0.12);
  const opacity = Math.max(0, 1 - abs * 0.32);
  return {
    transform: `translateY(${translateY}px) perspective(900px) rotateX(${rotateX}deg) translateZ(${translateZ}px) scale(${scale})`,
    opacity,
    zIndex: 100 - Math.round(abs * 10),
  };
}

// ─── 切换钮 ──────────────────────────────────────────────────────────────────

function ModeToggle({
  mode,
  onChange,
  label,
}: {
  mode: 'flat' | 'roller';
  onChange: (m: 'flat' | 'roller') => void;
  label?: string;
}) {
  const btn = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: '8px',
    border: 'none',
    background: active
      ? 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))'
      : 'transparent',
    color: active ? '#fff' : 'var(--color-ink-3)',
    fontSize: '12.5px',
    fontWeight: active ? 700 : 600,
    cursor: 'pointer',
    transition: 'background .15s, color .15s',
    whiteSpace: 'nowrap',
    ...(active
      ? { boxShadow: '0 8px 22px -12px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)' }
      : {}),
  });
  return (
    <div
      role="group"
      aria-label={`${label ? label + ' ' : ''}视图切换`}
      style={{
        display: 'inline-flex',
        gap: '4px',
        padding: '4px',
        borderRadius: '12px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
      }}
    >
      <button type="button" onClick={() => onChange('flat')} style={btn(mode === 'flat')} aria-pressed={mode === 'flat'}>
        <LayoutList size={14} /> 平铺
      </button>
      <button type="button" onClick={() => onChange('roller')} style={btn(mode === 'roller')} aria-pressed={mode === 'roller'}>
        <Layers size={14} /> 滚筒
      </button>
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────

export function RollerList<T>({
  items,
  renderItem,
  keyOf,
  pageSize = 10,
  paged = true,
  defaultMode = 'flat',
  label,
}: RollerListProps<T>): React.ReactElement {
  const [mode, setMode] = useState<'flat' | 'roller'>(defaultMode);
  const [page, setPage] = useState(0);

  // prefers-reduced-motion:订阅外部媒体查询 store(SSR 安全,变化即跟随)。
  const reduceMotion = useReduceMotion();

  // ── 平铺翻页 ──
  // page 仅由翻页钮设置;items 过滤/刷新后用 safePage 派生 clamp,无需 effect 回写,
  // 避免 react-hooks/set-state-in-effect。
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const flatItems = paged ? items.slice(safePage * pageSize, (safePage + 1) * pageSize) : items;

  if (items.length === 0) {
    // 空列表:不显示切换钮,交回调用方在外层渲染空态(本组件被空数组调用时返回占位)
    return <div />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ModeToggle mode={mode} onChange={setMode} label={label} />
      </div>

      {mode === 'flat' ? (
        <FlatView
          items={flatItems}
          renderItem={renderItem}
          keyOf={keyOf}
          offset={paged ? safePage * pageSize : 0}
        />
      ) : (
        <RollerView
          items={items}
          renderItem={renderItem}
          keyOf={keyOf}
          reduceMotion={reduceMotion}
        />
      )}

      {/* 平铺翻页器(仅内置分页 + 超一页时) */}
      {mode === 'flat' && paged && totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '4px',
            paddingTop: '12px',
            borderTop: '1px solid var(--color-line)',
          }}
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            style={pagerBtn(safePage === 0)}
          >
            <ChevronLeft size={14} /> 上一页
          </button>
          <span style={{ fontSize: '12.5px', color: 'var(--color-ink-3)' }}>
            第 {safePage + 1} / {totalPages} 页 · 共 {items.length} 条
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            style={pagerBtn(safePage >= totalPages - 1)}
          >
            下一页 <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function pagerBtn(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid var(--hair)',
    background: 'rgba(47,143,255,.05)',
    color: 'var(--color-ink)',
    fontSize: '12.5px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  };
}

// ─── 平铺视图:逐项卡片 ───────────────────────────────────────────────────────

function FlatView<T>({
  items,
  renderItem,
  keyOf,
  offset,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyOf: (item: T, index: number) => string;
  offset: number;
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((item, i) => (
        <div
          key={keyOf(item, offset + i)}
          style={{
            border: '1px solid var(--color-line)',
            borderRadius: '12px',
            background: 'var(--color-surface)',
            padding: '12px 14px',
          }}
        >
          {renderItem(item, offset + i)}
        </div>
      ))}
    </div>
  );
}

// ─── 滚筒视图:2.5D 卷轴 ──────────────────────────────────────────────────────

function RollerView<T>({
  items,
  renderItem,
  keyOf,
  reduceMotion,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyOf: (item: T, index: number) => string;
  reduceMotion: boolean;
}): React.ReactElement {
  // focus:连续 float 焦点(0 .. items.length-1)。滚轮平滑推动。
  const [focus, setFocus] = useState(0);
  const focusRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // rAF 平滑动画循环:focusRef 缓动逼近 targetRef,每帧 setState 一次。
  // 循环函数存进 ref 以自递归(requestAnimationFrame(tickRef.current)),
  // 赋值放进 mount effect(渲染期不可写 ref)。tick 只用 refs 与稳定的 setFocus,
  // 无外部闭包变量,一次绑定即可。
  const tickRef = useRef<() => void>(() => {});
  useEffect(() => {
    tickRef.current = () => {
      const cur = focusRef.current;
      const tgt = targetRef.current;
      const diff = tgt - cur;
      if (Math.abs(diff) < 0.001) {
        focusRef.current = tgt;
        setFocus(tgt);
        rafRef.current = null;
        return;
      }
      const next = cur + diff * 0.18; // 缓动系数
      focusRef.current = next;
      setFocus(next);
      rafRef.current = requestAnimationFrame(() => tickRef.current());
    };
  }, []);

  const animateTo = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(items.length - 1, target));
      targetRef.current = clamped;
      if (reduceMotion) {
        // 降级:不缓动,直接落位
        focusRef.current = clamped;
        setFocus(clamped);
        return;
      }
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => tickRef.current());
      }
    },
    [items.length, reduceMotion],
  );

  // 滚轮:在滚筒区域内拦截页面滚动,累积 delta → 移动目标焦点。
  useEffect(() => {
    const el = containerRef.current;
    if (!el || reduceMotion) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * WHEEL_SENSITIVITY;
      animateTo(targetRef.current + delta);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [animateTo, reduceMotion]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // 键盘可达:上下方向键移动焦点(无障碍 + 无鼠标可用)
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        animateTo(Math.round(targetRef.current) + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        animateTo(Math.round(targetRef.current) - 1);
      }
    },
    [animateTo],
  );

  const focusIndex = Math.round(focus);

  // ── reduced-motion 降级:普通纵向滚动列表,无透视无动画 ──
  if (reduceMotion) {
    return (
      <div
        style={{
          maxHeight: `${VIEWPORT_H}px`,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '2px',
        }}
      >
        {items.map((item, i) => (
          <div
            key={keyOf(item, i)}
            style={{
              border: '1px solid var(--color-line)',
              borderRadius: '12px',
              background: 'var(--color-surface)',
              padding: '12px 14px',
            }}
          >
            {renderItem(item, i)}
          </div>
        ))}
      </div>
    );
  }

  // 虚拟化:只渲染焦点附近 ±VISIBLE_RADIUS 项
  const from = Math.max(0, focusIndex - VISIBLE_RADIUS - 1);
  const to = Math.min(items.length - 1, focusIndex + VISIBLE_RADIUS + 1);
  const slots: React.ReactElement[] = [];
  for (let idx = from; idx <= to; idx += 1) {
    const d = idx - focus;
    if (Math.abs(d) > VISIBLE_RADIUS + 0.5) continue;
    const { transform, opacity, zIndex } = slotTransform(d);
    const isFocus = idx === focusIndex;
    slots.push(
      <div
        key={keyOf(items[idx], idx)}
        aria-hidden={!isFocus}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          marginTop: `-${ITEM_SLOT / 2}px`,
          transform,
          opacity,
          zIndex,
          transformOrigin: 'center center',
          transformStyle: 'preserve-3d',
          willChange: 'transform, opacity',
          pointerEvents: isFocus ? 'auto' : 'none',
        }}
      >
        <div
          style={{
            border: isFocus ? '1px solid var(--color-brand)' : '1px solid var(--color-line)',
            borderRadius: '12px',
            background: 'var(--color-surface)',
            padding: '12px 14px',
            boxShadow: isFocus ? '0 14px 40px -18px var(--au-blue-glow)' : 'none',
            transition: 'border-color .2s, box-shadow .2s',
          }}
        >
          {renderItem(items[idx], idx)}
        </div>
      </div>,
    );
  }

  // 当前项进度
  const total = items.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div
        ref={containerRef}
        tabIndex={0}
        role="listbox"
        aria-label={`滚筒视图,共 ${total} 项,当前第 ${focusIndex + 1} 项`}
        onKeyDown={onKeyDown}
        style={{
          position: 'relative',
          height: `${VIEWPORT_H}px`,
          overflow: 'hidden',
          outline: 'none',
          // 上下淡出遮罩,营造卷轴边缘消隐
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)',
          maskImage:
            'linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)',
          cursor: 'ns-resize',
        }}
      >
        {slots}
      </div>
      {/* 进度指示 + 提示 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--color-ink-4)',
        }}
      >
        <span>滚轮 / ↑↓ 浏览</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>
          {focusIndex + 1} / {total}
        </span>
      </div>
    </div>
  );
}

export default RollerList;
