'use client';

// onboarding-tour.tsx — Coach 首登引导(v3.1 重做 · 真侧栏同源版)。
//
// 形与质感取自 ver3.1 原型(磨砂玻璃 + 极光 + 章节轨 + 聚光灯 + 镜头级动效),
// 装进真实 Next.js app:复用线上 globals.css 双主题令牌、真实路由、单一真相源。
//
// ★核心⑤·真侧栏同源(Strategy2):弃手搓 DemoSidebar。OnboardingTour 本就挂在真实
//   (main)/layout.tsx 里,真侧栏已渲染在底下。引导覆盖层「只盖主内容区」(desktop:
//   left=var(--sidebar-w)),让真实侧栏照常露出可见;高亮由真侧栏的真实滑动指示器驱动
//   —— OnboardingTour 经 OnboardingNavContext 把当前章节的 href 写给 layout,layout 的
//   isActive / useLayoutEffect 指示器测量按它落位(不真导航、不触发路由)。Coach 章高亮
//   落到真 CTA 上(layout 给 CTA 加脉冲类)。两个 part(点数 / 使用帮助)用视口级聚光
//   打真侧栏的 [data-guide-real] 锚点(左上账户区 / 左下使用帮助),气泡躲到主区不遮挡。
//
// 两种运行态:
//  ① 主导览(首登)= 覆盖主区的「画布」:演示 surface + 画布内聚光灯,按 [data-guide] 锚点定位;
//     校招诊断章自动连播(score→压分→逐条),其余手动推进。承接钩子用 CTA 串联因果。
//     收尾不弹「恭喜」死胡同 —— router.push('/resumes') + 接力高亮真实上传锚点(ResumeHandoffHint)。
//  ② 功能 mini-tour(公告 CTA 触发)= 在真实 app 页上用聚光灯打 [data-tour] 锚点(沿用旧机制,
//     锚点不在则降级居中卡)。内容独立、按 seenKey 持久化。
//
// 文案逐字取自定稿 onboarding-v31-copy-batch-2.md(用户亲笔),不得改动。

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import './onboarding-motion.css';
import { STARTER_ITEMS } from './starter-items';
import { LAUNCH_FEATURE_TOUR_EVENT, type LaunchFeatureTourDetail } from '@/lib/feature-tour';
import { getFeatureUpdateByTourId } from '@/lib/feature-updates';
import { HANDOFF_KEY, HANDOFF_EVENT } from './resume-handoff-hint';
import { ChapterRail } from './onboarding-chapter-rail';
import { CanvasSpotlight } from './onboarding-spotlight';
import { useOnboardingNav } from './onboarding-nav-context';
import {
  ResultSurface,
  RewriteSurface,
  ChatSurface,
  MockSurface,
  DebriefSurface,
  AuxOverview,
  AccountSurface,
  ResumesSurface,
  HelpSurface,
} from './onboarding-surfaces';

const DONE_KEY = 'coach_tour_done';

// ── 主导览章节(章节轨 = 全景地图) ──────────────────────────────────
export const CHAPTERS = ['校招诊断', 'AI 改写', '问 Coach', '模拟面试', '面试复盘', '开始用'] as const;

// ── 章节 → 真侧栏视觉激活 href 映射(核心③) ──────────────────────────
// 引导期把这个 href 写给 layout(OnboardingNavContext),真侧栏滑动指示器滑到对应项 / CTA 脉冲。
// 不真导航,只视觉高亮。映射对齐 SIDEBAR_SPEC:
//   welcome / AI 改写 / 收尾 → /resumes(简历馆)、校招诊断 → /diagnoses/campus、
//   问 Coach → /chat(CTA)、模拟面试 → /mock、面试复盘 → /debrief、辅助功能 → /overview。

// ── 主导览步骤模型 ──────────────────────────────────────────────────
type SurfaceKind = 'resumes' | 'campus' | 'rewrite' | 'chat' | 'mock' | 'debrief' | 'aux' | 'account' | 'help';

interface CanvasStep {
  id: string;
  /** 章节轨索引;null = 不在轨上(welcome / handoff) */
  chapter: number | null;
  surface: SurfaceKind;
  /** surface 内部演示拍号 */
  demo: number;
  /** 真侧栏视觉激活 href(写给 OnboardingNavContext);null = 不覆盖 */
  activeHref: string | null;
  /** 画布内聚光锚点 [data-guide];null = 居中(welcome) */
  target: string | null;
  /** 聚光真侧栏锚点 [data-guide-real](视口级,气泡躲主区):account=左上账户区、
   *  help=左下使用帮助、more=工具区「更多功能」按钮(辅助功能屏聚光落点)。 */
  realTarget?: 'account' | 'help' | 'more';
  placement?: 'left' | 'right' | 'below' | 'above';
  /** 自动连播毫秒;null = 手动推进 */
  auto?: number | null;
  /** 锚点轻脉冲(演示「点这里」) */
  pulse?: boolean;
  /** welcome 卡 */
  welcome?: boolean;
  /** 收尾接力卡 */
  handoff?: boolean;
  // 气泡文案(逐字定稿)
  tag?: string;
  title?: string;
  body?: ReactNode;
  cta?: string;
}

