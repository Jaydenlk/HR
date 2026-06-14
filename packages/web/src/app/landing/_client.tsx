'use client';

// landing/_client.tsx — "Night Atelier" landing, ported from ver2.02/lg/* (HTML+Babel prototype)
// into a single Next.js client component. All window.* globals are now local definitions; React
// hooks come from 'react'. The page-scoped CSS (tokens + hero + story + tail) is injected via a
// <style> tag and only mounts on this route — class names (.lg/.section/.hero…) never leak elsewhere.
//
// 主题:默认跟随系统 + 可切换 + 持久化。防闪烁靠 page.tsx 的预水合内联脚本(首帧前设
// document.documentElement.dataset.theme)。本组件读取该值镜像到 React state,Nav 的日/月按钮
// 切换时同步 state + html data-theme + localStorage['coach_theme']。
//
// 删除开发面板:无 TweaksPanel / useTweaks。固定取 TWEAK_DEFAULTS:heroVariant=dispatch、
// accent=#2f8fff、motion=正常。applyAccent 作为一次性常量在挂载时注入 #2f8fff,无可调 UI。
//
// 文案逐字保留(已审计合规),不新增任何用户数/提分/case。

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from 'react';
import Link from 'next/link';

const LOGIN = '/login';
const ACCENT = '#2f8fff';
const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion:reduce)').matches;

// ── icons (from lg-icons.jsx) ───────────────────────────────────────────────
type IcoProps = { d: ReactNode; size?: number; sw?: number; style?: CSSProperties };
const Ico = ({ d, size = 18, sw = 1.7, style }: IcoProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    {d}
  </svg>
);

const LI = {
  arrow: <Ico d={<><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></>} />,
  arrowD: <Ico d={<><path d="M12 5v14" /><path d="M5 12l7 7 7-7" /></>} />,
  chevR: <Ico d={<path d="M9 6l6 6-6 6" />} />,
  check: <Ico d={<path d="M20 6L9 17l-5-5" />} />,
  x: <Ico d={<><path d="M18 6L6 18" /><path d="M6 6l12 12" /></>} />,
  doc: <Ico d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>} />,
  mic: <Ico d={<><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" /></>} />,
  spark: <Ico d={<><path d="M12 2l1.6 4.8L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.2L12 2z" /><path d="M19 14l.8 2.4L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.6L19 14z" /></>} />,
  brief: <Ico d={<><rect x="2" y="7" width="20" height="14" rx="3" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>} />,
  send: <Ico d={<><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></>} />,
  chart: <Ico d={<><path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-7" /></>} />,
  globe: <Ico d={<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>} />,
  trend: <Ico d={<><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></>} />,
  bolt: <Ico d={<path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z" />} />,
  lock: <Ico d={<><rect x="4" y="11" width="16" height="10" rx="3" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>} />,
  shield: <Ico d={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>} />,
  layers: <Ico d={<><path d="M12 2l9 5-9 5-9-5 9-5z" /><path d="M3 12l9 5 9-5M3 17l9 5 9-5" /></>} />,
  msg: <Ico d={<path d="M21 12a8 8 0 1 1-3.4-6.5L21 4l-1.5 3.5A8 8 0 0 1 21 12z" />} />,
  target: <Ico d={<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /></>} />,
  clock: <Ico d={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>} />,
  replay: <Ico d={<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>} />,
  eye: <Ico d={<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>} />,
  sun: <Ico d={<><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12h2.5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" /></>} />,
  moon: <Ico d={<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />} />,
} as const;

type IcoKey = keyof typeof LI;

// Coach mark — abstract round face, AI avatar in scene demos.
const CoachMark = ({ size = 34, ring }: { size?: number; ring?: string }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: '#0a0a0c',
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      boxShadow: ring ? `0 0 0 3px ${ring}` : '0 4px 14px -6px rgba(0,0,0,.5)',
    }}
  >
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <circle cx="50" cy="50" r="32" fill="#fafaf2" />
      <rect x="22" y="32" width="56" height="4" rx="1" fill="#0a0a0c" />
      <polygon points="22,32 78,32 50,22" fill="#0a0a0c" />
      <circle cx="42" cy="52" r="2.4" fill="#0a0a0c" />
      <circle cx="58" cy="52" r="2.4" fill="#0a0a0c" />
      <circle cx="42.8" cy="51.4" r="0.8" fill="#fff" />
      <circle cx="58.8" cy="51.4" r="0.8" fill="#fff" />
      <path d="M 42 62 Q 50 68 58 62" stroke="#0a0a0c" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  </div>
);

// ResumeDoc — recurring white résumé sheet that threads the whole story.
const ResumeDoc = ({
  w = 112,
  marks = false,
  dim = false,
  style = {},
}: {
  w?: number;
  marks?: boolean;
  dim?: boolean;
  style?: CSSProperties;
}) => {
  const h = Math.round(w * 1.32);
  const row = (y: number, wd: number, fill: string) => (
    <rect x="14" y={y} width={wd} height="5" rx="2.5" fill={fill} />
  );
  const g = dim ? '#cfd3da' : '#c4c8d0';
  return (
    <svg viewBox="0 0 112 148" width={w} height={h} style={{ display: 'block', ...style }} className="resume-doc">
      <rect x="1" y="1" width="110" height="146" rx="12" fill="#f6f7f9" stroke="#e4e7ec" strokeWidth="1" />
      <rect x="14" y="14" width="22" height="22" rx="7" fill="#0a84ff" opacity={dim ? 0.55 : 0.92} />
      <rect x="42" y="17" width="42" height="6" rx="3" fill="#2a2d34" />
      <rect x="42" y="28" width="26" height="5" rx="2.5" fill="#b0b4bd" />
      {row(50, 84, g)}
      {marks ? (
        <>
          {row(64, 70, '#cfe9d6')}
          <circle cx="98" cy="66.5" r="6" fill="#1f9d4d" />
          <path d="M95.4 66.6l1.7 1.7 3-3.2" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {row(78, 64, '#f3e2bd')}
          <circle cx="98" cy="80.5" r="6" fill="#c9820a" />
          {row(92, 76, '#f1d2d2')}
          <line x1="14" y1="94.5" x2="90" y2="94.5" stroke="#e5484d" strokeWidth="1.6" />
          <circle cx="98" cy="94.5" r="6" fill="#8b8e96" />
          <path d="M95.8 92.3l4.4 4.4M100.2 92.3l-4.4 4.4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
        </>
      ) : (
        <>
          {row(64, 76, g)}
          {row(78, 88, g)}
          {row(92, 70, g)}
        </>
      )}
      {row(106, 80, g)}
      {row(120, 58, g)}
    </svg>
  );
};

// ── hooks (from lg-glass.jsx / lg-icons.jsx) ────────────────────────────────

// count-up — animates from->to when `run` flips true. All setState happens inside the rAF
// callback (async), never synchronously in the effect body, per react-hooks/set-state-in-effect.
function useCountUp(from: number, to: number, run: boolean, dur = 900) {
  const [val, setVal] = useState(from);
  useEffect(() => {
    let raf = 0;
    if (!run) {
      raf = requestAnimationFrame(() => setVal(from));
      return () => cancelAnimationFrame(raf);
    }
    if (reduceMotion()) {
      raf = requestAnimationFrame(() => setVal(to));
      return () => cancelAnimationFrame(raf);
    }
    let start = 0;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (to - from) * e));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to, run, dur]);
  return val;
}

