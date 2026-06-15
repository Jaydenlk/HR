'use client';

// 新手导览:首次进入应用的分步引导。
// - localStorage 键 coach_tour_done=1 标记完成,已标记则永不再现
// - 桌面端:聚光灯挖洞(box-shadow 大外溢)+ 跟随气泡;窄屏聚光灯定位不可靠,
//   移动端降级为居中说明卡(不挖洞),保证可滚动、可跳过、tap target ≥44pt
// - 纯 React + CSS,零第三方依赖;目标元素靠 [data-tour="..."] 锚点定位
// - 文案:person-before-process,每步讲"你能做到 Y + 为什么重要",而非"这是 X 功能"

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STARTER_ITEMS } from './starter-items';

const DONE_KEY = 'coach_tour_done';

interface TourStep {
  /** 侧边栏锚点 data-tour 值;null 表示居中卡片(欢迎/启动清单,无聚光灯) */
  target: string | null;
  title: string;
  body: string;
}

// welcome 卡 + 5 个价值步 + 末尾"启动清单"卡。严守 ≤5 价值步(>5 完成率断崖)。
// 价值步落点:简历馆 → 校招诊断(aha,重点)→ 问 Coach 是调度台 → 点数怎么用 → 今天。
const STEPS: TourStep[] = [
  {
    target: null,
    title: '先花一分钟,带你上手',
    body: '你来这儿,是想把秋招这场仗打好。我先用一分钟,带你看怎么开始 —— 不急,随时能跳过。',
  },
  {
    target: 'resumes',
    title: '简历馆',
    body: '第一步:把简历传进来(PDF / 文本都行)。它会成为你的底稿 —— 之后每次改写都能回溯、能回滚。',
  },
  {
    target: 'campus',
    title: '校招诊断',
    body: '这是重点:按真实校招标准给你逐条体检,每个判断都给原文依据。够不上的,当场告诉你 —— 这是你最该先做的一次。',
  },
  {
    target: 'chat',
    title: '问 Coach 是你的调度台',
    body: '把处境讲给 Coach 听(比如「下周有腾讯产品岗面试」),它会配好下一步、给你一排一键行动卡 —— 你说人话,它配好下一步。',
  },
  {
    target: null,
    title: '点数怎么用',
    body: '注册我们送了你 50 点。每次让 AI 帮你生成用 1 点,余额在左下角随时看得到。试运行期间不收费,用完了找我们免费续 —— 放心用。',
  },
  {
    target: 'today',
    title: '今天',
    body: '每天来这儿看 AI 给你排的待办和复盘节奏,做完今天的就能去过别的生活。',
  },
];

// 末尾"启动清单"卡:给"完整 / 讲完"感,收口指向第一份诚实诊断(aha)。
// 清单条目来自单一真相源 STARTER_ITEMS(与 /today 常驻清单同源),不再各自硬编码。
const CHECKLIST_TITLE = '你的校招启动清单';
const CHECKLIST_CTA = '传简历,开始第一份诊断';

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
  padding: '11px 18px',
  minHeight: '44px',
  background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: 600,
  fontFamily: 'inherit',
  letterSpacing: '-0.003em',
  cursor: 'pointer',
  boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
};

// 桌面气泡里的紧凑主按钮(空间有限,不强求 44pt)
const compactPrimaryBtnStyle: React.CSSProperties = {
  ...primaryBtnStyle,
  padding: '8px 16px',
  minHeight: 'auto',
  fontSize: '13px',
};

