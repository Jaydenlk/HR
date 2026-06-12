'use client';

// 新手导览:首次进入应用的聚光灯式分步引导。
// - localStorage 键 coach_tour_done=1 标记完成,已标记则永不再现
// - 遮罩挖洞用 box-shadow 大外溢实现,洞与气泡位置用 CSS transition 平滑过渡
// - 纯 React + CSS,零第三方依赖;目标元素靠 [data-tour="..."] 锚点定位

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const DONE_KEY = 'coach_tour_done';

interface TourStep {
  /** 侧边栏锚点 data-tour 值;null 表示居中卡片(欢迎/结束,无聚光灯) */
  target: string | null;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  { target: null, title: '欢迎来到 Coach', body: '你的 AI 求职教练,句句有据、绝不编造。' },
  { target: 'resumes', title: '简历馆', body: '第一步先把简历传进来,支持 PDF/文本。' },
  { target: 'campus', title: '校招诊断', body: '一键体检,按校招标准逐条找问题,每条都给原文依据。' },
  { target: 'today', title: '今天', body: '每天来这里看待办和复盘节奏。' },
  { target: 'chat', title: '问 Coach', body: '任何求职问题随时问,它了解你的简历和进度。' },
  { target: null, title: '一切就绪', body: '把简历传进来,马上开始第一次诊断。' },
];

/** 目标元素的视口矩形(只取定位所需四个值,避免持有 DOMRect) */
interface HoleRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** 夹取数值,防止气泡越出视口 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// 气泡尺寸常量:宽度固定,高度按内容估算用于翻转判断
const BUBBLE_W = 300;
const BUBBLE_EST_H = 170;
const GAP = 14;
const EDGE = 8;

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: 'var(--color-ink)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  fontSize: '13px',
  fontWeight: 600,
  fontFamily: 'inherit',
  letterSpacing: '-0.003em',
  cursor: 'pointer',
};

const ghostBtnStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: 'transparent',
  color: 'var(--color-ink-3)',
  border: 'none',
  borderRadius: '10px',
  fontSize: '13px',
  fontWeight: 500,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