const STEPS: CanvasStep[] = [
  // 屏 0 · Welcome
  { id: 'welcome', chapter: null, surface: 'resumes', demo: 0, activeHref: '/resumes', target: null, welcome: true },

  // 屏 1-3 · 校招诊断(做满 3 拍 · 自动连播)
  {
    id: 'score',
    chapter: 0,
    surface: 'campus',
    demo: 1,
    activeHref: '/diagnoses/campus',
    target: 'scorering',
    placement: 'below',
    auto: 2100,
    tag: '校招诊断',
    title: '先给简历做诊断',
    body: '按校招标准逐条过一遍',
  },
  {
    id: 'cut',
    chapter: 0,
    surface: 'campus',
    demo: 2,
    activeHref: '/diagnoses/campus',
    target: 'scorering',
    placement: 'below',
    auto: 2900,
    tag: '防编造护栏',
    title: '没依据的,当场压分',
    body: '空谈言论，帮你具象化坐实！',
  },
  {
    id: 'checks',
    chapter: 0,
    surface: 'campus',
    demo: 3,
    activeHref: '/diagnoses/campus',
    target: 'checks',
    placement: 'left',
    auto: null,
    tag: '它给你的产出',
    title: '每条都标了原文依据',
    body: '黄色区域为重点提示，希望着重参考',
    cta: '去改这条',
  },

  // 屏 4-5 · AI 改写(做满 2 拍 · 亲手摸)。承接:AI 改写出现在校招诊断之后,诊断完会给一些建议。
  {
    id: 'rewrite-before',
    chapter: 1,
    surface: 'rewrite',
    demo: 1,
    activeHref: '/resumes',
    target: 'rewrite-demo',
    placement: 'left',
    auto: null,
    tag: 'AI 改写',
    title: '把话说到位,没做过不编',
    body: '承接刚才那条「需确认」—— 你写「负责」,原文是「参与」。',
  },
  {
    id: 'rewrite-after',
    chapter: 1,
    surface: 'rewrite',
    demo: 2,
    activeHref: '/resumes',
    target: 'rewrite-run',
    placement: 'left',
    auto: null,
    pulse: true,
    tag: 'AI 改写 · 怎么用',
    title: '点改写，帮助你更加完善你的履历',
    body: '点这里，更好的展示你的履历「并标注出处」',
    cta: '问 Coach',
  },

  // 屏 6-7 · 问 Coach(做满 2 拍 · 亲手摸)
  {
    id: 'chat-reply',
    chapter: 2,
    surface: 'chat',
    demo: 1,
    activeHref: '/chat',
    target: 'actcards',
    placement: 'right',
    auto: null,
    tag: '问 Coach',
    title: '说明你的现状，帮你准备下一步',
  },
  {
    id: 'chat-acts',
    chapter: 2,
    surface: 'chat',
    demo: 2,
    activeHref: '/chat',
    target: 'actcards',
    placement: 'above',
    auto: null,
    tag: '问 Coach · 怎么用',
    title: '不知道先做什么？直接说现状即可~',
    body: '他会帮你配置好内容，点击即可开始！',
    cta: '试试问一句',
  },

  // 屏 8 · 模拟面试(次线 1 拍)
  {
    id: 'mock',
    chapter: 3,
    surface: 'mock',
    demo: 0,
    activeHref: '/mock',
    target: 'mock-voice',
    placement: 'left',
    auto: null,
    pulse: true,
    tag: '模拟面试',
    title: '两种模式，供你选择',
    body: '累了？紧张？没关系，我们模拟真实环境！努力达到最好的效果',
    cta: '看复盘',
  },

  // 屏 9 · 面试复盘(次线 1 拍 + 扫码一瞥)
  {
    id: 'debrief',
    chapter: 4,
    surface: 'debrief',
    demo: 0,
    activeHref: '/debrief',
    target: 'debrief-demo',
    placement: 'left',
    auto: null,
    tag: '面试复盘',
    title: '面试有记录？我来帮你解析~',
    body: '录音在手机也可以上传哦~',
    cta: '还有什么',
  },

  // 屏 10 · 辅助功能(第4点:聚光呼吸落真侧栏「更多功能」按钮,不再高亮 /overview/求职总览)
  {
    id: 'aux',
    chapter: 5,
    surface: 'aux',
    demo: 0,
    activeHref: null,
    target: null,
    realTarget: 'more',
    placement: 'right',
    auto: null,
    tag: '更多 · 辅助功能',
    title: '还有这些功能可以选择使用哦~',
    body: '主要功能都已展示完成，欢迎体验！点开「更多功能」就能看到这些辅助工具。',
    cta: '看点数',
  },

  // 屏 11 · Part A 点数(主区显示账户/点数界面 + 聚光真侧栏左上账户区)
  {
    id: 'credits',
    chapter: 5,
    surface: 'account',
    demo: 0,
    activeHref: null,
    target: null,
    realTarget: 'account',
    placement: 'right',
    auto: null,
    tag: '点数 · 在这看',
    title: '余额、名字、主题键都在左上角',
    body: (
      <>
        左上角这块显示你的头像、名字和剩余点数。点数<strong>用多少扣多少</strong>,各功能消耗不同——多数功能每次 1 点,面试复盘(转写+分析)成功才扣 7 点,失败不扣。旁边那个小圆钮,点一下切换深色 / 浅色主题。
      </>
    ),
    cta: '使用帮助',
  },

  // 屏 12 · Part B 使用帮助(聚光真侧栏左下)
  {
    id: 'help',
    chapter: 5,
    surface: 'help',
    demo: 0,
    activeHref: null,
    target: null,
    realTarget: 'help',
    placement: 'right',
    auto: null,
    tag: '使用帮助 · 随时点',
    title: '忘了功能在哪?点这里',
    body: '左下角「使用帮助」随时可以点开,一处看清平台能帮你做哪些事,还能重看这趟引导。',
    cta: '轮到你了',
  },

  // 屏 13 · 收尾接力(治 finish 撒手)
  {
    id: 'handoff',
    chapter: 5,
    surface: 'resumes',
    demo: 0,
    activeHref: '/resumes',
    target: 'upload',
    placement: 'right',
    auto: null,
    handoff: true,
    tag: '轮到你了',
    title: '轮到你的简历',
    body: '快来在模拟情景闯一闯！祝你拿下优秀的Offer！',
    cta: '传简历',
  },
];

