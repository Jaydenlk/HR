'use client';

// landing/_mobile.tsx — Coach 移动版落地页,从 移动端/lgm/m-app.jsx(HTML+Babel 原型)移植为
// 单个 Next.js client 组件,默认导出 LandingMobile。设备外壳 + 拇指原生分节,与桌面 Night Atelier
// 共用一套品牌语言,但走移动专属的滚动容器(.screen,非 window)与版式。
//
// 复用:LI / CoachMark / ResumeDoc / useCountUp / useTypewriter / reduceMotion 全部从 ./_client
// import,不重复造。本文件只承载移动版独有的结构、滚动效果(reveal/journey/sticky CTA,observer
// 的 root 是 .screen 滚动容器而非 window)、hero 时间线与主题状态。
//
// 样式:全部由 _mobile_styles.ts 的 MOBILE_CSS 提供,每条规则带 .lg-mroot 作用域,经 page.tsx
// 注入。本组件渲染的 DOM 整体被 page.tsx 套在 <div className="lg-mroot ...">(挂 next/font variable)。
//
// 主题:默认跟随系统 + 可切 + 持久化到 localStorage['coach_theme'](全站同键)。防闪烁靠根 layout 的
// 预水合脚本(首帧前设 documentElement.dataset.theme + .dark class)。本组件读该值镜像进 state,
// 切换时同步 state + html data-theme + .dark class + localStorage,与桌面 _client.tsx 一致。
//
// 文案逐字保留(上一轮已审计合规),不新增任何用户数/提分/case。

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import {
  LI,
  CoachMark,
  ResumeDoc,
  useCountUp,
  useTypewriter,
  reduceMotion,
} from './_client';

// ── 简历状态 chip ────────────────────────────────────────────────────────────
const RT = ({ s }: { s: string }) => (
  <span className="rchip">
    <span className="pg" />
    <b>简历</b>
    <span className="st">{s}</span>
  </span>
);

// ── mobile→desktop handoff button (copy link) ────────────────────────────────
function CopyLinkBtn({
  block,
  glass,
  children,
}: {
  block?: boolean;
  glass?: boolean;
  children: ReactNode;
}) {
  const [done, setDone] = useState(false);
  const copy = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // clipboard 不可用(无 HTTPS / 权限):静默,仍给"已复制"反馈,用户可手动复制地址栏。
    }
    setDone(true);
    setTimeout(() => setDone(false), 2200);
  }, []);
  return (
    <button
      type="button"
      className={
        'btn ' + (glass ? 'btn-glass' : 'btn-primary') + (block ? ' btn-block' : '')
      }
      onClick={copy}
    >
      {done ? <>链接已复制 {LI.check}</> : children}
    </button>
  );
}

