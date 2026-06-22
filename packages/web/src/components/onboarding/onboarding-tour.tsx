'use client';

// onboarding-tour.tsx — Coach 首登引导(v3.1 重做)。
//
// 形与质感取自 ver3.1 原型(磨砂玻璃 + 极光 + 章节轨 + 聚光灯 + 镜头级动效),
// 装进真实 Next.js app:复用线上 globals.css 双主题令牌(暗/亮自动跟随,无硬编码暗色)、
// 真实路由、单一真相源(STARTER_ITEMS / FEATURE_TOURS)。
//
// 两种运行态:
//  ① 主导览(首登)= 全屏「画布」:真实壳复刻(OnboardingShell)+ 演示 surface + 画布内聚光灯,
//     按 [data-guide] 锚点定位。主线 3 功能做满多拍、次线 2 功能各 1 拍、赠品一屏,
//     校招诊断章自动连播(score→压分→逐条),其余手动推进。承接钩子用 CTA 串联因果。
//     收尾不弹「恭喜」死胡同 —— router.push('/resumes') + 接力高亮真实上传锚点(ResumeHandoffHint)。
//  ② 功能 mini-tour(公告 CTA 触发)= 在真实 app 页上用聚光灯打 [data-tour] 锚点(沿用旧机制,
//     锚点不在则降级居中卡)。内容独立、按 seenKey 持久化。
//
// 文案逐字取自定稿 onboarding-v31-copy.md,不得改动。

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import './onboarding-motion.css';
import { STARTER_ITEMS } from './starter-items';
import { LAUNCH_FEATURE_TOUR_EVENT, type LaunchFeatureTourDetail } from '@/lib/feature-tour';
import { getFeatureUpdateByTourId } from '@/lib/feature-updates';
import { HANDOFF_KEY, HANDOFF_EVENT } from './resume-handoff-hint';
import { OnboardingShell } from './onboarding-shell';
import { ChapterRail } from './onboarding-chapter-rail';
import { CanvasSpotlight } from './onboarding-spotlight';
import {
  ResultSurface,
  RewriteSurface,
  ChatSurface,
  MockSurface,
  DebriefSurface,
  AuxOverview,
  ResumesSurface,
} from './onboarding-surfaces';

const DONE_KEY = 'coach_tour_done';

// ── 主导览章节(章节轨 = 全景地图) ──────────────────────────────────
export const CHAPTERS = ['校招诊断', 'AI 改写', '问 Coach', '模拟面试', '面试复盘', '开始用'] as const;

// ── 主导览步骤模型 ──────────────────────────────────────────────────
type SurfaceKind = 'resumes' | 'campus' | 'rewrite' | 'chat' | 'mock' | 'debrief' | 'aux';

interface CanvasStep {
  id: string;
  /** 章节轨索引;null = 不在轨上(welcome / handoff) */
  chapter: number | null;
  surface: SurfaceKind;
  /** surface 内部演示拍号 */
  demo: number;
  /** 侧栏高亮键(视觉上当前在哪个功能) */
  active: string;
  /** 画布内聚光锚点 [data-guide];null = 居中(welcome) */
  target: string | null;
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
  { id: 'welcome', chapter: null, surface: 'resumes', demo: 0, active: 'resumes', target: null, welcome: true },

  // 屏 1-3 · 校招诊断(做满 3 拍 · 自动连播)
  {
    id: 'score',
    chapter: 0,
    surface: 'campus',
    demo: 1,
    active: 'campus',
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
    active: 'campus',
    target: 'scorering',
    placement: 'below',
    auto: 2900,
    tag: '防编造护栏',
    title: '没依据的,当场压分',
    body: '没有基数,从多少涨到多少没写。',
  },
  {
    id: 'checks',
    chapter: 0,
    surface: 'campus',
    demo: 3,
    active: 'campus',
    target: 'checks',
    placement: 'left',
    auto: null,
    tag: '它给你的产出',
    title: '每条都标了原文依据',
    body: '黄的那条,回头第一个改。',
    cta: '去改这条',
  },