// ── 功能 mini-tour(公告 CTA;聚光真实 [data-tour] 锚点) ──────────────
interface FeatureStep {
  target: string | null;
  title: string;
  body: string;
}
interface FeatureTourDef {
  tourId: string;
  steps: FeatureStep[];
}
const FEATURE_TOURS: FeatureTourDef[] = [
  {
    tourId: 'asr-recording',
    steps: [
      {
        target: 'asr-upload',
        title: '把录音变复盘',
        body: '面完一场,把录音传到这儿,自动转成文字,再逐题标出哪答得好、哪能更好。成功才扣 7 点。',
      },
    ],
  },
];
function findFeatureTour(tourId: string): FeatureTourDef | undefined {
  return FEATURE_TOURS.find((t) => t.tourId === tourId);
}

// ── 启动清单(收尾卡)单一真相源渲染 ────────────────────────────────
// 三步对齐定稿(传简历 / 拿到诊断 / 问 Coach):过滤掉 direction(意图分挡已砍,不展示)。
function ChecklistPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
      {STARTER_ITEMS.filter((it) => it.id !== 'direction').map((item, i) => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
          <span
            className="mono"
            style={{ width: 20, height: 20, borderRadius: 999, border: '1.5px solid var(--color-brand)', color: 'var(--color-brand)', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            {i + 1}
          </span>
          <span style={{ fontSize: 13.5, color: 'var(--color-ink-2)', lineHeight: 1.4 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── 按钮样式 ────────────────────────────────────────────────────────
const primaryBtn: React.CSSProperties = {
  padding: '8px 16px',
  background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxShadow: '0 10px 24px -12px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
};
const ghostBtn: React.CSSProperties = {
  padding: '8px 12px',
  background: 'transparent',
  color: 'var(--color-ink-3)',
  border: 'none',
  borderRadius: 9,
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'inherit',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

// ── Welcome 卡(磨砂简历叠卡 + ? 钩子) ─────────────────────────────
function MiniCVStack() {
  const card: React.CSSProperties = { position: 'absolute', borderRadius: 14, overflow: 'hidden' };
  const paper: React.CSSProperties = {
    background: 'var(--color-surface)',
    boxShadow: '0 24px 50px -22px rgba(0,0,0,.4), 0 2px 8px rgba(0,0,0,.12)',
    border: '1px solid var(--hair)',
  };
  const bar = (w: string, c: string, t: number) => <div style={{ height: 5, width: w, borderRadius: 3, background: c, marginTop: t }} />;
  return (
    <div style={{ position: 'relative', height: 158, marginBottom: 4 }}>
      <div className="lg" style={{ ...card, left: 'calc(50% - 116px)', top: 24, width: 96, height: 120, transform: 'rotate(-9deg)', opacity: 0.55 }} />
      <div style={{ ...card, ...paper, left: 'calc(50% + 22px)', top: 18, width: 96, height: 124, transform: 'rotate(8deg)', opacity: 0.66 }} />
      <div style={{ ...card, ...paper, left: 'calc(50% - 54px)', top: 8, width: 112, height: 138, zIndex: 3 }}>
        <div
          className="mono"
          style={{ position: 'absolute', top: -9, left: 18, fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, color: 'var(--color-brand)', background: 'var(--color-surface)', border: '1px solid var(--hair)', borderRadius: 6, padding: '2px 7px', zIndex: 4 }}
        >
          v3 · 还在改
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 22, height: 22, borderRadius: 7, background: 'linear-gradient(135deg,var(--color-brand),var(--color-brand-deep))', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              {bar('76%', 'var(--color-ink-2)', 0)}
              {bar('48%', 'var(--color-line-2)', 6)}
            </div>
          </div>
          {bar('90%', 'var(--color-line)', 13)}
          {bar('74%', 'var(--color-line)', 9)}
          {bar('82%', 'var(--color-line)', 9)}
          {bar('64%', 'var(--color-line)', 9)}
        </div>
      </div>
      <span style={{ position: 'absolute', right: 'calc(50% - 128px)', top: 6, fontFamily: 'Georgia,serif', fontStyle: 'italic', fontWeight: 600, fontSize: 34, color: 'var(--color-brand)', opacity: 0.5, zIndex: 4 }}>?</span>
    </div>
  );
}

function WelcomeCard({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div>
      <MiniCVStack />
      <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-.01em', textAlign: 'center', lineHeight: 1.4, marginTop: 8 }}>
        欢迎来到Coach~
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--color-ink-2)', textAlign: 'center', margin: '10px auto 0', lineHeight: 1.65, maxWidth: '24em' }}>
        我是引导，接下来我来简单介绍一下😋
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
        <button type="button" onClick={onStart} style={{ ...primaryBtn, padding: '11px 22px', fontSize: 14, borderRadius: 999 }}>
          带我看
        </button>
        <button type="button" onClick={onSkip} style={{ ...ghostBtn, padding: '11px 14px', fontSize: 13, borderRadius: 999 }}>
          先跳过
        </button>
      </div>
    </div>
  );
}

// ── 主组件 ──────────────────────────────────────────────────────────
export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  // 关场:置 true 时覆盖层根节点播出场动画(从大到小淡出),动画结束再真正卸载(治「结束顿挫」)。
  const [closing, setClosing] = useState(false);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [featureTour, setFeatureTour] = useState<FeatureTourDef | null>(null);
  const [featureStep, setFeatureStep] = useState(0);
  const [featureRect, setFeatureRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  // Part A/B:聚光真侧栏锚点的视口级矩形(getBoundingClientRect)。
  const [realRect, setRealRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  // 关场出场动画的延时 teardown 句柄:存 ref 以便重开/新一轮关场/卸载时取消,杜绝孤儿定时器把刚重开的引导杀掉(竞态)。
  const exitTimerRef = useRef<number | null>(null);
  const { setGuideActiveHref } = useOnboardingNav();

  const s = STEPS[step];
  const atEnd = step === STEPS.length - 1;

  // 关场闸:先播覆盖层出场动画(从大到小淡出 ~220ms),动画结束再执行真正的卸载/收尾逻辑。
  // prefers-reduced-motion 下不延迟,直接卸载(降级为直接显隐)。
  const runWithExit = useCallback((teardown: () => void) => {
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      teardown();
      return;
    }
    // 新一轮关场开始前,先取消上一轮可能仍在飞的延时 teardown(finishMain/finishFeature 都经此入口),避免孤儿叠加。
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setClosing(true);
    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null;
      setClosing(false);
      teardown();
    }, 230);
  }, []);

  // 视口判定(<768 走移动降级居中卡)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 首挂载:未完成才激活
  useEffect(() => {
    if (localStorage.getItem(DONE_KEY) === '1') return;
    const t = window.setTimeout(() => setActive(true), 300);
    return () => window.clearTimeout(t);
  }, []);

  // 重看引导:coach:restart-tour
  useEffect(() => {
    const onRestart = () => {
      // 关场出场动画途中重看:先取消在飞的延时 teardown,否则它 ~230ms 后会把刚重开的引导 setActive(false) 杀掉(竞态)。
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setClosing(false);
      setFeatureTour(null);
      setStep(0);
      setPlaying(false);
      setActive(true);
    };
    window.addEventListener('coach:restart-tour', onRestart);
    return () => window.removeEventListener('coach:restart-tour', onRestart);
  }, []);

  // 功能 mini-tour 启动
  useEffect(() => {
    const onLaunch = (e: Event) => {
      const detail = (e as CustomEvent<LaunchFeatureTourDetail>).detail;
      const def = detail?.tourId ? findFeatureTour(detail.tourId) : undefined;
      if (!def) return;
      setFeatureTour(def);
      setFeatureStep(0);
      window.setTimeout(() => setActive(true), 350);
    };
    window.addEventListener(LAUNCH_FEATURE_TOUR_EVENT, onLaunch);
    return () => window.removeEventListener(LAUNCH_FEATURE_TOUR_EVENT, onLaunch);
  }, []);

  // ★真侧栏同源:主导览期间把当前章节的 activeHref 写给 layout(真侧栏指示器据此滑动/CTA 脉冲)。
  // 并在 body 打 data-onboarding-active 让真侧栏指示器叠引导辉光。退出 / 切到功能 tour 时清干净(零回归)。
  const inMainTour = active && !featureTour;
  useEffect(() => {
    if (!inMainTour) {
      setGuideActiveHref(null);
      document.body.removeAttribute('data-onboarding-active');
      return;
    }
    document.body.setAttribute('data-onboarding-active', '1');
    setGuideActiveHref(s.activeHref);
    return () => {
      // 卸载或依赖变化的收尾在下一次 effect 体内重设;真正清场在 inMainTour=false 分支 + 下方卸载兜底。
    };
  }, [inMainTour, s.activeHref, setGuideActiveHref]);

  // 组件卸载兜底:确保不残留覆盖状态。
  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setGuideActiveHref(null);
      document.body.removeAttribute('data-onboarding-active');
    };
  }, [setGuideActiveHref]);

  // 校招诊断章自动连播:仅当 auto 非空才排定时器进下一拍;auto 为 null 的步不排,连播自然停在该步。
  useEffect(() => {
    if (!active || featureTour || !playing) return;
    if (s.auto == null) return;
    const t = window.setTimeout(() => setStep((i) => Math.min(STEPS.length - 1, i + 1)), s.auto);
    return () => window.clearTimeout(t);
  }, [active, featureTour, playing, step, s.auto]);

  // Part A/B/辅助功能(account / help / more):量真侧栏锚点 [data-guide-real] 的视口矩形(桌面)。
  // ★自适应:聚光框位置一律从真实元素的实时 getBoundingClientRect 计算,且在任何会改变锚点位置的
  //   事件后重算 —— 绝不「测一次锁死」:
  //   ① more 在侧栏可滚动中段(overflowY:auto):先 scrollIntoView 把它滚进可视区再测,否则量到视口外/被裁切位;
  //   ② account 的点数(creditBalance 异步)/头像(异步加载)回来后账户区撑高 → ResizeObserver 观察锚点本身重测;
  //   ③ 侧栏整体内容高度变化(展开「更多」、最近对话、admin 项)→ ResizeObserver 观察 aside 重测(波及 more 位移);
  //   ④ 窗口 resize / 中段滚动 → 监听重算。
  //   useLayoutEffect 在绘制前同步首测(锚点是已渲染的固定 DOM),切到 part 拍聚光起始即落侧栏,不闪。
  useLayoutEffect(() => {
    if (!active || featureTour) return;
    const realTarget = s.realTarget;
    const measure = () => {
      if (!realTarget || isMobile) {
        setRealRect(null);
        return;
      }
      const el = document.querySelector(`[data-guide-real="${realTarget}"]`);
      if (!el) {
        setRealRect(null);
        return;
      }
      // more 在可滚动中段:先滚进可视区,聚光框才能罩住真实可见位置(治「没滚到可视区就量偏」)。
      if (realTarget === 'more') el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      setRealRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    // 非 part 步 / 移动:measure 已置 null,无需注册观察器与定时器。
    if (!realTarget || isMobile) return;
    // 异步首屏数据(/me 点数、头像)回来撑高账户区的兜底校准。
    const t1 = window.setTimeout(measure, 60);
    const t2 = window.setTimeout(measure, 240);

    // ResizeObserver:观察锚点本身(异步加载撑高)+ 侧栏 aside(内容高度变化波及 more 位移)。
    const ro = new ResizeObserver(measure);
    const anchorEl = document.querySelector(`[data-guide-real="${realTarget}"]`);
    if (anchorEl) ro.observe(anchorEl);
    const aside = document.querySelector('aside');
    if (aside) ro.observe(aside);

    // 中段滚动容器滚动时 more 位移 → 重测(捕获阶段抓到内部滚动)。
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, featureTour, s.realTarget, isMobile, step]);

  // 功能 tour:聚光真实 [data-tour] 锚点(桌面);移动 / 锚点缺失降级居中卡
  useEffect(() => {
    if (!active || !featureTour) return;
    const measure = () => {
      if (isMobile) {
        setFeatureRect(null);
        return;
      }
      const fs = featureTour.steps[featureStep];
      if (!fs || fs.target == null) {
        setFeatureRect(null);
        return;
      }
      const el = document.querySelector(`[data-tour="${fs.target}"]`);
      if (!el) {
        setFeatureRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setFeatureRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const t = window.setTimeout(measure, 60);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [active, featureTour, featureStep, isMobile]);

  // 收尾:写 DONE_KEY,跳简历页 + 触发接力(治撒手)。先播关场动画再真正卸载(runWithExit)。
  const finishMain = useCallback(
    (goResumes: boolean) => {
      runWithExit(() => {
        localStorage.setItem(DONE_KEY, '1');
        setGuideActiveHref(null);
        document.body.removeAttribute('data-onboarding-active');
        setActive(false);
        setStep(0);
        setPlaying(false);
        if (goResumes) {
          try {
            sessionStorage.setItem(HANDOFF_KEY, '1');
          } catch {
            /* ignore */
          }
          router.push('/resumes');
          window.setTimeout(() => window.dispatchEvent(new CustomEvent(HANDOFF_EVENT)), 400);
        }
      });
    },
    [router, setGuideActiveHref, runWithExit],
  );

  // 功能 tour 收尾:写 seenKey。同样先播关场动画再卸载。
  const finishFeature = useCallback(() => {
    runWithExit(() => {
      if (featureTour) {
        const reg = getFeatureUpdateByTourId(featureTour.tourId);
        if (reg) localStorage.setItem(reg.seenKey, '1');
      }
      setFeatureTour(null);
      setFeatureStep(0);
      setActive(false);
    });
  }, [featureTour, runWithExit]);

  // Esc = 跳过
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (featureTour) finishFeature();
      else finishMain(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, featureTour, finishMain, finishFeature]);

  if (!active) return null;

  // ── 渲染分流 ──────────────────────────────────────────────────────
  // A) 功能 mini-tour:真实 app 页上的聚光灯 / 居中卡(沿用旧体验)
  if (featureTour) {
    return (
      <FeatureTourLayer
        def={featureTour}
        stepIndex={featureStep}
        rect={featureRect}
        isMobile={isMobile}
        closing={closing}
        onNext={() => {
          if (featureStep >= featureTour.steps.length - 1) finishFeature();
          else setFeatureStep((i) => i + 1);
        }}
        onSkip={finishFeature}
      />
    );
  }

  // 移动端降级:不挖洞,只用居中卡讲文案(聚光定位窄屏不可靠)
  const mobileCard = isMobile && !s.welcome && !s.handoff;

  // 上一步 / 下一步:统一前进/后退(part 步也走同一套)
  const goPrev = () => {
    setPlaying(false);
    setStep((i) => Math.max(1, i - 1));
  };
  const goNext = () => {
    setPlaying(false);
    setStep((i) => Math.min(STEPS.length - 1, i + 1));
  };

  // Part A/B/辅助功能:聚光真侧栏锚点。不再全屏挖洞压暗(用户反馈「暗背景+灰遮罩看不清」),
  // 改为:主区画布正常显示对应演示界面(account / aux,全亮),侧栏目标只叠一个呼吸高亮框,
  // 气泡固定右下角解说。桌面有 realRect 才走侧栏高亮;否则(移动/未测到)降级主区居中卡。
  const realPart = !!s.realTarget && !isMobile && realRect != null;

  const bubbleContent = s.welcome ? (
    <WelcomeCard
      onStart={() => {
        setStep(1);
        setPlaying(true);
      }}
      onSkip={() => finishMain(false)}
    />
  ) : s.handoff ? (
    <HandoffCard onStart={() => finishMain(true)} onReset={() => finishMain(false)} />
  ) : (
    <StepBubble s={s} atEnd={atEnd} onPrev={goPrev} onNext={goNext} onSkip={() => finishMain(false)} />
  );

  // ★主区画布:desktop 只盖主内容区(left=var(--sidebar-w)),真侧栏照常露出;mobile 全屏。
  const canvasInset: React.CSSProperties = isMobile
    ? { position: 'fixed', inset: 0 }
    : { position: 'fixed', top: 0, right: 0, bottom: 0, left: 'var(--sidebar-w)' };

  return (
    <div
      data-onboarding
      role="dialog"
      aria-modal="true"
      aria-label="新手导览"
      ref={rootRef}
      className={closing ? 'ob-overlay-out' : 'ob-overlay-in'}
      style={{ ...canvasInset, zIndex: 300, overflow: 'hidden' }}
    >
      {/* 舞台:主区画布常驻(治顿挫根因)。只有中央 stage 内容随 surface 交叉过渡;
          真侧栏在画布之外(左侧)由 OnboardingNavContext 驱动滑动高亮(核心⑤同源)。 */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--color-bg)', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)' }}>
        <main style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
          <StageContent surface={s.surface} demo={s.demo} />
        </main>
      </div>

      {/* 章节轨(全景地图 + 进度 + 可跳转) */}
      {s.chapter != null && (
        <ChapterRail
          chapters={CHAPTERS}
          current={s.chapter}
          onJump={(ch) => {
            const i = STEPS.findIndex((st) => st.chapter === ch);
            if (i >= 0) {
              setPlaying(ch === 0);
              setStep(i);
            }
          }}
        />
      )}

      {/* 聚光层 + 气泡 */}
      {realPart && realRect ? (
        // Part 步:侧栏目标呼吸高亮(无全屏暗 scrim,主区演示界面保持全亮)+ 固定气泡。
        <SidebarHighlight rect={realRect} bubble={bubbleContent} closing={closing} />
      ) : (
        // 主导览常规步:画布内按 [data-guide] 锚点聚光,气泡固定右下角。
        <CanvasSpotlight
          rootRef={rootRef}
          targetKey={mobileCard ? null : s.target}
          pulse={s.pulse}
          centered={s.welcome || s.handoff || mobileCard}
          bubble={bubbleContent}
        />
      )}
    </div>
  );
}

// ── 侧栏目标高亮(Part 步:account/help/more)──────────────────────────────────
// 视口级(fixed):全屏灰蒙版(scrim)压暗主区聚焦入口 + 真侧栏目标锚点上叠呼吸描边高亮框(不挖洞,
// 暗背景上描边更醒目),说明卡紧贴该锚点右侧、竖直靠近 —— 高光入口与说明卡连成一体,不再四散;
// clamp 防出界。
//
// ★定位根治:用 Portal 渲染到 <body>,脱离主导览覆盖层(canvasInset 的 left=var(--sidebar-w)=248 +
//   入场动画 will-change:transform 会给后代 fixed 创建 containing block,使「视口级 fixed」实际相对
//   覆盖层左缘偏移整整一个侧栏宽,聚光框落到主区左缘而非侧栏)。Portal 后这些 fixed 元素相对真实
//   视口定位,rect(真实锚点 getBoundingClientRect)即视口坐标,聚光框精确罩住侧栏目标。
//   Portal 容器全屏(inset:0,left=0)且带 data-onboarding(保留 motion.css 作用域样式)+ 关场
//   className 同步覆盖层出场淡出。坐标全部来自实时 rect(由 tour 的自适应 effect 在 resize/异步/滚动后重测)。
function SidebarHighlight({ rect, bubble, closing }: { rect: { top: number; left: number; width: number; height: number }; bubble: ReactNode; closing: boolean }) {
  const BUBBLE_W = 320;
  const EDGE = 24;
  const GAP = 16;
  const BUBBLE_EST_H = 240; // help 拍气泡较高(实测 h≈249),估高足够以保证 clamp 不溢出屏底。
  // 说明卡贴靠侧栏锚点右侧(account 在左上、help 在左下,右侧有大量横向空间),竖直靠近锚点顶部;
  // clamp 防出界(防旧版 bottom:1085 溢出屏底)。高光入口 + 紧挨右侧的说明卡连成一体。
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  const bubbleLeft = clamp(rect.left + rect.width + GAP, EDGE, window.innerWidth - BUBBLE_W - EDGE);
  const bubbleTop = clamp(rect.top, EDGE, window.innerHeight - BUBBLE_EST_H - EDGE);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      data-onboarding
      className={closing ? 'ob-overlay-out' : undefined}
      style={{ position: 'fixed', inset: 0, zIndex: 300, pointerEvents: 'none' }}
    >
      {/* 灰蒙版(复用 .ob-spot-scrim,双主题正确):盖住主区演示界面变暗,聚焦到高光入口。
          在 ring 下层(z-index 低于 ring/气泡),保留描边 ring(不挖洞),暗背景上描边更醒目。 */}
      <div className="ob-spot-scrim" style={{ zIndex: 310 }} />
      <div
        className="ob-spot-ring ob-spot-breathe"
        style={{ position: 'fixed', top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, zIndex: 320 }}
      />
      <div className="lg ob-bubble" style={{ position: 'fixed', top: bubbleTop, left: bubbleLeft, width: BUBBLE_W, padding: 18, zIndex: 320, pointerEvents: 'auto' }}>
        {bubble}
      </div>
    </div>,
    document.body,
  );
}

// ── 舞台内容(跨章交叉淡入,承接桥已删) ───────────────────────────────
function renderSurface(surface: SurfaceKind, demo: number): ReactNode {
  switch (surface) {
    case 'campus':
      return <ResultSurface demo={demo} />;
    case 'rewrite':
      return <RewriteSurface demo={demo} />;
    case 'chat':
      return <ChatSurface demo={demo} />;
    case 'mock':
      return <MockSurface />;
    case 'debrief':
      return <DebriefSurface />;
    case 'aux':
      return <AuxOverview />;
    case 'account':
      return <AccountSurface />;
    case 'help':
      return <HelpSurface />;
    default:
      return <ResumesSurface phase="idle" />;
  }
}

type StagePhase = 'idle' | 'exit' | 'enter';

function StageContent({ surface, demo }: { surface: SurfaceKind; demo: number }) {
  const [shown, setShown] = useState<{ surface: SurfaceKind; demo: number }>({ surface, demo });
  const [outgoing, setOutgoing] = useState<{ surface: SurfaceKind; demo: number } | null>(null);
  const [phase, setPhase] = useState<StagePhase>('idle');
  const [prevProps, setPrevProps] = useState<{ surface: SurfaceKind; demo: number }>({ surface, demo });
  const [seq, setSeq] = useState(0);

  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── 渲染期:props 变化即时调整 state(不进 effect)──────────────────
  if (surface !== prevProps.surface) {
    setPrevProps({ surface, demo });
    if (reduced) {
      setShown({ surface, demo });
      setOutgoing(null);
      setPhase('idle');
    } else {
      setOutgoing(shown);
      setShown({ surface, demo });
      setPhase('exit');
      setSeq((n) => n + 1);
    }
  } else if (demo !== prevProps.demo) {
    setPrevProps({ surface, demo });
    setShown({ surface, demo });
  }

  // ── effect:仅排定时器(与外部时钟同步),不在 effect 体内同步 setState ──
  // 承接句已删:切章只剩交叉淡入,入场固定在出场开始后 120ms 启动(略重叠),不再有 bridge 停留延迟。
  useEffect(() => {
    if (phase !== 'exit') return;
    const enterDelay = 120;
    const t1 = window.setTimeout(() => setPhase('enter'), enterDelay);
    const t2 = window.setTimeout(() => {
      setOutgoing(null);
      setPhase('idle');
    }, enterDelay + 360);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);

  // 第1/5点:演示舞台不再用 overflow:auto(那是校招诊断右侧竖滚动条的根)。每层用 FitSurface
  // 按可用高度等比缩小贴合视口,绝不滚动;窗口 resize 时 ResizeObserver 重算 scale。
  const layerBase: React.CSSProperties = { position: 'absolute', inset: 0, overflow: 'hidden' };
  const enterHidden = phase === 'exit';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div
        className={phase === 'enter' ? 'ob-stage-enter' : ''}
        style={enterHidden ? { ...layerBase, opacity: 0 } : layerBase}
        key={shown.surface}
      >
        <FitSurface>{renderSurface(shown.surface, shown.demo)}</FitSurface>
      </div>
      {outgoing && (
        <div className="ob-stage-exit" style={{ ...layerBase, zIndex: 2, pointerEvents: 'none' }} key={'out-' + outgoing.surface}>
          <FitSurface>{renderSurface(outgoing.surface, outgoing.demo)}</FitSurface>
        </div>
      )}
    </div>
  );
}

// ── FitSurface · 演示 surface 等比贴合视口(第1+5点根治) ─────────────────────────
// 演示是「精选片段」,不该出现滚动条。本组件测内容自然高度与可用高度:内容超出时整体等比缩小
// (transform: scale,transform-origin 顶部居中),内容不足时不放大(scale ≤ 1)、垂直居中留白。
// 桌面各分辨率 / 拖动窗口都自适应:ResizeObserver 同时观测外框与内容,任一变化即重算 scale。
// scale 加在内层,聚光锚点的 getBoundingClientRect 已反映缩放后位置,聚光洞自动跟随(见 spotlight)。
function FitSurface({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const inner = innerRef.current;
    if (!frame || !inner) return;
    const recompute = () => {
      // scrollHeight/Width 是缩放前的自然尺寸(transform 不改变 layout)——正是我们要的基准。
      const availH = frame.clientHeight;
      const contentH = inner.scrollHeight;
      const next = contentH > 0 && availH > 0 ? Math.min(1, availH / contentH) : 1;
      setScale((prev) => (Math.abs(prev - next) > 0.005 ? next : prev));
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(frame);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [children]);

  // 垂直对齐随 scale 切换:scale=1(内容装得下)→ 居中(还原 chat 等少内容 surface 的垂直居中观感,
  // 不再「挤在上面」);scale<1(内容超高需缩)→ 顶对齐 + transform-origin 顶部,从顶等比缩,
  // 内容不被 flex 居中顶出容器上沿。两种情况都不滚动、不溢出。
  const needsShrink = scale < 0.999;
  return (
    <div
      ref={frameRef}
      style={{ width: '100%', height: '100%', display: 'flex', alignItems: needsShrink ? 'flex-start' : 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      <div ref={innerRef} style={{ width: '100%', transform: `scale(${scale})`, transformOrigin: 'top center' }}>
        {children}
      </div>
    </div>
  );
}

// ── 主导览步骤气泡 ──────────────────────────────────────────────────
function StepBubble({
  s,
  atEnd,
  onPrev,
  onNext,
  onSkip,
}: {
  s: CanvasStep;
  atEnd: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <>
      {s.tag && <div className="mono" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', color: 'var(--color-brand)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>{s.tag}</div>}
      <div style={{ fontFamily: 'var(--serif)', fontSize: 15.5, fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-.01em' }}>{s.title}</div>
      {s.body && <div style={{ fontSize: 13, color: 'var(--color-ink-2)', marginTop: 7, lineHeight: 1.65 }}>{s.body}</div>}
      <div style={{ marginTop: 15, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <button type="button" style={ghostBtn} onClick={onSkip}>
          跳过
        </button>
        <span style={{ display: 'inline-flex', gap: 8 }}>
          {!atEnd && (
            <button type="button" style={ghostBtn} onClick={onPrev}>
              上一步
            </button>
          )}
          <button type="button" style={primaryBtn} onClick={onNext}>
            {s.cta ?? '下一步'}
          </button>
        </span>
      </div>
    </>
  );
}

// ── 收尾接力卡(居中,含启动清单 · 治撒手) ─────────────────────────
function HandoffCard({ onStart, onReset }: { onStart: () => void; onReset: () => void }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-.02em' }}>轮到你的简历</div>
      <div style={{ fontSize: 13, color: 'var(--color-ink-3)', marginTop: 8, marginBottom: 18, lineHeight: 1.6 }}>快来在模拟情景闯一闯！祝你拿下优秀的Offer！</div>
      <div style={{ textAlign: 'left' }}>
        <ChecklistPreview />
      </div>
      <div style={{ marginTop: 22 }}>
        <button type="button" onClick={onStart} style={{ ...primaryBtn, width: '100%', padding: '11px 18px', fontSize: 14 }}>
          传简历
        </button>
      </div>
      <div style={{ marginTop: 8 }}>
        <button type="button" onClick={onReset} style={ghostBtn}>
          随时重看
        </button>
      </div>
    </div>
  );
}

// ── 功能 mini-tour 层(真实 app 页聚光灯) ───────────────────────────
function FeatureTourLayer({
  def,
  stepIndex,
  rect,
  isMobile,
  closing,
  onNext,
  onSkip,
}: {
  def: FeatureTourDef;
  stepIndex: number;
  rect: { top: number; left: number; width: number; height: number } | null;
  isMobile: boolean;
  closing: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const fs = def.steps[stepIndex];
  const isLast = stepIndex >= def.steps.length - 1;
  const useSpot = !isMobile && rect != null;
  const BUBBLE_W = 300;
  const gap = 14;
  const edge = 8;

  let bubbleTop = 0;
  let bubbleLeft = 0;
  if (useSpot && rect) {
    if (rect.left + rect.width + gap + BUBBLE_W <= window.innerWidth - edge) {
      bubbleLeft = rect.left + rect.width + gap;
      bubbleTop = Math.min(Math.max(rect.top - edge, edge), window.innerHeight - 170 - edge);
    } else {
      bubbleLeft = Math.min(Math.max(rect.left, edge), window.innerWidth - BUBBLE_W - edge);
      bubbleTop = rect.top + rect.height + gap + 170 > window.innerHeight - edge ? rect.top - gap - 170 : rect.top + rect.height + gap;
    }
  }

  return (
    <div data-onboarding role="dialog" aria-modal="true" aria-label="功能导览" className={closing ? 'ob-overlay-out' : 'ob-overlay-in'} style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {useSpot && rect ? (
        <div className="ob-spot-hole" style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }} />
      ) : (
        <div className="ob-spot-scrim" />
      )}
      <div
        className="lg ob-bubble"
        style={useSpot ? { position: 'fixed', top: bubbleTop, left: bubbleLeft, width: BUBBLE_W, padding: 16 } : { position: 'relative', width: 380, maxWidth: '100%', padding: 28, textAlign: 'center' }}
      >
        <div style={{ fontFamily: 'var(--serif)', fontSize: useSpot ? 14 : 19, fontWeight: useSpot ? 600 : 700, color: 'var(--color-ink)' }}>{fs.title}</div>
        <div style={{ fontSize: 13, color: 'var(--color-ink-2)', marginTop: useSpot ? 6 : 10, lineHeight: 1.65 }}>{fs.body}</div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: useSpot ? 'flex-end' : 'center', gap: 8 }}>
          <button type="button" onClick={onSkip} style={ghostBtn}>
            跳过
          </button>
          <button type="button" onClick={onNext} style={primaryBtn}>
            {isLast ? '知道了' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
}