// ── HERO ──────────────────────────────────────────────────────────────────────
function Hero({ phase, lit }: { phase: number; lit: boolean }) {
  const tw = useTypewriter('下周有腾讯的产品岗面试,帮我准备一下。', phase >= 1, 46);
  const score = useCountUp(78, 61, phase >= 6, 1000);
  const sh = (n: number) => (phase >= n ? ' show' : '');
  return (
    <header className={'m-hero' + (lit ? ' lit' : '')} id="m-hero">
      <span className="pill" data-rev>
        <span className="dot" />2026 秋招生 · 公测邀请制
      </span>
      <h1 data-rev data-rd="1">
        说一句你卡在哪,它把
        <span className="u accent">
          下一步
          <svg viewBox="0 0 200 12" preserveAspectRatio="none">
            <path d="M3 8 Q100 1 197 7" />
          </svg>
        </span>
        摆到你面前。
      </h1>
      <p className="sub" data-rev data-rd="2">
        给 2026 秋招生的 AI 求职教练。说人话 —— <b>诊断、模拟面试、改简历,它配好下一步</b>。完整功能在电脑端。
      </p>
      <div className="m-hero-cta" data-rev data-rd="3">
        <CopyLinkBtn block>复制链接,去电脑打开 {LI.arrow}</CopyLinkBtn>
        <div className="trust">
          <span>{LI.globe}电脑端使用</span>
          <i />
          <span>{LI.shield}注册送 50 点</span>
          <i />
          <span>{LI.lock}不替你编</span>
        </div>
      </div>
      <div className="m-scene" data-rev="scale" data-rd="3">
        <div className="card disp lg float">
          <div className="ch">
            <span className="l">
              <span className="live" />调度台
            </span>
            <span className="tag">演示</span>
          </div>
          <div className="body">
            <div className={'m-bub me' + sh(1)}>
              <div className="t">
                {phase >= 1 ? tw : ''}
                {phase >= 1 && phase < 2 ? <span className="cur" /> : null}
              </div>
            </div>
            {phase >= 2 && phase < 3 ? (
              <div className="m-bub ai show">
                <CoachMark size={26} />
                <div className="t" style={{ padding: 0 }}>
                  <div className="m-typing">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </div>
            ) : (
              <div className={'m-bub ai' + sh(3)}>
                <CoachMark size={26} />
                <div className="t">这三件事现在做最划算。</div>
              </div>
            )}
          </div>
          <div className="m-acts">
            <div className={'a' + sh(4)}>
              <span className="i">{LI.doc}</span>
              <b>先体检</b>
            </div>
            <div className={'a' + sh(4)} style={{ transitionDelay: phase >= 4 ? '.08s' : '0s' }}>
              <span className="i">{LI.mic}</span>
              <b>模拟</b>
            </div>
            <div className={'a' + sh(4)} style={{ transitionDelay: phase >= 4 ? '.16s' : '0s' }}>
              <span className="i">{LI.spark}</span>
              <b>改一版</b>
            </div>
          </div>
        </div>
        <div className="card guard lg float-2">
          <div className="gh">
            <span className="l">护栏</span>
            <span className="flip">
              <span className="from">78</span>
              <span className="ar">→</span>
              <span className="to mono">{score}</span>
            </span>
          </div>
          <div className="gbody">
            <div className={'m-gl ok' + sh(5)}>
              <span className="b">{LI.check}核实</span>
              <span className="t">
                <b>首屏 3.2s→0.9s</b> 有出处,留下。
              </span>
            </div>
            <div className={'m-gl cut' + sh(6)} style={{ transitionDelay: phase >= 6 ? '.05s' : '0s' }}>
              <span className="b">已删</span>
              <span className="t">
                <s>增长 200%</s> 没口径,<b>不替你圆。</b>
              </span>
            </div>
          </div>
        </div>
        <div className="card rfloat lg float">
          <span className="rp" />
          <span className="rt">
            <b>你的简历</b>
            <span>v7 · 核对中</span>
          </span>
        </div>
      </div>
      <div className="m-cue" data-rev data-rd="3">
        <div className="m" />
        <span>往下看</span>
      </div>
    </header>
  );
}

// ── NIGHT ─────────────────────────────────────────────────────────────────────
const Night = () => (
  <section className="sec m-night">
    <span className="kick" data-rev>
      <span className="dot" />深夜两点
    </span>
    <div className="lamp" data-rev="scale" data-rd="1">
      <div className="halo float" />
      <div className="doc d2">
        <ResumeDoc w={128} dim />
      </div>
      <div className="doc d1 float-2">
        <span className="ver">v7 · 还在改</span>
        <ResumeDoc w={128} />
      </div>
    </div>
    <div className="big" data-rev data-rd="1">
      投出去三十份,<span className="sm">大多没有回音。</span>
    </div>
    <div className="v" data-rev data-rd="2">
      <span className="q">“</span>
      <span>
        写淡了怕没亮点,<b>写满了又怕一问就穿帮</b>。
      </span>
    </div>
    <div className="turn" data-rev data-rd="3">
      问题大概率不在你 —— 是这份简历,<span className="accent">还没把你做过的事说清楚。</span>
      <span className="s">Coach 陪你,一条一条理清楚。从今晚这一份开始。</span>
    </div>
  </section>
);