  // 屏 4-5 · AI 改写(做满 2 拍 · 亲手摸)
  {
    id: 'rewrite-before',
    chapter: 1,
    surface: 'rewrite',
    demo: 1,
    active: 'resumes',
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
    active: 'resumes',
    target: 'rewrite-run',
    placement: 'left',
    auto: null,
    pulse: true,
    tag: 'AI 改写 · 怎么用',
    title: '点改写,只用你写过的事实',
    body: '点这里,出来的每句都标着「只用了你写过的内容」。',
    cta: '问 Coach',
  },

  // 屏 6-7 · 问 Coach(做满 2 拍 · 亲手摸)
  {
    id: 'chat-reply',
    chapter: 2,
    surface: 'chat',
    demo: 1,
    active: 'chat',
    target: 'chat',
    placement: 'right',
    auto: null,
    tag: '问 Coach',
    title: '说你的情况,排出下一步',
    body: '你说人话讲处境,它把下一步摆你面前。',
  },
  {
    id: 'chat-acts',
    chapter: 2,
    surface: 'chat',
    demo: 2,
    active: 'chat',
    target: 'actcards',
    placement: 'above',
    auto: null,
    tag: '问 Coach · 怎么用',
    title: '不知道先做啥,问一句就行',
    body: '跟它说一句,它就把这排卡摆出来,点一下就开始。',
    cta: '试试问一句',
  },

  // 屏 8 · 模拟面试(次线 1 拍)
  {
    id: 'mock',
    chapter: 3,
    surface: 'mock',
    demo: 0,
    active: 'mock',
    target: 'mock-voice',
    placement: 'left',
    auto: null,
    pulse: true,
    tag: '模拟面试',
    title: '选语音,出题你答',
    body: '挑文字或语音,逐题出,答完进复盘。',
    cta: '看复盘',
  },

  // 屏 9 · 面试复盘(次线 1 拍 + 扫码一瞥)
  {
    id: 'debrief',
    chapter: 4,
    surface: 'debrief',
    demo: 0,
    active: 'debrief',
    target: 'debrief-demo',
    placement: 'left',
    auto: null,
    tag: '面试复盘',
    title: '面完传录音,逐题给你盘',
    body: '录音在手机?扫码直接传。',
    cta: '还有什么',
  },

  // 屏 10 · 赠品宫格(辅 · 一屏带过)
  {
    id: 'aux',
    chapter: 5,
    surface: 'aux',
    demo: 0,
    active: 'overview',
    target: 'aux-grid',
    placement: 'below',
    auto: null,
    tag: '更多 · 赠品',
    title: '这些用到再说,点开就能用',
    body: '主功能都讲完了,这些随时在。',
    cta: '轮到你了',
  },

  // 屏 11 · 收尾接力(治 finish 撒手)
  {
    id: 'handoff',
    chapter: 5,
    surface: 'resumes',
    demo: 0,
    active: 'resumes',
    target: 'upload',
    placement: 'right',
    auto: null,
    handoff: true,
    tag: '轮到你了',
    title: '轮到你的简历',
    body: '刚看到的就是你能用的全部。',
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
        简历先过一遍
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--color-ink-2)', textAlign: 'center', margin: '10px auto 0', lineHeight: 1.65, maxWidth: '24em' }}>
        跑一圈你就知道怎么用
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
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [featureTour, setFeatureTour] = useState<FeatureTourDef | null>(null);
  const [featureStep, setFeatureStep] = useState(0);
  const [featureRect, setFeatureRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  const s = STEPS[step];
  const atEnd = step === STEPS.length - 1;

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

  // 校招诊断章自动连播:仅当 auto 非空才排定时器进下一拍;auto 为 null 的步不排,连播自然停在该步。
  // (不在此处 setPlaying(false):playing 残留为 true 无副作用——auto==null 时本 effect 不做任何事。)
  useEffect(() => {
    if (!active || featureTour || !playing) return;
    if (s.auto == null) return;
    const t = window.setTimeout(() => setStep((i) => Math.min(STEPS.length - 1, i + 1)), s.auto);
    return () => window.clearTimeout(t);
  }, [active, featureTour, playing, step, s.auto]);

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

  // 收尾:写 DONE_KEY,跳简历页 + 触发接力(治撒手)
  const finishMain = useCallback(
    (goResumes: boolean) => {
      localStorage.setItem(DONE_KEY, '1');
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
        // 已在 /resumes 时 push 不重挂载,补发事件确保接力触发
        window.setTimeout(() => window.dispatchEvent(new CustomEvent(HANDOFF_EVENT)), 400);
      }
    },
    [router],
  );