const ghostBtnStyle: React.CSSProperties = {
  padding: '11px 14px',
  minHeight: '44px',
  background: 'transparent',
  color: 'var(--color-ink-3)',
  border: 'none',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: 500,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const compactGhostBtnStyle: React.CSSProperties = {
  ...ghostBtnStyle,
  padding: '8px 12px',
  minHeight: 'auto',
  fontSize: '13px',
};

// 总卡数 = welcome + 价值步 + 启动清单卡;进度点按此计数。
const TOTAL = STEPS.length + 1;

/** 进度点:当前步拉长为胶囊并染品牌色 */
function Dots({ current }: { current: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      {Array.from({ length: TOTAL }).map((_, i) => (
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

/** 末尾启动清单卡的清单条目展示(导览态,纯视觉前瞻,不接真实进度——真实进度在 /today 的常驻清单)。
 *  条目来自单一真相源 STARTER_ITEMS,与 /today 常驻清单同源、编译期不可分叉。 */
function ChecklistPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
      {STARTER_ITEMS.map((item, i) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'left',
          }}
        >
          <span
            style={{
              width: '20px',
              height: '20px',
              borderRadius: 'var(--radius-pill)',
              border: '1.5px solid var(--color-line-2)',
              color: 'var(--color-ink-4)',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {i + 1}
          </span>
          <span style={{ fontSize: '13.5px', color: 'var(--color-ink-2)', lineHeight: 1.4 }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<HoleRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
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

  // 视口宽度判定:与 layout 一致用 768 阈值。移动端走居中卡片降级。
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 首次挂载:未标记完成才激活;延迟一拍等侧边栏渲染稳定
  useEffect(() => {
    if (localStorage.getItem(DONE_KEY) === '1') return;
    const timer = window.setTimeout(() => setActive(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  // 步骤变化/窗口缩放:重算目标位置(仅桌面聚光灯需要)。移动端不挖洞,跳过测量。
  // 目标元素不存在(如该锚点被折叠/未渲染)则不聚光,退化为居中卡。
  useEffect(() => {
    if (!active) return;
    const measure = () => {
      // 移动端不挖洞,跳过测量直接清空矩形;桌面端按当前步定位目标。
      if (isMobile) {
        setRect(null);
        return;
      }
      const step = STEPS[stepIndex];
      if (!step) return;
      if (step.target === null) {
        setRect(null);
        return;
      }
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active, stepIndex, isMobile]);

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

  // stepIndex ∈ [0, STEPS.length]:最后一格(== STEPS.length)是启动清单卡。
  const isChecklist = stepIndex === STEPS.length;
  const step = isChecklist ? null : STEPS[stepIndex];
  // welcome / 点数步 / 启动清单 / 移动端 / 锚点缺失 → 走居中卡片;否则聚光灯气泡。
  const useSpotlight = !isMobile && !isChecklist && step != null && step.target !== null && rect != null;

  // 挖洞矩形:有目标时围住目标(留 6px 余量);否则收拢到屏幕中心,洞闭合即全屏遮罩
  const hole: HoleRect = useSpotlight
    ? { top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }
    : { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 };

  // 气泡定位:优先目标右侧;右侧放不下改下方;下方越出视口则翻到上方
  let bubbleTop = 0;
  let bubbleLeft = 0;
  if (useSpotlight) {
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
      data-tour-spotlight
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflowY: 'auto',
        animation: 'tour-fade-in 0.25s ease',
      }}
    >
      {/* 动画 keyframes + 遮罩配色:组件自包含,不进全局样式。
          --tour-scrim 对齐共享 .modal-scrim 的克制色值(暗罩不发灰发脏),
          但本组件是全屏聚光层(含侧栏),故不用 .modal-scrim/.modal-overlay。
          通过 CSS 变量让暗/亮主题各自取干净值,inline style 引用即可。 */}
      <style>{`
        [data-tour-spotlight] { --tour-scrim: rgba(5, 6, 12, 0.38); }
        html[data-theme="light"] [data-tour-spotlight] { --tour-scrim: rgba(17, 19, 28, 0.2); }
        @keyframes tour-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tour-pop-in {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* 聚光灯洞:仅桌面聚光态渲染;移动端 / 居中卡只用纯遮罩(下方半透明背板) */}
      {useSpotlight ? (
        <div
          style={{
            position: 'fixed',
            top: `${hole.top}px`,
            left: `${hole.left}px`,
            width: `${hole.width}px`,
            height: `${hole.height}px`,
            borderRadius: '12px',
            border: '2px solid var(--color-brand)',
            boxShadow: '0 0 0 9999px var(--tour-scrim)',
            transition:
              'top 0.32s ease, left 0.32s ease, width 0.32s ease, height 0.32s ease',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--tour-scrim)',
            pointerEvents: 'none',
          }}
        />
      )}

      {isChecklist ? (
        /* 末尾:启动清单卡(居中) */
        <div
          className="lg"
          style={{
            position: 'relative',
            width: '420px',
            maxWidth: '100%',
            padding: '28px',
            animation: 'tour-pop-in 0.3s ease',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: '19px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            {CHECKLIST_TITLE}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--color-ink-3)',
              marginTop: '8px',
              marginBottom: '18px',
              lineHeight: 1.6,
              textAlign: 'center',
            }}
          >
            四步走完,你就跑通了 Coach 最核心的一圈。
          </div>
          <ChecklistPreview />
          <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'center' }}>
            <Dots current={stepIndex} />
          </div>
          <div style={{ marginTop: '18px' }}>
            <button
              type="button"
              onClick={() => finish(true)}
              style={{ ...primaryBtnStyle, width: '100%' }}
            >
              {CHECKLIST_CTA}
            </button>
          </div>
          <div style={{ marginTop: '8px', textAlign: 'center' }}>
            <button type="button" onClick={() => finish(false)} style={ghostBtnStyle}>
              先逛逛
            </button>
          </div>
        </div>
      ) : useSpotlight ? (
        /* 桌面聚光态:说明气泡跟随聚光灯,位置带 transition 平滑移动 */
        <div
          className="lg"
          style={{
            position: 'fixed',
            top: `${bubbleTop}px`,
            left: `${bubbleLeft}px`,
            width: `${BUBBLE_W}px`,
            borderRadius: 'var(--radius-default)',
            padding: '16px',
            transition: 'top 0.32s ease, left 0.32s ease',
            animation: 'tour-pop-in 0.3s ease',
          }}
        >
          <div style={{ fontFamily: 'var(--serif)', fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
            {step?.title}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--color-ink-2)',
              marginTop: '6px',
              lineHeight: 1.65,
            }}
          >
            {step?.body}
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
              <button type="button" onClick={() => finish(false)} style={compactGhostBtnStyle}>
                跳过
              </button>
              <button
                type="button"
                onClick={() => setStepIndex((i) => i + 1)}
                style={compactPrimaryBtnStyle}
              >
                下一步
              </button>
            </span>
          </div>
        </div>
      ) : (
        /* 居中说明卡:welcome / 点数步 / 移动端各步 / 锚点缺失降级 */
        <div
          className="lg"
          style={{
            position: 'relative',
            width: '380px',
            maxWidth: '100%',
            padding: '28px',
            textAlign: 'center',
            animation: 'tour-pop-in 0.3s ease',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: '19px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.02em',
            }}
          >
            {step?.title}
          </div>
          <div
            style={{
              fontSize: '13.5px',
              color: 'var(--color-ink-2)',
              marginTop: '10px',
              lineHeight: 1.7,
            }}
          >
            {step?.body}
          </div>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
            <Dots current={stepIndex} />
          </div>
          <div
            style={{
              marginTop: '18px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <button type="button" onClick={() => finish(false)} style={ghostBtnStyle}>
              跳过
            </button>
            <button
              type="button"
              onClick={() => setStepIndex((i) => i + 1)}
              style={primaryBtnStyle}
            >
              {stepIndex === 0 ? '开始导览' : '下一步'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