/** 进度点:当前步拉长为胶囊并染品牌色 */
function Dots({ current }: { current: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      {STEPS.map((_, i) => (
        <span
          key={i}
          style={{
            width: i === current ? '14px' : '5px',
            height: '5px',
            borderRadius: 'var(--radius-pill)',
            background: i === current ? 'var(--color-brand)' : 'var(--color-line-2)',
            transition: 'width 0.25s ease, background 0.25s ease',
          }}
        />
      ))}
    </span>
  );
}

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<HoleRect | null>(null);
  const router = useRouter();

  // 完成/跳过:写标记并关闭;goResumes=true 时跳转简历馆
  const finish = useCallback(
    (goResumes: boolean) => {
      localStorage.setItem(DONE_KEY, '1');
      setActive(false);
      if (goResumes) router.push('/resumes');
    },
    [router],
  );

  // 首次挂载:未标记完成才激活;延迟一拍等侧边栏渲染稳定(移动端布局若卸载本组件,定时器随之清理)
  useEffect(() => {
    if (localStorage.getItem(DONE_KEY) === '1') return;
    const timer = window.setTimeout(() => setActive(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  // 步骤变化/窗口缩放:重算目标位置;目标元素不存在则自动跳过该步
  useEffect(() => {
    if (!active) return;
    const measure = () => {
      const step = STEPS[stepIndex];
      if (!step) return;
      if (step.target === null) {
        setRect(null);
        return;
      }
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (!el) {
        setStepIndex((i) => i + 1);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active, stepIndex]);

  // Esc = 跳过并标记完成
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, finish]);

  if (!active) return null;
  const step = STEPS[stepIndex];
  if (!step) return null;

  const isCard = step.target === null;
  const isEnd = stepIndex === STEPS.length - 1;

  // 挖洞矩形:有目标时围住目标(留 6px 余量);卡片步收拢到屏幕中心,洞闭合即全屏遮罩
  const hole: HoleRect = rect
    ? { top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }
    : { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 };

  // 气泡定位:优先目标右侧;右侧放不下改下方;下方越出视口则翻到上方
  let bubbleTop = 0;
  let bubbleLeft = 0;
  if (rect) {
    if (rect.left + rect.width + GAP + BUBBLE_W <= window.innerWidth - EDGE) {
      bubbleLeft = rect.left + rect.width + GAP;
      bubbleTop = clamp(rect.top - EDGE, EDGE, window.innerHeight - BUBBLE_EST_H - EDGE);
    } else {
      bubbleLeft = clamp(rect.left, EDGE, window.innerWidth - BUBBLE_W - EDGE);
      bubbleTop =
        rect.top + rect.height + GAP + BUBBLE_EST_H > window.innerHeight - EDGE
          ? rect.top - GAP - BUBBLE_EST_H
          : rect.top + rect.height + GAP;
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="新手导览"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'tour-fade-in 0.25s ease',
      }}
    >
      {/* 动画 keyframes:组件自包含,不进全局样式 */}
      <style>{`
        @keyframes tour-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tour-pop-in {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* 聚光灯洞:box-shadow 大外溢充当遮罩,洞带圆角与 2px 品牌色描边,位置/尺寸平滑过渡 */}
      <div
        style={{
          position: 'fixed',
          top: `${hole.top}px`,
          left: `${hole.left}px`,
          width: `${hole.width}px`,
          height: `${hole.height}px`,
          borderRadius: rect ? '12px' : '50%',
          border: rect ? '2px solid var(--color-brand)' : '0px solid var(--color-brand)',
          boxShadow: '0 0 0 9999px rgba(29, 29, 31, 0.55)',
          transition:
            'top 0.32s ease, left 0.32s ease, width 0.32s ease, height 0.32s ease, border-width 0.32s ease, border-radius 0.32s ease',
          pointerEvents: 'none',
        }}
      />

      {isCard ? (
        /* 居中卡片:欢迎(首步)/ 结束(末步) */
        <div
          style={{
            width: '380px',
            maxWidth: 'calc(100vw - 48px)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.18)',
            animation: 'tour-pop-in 0.3s ease',
          }}
        >
          <div
            style={{
              fontSize: '19px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.02em',
            }}
          >
            {step.title}
          </div>
          <div
            style={{
              fontSize: '13.5px',
              color: 'var(--color-ink-2)',
              marginTop: '10px',
              lineHeight: 1.7,
            }}
          >
            {step.body}
          </div>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
            <Dots current={stepIndex} />
          </div>
          <div
            style={{ marginTop: '18px', display: 'flex', justifyContent: 'center', gap: '10px' }}
          >
            {isEnd ? (
              <button type="button" onClick={() => finish(true)} style={primaryBtnStyle}>
                去简历馆开始
              </button>
            ) : (
              <>
                <button type="button" onClick={() => finish(false)} style={ghostBtnStyle}>
                  跳过
                </button>
                <button
                  type="button"
                  onClick={() => setStepIndex((i) => i + 1)}
                  style={primaryBtnStyle}
                >
                  开始导览
                </button>
              </>
            )}
          </div>
        </div>
      ) : rect ? (
        /* 说明气泡:跟随聚光灯,位置带 transition 平滑移动 */
        <div
          style={{
            position: 'fixed',
            top: `${bubbleTop}px`,
            left: `${bubbleLeft}px`,
            width: `${BUBBLE_W}px`,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-default)',
            padding: '16px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.16)',
            transition: 'top 0.32s ease, left 0.32s ease',
            animation: 'tour-pop-in 0.3s ease',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
            {step.title}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--color-ink-2)',
              marginTop: '6px',
              lineHeight: 1.65,
            }}
          >
            {step.body}
          </div>
          <div
            style={{
              marginTop: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Dots current={stepIndex} />
            <span style={{ display: 'inline-flex', gap: '6px' }}>
              <button type="button" onClick={() => finish(false)} style={ghostBtnStyle}>
                跳过
              </button>
              <button
                type="button"
                onClick={() => setStepIndex((i) => i + 1)}
                style={primaryBtnStyle}
              >
                下一步
              </button>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