// ── WHY (differentiators) ─────────────────────────────────────────────────────
const Why = () => (
  <section className="sec m-why">
    <span className="kick" data-rev>
      <span className="dot" />凭什么是它
    </span>
    <div className="m-why-list">
      <div className="m-why-row w1" data-rev data-rd="1">
        <span className="ic">{LI.shield}</span>
        <div className="ct">
          <b>
            不替你编<span className="accent">一个数字</span>
          </b>
          <span>三道写死的代码护栏 —— 加了水分当场拦下、压分,不是嘴上说说的「AI 自觉」。</span>
        </div>
      </div>
      <div className="m-why-row w2" data-rev data-rd="2">
        <span className="ic">{LI.bolt}</span>
        <div className="ct">
          <b>说人话就能用</b>
          <span>不用研究功能。讲一句你要面什么,它就配好下一步,点一下就开始。</span>
        </div>
      </div>
      <div className="m-why-row w3" data-rev data-rd="3">
        <span className="ic">{LI.layers}</span>
        <div className="ct">
          <b>陪你到上场</b>
          <span>从改简历到模拟面试到逐题复盘,8 项能力贯穿整段秋招。</span>
        </div>
      </div>
    </div>
  </section>
);

// ── ACTS ──────────────────────────────────────────────────────────────────────
const Acts = () => (
  <section className="sec" id="how">
    <div className="m-act">
      <div className="m-chap" data-rev>
        <span className="n">01</span> 它先读你
      </div>
      <h2 data-rev data-rd="1">
        你说人话,它<span className="accent">读懂,配好下一步。</span>
      </h2>
      <div data-rev data-rd="2">
        <span className="get">{LI.bolt} 不用研究功能,张嘴就行</span>
      </div>
      <p className="lead" data-rev data-rd="2">
        把你下周要面什么直接讲出来,它就着你这份简历认出公司、岗位、时间,把<b>最该做的几件事</b>摆到你面前。
      </p>
      <div className="lg m-viz" data-rev="blur" data-rd="2">
        <div className="m-vh">
          <span className="t">意图识别</span>
          <RT s="已读取" />
        </div>
        <div className="m-said">
          下周有<span className="e">腾讯<span className="tg">公司</span></span>的
          <span className="e">产品岗<span className="tg">岗位</span></span>
          <span className="e">面试<span className="tg">意图</span></span>,帮我准备一下。
        </div>
        <div className="m-flow">
          <span className="ln" />
          <span className="bd">配好 3 件事</span>
          <span className="ln" />
        </div>
        <div className="m-ac3">
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

    <div className="m-act">
      <div className="m-chap" data-rev>
        <span className="n">02</span> 改到敢投
      </div>
      <h2 data-rev data-rd="1">
        面试官那一追问,<span className="accent">每句你都接得住。</span>
      </h2>
      <div data-rev data-rd="2">
        <span className="get">{LI.shield} 一份敢投、也敢被追问的简历</span>
      </div>
      <p className="lead" data-rev data-rd="2">
        你没做过的,<b>一个字都不替你编</b>。靠的不是 AI 自觉,是三道写死的代码护栏。
      </p>
      <div className="lg m-viz" data-rev="blur" data-rd="2">
        <div className="m-vh">
          <span className="t">三道防编造护栏</span>
          <RT s="v7 → 核对中" />
        </div>
        <div className="m-rails">
          <div className="m-rail r1">
            <span className="ri">{LI.clock}</span>
            <div className="rt">
              <b>
                时间线勾稽<span className="vd">拦下</span>
              </b>
              <span className="d">实习早于入学,代码扫原文抓出来。</span>
              <span className="ex">
                <span className="bad">实习 2024.03</span>
                <span className="arr">早于</span>入学 09
              </span>
            </div>
          </div>
          <div className="m-rail r2">
            <span className="ri">{LI.chart}</span>
            <div className="rt">
              <b>
                可疑数字压分<span className="vd">78→61</span>
              </b>
              <span className="d">没基数没口径的「增长 200%」,评分压下来。</span>
            </div>
          </div>
          <div className="m-rail r3">
            <span className="ri">{LI.shield}</span>
            <div className="rt">
              <b>
                防编造溯源<span className="vd">已核实</span>
              </b>
              <span className="d">新增数字必须在你原文里找得到出处。</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="m-act">
      <div className="m-chap" data-rev>
        <span className="n">03</span> 一路陪着
      </div>
      <h2 data-rev data-rd="1">
        从这份简历,<span className="accent">一路陪你到上场。</span>
      </h2>
      <div data-rev data-rd="2">
        <span className="get">{LI.layers} 整段秋招有人帮你盯进度</span>
      </div>
      <p className="lead" data-rev data-rd="2">
        从改到敢投,到按岗位模拟面试,到面完逐题复盘 —— <b>整段秋招,它一直在。</b>
      </p>
      <div className="lg m-viz" data-rev="blur" data-rd="2" data-journey>
        <div className="m-vh">
          <span className="t">你的秋招进度</span>
          <RT s="敢投了" />
        </div>
        <div className="m-journey">
          <div className="m-js">
            <div className="jr">
              <div className="jd">{LI.spark}</div>
              <div className="jl" />
            </div>
            <div className="jb">
              <b>简历改到敢投</b>
              <p>多版本管理,改了哪版都找得回。</p>
            </div>
          </div>
          <div className="m-js">
            <div className="jr">
              <div className="jd">{LI.doc}</div>
              <div className="jl" />
            </div>
            <div className="jb">
              <b>按校招标准体检</b>
              <p>0–100 评分,每个判断给原文依据。</p>
            </div>
          </div>
          <div className="m-js on">
            <div className="jr">
              <div className="jd">{LI.mic}</div>
              <div className="jl" />
            </div>
            <div className="jb">
              <b>
                模拟下周那场<span className="now">进行中</span>
              </b>
              <p>按岗位出题,联网补背景。</p>
            </div>
          </div>
          <div className="m-js">
            <div className="jr">
              <div className="jd">{LI.chart}</div>
              <div className="jl" />
            </div>
            <div className="jb">
              <b>面完逐题复盘</b>
              <p>预测下一轮会问什么。</p>
            </div>
          </div>
          <div className="m-js">
            <div className="jr">
              <div className="jd">{LI.brief}</div>
            </div>
            <div className="jb">
              <b>投递追踪到 offer</b>
              <p>六阶段看板,一眼看清。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ── COMPARE ─────────────────────────────────────────────────────────────────
const Compare = () => (
  <section className="sec m-comp">
    <div className="head">
      <span className="kick" data-rev>
        <span className="dot" />一句话的立场
      </span>
      <h2 data-rev data-rd="1">
        别人帮你骗过机器,
        <br />
        我们帮你<span className="accent">过面试官。</span>
      </h2>
    </div>
    <div className="m-vcard lg them" data-rev data-rd="1">
      <div className="vk">通用 AI / 简历工具</div>
      <div className="m-vr">
        <span className="vi">{LI.x}</span>
        <span>塞满关键词,骗过筛选机器</span>
      </div>
      <div className="m-vr">
        <span className="vi">{LI.x}</span>
        <span>把经历写得越漂亮越好</span>
      </div>
      <div className="m-vr">
        <span className="vi">{LI.x}</span>
        <span>漂亮到面试官一追问就穿帮</span>
      </div>
    </div>
    <div className="m-vcard us" data-rev data-rd="2">
      <div className="vk">
        Coach <span className="bd">和你站一边</span>
      </div>
      <div className="m-vr">
        <span className="vi">{LI.check}</span>
        <span>
          <b>每一句你都接得住</b>下一个问题
        </span>
      </div>
      <div className="m-vr">
        <span className="vi">{LI.check}</span>
        <span>
          吹过头的数字,它先帮你<b>压下来</b>
        </span>
      </div>
      <div className="m-vr">
        <span className="vi">{LI.check}</span>
        <span>
          教你把口径补全,<b>不教你圆谎</b>
        </span>
      </div>
    </div>
  </section>
);

// ── CAPS (horizontal snap carousel) ──────────────────────────────────────────
const CAPS: { ic: keyof typeof LI; n: string; d: string }[] = [
  { ic: 'doc', n: '校招诊断', d: '按真实校招标准打分 + 逐条改写。' },
  { ic: 'spark', n: '简历馆', d: '多版本管理,一键回滚。' },
  { ic: 'mic', n: '模拟面试', d: '按岗位出题,逐题反馈。' },
  { ic: 'brief', n: '投递追踪', d: '六阶段看板,进度一眼清。' },
  { ic: 'send', n: '求职信', d: '按公司岗位语气生成。' },
  { ic: 'chart', n: '面试复盘', d: '逐题评估,预测下一轮。' },
  { ic: 'globe', n: '职业地图', d: '看清目标方向要哪些能力。' },
  { ic: 'trend', n: '行业趋势', d: '岗位最近在要什么新技能。' },
];

function Caps() {
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setIdx(Math.round(el.scrollLeft / 170));
  }, []);
  return (
    <section className="sec m-caps" id="caps">
      <div className="head">
        <span className="kick" data-rev>
          <span className="dot" />能力全景
        </span>
        <h2 data-rev data-rd="1">
          不只是改简历。
          <br />
          整个秋招都搭把手。
        </h2>
      </div>
      <div className="m-rail-scroll" ref={ref} onScroll={onScroll} data-rev data-rd="1">
        {CAPS.map((c) => (
          <div className="m-cap lg" key={c.n}>
            <span className="ci">{LI[c.ic]}</span>
            <h4>{c.n}</h4>
            <p>{c.d}</p>
          </div>
        ))}
      </div>
      <div className="m-dots">
        {CAPS.map((c, i) => (
          <i key={c.n} className={Math.min(idx, CAPS.length - 1) === i ? 'on' : ''} />
        ))}
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: '跟拿 ChatGPT 改简历有啥区别?',
    a: (
      <>
        ChatGPT 会顺着你把数据写好看;<b>Coach 用代码拦着你别这么干</b>。一个帮你骗过机器,一个帮你过面试官。
      </>
    ),
  },
  {
    q: '公测免费,以后收费吗?',
    a: (
      <>
        现在试运行<b>不收费</b>。以后点数制:注册送 50 点,<b>试运行期间用完能免费续</b>。
      </>
    ),
  },
  {
    q: '简历会被拿去训练吗?',
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
        邀请制公测,<b>找我们要一个就行</b>,试运行期间不要钱。
      </>
    ),
  },
];

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="sec m-faq" id="faq">
      <div className="head">
        <span className="kick" data-rev>
          <span className="dot" />你大概会问
        </span>
        <h2 data-rev data-rd="1">
          把心里的疑虑,
          <br />
          正面说清楚。
        </h2>
      </div>
      <div className="m-faq-list" data-rev data-rd="1">
        {FAQS.map((f, i) => (
          <div
            className={'m-faq-item lg' + (open === i ? ' open' : '')}
            key={f.q}
            onClick={() => setOpen(open === i ? -1 : i)}
          >
            <div className="m-faq-q">
              <span>{f.q}</span>
              <span className="ic">{LI.arrowD}</span>
            </div>
            <div className="m-faq-a-wrap">
              <div className="m-faq-a">{f.a}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── CLOSING ───────────────────────────────────────────────────────────────────
const Closing = () => (
  <section className="sec m-close">
    <span className="kick" data-rev>
      <span className="dot" />换个屏幕开始
    </span>
    <h2 data-rev data-rd="1" style={{ marginTop: 14 }}>
      打开电脑,
      <br />
      <span className="accent">把简历交给它。</span>
    </h2>
    <div className="m-handoff lg" data-rev="scale" data-rd="1">
      <div className="hd">
        <span className="float">
          <ResumeDoc w={64} />
        </span>
      </div>
      <div className="m-addr">
        <span className="lock">{LI.lock}</span>
        <b>coach.app</b>
        <span className="blink" />
      </div>
      <CopyLinkBtn block>复制链接,去电脑打开 {LI.arrow}</CopyLinkBtn>
      <div className="note">
        手机上先看个大概 —— <b>Coach 在电脑浏览器里使用</b>。换电脑打开就能传简历、免费诊断。
      </div>
    </div>
    <div className="bd2" data-rev data-rd="2">
      {LI.lock}
      <span>
        <b>说在前面:</b>它不替你编经历,不承诺 offer,暂不做社招和海外岗。
      </span>
    </div>
    <div className="m-foot" data-rev data-rd="2">
      Coach · 给 2026 秋招生的 AI 求职教练
      <br />
      公测邀请制 · 仅电脑端 · 试运行不收费
    </div>
  </section>
);

// ── shell ──────────────────────────────────────────────────────────────────────
const PHASES = 6;
const DUR = [380, 1500, 880, 700, 880, 1100];

export default function LandingMobile() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [phase, setPhase] = useState(0);
  const [lit, setLit] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const screenRef = useRef<HTMLDivElement>(null);

  // 镜像根 layout 预水合脚本设到 documentElement 的主题(首次 render SSR/CSR 均为 'dark',无 hydration
  // mismatch),rAF 后对齐真实值。setState 在 async rAF 回调里,符合 react-hooks/set-state-in-effect。
  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    const raf = requestAnimationFrame(() => setTheme(current === 'light' ? 'light' : 'dark'));
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      const el = document.documentElement;
      el.dataset.theme = next;
      el.classList.toggle('dark', next === 'dark');
      try {
        localStorage.setItem('coach_theme', next);
      } catch {
        // localStorage 不可用(隐私模式):本会话仍生效,只是不持久化。
      }
      return next;
    });
  }, []);

  // hero 时间线。所有 setPhase/setLit 都在 rAF/setTimeout 回调里(async),符合 react-hooks/set-state-in-effect。
  useEffect(() => {
    let raf = 0;
    if (reduceMotion()) {
      raf = requestAnimationFrame(() => {
        setPhase(PHASES);
        setLit(true);
      });
      return () => cancelAnimationFrame(raf);
    }
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      if (i >= PHASES) return;
      timers.push(
        setTimeout(() => {
          i += 1;
          setPhase(i);
          run();
        }, DUR[i]),
      );
    };
    const kick = setTimeout(run, 480);
    const l = setTimeout(() => setLit(true), 200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(kick);
      clearTimeout(l);
      timers.forEach(clearTimeout);
    };
  }, []);

  // reveal observer —— root 是 .screen 滚动容器(非 window)。journey 激活态在 DOM 上是静态 .m-js.on,
  // 此处的 jin observer 与源原型一致(保留),不改变行为。
  useEffect(() => {
    const root = screenRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (ents) => {
        ents.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { root, threshold: 0.14, rootMargin: '0px 0px -5% 0px' },
    );
    root.querySelectorAll('[data-rev]').forEach((el) => io.observe(el));
    const jio = new IntersectionObserver(
      (ents) => {
        ents.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('jin');
        });
      },
      { root, threshold: 0.4 },
    );
    root.querySelectorAll('[data-journey]').forEach((el) => jio.observe(el));
    return () => {
      io.disconnect();
      jio.disconnect();
    };
  }, []);

  // sticky CTA after hero —— 监听 .screen 的 scrollTop。setState 在 scroll 回调里(async)。
  useEffect(() => {
    const root = screenRef.current;
    if (!root) return;
    const on = () => setShowCta(root.scrollTop > 520);
    root.addEventListener('scroll', on, { passive: true });
    return () => root.removeEventListener('scroll', on);
  }, []);

  return (
    <div className="stage">
      <div className="device">
        <div className="topbar">
          <a className="logo" href="#m-hero">
            <span className="mk">C</span>Coach
          </a>
          <div className="tr">
            <button className="iconbtn" onClick={toggleTheme} aria-label="切换深浅色" type="button">
              {theme === 'dark' ? LI.sun : LI.moon}
            </button>
          </div>
        </div>

        <div className="screen" ref={screenRef}>
          <div className="atmos">
            <i className="a1" />
            <i className="a2" />
            <i className="a3" />
          </div>
          <Hero phase={phase} lit={lit} />
          <Night />
          <Why />
          <Acts />
          <Compare />
          <Caps />
          <Faq />
          <Closing />
          <div style={{ height: 92 }} />
        </div>

        <div className={'ctabar' + (showCta ? ' show' : '')}>
          <div className="meta">
            <b>{LI.globe}完整功能在电脑端</b>
            <span>复制链接 · 换电脑浏览器打开</span>
          </div>
          <CopyLinkBtn>复制链接 {LI.arrow}</CopyLinkBtn>
          <div className="home" />
        </div>
      </div>
    </div>
  );
}