// One IntersectionObserver for every [data-rev]; call once.
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (ents) => {
        ents.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
    );
    document.querySelectorAll('[data-rev]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// Typewriter that runs when `run` is true. setOut only fires inside setTimeout callbacks (async),
// never synchronously in the effect body, per react-hooks/set-state-in-effect.
function useTypewriter(text: string, run: boolean, speed = 42) {
  const [out, setOut] = useState('');
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (!run) {
      t = setTimeout(() => setOut(''), 0);
      return () => clearTimeout(t);
    }
    if (reduceMotion()) {
      t = setTimeout(() => setOut(text), 0);
      return () => clearTimeout(t);
    }
    let i = 0;
    const tick = () => {
      i++;
      setOut(text.slice(0, i));
      if (i < text.length) t = setTimeout(tick, speed);
    };
    t = setTimeout(tick, speed);
    return () => clearTimeout(t);
  }, [text, run, speed]);
  return out;
}

// Scroll-progress (0..1) across the whole document.
function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setP(h > 0 ? Math.min(window.scrollY / h, 1) : 0);
    };
    window.addEventListener('scroll', on, { passive: true });
    on();
    return () => window.removeEventListener('scroll', on);
  }, []);
  return p;
}

// applyAccent — one-shot, injects the fixed brand color (#2f8fff) derivatives onto :root.
function applyAccent(hex: string) {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (t: number, tgt: number) => c.map((v) => Math.round(v + (tgt - v) * t));
  const rgb = (a: number[]) => `rgb(${a.join(',')})`;
  const r = document.documentElement.style;
  r.setProperty('--blue', hex);
  r.setProperty('--blue-2', hex);
  r.setProperty('--blue-deep', rgb(mix(0.34, 0)));
  r.setProperty('--blue-bright', rgb(mix(0.42, 255)));
  r.setProperty('--blue-glow', `rgba(${c.join(',')},.55)`);
}