  // 功能 tour 收尾:写 seenKey
  const finishFeature = useCallback(() => {
    if (featureTour) {
      const reg = getFeatureUpdateByTourId(featureTour.tourId);
      if (reg) localStorage.setItem(reg.seenKey, '1');
    }
    setFeatureTour(null);
    setFeatureStep(0);
    setActive(false);
  }, [featureTour]);

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
        onNext={() => {
          if (featureStep >= featureTour.steps.length - 1) finishFeature();
          else setFeatureStep((i) => i + 1);
        }}
        onSkip={finishFeature}
      />
    );
  }

  // B) 主导览:全屏画布。welcome / 收尾卡走居中卡;其余画布内聚光灯。
  const surface = (() => {
    switch (s.surface) {
      case 'campus':
        return <ResultSurface demo={s.demo} />;
      case 'rewrite':
        return <RewriteSurface demo={s.demo} />;
      case 'chat':
        return <ChatSurface demo={s.demo} />;
      case 'mock':
        return <MockSurface />;
      case 'debrief':
        return <DebriefSurface />;
      case 'aux':
        return <AuxOverview />;
      default:
        return <ResumesSurface phase="idle" />;
    }
  })();

  // 移动端降级:不挖洞,只用居中卡讲文案(聚光定位窄屏不可靠)
  const mobileCard = isMobile && !s.welcome && !s.handoff;

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
    <StepBubble
      s={s}
      atEnd={atEnd}
      onPrev={() => {
        setPlaying(false);
        setStep((i) => Math.max(1, i - 1));
      }}
      onNext={() => {
        setPlaying(false);
        setStep((i) => Math.min(STEPS.length - 1, i + 1));
      }}
      onSkip={() => finishMain(false)}
    />
  );

  return (
    <div
      data-onboarding
      role="dialog"
      aria-modal="true"
      aria-label="新手导览"
      ref={rootRef}
      style={{ position: 'fixed', inset: 0, zIndex: 300, overflow: 'hidden', animation: 'ob-fade .25s var(--ob-ease)' }}
    >
      {/* 舞台:真实壳 + 当前 surface(画布,被聚光层盖在下面) */}
      <div className="ob-page-fade" key={s.id} style={{ position: 'absolute', inset: 0, background: 'var(--color-bg)', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)' }}>
        <OnboardingShell activeKey={s.active}>{surface}</OnboardingShell>
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
      <CanvasSpotlight
        rootRef={rootRef}
        targetKey={mobileCard ? null : s.target}
        placement={s.placement}
        pulse={s.pulse}
        centered={s.welcome || s.handoff || mobileCard}
        bubble={bubbleContent}
      />
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
      <div style={{ fontSize: 13, color: 'var(--color-ink-2)', marginTop: 7, lineHeight: 1.65 }}>{s.body}</div>
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
      <div style={{ fontSize: 13, color: 'var(--color-ink-3)', marginTop: 8, marginBottom: 18, lineHeight: 1.6 }}>刚看到的就是你能用的全部</div>
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
  onNext,
  onSkip,
}: {
  def: FeatureTourDef;
  stepIndex: number;
  rect: { top: number; left: number; width: number; height: number } | null;
  isMobile: boolean;
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
    <div data-onboarding role="dialog" aria-modal="true" aria-label="功能导览" style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'ob-fade .25s var(--ob-ease)' }}>
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