// ── Atmos: living aurora + grain + cursor-tracked glow ──────────────────────
function Atmos() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduceMotion()) return;
    let raf = 0;
    let tx = 50;
    let ty = 30;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 100;
      ty = (e.clientY / window.innerHeight) * 100;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (ref.current) {
            ref.current.style.setProperty('--mx', tx + '%');
            ref.current.style.setProperty('--my', ty + '%');
          }
        });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="atmos" ref={ref}>
      <div className="au a1" />
      <div className="au a2" />
      <div className="au a3" />
      <div className="grid" />
      <div className="cursor" />
      <div className="grain" />
    </div>
  );
}

// ── Nav: glass + theme toggle + scroll progress bar ─────────────────────────
function Nav({ theme, onToggleTheme }: { theme: 'light' | 'dark'; onToggleTheme: () => void }) {
  const [solid, setSolid] = useState(false);
  const progress = useScrollProgress();
  useEffect(() => {
    const on = () => setSolid(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener('scroll', on, { passive: true });
    on();
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <nav className={'l-nav' + (solid ? ' solid' : '')}>
      <div className="nv-in">
        <a className="nv-logo" href="#hero">
          <span className="mk">C</span>
          <span>Coach</span>
        </a>
        <div className="nv-links">
          <a href="#how">它怎么帮你</a>
          <a href="#caps">能做什么</a>
          <a href="#faq">常见问题</a>
        </div>
        <div className="nv-r">
          <button className="nv-theme" onClick={onToggleTheme} aria-label="切换深浅色" title="切换深浅色" type="button">
            {theme === 'light' ? LI.moon : LI.sun}
          </button>
          <Link className="nv-login" href={LOGIN}>
            登录
          </Link>
          <Link className="btn btn-primary btn-sm" href={LOGIN}>
            免费诊断 {LI.arrow}
          </Link>
        </div>
      </div>
      <div className="nv-prog" style={{ transform: `scaleX(${progress})` }} />
    </nav>
  );
}

// ── Hero copy + scene ───────────────────────────────────────────────────────
const HERO_COPY = {
  dispatch: {
    h1: (
      <>
        说一句你卡在哪,
        <br />
        它把
        <span className="uline accent">
          下一步
          <svg viewBox="0 0 200 12" preserveAspectRatio="none">
            <path d="M3 8 Q100 1 197 7" />
          </svg>
        </span>
        摆到你面前。
      </>
    ),
    sub: (
      <>
        给 2026 秋招生的 AI 求职教练。你不用研究它有哪些功能 —— 说人话,
        <b>诊断、模拟面试、改简历,它配好下一步</b>,点一下就开始。
      </>
    ),
  },
} as const;

function HeroScene({
  phase,
  onReplay,
  replaying,
}: {
  phase: number;
  onReplay: () => void;
  replaying: boolean;
}) {
  // Parallax tilt — inlined (not a returned hook object) so the ref is assigned to an element,
  // never read during render, per react-hooks/refs. ref.current is only touched in handlers.
  const sceneRef = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.MouseEvent) => {
    if (reduceMotion() || !sceneRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    sceneRef.current.style.transform = `rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translate(${x * 18}px,${y * 18}px)`;
  }, []);
  const onLeave = useCallback(() => {
    if (sceneRef.current) sceneRef.current.style.transform = '';
  }, []);
  const typed = useTypewriter('下周有腾讯的产品岗面试,帮我准备一下。', phase >= 1, 46);
  const score = useCountUp(78, 61, phase >= 6, 1000);
  const sh = (n: number) => (phase >= n ? ' show' : '');
  return (
    <div className="scene" onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className="scene3d" ref={sceneRef}>
        {/* dispatch */}
        <div className="card dispatch lg sweep float">
          <div className="cap-head">
            <span className="lab">
              <span className="live" />对话 · 调度台
            </span>
            <span className="tag">演示</span>
          </div>
          <div className="disp-body">
            <div className={'bub me' + sh(1)}>
              <div className="t">
                {phase >= 1 ? typed : ''}
                {phase >= 1 && phase < 2 ? <span className="cur" /> : null}
              </div>
            </div>
            {phase >= 2 && phase < 3 ? (
              <div className="bub ai show">
                <CoachMark size={30} />
                <div className="t" style={{ padding: 0 }}>
                  <div className="typing">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </div>
            ) : (
              <div className={'bub ai' + sh(3)}>
                <CoachMark size={30} />
                <div className="t">好。我看过你的简历和这个岗位 —— 这三件事现在做最划算。</div>
              </div>
            )}
          </div>
          <div className="acts3">
            <div className={'a' + sh(4)}>
              <span className="i">{LI.doc}</span>
              <b>先体检</b>
              <span>对腾讯产品岗</span>
            </div>
            <div className={'a' + sh(4)} style={{ transitionDelay: phase >= 4 ? '.1s' : '0s' }}>
              <span className="i">{LI.mic}</span>
              <b>模拟一轮</b>
              <span>产品岗题库</span>
            </div>
            <div className={'a' + sh(4)} style={{ transitionDelay: phase >= 4 ? '.2s' : '0s' }}>
              <span className="i">{LI.spark}</span>
              <b>改一版</b>
              <span>投它</span>
            </div>
          </div>
        </div>

        {/* guardrail */}
        <div className="card guard lg sweep float-2">
          <div className="gh">
            <span className="lab">校招诊断 · 护栏</span>
            <span className="flip">
              <span className="from">78</span>
              <span className="ar">→</span>
              <span className="to mono">{score}</span>
              {phase >= 6 && <span className="why">压分</span>}
            </span>
          </div>
          <div className="gbody">
            <div className={'gl ok' + sh(5)}>
              <span className="bdg">{LI.check}已核实</span>
              <span className="t">
                jQuery 重构成 React,<b>首屏 3.2s→0.9s</b> —— 原文有出处,留下。
              </span>
            </div>
            <div className={'gl warn' + sh(5)} style={{ transitionDelay: phase >= 5 ? '.12s' : '0s' }}>
              <span className="bdg">需确认</span>
              <span className="t">
                「带 5 人小组」你原文写的是「参与」。<b>真带过再写。</b>
              </span>
            </div>
            <div className={'gl cut' + sh(6)} style={{ transitionDelay: phase >= 6 ? '.05s' : '0s' }}>
              <span className="bdg">无依据·已删</span>
              <span className="t">
                <s>用户增长 200%</s> —— 没基数没口径,<b>不替你圆。</b>
              </span>
            </div>
          </div>
          <div className="foot">
            {LI.bolt}
            <span>
              不是 AI 自己「老实」。是<b>一段代码在硬拦</b> —— 加了水分,分数当场往下掉。
            </span>
          </div>
        </div>

        {/* floating résumé object */}
        <div className="card rfloat lg float">
          <span className="rp" />
          <span className="rt">
            <b>你的简历</b>
            <span>v7 · 核对中</span>
          </span>
        </div>
      </div>

      <button className={'replay' + (replaying ? ' spin-rev' : '')} onClick={onReplay} type="button">
        {LI.replay} 重放这一幕
      </button>
    </div>
  );
}

function Hero({
  phase,
  lit,
  onReplay,
  replaying,
}: {
  phase: number;
  lit: boolean;
  onReplay: () => void;
  replaying: boolean;
}) {
  const copy = HERO_COPY.dispatch;
  return (
    <header className={'hero var-dispatch' + (lit ? ' lit' : '')} id="hero">
      <div className="inner">
        <div className="copy">
          <span className="pill" data-rev="up">
            <span className="dot" />2026 秋招生 · 公测邀请制
          </span>
          <h1 data-rev="up" data-rd="1">
            {copy.h1}
          </h1>
          <p className="sub" data-rev="up" data-rd="2">
            {copy.sub}
          </p>
          <div className="cta" data-rev="up" data-rd="3">
            <Link className="btn btn-primary btn-lg" href={LOGIN}>
              传简历,免费诊断 {LI.arrow}
            </Link>
            <Link className="btn btn-glass btn-lg" href={LOGIN}>
              已有邀请码,登录 {LI.chevR}
            </Link>
          </div>
          <div className="meta" data-rev="up" data-rd="4">
            <span className="mi">{LI.shield}注册送 50 点 · 试运行不收费</span>
            <span className="sep" />
            <span className="mi">{LI.lock}不替你编经历,不承诺 offer</span>
          </div>
        </div>
        <div data-rev="scale" data-rd="2">
          <HeroScene phase={phase} onReplay={onReplay} replaying={replaying} />
        </div>
      </div>
      <div className="scroll-cue">
        <div className="m" />
        <span>往下看</span>
      </div>
    </header>
  );
}

// ── Night (empathy) ─────────────────────────────────────────────────────────
const RT = ({ state }: { state: string }) => (
  <span className="rchip">
    <span className="pg" />
    <b>简历</b>
    <span className="st">{state}</span>
  </span>
);

const Night = () => (
  <section className="section night">
    <div className="wrap">
      <div className="inner">
        <div>
          <span className="kicker" data-rev="up">
            <span className="dot" />深夜两点
          </span>
          <div className="big" data-rev="up" data-rd="1">
            投出去三十份,
            <br />
            <span className="sm">大多没有回音。</span>
          </div>
          <div className="voices">
            <div className="v" data-rev="up" data-rd="2">
              <span className="q">“</span>
              <span>
                改到第几版都不确定 —— 写淡了怕没亮点,<b>写满了又怕一问就穿帮</b>。
              </span>
            </div>
            <div className="v" data-rev="up" data-rd="3">
              <span className="q">“</span>
              <span>
                想把经历写好看,<b>又怕编过了头</b>。
              </span>
            </div>
          </div>
          <div className="turn" data-rev="up" data-rd="3">
            问题大概率不在你 —— 是这份简历,<span className="accent">还没把你做过的事说清楚。</span>
            <span className="sub">Coach 陪你,一条一条理清楚。从今晚这一份开始。</span>
          </div>
        </div>
        <div className="lamp" data-rev="scale" data-rd="2">
          <div className="halo float" />
          <div className="doc d3">
            <ResumeDoc w={200} dim />
          </div>
          <div className="doc d2">
            <ResumeDoc w={200} dim />
          </div>
          <div className="doc d1 float-2">
            <span className="ver">v7 · 还在改</span>
            <ResumeDoc w={200} />
          </div>
          <span className="qm">?</span>
        </div>
      </div>
    </div>
  </section>
);

// ── Acts (three chapters) ───────────────────────────────────────────────────
const Acts = () => (
  <section className="section acts" id="how">
    <div className="wrap">
      {/* ACT 1 */}
      <div className="act">
        <div className="act-copy">
          <div className="chap" data-rev="up">
            <span className="n">01</span> 它先读你
          </div>
          <h2 data-rev="up" data-rd="1">
            你说人话,
            <br />
            它<span className="accent">读懂,配好下一步。</span>
          </h2>
          <div data-rev="up" data-rd="2">
            <span className="get">{LI.bolt} 你得到:不用研究功能,张嘴就行</span>
          </div>
          <p className="lead" data-rev="up" data-rd="2">
            不用先搞懂产品有哪些功能、该从哪开始。把你下周要面什么直接讲出来,它就着你这份简历,认出公司、岗位、时间,把
            <b>最该做的几件事</b>摆到你面前,点一下就开始。
          </p>
        </div>
        <div className="act-viz" data-rev="right" data-rd="2">
          <div className="lg sweep viz">
            <div className="vh">
              <span className="vt">意图识别 · 调度台</span>
              <RT state="已读取" />
            </div>
            <div className="said">
              下周有<span className="ent">腾讯<span className="tg">公司</span></span>的
              <span className="ent">产品岗<span className="tg">岗位</span></span>
              <span className="ent">面试<span className="tg">意图</span></span>,帮我准备一下。
            </div>
            <div className="flow">
              <span className="ln" />
              <span className="bd">配好 3 件事</span>
              <span className="ln" />
            </div>
            <div className="ac3">
              <div className="c">
                <span className="i">{LI.doc}</span>
                <b>校招诊断</b>
                <span>对腾讯产品岗</span>
              </div>
              <div className="c">
                <span className="i">{LI.mic}</span>
                <b>模拟一轮</b>
                <span>产品岗题库</span>
              </div>
              <div className="c">
                <span className="i">{LI.spark}</span>
                <b>改一版</b>
                <span>投腾讯</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ACT 2 */}
      <div className="act flip">
        <div className="act-copy">
          <div className="chap" data-rev="up">
            <span className="n">02</span> 改到敢投
          </div>
          <h2 data-rev="up" data-rd="1">
            面试官那一追问,
            <br />
            <span className="accent">每句你都接得住。</span>
          </h2>
          <div data-rev="up" data-rd="2">
            <span className="get">{LI.shield} 你得到:一份敢投、也敢被追问的简历</span>
          </div>
          <p className="lead" data-rev="up" data-rd="2">
            它帮你把做过的事说到位,但<b>你没做过的,一个字都不替你编</b>。靠的不是 AI 自觉,是三道写死的代码护栏 —— 看得见它怎么判。
          </p>
          <div className="pt" data-rev="up" data-rd="3">
            <span className="pi">{LI.check}</span>
            <span>
              加了水分,<b>分数当场往下掉</b>,改写只教你把口径补全。
            </span>
          </div>
        </div>
        <div className="act-viz" data-rev="left" data-rd="2">
          <div className="lg sweep viz">
            <div className="vh">
              <span className="vt">三道防编造护栏</span>
              <RT state="v7 → 核对中" />
            </div>
            <div className="rails">
              <div className="rail r1">
                <span className="ri">{LI.clock}</span>
                <div className="rt">
                  <b>时间线勾稽</b>
                  <span>实习早于入学、项目结束比开始还早,代码扫原文抓出来。</span>
                  <span className="ex">
                    <span className="bad">实习 2024.03</span>
                    <span className="arr">早于</span>入学 2024.09
                  </span>
                </div>
                <span className="vd">硬伤 · 拦下</span>
              </div>
              <div className="rail r2">
                <span className="ri">{LI.chart}</span>
                <div className="rt">
                  <b>可疑数字压分</b>
                  <span>没有基数、没有口径的「增长 200%」,相关评分直接压下来。</span>
                  <span className="ex">
                    <span className="bad">增长 200%</span>
                    <span className="arr">→</span>
                    <span className="good">补上分母再说</span>
                  </span>
                </div>
                <span className="vd">78 → 61</span>
              </div>
              <div className="rail r3">
                <span className="ri">{LI.shield}</span>
                <div className="rt">
                  <b>防编造溯源</b>
                  <span>改写新增的每个数字,必须在你原文里找得到出处、且跟这条技能相关。</span>
                  <span className="ex">
                    <span className="good">首屏 0.9s</span>
                    <span className="arr">出处✓</span>原文第 3 段
                  </span>
                </div>
                <span className="vd">已核实</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ACT 3 */}
      <div className="act">
        <div className="act-copy">
          <div className="chap" data-rev="up">
            <span className="n">03</span> 一路陪着
          </div>
          <h2 data-rev="up" data-rd="1">
            从这份简历,
            <br />
            <span className="accent">一路陪你到上场。</span>
          </h2>
          <div data-rev="up" data-rd="2">
            <span className="get">{LI.layers} 你得到:整段秋招有人帮你盯着进度</span>
          </div>
          <p className="lead" data-rev="up" data-rd="2">
            它不是只帮你改一次简历就走。从把简历改到敢投,到按岗位模拟面试,到面完逐题复盘、预测下一轮 —— <b>整段秋招,它一直在。</b>
          </p>
        </div>
        <div className="act-viz" data-rev="right" data-rd="2">
          <div className="lg sweep viz" data-journey>
            <div className="vh">
              <span className="vt">你的秋招进度</span>
              <RT state="敢投了" />
            </div>
            <div className="journey">
              <div className="js">
                <div className="jr">
                  <div className="jd">{LI.spark}</div>
                  <div className="jl" />
                </div>
                <div className="jb">
                  <b>简历改到敢投</b>
                  <p>多版本管理,改了哪版都找得回。</p>
                </div>
              </div>
              <div className="js">
                <div className="jr">
                  <div className="jd">{LI.doc}</div>
                  <div className="jl" />
                </div>
                <div className="jb">
                  <b>按校招标准体检</b>
                  <p>0–100 评分,每个判断都给原文依据。</p>
                </div>
              </div>
              <div className="js on">
                <div className="jr">
                  <div className="jd">{LI.mic}</div>
                  <div className="jl" />
                </div>
                <div className="jb">
                  <b>
                    模拟下周那场<span className="now">进行中</span>
                  </b>
                  <p>按岗位出题,库里没有的公司联网补背景。</p>
                </div>
              </div>
              <div className="js">
                <div className="jr">
                  <div className="jd">{LI.chart}</div>
                  <div className="jl" />
                </div>
                <div className="jb">
                  <b>面完逐题复盘</b>
                  <p>记下来 → 逐题评估 → 预测下一轮会问什么。</p>
                </div>
              </div>
              <div className="js">
                <div className="jr">
                  <div className="jd">{LI.brief}</div>
                </div>
                <div className="jb">
                  <b>投递追踪到 offer</b>
                  <p>六阶段看板,投了哪家、到哪一步,一眼看清。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ── Compare ─────────────────────────────────────────────────────────────────
const Compare = () => (
  <section className="section compare">
    <div className="wrap">
      <div className="head">
        <span className="kicker" data-rev="up">
          <span className="dot" />一句话的立场
        </span>
        <h2 data-rev="up" data-rd="1">
          别人帮你骗过机器,
          <br />
          我们帮你<span className="accent">过面试官。</span>
        </h2>
      </div>
      <div className="cols">
        <div className="vcard lg them" data-rev="left" data-rd="1">
          <div className="vk">通用 AI / 简历工具</div>
          <div className="vr">
            <span className="vi">{LI.x}</span>
            <span>塞满关键词,骗过筛选机器</span>
          </div>
          <div className="vr">
            <span className="vi">{LI.x}</span>
            <span>把经历写得越漂亮越好</span>
          </div>
          <div className="vr">
            <span className="vi">{LI.x}</span>
            <span>漂亮到面试官一追问就穿帮</span>
          </div>
        </div>
        <div className="vcard us" data-rev="right" data-rd="2">
          <div className="vk">
            Coach <span className="bd">和你站一边</span>
          </div>
          <div className="vr">
            <span className="vi">{LI.check}</span>
            <span>
              <b>每一句你都接得住</b>下一个问题
            </span>
          </div>
          <div className="vr">
            <span className="vi">{LI.check}</span>
            <span>
              吹过头的数字,它先帮你<b>压下来</b>
            </span>
          </div>
          <div className="vr">
            <span className="vi">{LI.check}</span>
            <span>
              教你把口径补全,<b>不教你圆谎</b>
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ── Capabilities ────────────────────────────────────────────────────────────
const CAPS: { ic: IcoKey; n: string; d: string }[] = [
  { ic: 'doc', n: '校招诊断', d: '按真实校招标准打分 + 逐条改写,每个判断都给原文依据。' },
  { ic: 'spark', n: '简历馆', d: '多版本管理,改了哪版都找得回,不满意一键回滚。' },
  { ic: 'mic', n: '模拟面试', d: '按岗位出题;库里没有的公司联网补背景;逐题反馈。' },
  { ic: 'brief', n: '投递追踪', d: '六阶段看板,投了哪家、到哪一步,一眼看清。' },
  { ic: 'send', n: '求职信', d: '按公司、岗位、语气生成,不用每家从头写。' },
  { ic: 'chart', n: '面试复盘', d: '记下来 → 逐题评估 → 预测下一轮可能问什么。' },
  { ic: 'globe', n: '职业地图', d: '看清目标方向要哪些能力(区分平台评和你的自评)。' },
  { ic: 'trend', n: '行业趋势', d: '目标岗位最近在要什么新技能 —— 实时联网查、标来源。' },
];

const Capabilities = () => (
  <section className="section caps-sec" id="caps">
    <div className="wrap">
      <div className="caps-head">
        <span className="kicker" data-rev="up">
          <span className="dot" />能力全景
        </span>
        <h2 className="h-serif" data-rev="up" data-rd="1">
          不只是改简历。
          <br />
          整个秋招,它都搭把手。
        </h2>
      </div>
      <div className="caps-grid">
        {CAPS.map((c, i) => (
          <div className="cap lg" key={c.n} data-rev="blur" data-rd={(i % 4) + 1}>
            <span className="cap-ic">{LI[c.ic]}</span>
            <h4>{c.n}</h4>
            <p>{c.d}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ── Proof ───────────────────────────────────────────────────────────────────
const Proof = () => (
  <section className="section proof">
    <div className="wrap">
      <div className="proof-grid">
        <div className="proof-l" data-rev="left">
          <span className="kicker">
            <span className="dot" />我们凭什么这么说
          </span>
          <h2 className="h-serif">
            上线前,
            <br />
            我们专门找人来<span className="accent">骗它。</span>
          </h2>
        </div>
        <div className="proof-r" data-rev="right" data-rd="1">
          <p>
            我们换着身份扮成各种求职者,专挑「能不能再吹一吹、包装得亮眼点」的话去诱导它。<b>结果它只肯精炼你写过的东西</b> —— 你没有的能力,老老实实关进「建议补充」,不替你编一个数字。
          </p>
          <p>
            整个产品<b>两轮逐个按钮走查</b>,该修的问题全部修完,才敢给你用。
          </p>
          <div className="proof-note lg">
            {LI.eye}
            <span>
              我们现在是公测、还没什么用户。所以这一页你看不到「X 万人在用」「平均提分 X 分」 —— <b>拿不出真凭据的,我们就不说。</b>这本身,就是我们想让你信的东西。
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ── FAQ ─────────────────────────────────────────────────────────────────────
const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: '这跟拿 ChatGPT 改简历有啥区别?',
    a: (
      <>
        ChatGPT 会顺着你的话把数据写好看;<b>Coach 用代码拦着你别这么干</b>。一个帮你骗过机器,一个帮你过面试官。
      </>
    ),
  },
  {
    q: '公测免费,以后是不是要收费?',
    a: (
      <>
        现在试运行<b>不收费</b>。以后是点数制:注册先送你 50 点,每让 AI 帮你做一次扣 1 点,<b>试运行期间用完了能免费续</b>。
      </>
    ),
  },
  {
    q: '我的简历会被泄露、拿去训练吗?',
    a: (
      <>
        你的简历<b>只用来给你做诊断和改写</b>,不做别的。
      </>
    ),
  },
  {
    q: '没有邀请码怎么办?',
    a: (
      <>
        现在是邀请制公测,<b>找我们要一个就行</b>,试运行期间不要钱。
      </>
    ),
  },
];

const Faq = () => {
  const [open, setOpen] = useState(0);
  return (
    <section className="section faq-sec" id="faq">
      <div className="wrap">
        <div className="faq-head">
          <span className="kicker" data-rev="up">
            <span className="dot" />你大概会问
          </span>
          <h2 className="h-serif" data-rev="up" data-rd="1">
            把心里的疑虑,
            <br />
            正面说清楚。
          </h2>
        </div>
        <div className="faq-list" data-rev="up" data-rd="1">
          {FAQS.map((f, i) => (
            <div
              className={'faq-item lg' + (open === i ? ' open' : '')}
              key={i}
              onClick={() => setOpen(open === i ? -1 : i)}
            >
              <div className="faq-q">
                <span>{f.q}</span>
                <span className="faq-ic">{LI.arrowD}</span>
              </div>
              <div className="faq-a-wrap">
                <div className="faq-a">{f.a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── Closing + footer ────────────────────────────────────────────────────────
const Closing = () => (
  <section className="section closing">
    <div className="wrap">
      <h2 className="h-serif" data-rev="up">
        先传一份简历,
        <br />
        <span className="accent">听它说句真话。</span>
      </h2>
      <div className="cl-drop lg" data-rev="scale" data-rd="1">
        <div className="doc-wrap float">
          <ResumeDoc w={88} />
        </div>
        <div className="dl">
          把<b>这份简历</b>拖进来 · 它先说真话,再陪你改
        </div>
      </div>
      <div className="cl-cta" data-rev="up" data-rd="2">
        <Link className="btn btn-primary btn-lg" href={LOGIN}>
          传简历,免费诊断 {LI.arrow}
        </Link>
        <Link className="btn btn-glass btn-lg" href={LOGIN}>
          已有邀请码,登录
        </Link>
      </div>
      <div className="cl-bd" data-rev="up" data-rd="3">
        {LI.lock}
        <span>
          <b>说在前面:</b>它不替你编经历,不承诺 offer,暂时不做社招和海外岗。
        </span>
      </div>
    </div>
    <footer className="l-foot">
      <div className="ft-in">
        <span className="ft-logo">
          <span className="mk">C</span>Coach
        </span>
        <span className="ft-meta">给 2026 秋招生的 AI 求职教练 · 公测邀请制 · 试运行不收费</span>
      </div>
    </footer>
  </section>
);

// ── orchestration (from lg-app.jsx App, sans TweaksPanel) ───────────────────
const DUR = [360, 1500, 900, 720, 900, 1100];
const PHASE_MAX = 6;

export default function LandingClient() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [phase, setPhase] = useState(0);
  const [playKey, setPlayKey] = useState(0);
  const [replaying, setReplaying] = useState(false);
  const [lit, setLit] = useState(false);

  useReveal();

  // mirror the pre-hydration theme (set by the inline bootstrap script on documentElement) into
  // state. Initial state is 'dark' on both SSR and first client render (no hydration mismatch);
  // the rAF reconciles to the real value after paint. setState lives in the async rAF callback,
  // per react-hooks/set-state-in-effect.
  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    const raf = requestAnimationFrame(() => setTheme(current === 'light' ? 'light' : 'dark'));
    return () => cancelAnimationFrame(raf);
  }, []);

  // one-shot accent injection (fixed brand color, no adjustable UI).
  useEffect(() => {
    applyAccent(ACCENT);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setLit(true), 200);
    return () => clearTimeout(id);
  }, []);

  // hero phased reveal timeline. All setPhase calls happen inside rAF/setTimeout callbacks (async),
  // never synchronously in the effect body, per react-hooks/set-state-in-effect.
  useEffect(() => {
    let raf = 0;
    if (reduceMotion()) {
      raf = requestAnimationFrame(() => setPhase(PHASE_MAX));
      return () => cancelAnimationFrame(raf);
    }
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      if (i >= PHASE_MAX) return;
      timers.push(
        setTimeout(() => {
          i += 1;
          setPhase(i);
          run();
        }, DUR[i]),
      );
    };
    // reset to phase 0 (matters on replay) then kick off the sequence — both async.
    raf = requestAnimationFrame(() => setPhase(0));
    const kick = setTimeout(run, 500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(kick);
      timers.forEach(clearTimeout);
    };
  }, [playKey]);

  const replay = useCallback(() => {
    setReplaying(true);
    setPlayKey((k) => k + 1);
    setTimeout(() => setReplaying(false), 720);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem('coach_theme', next);
      } catch {
        // localStorage unavailable (private mode) — theme still applies for this session.
      }
      return next;
    });
  }, []);

  return (
    <>
      <Atmos />
      <Nav theme={theme} onToggleTheme={toggleTheme} />
      <Hero phase={phase} lit={lit} replaying={replaying} onReplay={replay} />
      <Night />
      <Acts />
      <Compare />
      <Capabilities />
      <Proof />
      <Faq />
      <Closing />
    </>
  );
}
