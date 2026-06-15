// landing/_mobile_styles.ts — page-scoped CSS for the mobile landing, ported from
// 移动端/lgm/m-tokens.css + m-app.jsx 的 M_CSS,合并为单个导出 MOBILE_CSS。
//
// 作用域隔离(关键):移动版用了 .atmos/.lg/.btn/.float/[data-rev]/.mono/.serif/.kick/.accent 等
// 与桌面 Night Atelier(LANDING_CSS)同名的类与裸属性选择器。两套 CSS 同时注入同一文档,
// 必须靠 .lg-mroot 前缀把移动版彻底圈住:每条规则的最外层目标都带 .lg-mroot,token 也挂
// .lg-mroot(不进 :root,不污染桌面/全站),light 覆盖写成 [data-theme="light"] .lg-mroot ...
// (data-theme 由根 layout 写在 documentElement 上)。
//
// @keyframes 名是全局命名空间,但移动版全部用 m 前缀(mpulse/mblink/mtdot/mcue/mdrift1-3/mfloat),
// 与桌面的 drift1-3/floaty/sweep/sweep 不冲突,故不前缀、原样保留。
//
// 字体:--mono(JetBrains Mono,Latin)接 next/font 注入的 --font-mono-jb(挂在根 div .lg-mroot 上);
// --serif/--sans(CJK)保留 Noto + 系统回退链(PingFang/YaHei/Songti/SimSun),墙内 CDN 拿不到时降级。
//
// 响应式:本 CSS 不含 show/hide 切换;由 page.tsx 注入的桥接媒体查询(<768 显示 .lg-mroot、隐藏
// .lg-root,≥768 反之)负责。display:none 的那一侧不绘制、不跑动画,无 hydration mismatch、无闪。

// ── tokens(m-tokens.css :root)→ .lg-mroot ──────────────────────────────────
const TOKENS_CSS = `
.lg-mroot{
  --blue:#2f8fff; --blue-2:#0a84ff; --blue-bright:#7cb8ff; --blue-deep:#0a5fd0; --blue-glow:rgba(47,143,255,.55);
  --au-cyan:#2fd9ff; --au-violet:#7b6bff;

  --bg-0:#05060c; --bg-1:#080a14; --bg-2:#0d1020;
  --ink:#f2f5fc; --ink-2:rgba(242,245,252,.70); --ink-3:rgba(242,245,252,.46); --ink-4:rgba(242,245,252,.30);
  --hair:rgba(255,255,255,.10); --hair-2:rgba(255,255,255,.16);

  --glass-bg:linear-gradient(150deg,rgba(255,255,255,.12),rgba(255,255,255,.03) 48%,rgba(255,255,255,.07));
  --glass-bd:rgba(255,255,255,.15);
  --glass-spec:rgba(255,255,255,.2);
  --glass-rim:rgba(255,255,255,.32);
  --tint:rgba(47,143,255,.06);
  --chrome:rgba(10,12,22,.62);

  --ok:#34d27b;--ok-dim:rgba(52,210,123,.16);
  --warn:#f5b53d;--warn-dim:rgba(245,181,61,.16);
  --cut:#8b90a0;--cut-dim:rgba(139,144,160,.14);
  --danger:#ff5d6b;--danger-dim:rgba(255,93,107,.16);

  --au-op:.5; --au-blend:screen; --room:#0a0b12;

  --serif:"Noto Serif SC",Georgia,"Songti SC","SimSun",serif;
  --sans:"Noto Sans SC","PingFang SC","Microsoft YaHei",-apple-system,ui-sans-serif,system-ui,sans-serif;
  /* --mono(Latin)接 next/font 的 --font-mono-jb(与 page.tsx 同层挂在 .lg-mroot 根 div 上)。 */
  --mono:var(--font-mono-jb),"JetBrains Mono",ui-monospace,monospace;
  --ease:cubic-bezier(.22,.61,.36,1);
  --ease-out:cubic-bezier(.16,1,.3,1);
  --spring:cubic-bezier(.34,1.56,.64,1);
}
[data-theme="light"] .lg-mroot{
  --blue:#0a6fe0; --blue-bright:#0a5fc0; --blue-glow:rgba(10,111,224,.4);
  --bg-0:#eef1f8; --bg-1:#f4f6fb; --bg-2:#ffffff;
  --ink:#11131c; --ink-2:rgba(17,19,28,.66); --ink-3:rgba(17,19,28,.46); --ink-4:rgba(17,19,28,.3);
  --hair:rgba(17,19,28,.10); --hair-2:rgba(17,19,28,.16);
  --glass-bg:linear-gradient(150deg,rgba(255,255,255,.92),rgba(255,255,255,.66) 48%,rgba(255,255,255,.82));
  --glass-bd:rgba(255,255,255,.9); --glass-spec:rgba(255,255,255,.95); --glass-rim:#fff;
  --tint:rgba(10,111,224,.05); --chrome:rgba(248,250,253,.7);
  --ok:#15a35a;--warn:#bd7d06;--cut:#737888;--danger:#e23b48;
  --au-op:.34; --au-blend:multiply; --room:#dfe4ee;
}

.lg-mroot *{box-sizing:border-box}
.lg-mroot{background:var(--room);font-family:var(--sans);-webkit-font-smoothing:antialiased;
  transition:background .4s var(--ease);min-height:100vh}
.lg-mroot .mono{font-family:var(--mono);font-variant-numeric:tabular-nums;letter-spacing:0}
.lg-mroot .serif{font-family:var(--serif)}
.lg-mroot img,.lg-mroot svg{display:block}
.lg-mroot ::selection{background:rgba(47,143,255,.3);color:#fff}

/* ═══════ STAGE — phone centered on an ambient room ═══════ */
.lg-mroot .stage{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:26px 16px;
  background:radial-gradient(120% 90% at 50% 0%, color-mix(in srgb,var(--room) 78%, var(--blue) 8%), var(--room));
  transition:background .4s var(--ease)}
@media (max-width:460px){.lg-mroot .stage{padding:0}}

/* device */
.lg-mroot .device{position:relative;width:402px;height:858px;border-radius:52px;background:#000;flex-shrink:0;
  box-shadow:0 50px 110px -30px rgba(0,0,0,.7),0 0 0 11px #0c0d12,0 0 0 12px rgba(255,255,255,.06);
  overflow:hidden}
@media (max-width:460px){.lg-mroot .device{width:100vw;height:100vh;height:100dvh;border-radius:0;box-shadow:none}}

/* screen — the scroll container */
.lg-mroot .screen{position:absolute;inset:0;border-radius:52px;overflow-y:auto;overflow-x:hidden;
  background:radial-gradient(135% 80% at 50% -6%, var(--bg-2), var(--bg-1) 44%, var(--bg-0) 100%);
  -webkit-overflow-scrolling:touch;scroll-behavior:smooth}
@media (max-width:460px){.lg-mroot .screen{border-radius:0}}
.lg-mroot .screen::-webkit-scrollbar{display:none}
.lg-mroot .screen{scrollbar-width:none}

/* aurora inside the screen (sticky so it stays put while content scrolls) */
.lg-mroot .atmos{position:sticky;top:0;height:0;z-index:0;pointer-events:none}
.lg-mroot .atmos i{position:absolute;border-radius:50%;filter:blur(60px);opacity:var(--au-op);mix-blend-mode:var(--au-blend);display:block}
.lg-mroot .atmos .a1{width:340px;height:340px;left:-90px;top:-40px;background:radial-gradient(circle,var(--blue),transparent 62%);animation:mdrift1 24s var(--ease) infinite alternate}
.lg-mroot .atmos .a2{width:280px;height:280px;right:-90px;top:280px;background:radial-gradient(circle,var(--au-violet),transparent 62%);opacity:calc(var(--au-op)*.7);animation:mdrift2 30s ease infinite alternate}
.lg-mroot .atmos .a3{width:300px;height:300px;left:40px;top:640px;background:radial-gradient(circle,var(--au-cyan),transparent 62%);opacity:calc(var(--au-op)*.6);animation:mdrift3 27s ease infinite alternate}
@keyframes mdrift1{to{transform:translate(50px,40px) scale(1.18)}}
@keyframes mdrift2{to{transform:translate(-40px,50px) scale(1.2)}}
@keyframes mdrift3{to{transform:translate(40px,-40px) scale(.9)}}

/* ═══════ CHROME (fixed within device) ═══════ */
/* status bar */
.lg-mroot .statusbar{position:absolute;top:0;left:0;right:0;height:54px;z-index:40;display:flex;align-items:center;
  justify-content:space-between;padding:16px 30px 0;pointer-events:none}
.lg-mroot .statusbar .time{font-family:-apple-system,"SF Pro",system-ui,var(--sans);font-weight:600;font-size:15px;color:var(--ink)}
.lg-mroot .statusbar .ind{display:flex;align-items:center;gap:6px;color:var(--ink)}
.lg-mroot .island{position:absolute;top:12px;left:50%;transform:translateX(-50%);width:120px;height:34px;border-radius:20px;background:#000;z-index:45}
@media (max-width:460px){.lg-mroot .island{display:none}}

/* top bar */
.lg-mroot .topbar{position:absolute;top:50px;left:0;right:0;z-index:38;display:flex;align-items:center;justify-content:space-between;
  padding:9px 16px;background:var(--chrome);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);
  border-bottom:1px solid var(--hair);transition:background .4s var(--ease)}
.lg-mroot .topbar .logo{display:flex;align-items:center;gap:8px;font-family:var(--serif);font-weight:700;font-size:17px;color:var(--ink);letter-spacing:-.01em;text-decoration:none}
.lg-mroot .topbar .logo .mk{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,var(--blue),var(--blue-deep));color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;box-shadow:0 4px 12px -4px var(--blue-glow)}
.lg-mroot .topbar .tr{display:flex;align-items:center;gap:8px}
.lg-mroot .iconbtn{appearance:none;width:34px;height:34px;border-radius:50%;border:1px solid var(--glass-bd);background:var(--glass-bg);
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:var(--ink-2);display:flex;align-items:center;justify-content:center;
  cursor:pointer;transition:.2s var(--ease);box-shadow:inset 0 1px 0 var(--glass-rim)}
.lg-mroot .iconbtn:active{transform:scale(.92)}
.lg-mroot .iconbtn svg{width:17px;height:17px}

/* bottom CTA bar — the signature mobile pattern */
.lg-mroot .ctabar{position:absolute;left:0;right:0;bottom:0;z-index:42;padding:12px 16px calc(14px + env(safe-area-inset-bottom));
  background:var(--chrome);-webkit-backdrop-filter:blur(22px) saturate(180%);backdrop-filter:blur(22px) saturate(180%);
  border-top:1px solid var(--hair);display:flex;align-items:center;gap:11px;
  transform:translateY(120%);transition:transform .55s var(--spring),background .4s var(--ease)}
.lg-mroot .ctabar.show{transform:none}
.lg-mroot .ctabar .meta{flex:1;min-width:0}
.lg-mroot .ctabar .meta b{display:block;font-family:var(--serif);font-size:14.5px;font-weight:600;color:var(--ink);line-height:1.2}
.lg-mroot .ctabar .meta span{font-size:11px;color:var(--ink-3)}
.lg-mroot .ctabar .home{position:absolute;left:50%;bottom:7px;transform:translateX(-50%);width:120px;height:4px;border-radius:99px;background:var(--ink-4);pointer-events:none}

/* ═══════ buttons ═══════ */
.lg-mroot .btn{font-family:var(--sans);appearance:none;cursor:pointer;border:1px solid transparent;display:inline-flex;align-items:center;justify-content:center;gap:8px;
  font-weight:600;letter-spacing:-.01em;border-radius:980px;font-size:15px;transition:.22s var(--ease);white-space:nowrap;min-height:48px;padding:0 22px}
.lg-mroot .btn:active{transform:scale(.97)}
.lg-mroot .btn svg{width:17px;height:17px}
.lg-mroot .btn-primary{background:linear-gradient(135deg,var(--blue),var(--blue-deep));color:#fff;box-shadow:0 10px 26px -10px var(--blue-glow),inset 0 1px 0 rgba(255,255,255,.4)}
.lg-mroot .btn-glass{background:var(--glass-bg);-webkit-backdrop-filter:blur(16px) saturate(160%);backdrop-filter:blur(16px) saturate(160%);
  color:var(--ink);border-color:var(--glass-bd);box-shadow:inset 0 1px 0 var(--glass-rim)}
.lg-mroot .btn-block{width:100%}

/* ═══════ liquid glass card ═══════ */
.lg-mroot .lg{position:relative;border-radius:22px;background:var(--glass-bg);
  -webkit-backdrop-filter:blur(24px) saturate(180%);backdrop-filter:blur(24px) saturate(180%);
  border:1px solid var(--glass-bd);box-shadow:0 22px 50px -28px rgba(0,0,0,.7),inset 0 1px 0 var(--glass-rim);overflow:hidden;isolation:isolate}
.lg-mroot .lg::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:0;
  background:radial-gradient(120% 80% at 0% 0%,var(--glass-spec),transparent 46%);mix-blend-mode:screen;opacity:.9}
.lg-mroot .lg>*{position:relative;z-index:1}

/* ═══════ reveal ═══════ */
.lg-mroot [data-rev]{opacity:0;transform:translateY(24px);transition:opacity .85s var(--ease-out),transform .85s var(--ease-out),filter .85s var(--ease-out);will-change:opacity,transform}
.lg-mroot [data-rev="blur"]{filter:blur(12px);transform:translateY(14px)}
.lg-mroot [data-rev="scale"]{transform:scale(.93)}
.lg-mroot [data-rev].in{opacity:1;transform:none;filter:none}
.lg-mroot [data-rd="1"]{transition-delay:.08s}.lg-mroot [data-rd="2"]{transition-delay:.16s}.lg-mroot [data-rd="3"]{transition-delay:.24s}.lg-mroot [data-rd="4"]{transition-delay:.32s}
@media (prefers-reduced-motion:reduce){
  .lg-mroot [data-rev]{opacity:1!important;transform:none!important;filter:none!important;transition:none!important}
  .lg-mroot .atmos i,.lg-mroot .float,.lg-mroot .lg .sweep{animation:none!important}
  .lg-mroot .screen{scroll-behavior:auto}
}
.lg-mroot .float{animation:mfloat 7s var(--ease) infinite alternate}
.lg-mroot .float-2{animation:mfloat 9s var(--ease) infinite alternate-reverse}
@keyframes mfloat{to{transform:translateY(-9px)}}

/* ═══════ section frame ═══════ */
.lg-mroot .sec{position:relative;z-index:1;padding:54px 20px}
.lg-mroot .kick{font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--blue-bright);
  display:inline-flex;align-items:center;gap:8px}
.lg-mroot .kick .dot{width:5px;height:5px;border-radius:50%;background:var(--blue);box-shadow:0 0 10px var(--blue-glow)}
.lg-mroot .accent{color:var(--blue-bright)}

/* résumé status chip — the thread */
.lg-mroot .rchip{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:9.5px;font-weight:600;color:var(--ink-2);
  background:var(--tint);border:1px solid var(--hair);border-radius:999px;padding:4px 10px 4px 5px}
.lg-mroot .rchip .pg{width:13px;height:17px;border-radius:3px;background:#f6f7f9;position:relative;flex-shrink:0;box-shadow:0 2px 5px rgba(0,0,0,.4)}
.lg-mroot .rchip .pg::before{content:"";position:absolute;left:2.5px;top:2.5px;width:4px;height:4px;border-radius:1.5px;background:var(--blue)}
.lg-mroot .rchip .pg::after{content:"";position:absolute;left:2.5px;top:9px;right:2.5px;height:1.5px;border-radius:1px;background:#c4c8d0;box-shadow:0 3px 0 #d7dae0}
.lg-mroot .rchip b{color:var(--ink);font-weight:700}.lg-mroot .rchip .st{color:var(--blue-bright)}
`;

// ── sections(m-app.jsx M_CSS)→ each rule prefixed with .lg-mroot ────────────
const SECTIONS_CSS = `
/* ═══ HERO ═══ */
.lg-mroot .m-hero{position:relative;padding:118px 20px 38px;min-height:760px;display:flex;flex-direction:column;justify-content:center}
.lg-mroot .m-hero .pill{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10px;font-weight:600;
  letter-spacing:.1em;padding:7px 13px;border-radius:999px;background:var(--glass-bg);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
  border:1px solid var(--glass-bd);color:var(--ink-2);box-shadow:inset 0 1px 0 var(--glass-rim);margin-bottom:20px}
.lg-mroot .m-hero .pill .dot{width:6px;height:6px;border-radius:50%;background:var(--blue);box-shadow:0 0 0 0 var(--blue-glow);animation:mpulse 2.4s infinite}
@keyframes mpulse{0%{box-shadow:0 0 0 0 rgba(47,143,255,.5)}70%{box-shadow:0 0 0 7px rgba(47,143,255,0)}100%{box-shadow:0 0 0 0 rgba(47,143,255,0)}}
.lg-mroot .m-hero h1{font-family:var(--serif);margin:0;font-weight:600;font-size:32px;line-height:1.28;letter-spacing:-.01em;color:var(--ink);text-wrap:balance}
.lg-mroot .m-hero h1 .accent{color:var(--blue-bright)}
.lg-mroot .m-hero h1 .u{position:relative;white-space:nowrap}
.lg-mroot .m-hero h1 .u svg{position:absolute;left:0;right:0;bottom:-.16em;width:100%;height:.2em;overflow:visible}
.lg-mroot .m-hero h1 .u path{stroke:var(--blue);stroke-width:4;fill:none;stroke-linecap:round;stroke-dasharray:230;stroke-dashoffset:230;transition:stroke-dashoffset 1.1s var(--ease-out) .5s}
.lg-mroot .m-hero.lit h1 .u path{stroke-dashoffset:0}
.lg-mroot .m-hero .sub{margin:20px 0 0;font-size:14.5px;line-height:1.65;color:var(--ink-2);text-wrap:pretty}
.lg-mroot .m-hero .sub b{color:var(--ink);font-weight:600}

/* hero scene — stacked glass */
.lg-mroot .m-scene{margin-top:28px;position:relative;height:300px}
.lg-mroot .m-scene .card{position:absolute;border-radius:20px}
.lg-mroot .m-scene .disp{left:0;top:0;width:240px;z-index:3;padding:0}
.lg-mroot .m-scene .ch{display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-bottom:1px solid var(--hair)}
.lg-mroot .m-scene .ch .l{font-family:var(--mono);font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);display:flex;align-items:center;gap:6px}
.lg-mroot .m-scene .ch .live{width:5px;height:5px;border-radius:50%;background:var(--blue);box-shadow:0 0 8px var(--blue-glow);animation:mpulse 2s infinite}
.lg-mroot .m-scene .ch .tag{font-family:var(--mono);font-size:8px;letter-spacing:.1em;color:var(--ink-3);border:1px solid var(--hair-2);border-radius:5px;padding:2px 6px}
.lg-mroot .m-scene .body{padding:12px 13px;display:flex;flex-direction:column;gap:9px;min-height:78px}
.lg-mroot .m-bub{max-width:92%;opacity:0;transform:translateY(7px);transition:.45s var(--ease-out)}
.lg-mroot .m-bub.show{opacity:1;transform:none}
.lg-mroot .m-bub.me{align-self:flex-end}
.lg-mroot .m-bub.me .t{background:linear-gradient(135deg,var(--blue),var(--blue-deep));color:#fff;border-radius:13px 13px 4px 13px;padding:8px 11px;font-size:12px;line-height:1.5;min-height:1.1em}
.lg-mroot .m-bub.me .cur{display:inline-block;width:2px;height:1em;background:#fff;margin-left:1px;vertical-align:-2px;animation:mblink .9s steps(1) infinite}
@keyframes mblink{50%{opacity:0}}
.lg-mroot .m-bub.ai{align-self:flex-start;display:flex;gap:7px;align-items:flex-end}
.lg-mroot .m-bub.ai .t{background:var(--tint);color:var(--ink);border:1px solid var(--hair);border-radius:13px 13px 13px 4px;padding:8px 11px;font-size:12px;line-height:1.5}
.lg-mroot .m-typing{display:inline-flex;gap:3px;padding:10px 12px}
.lg-mroot .m-typing i{width:5px;height:5px;border-radius:50%;background:var(--ink-3);animation:mtdot 1.2s infinite}
.lg-mroot .m-typing i:nth-child(2){animation-delay:.18s}.lg-mroot .m-typing i:nth-child(3){animation-delay:.36s}
@keyframes mtdot{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-4px);opacity:1}}
.lg-mroot .m-acts{display:flex;gap:6px;padding:0 13px 13px 43px}
.lg-mroot .m-acts .a{flex:1;background:var(--tint);border:1px solid var(--hair);border-radius:10px;padding:8px 7px;display:flex;flex-direction:column;gap:5px;
  opacity:0;transform:translateY(9px) scale(.95);transition:.5s var(--spring)}
.lg-mroot .m-acts .a.show{opacity:1;transform:none}
.lg-mroot .m-acts .a .i{width:22px;height:22px;border-radius:7px;background:rgba(47,143,255,.18);color:var(--blue-bright);display:flex;align-items:center;justify-content:center}
.lg-mroot .m-acts .a .i svg{width:13px;height:13px}
.lg-mroot .m-acts .a b{font-size:9.5px;font-weight:600;color:var(--ink);line-height:1.1}

.lg-mroot .m-scene .guard{right:0;bottom:6px;width:206px;z-index:4}
.lg-mroot .m-scene .guard .gh{display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-bottom:1px solid var(--hair)}
.lg-mroot .m-scene .guard .gh .l{font-family:var(--mono);font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}
.lg-mroot .m-scene .flip{display:flex;align-items:center;gap:5px;font-family:var(--mono);font-weight:700}
.lg-mroot .m-scene .flip .from{font-size:12px;color:var(--ink-3);text-decoration:line-through}
.lg-mroot .m-scene .flip .ar{color:var(--ink-3);font-size:9px}
.lg-mroot .m-scene .flip .to{font-size:17px;color:var(--danger)}
.lg-mroot .m-scene .gbody{padding:11px 12px;display:flex;flex-direction:column;gap:6px}
.lg-mroot .m-gl{display:grid;grid-template-columns:auto 1fr;gap:7px;padding:7px 9px;border-radius:9px;font-size:10px;line-height:1.45;align-items:start;
  opacity:0;transform:translateX(8px);transition:.5s var(--ease-out)}
.lg-mroot .m-gl.show{opacity:1;transform:none}
.lg-mroot .m-gl .b{font-size:8px;font-weight:700;padding:2px 6px;border-radius:5px;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;margin-top:1px}
.lg-mroot .m-gl .b svg{width:9px;height:9px}
.lg-mroot .m-gl.ok{background:var(--ok-dim)}.lg-mroot .m-gl.ok .b{background:var(--ok);color:#04130a}.lg-mroot .m-gl.ok .t{color:var(--ink-2)}
.lg-mroot .m-gl.cut{background:var(--cut-dim)}.lg-mroot .m-gl.cut .b{background:var(--cut);color:#fff}.lg-mroot .m-gl.cut .t{color:var(--ink-3)}
.lg-mroot .m-gl .t b{color:var(--ink);font-weight:600}.lg-mroot .m-gl .t s{opacity:.65}

.lg-mroot .m-scene .rfloat{position:absolute;left:10px;bottom:18px;z-index:5;padding:8px 11px;display:flex;align-items:center;gap:8px;border-radius:14px}
.lg-mroot .m-scene .rfloat .rp{width:24px;height:30px;border-radius:4px;background:#f6f7f9;position:relative;flex-shrink:0;box-shadow:0 4px 10px rgba(0,0,0,.4)}
.lg-mroot .m-scene .rfloat .rp::before{content:"";position:absolute;left:5px;top:5px;width:7px;height:7px;border-radius:2px;background:var(--blue)}
.lg-mroot .m-scene .rfloat .rp::after{content:"";position:absolute;left:5px;top:15px;right:5px;height:1.5px;border-radius:1px;background:#c4c8d0;box-shadow:0 4px 0 #d7dae0}
.lg-mroot .m-scene .rfloat .rt b{display:block;font-size:9.5px;font-weight:600;color:var(--ink)}
.lg-mroot .m-scene .rfloat .rt span{font-size:8px;color:var(--blue-bright);font-family:var(--mono)}

.lg-mroot .m-cue{display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:30px;color:var(--ink-3);font-family:var(--mono);font-size:9px;letter-spacing:.18em;text-transform:uppercase;white-space:nowrap}
.lg-mroot .m-cue .m{width:18px;height:28px;border-radius:10px;border:1.5px solid currentColor;position:relative}
.lg-mroot .m-cue .m::after{content:"";position:absolute;left:50%;top:5px;width:2.5px;height:5px;border-radius:2px;background:currentColor;transform:translateX(-50%);animation:mcue 1.8s infinite}
@keyframes mcue{0%{opacity:0;transform:translate(-50%,0)}40%{opacity:1}80%{opacity:0;transform:translate(-50%,7px)}}

/* ═══ NIGHT ═══ */
.lg-mroot .m-night{text-align:left}
.lg-mroot .m-night .lamp{position:relative;height:200px;display:flex;align-items:center;justify-content:center;margin:18px 0 26px}
.lg-mroot .m-night .lamp .halo{position:absolute;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(47,143,255,.32),transparent 60%);filter:blur(34px)}
.lg-mroot .m-night .lamp .doc{position:absolute;width:128px;border-radius:11px;box-shadow:0 30px 60px -26px rgba(0,0,0,.8)}
.lg-mroot .m-night .lamp .d2{transform:rotate(7deg) translate(40px,10px) scale(.9);opacity:.55}
.lg-mroot .m-night .lamp .d1{transform:rotate(-3deg);z-index:2}
.lg-mroot .m-night .lamp .ver{position:absolute;top:-10px;left:12px;font-family:var(--mono);font-size:9px;font-weight:600;color:var(--blue-bright);
  background:var(--glass-bg);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid var(--glass-bd);border-radius:6px;padding:3px 8px;z-index:3}
.lg-mroot .m-night .big{font-family:var(--serif);font-weight:600;font-size:25px;line-height:1.3;color:var(--ink);margin:16px 0 0;text-wrap:balance}
.lg-mroot .m-night .big .sm{color:var(--ink-3)}
.lg-mroot .m-night .v{display:flex;gap:11px;align-items:flex-start;font-size:14px;line-height:1.6;color:var(--ink-2);margin:20px 0 0;text-wrap:pretty}
.lg-mroot .m-night .v .q{font-family:var(--serif);color:var(--blue-bright);font-size:1.5em;line-height:.7;flex-shrink:0}
.lg-mroot .m-night .v b{color:var(--ink);font-weight:600}
.lg-mroot .m-night .turn{font-family:var(--serif);font-weight:600;font-size:20px;line-height:1.4;color:var(--ink);margin-top:26px;padding-left:15px;border-left:2px solid var(--blue);text-wrap:balance}
.lg-mroot .m-night .turn .accent{color:var(--blue-bright)}
.lg-mroot .m-night .turn .s{display:block;font-family:var(--sans);font-size:13px;font-weight:400;color:var(--ink-3);margin-top:10px;line-height:1.5}

/* ═══ ACTS ═══ */
.lg-mroot .m-act{margin-top:34px}
.lg-mroot .m-act:first-child{margin-top:0}
.lg-mroot .m-chap{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.1em;color:var(--blue-bright);text-transform:uppercase;display:flex;align-items:center;gap:9px;margin-bottom:14px}
.lg-mroot .m-chap .n{font-family:var(--serif);font-size:26px;font-weight:700;color:var(--ink-4);letter-spacing:0;line-height:1}
.lg-mroot .m-act h2{font-family:var(--serif);margin:0;font-weight:600;font-size:24px;line-height:1.3;color:var(--ink);text-wrap:balance}
.lg-mroot .m-act h2 .accent{color:var(--blue-bright)}
.lg-mroot .m-act .get{margin:16px 0 0;display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--blue-bright);background:var(--tint);border:1px solid var(--hair);border-radius:999px;padding:6px 13px}
.lg-mroot .m-act .get svg{width:14px;height:14px}
.lg-mroot .m-act .lead{margin:16px 0 20px;font-size:14px;line-height:1.7;color:var(--ink-2);text-wrap:pretty}
.lg-mroot .m-act .lead b{color:var(--ink);font-weight:600}
.lg-mroot .m-viz{padding:16px}
.lg-mroot .m-vh{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px;gap:8px}
.lg-mroot .m-vh .t{font-family:var(--mono);font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}

.lg-mroot .m-said{background:var(--tint);border:1px solid var(--hair);border-radius:13px;padding:13px;font-size:13.5px;line-height:1.7;color:var(--ink)}
.lg-mroot .m-said .e{position:relative;font-weight:700;color:var(--blue-bright);background:rgba(47,143,255,.16);border-radius:5px;padding:1px 5px;white-space:nowrap}
.lg-mroot .m-said .e .tg{position:absolute;top:-14px;left:0;font-family:var(--mono);font-size:8px;letter-spacing:.05em;color:var(--blue);font-weight:600;white-space:nowrap}
.lg-mroot .m-flow{display:flex;align-items:center;gap:8px;color:var(--ink-3);margin:14px 0 12px}
.lg-mroot .m-flow .ln{height:1px;flex:1;background:var(--hair-2)}
.lg-mroot .m-flow .bd{font-family:var(--mono);font-size:9.5px;font-weight:600;color:var(--blue-bright);border:1px solid var(--hair);background:var(--tint);border-radius:999px;padding:4px 10px}
.lg-mroot .m-ac3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.lg-mroot .m-ac3 .c{background:var(--tint);border:1px solid var(--hair);border-radius:12px;padding:11px 9px;display:flex;flex-direction:column;gap:7px}
.lg-mroot .m-ac3 .c .i{width:28px;height:28px;border-radius:9px;background:rgba(47,143,255,.16);color:var(--blue-bright);display:flex;align-items:center;justify-content:center}
.lg-mroot .m-ac3 .c .i svg{width:15px;height:15px}
.lg-mroot .m-ac3 .c b{font-size:11.5px;font-weight:600;color:var(--ink)}.lg-mroot .m-ac3 .c span{font-size:9.5px;color:var(--ink-3)}

.lg-mroot .m-rails{display:flex;flex-direction:column;gap:9px}
.lg-mroot .m-rail{border:1px solid var(--hair);border-radius:13px;padding:12px 13px;background:var(--tint);display:grid;grid-template-columns:auto 1fr;gap:11px;align-items:start}
.lg-mroot .m-rail .ri{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.lg-mroot .m-rail .ri svg{width:16px;height:16px}
.lg-mroot .m-rail.r1 .ri{background:var(--danger-dim);color:var(--danger)}.lg-mroot .m-rail.r2 .ri{background:var(--warn-dim);color:var(--warn)}.lg-mroot .m-rail.r3 .ri{background:var(--ok-dim);color:var(--ok)}
.lg-mroot .m-rail .rt b{display:block;font-size:13px;font-weight:600;color:var(--ink)}
.lg-mroot .m-rail .rt .vd{font-family:var(--mono);font-size:9px;font-weight:700;float:right;padding:3px 8px;border-radius:6px;margin-left:8px}
.lg-mroot .m-rail.r1 .vd{background:var(--danger-dim);color:var(--danger)}.lg-mroot .m-rail.r2 .vd{background:var(--warn-dim);color:var(--warn)}.lg-mroot .m-rail.r3 .vd{background:var(--ok-dim);color:var(--ok)}
.lg-mroot .m-rail .rt span.d{font-size:11.5px;color:var(--ink-3);line-height:1.45;display:block;margin-top:3px}
.lg-mroot .m-rail .rt .ex{font-family:var(--mono);font-size:10px;margin-top:6px;padding:5px 8px;border-radius:7px;background:rgba(0,0,0,.22);color:var(--ink-2);display:inline-flex;align-items:center;gap:6px}
[data-theme="light"] .lg-mroot .m-rail .rt .ex{background:rgba(17,19,28,.05)}
.lg-mroot .m-rail .ex .bad{color:var(--danger);text-decoration:line-through}.lg-mroot .m-rail .ex .arr{color:var(--ink-3)}.lg-mroot .m-rail .ex .good{color:var(--ok);font-weight:600}

.lg-mroot .m-journey{display:flex;flex-direction:column}
.lg-mroot .m-js{display:grid;grid-template-columns:auto 1fr;gap:13px}
.lg-mroot .m-js .jr{display:flex;flex-direction:column;align-items:center}
.lg-mroot .m-js .jd{width:30px;height:30px;border-radius:9px;background:var(--tint);border:1px solid var(--hair);display:flex;align-items:center;justify-content:center;color:var(--ink-3);flex-shrink:0;transition:.3s}
.lg-mroot .m-js .jd svg{width:15px;height:15px}
.lg-mroot .m-js.on .jd{background:var(--blue);border-color:var(--blue);color:#fff;box-shadow:0 0 0 4px rgba(47,143,255,.18),0 0 16px var(--blue-glow)}
.lg-mroot .m-js .jl{width:1.5px;flex:1;background:var(--hair);min-height:14px}.lg-mroot .m-js:last-child .jl{display:none}
.lg-mroot .m-js .jb{padding-bottom:16px}.lg-mroot .m-js .jb b{font-size:14px;font-weight:600;color:var(--ink)}
.lg-mroot .m-js .jb .now{font-family:var(--mono);font-size:8.5px;font-weight:700;color:var(--blue-bright);background:rgba(47,143,255,.16);border-radius:5px;padding:2px 6px;margin-left:7px}
.lg-mroot .m-js .jb p{margin:3px 0 0;font-size:12px;color:var(--ink-3);line-height:1.5}

/* ═══ COMPARE ═══ */
.lg-mroot .m-comp .head{text-align:center;margin-bottom:24px}
.lg-mroot .m-comp h2{font-family:var(--serif);margin:12px 0 0;font-weight:600;font-size:25px;line-height:1.3;color:var(--ink);text-wrap:balance}
.lg-mroot .m-comp h2 .accent{color:var(--blue-bright)}
.lg-mroot .m-comp .head .kick{justify-content:center}
.lg-mroot .m-vcard{border-radius:20px;padding:22px;margin-top:13px}
.lg-mroot .m-vcard .vk{font-family:var(--mono);font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.lg-mroot .m-vcard.them .vk{color:var(--ink-3)}
.lg-mroot .m-vcard.us{background:linear-gradient(150deg,rgba(47,143,255,.22),rgba(47,143,255,.06));border:1px solid rgba(47,143,255,.34);box-shadow:0 26px 60px -34px rgba(10,50,120,.7),0 0 60px -30px var(--blue-glow)}
.lg-mroot .m-vcard.us .vk{color:var(--blue-bright)}
.lg-mroot .m-vcard.us .vk .bd{font-size:8.5px;padding:2px 7px;border-radius:5px;background:rgba(47,143,255,.3);color:#dcecff}
.lg-mroot .m-vr{display:grid;grid-template-columns:auto 1fr;gap:11px;padding:11px 0;font-size:13.5px;line-height:1.45;align-items:start}
.lg-mroot .m-vcard.them .m-vr{color:var(--ink-2);border-top:1px solid var(--hair)}
.lg-mroot .m-vcard.us .m-vr{color:var(--ink);border-top:1px solid rgba(255,255,255,.12)}
.lg-mroot .m-vr:first-of-type{border-top:0!important}.lg-mroot .m-vr .vi{flex-shrink:0;margin-top:1px}.lg-mroot .m-vr .vi svg{width:16px;height:16px}
.lg-mroot .m-vcard.them .vi{color:var(--ink-3)}.lg-mroot .m-vcard.us .vi{color:var(--blue-bright)}.lg-mroot .m-vcard.us b{color:var(--ink);font-weight:700}

/* ═══ CAPS — horizontal snap carousel (mobile pattern) ═══ */
.lg-mroot .m-caps .head{margin-bottom:18px}
.lg-mroot .m-caps h2{font-family:var(--serif);margin:12px 0 0;font-weight:600;font-size:24px;line-height:1.3;color:var(--ink);text-wrap:balance}
.lg-mroot .m-rail-scroll{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 20px 8px;margin:0 -20px;-webkit-overflow-scrolling:touch}
.lg-mroot .m-rail-scroll::-webkit-scrollbar{display:none}.lg-mroot .m-rail-scroll{scrollbar-width:none}
.lg-mroot .m-cap{flex:0 0 158px;scroll-snap-align:start;padding:18px;display:flex;flex-direction:column;gap:10px;border-radius:18px}
.lg-mroot .m-cap .ci{width:38px;height:38px;border-radius:11px;background:var(--tint);border:1px solid var(--hair);display:flex;align-items:center;justify-content:center;color:var(--ink-2)}
.lg-mroot .m-cap .ci svg{width:19px;height:19px}
.lg-mroot .m-cap h4{margin:0;font-family:var(--serif);font-size:16px;font-weight:600;color:var(--ink)}
.lg-mroot .m-cap p{margin:0;font-size:12px;color:var(--ink-3);line-height:1.5}
.lg-mroot .m-dots{display:flex;justify-content:center;gap:6px;margin-top:14px}
.lg-mroot .m-dots i{width:6px;height:6px;border-radius:50%;background:var(--hair-2);transition:.3s}
.lg-mroot .m-dots i.on{background:var(--blue);width:18px;border-radius:99px}

/* ═══ FAQ ═══ */
.lg-mroot .m-faq .head{margin-bottom:18px}
.lg-mroot .m-faq h2{font-family:var(--serif);margin:12px 0 0;font-weight:600;font-size:24px;line-height:1.3;color:var(--ink);text-wrap:balance}
.lg-mroot .m-faq-list{display:flex;flex-direction:column;gap:10px}
.lg-mroot .m-faq-item{padding:0 16px;cursor:pointer;border-radius:16px;transition:border-color .25s}
.lg-mroot .m-faq-q{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:17px 0;font-family:var(--serif);font-size:15.5px;font-weight:600;color:var(--ink);line-height:1.4;min-height:56px}
.lg-mroot .m-faq-q .ic{flex-shrink:0;color:var(--ink-3);transition:transform .35s var(--ease),color .2s}.lg-mroot .m-faq-q .ic svg{width:17px;height:17px}
.lg-mroot .m-faq-item.open .ic{transform:rotate(180deg);color:var(--blue-bright)}
.lg-mroot .m-faq-a-wrap{display:grid;grid-template-rows:0fr;transition:grid-template-rows .38s var(--ease)}
.lg-mroot .m-faq-item.open .m-faq-a-wrap{grid-template-rows:1fr}
.lg-mroot .m-faq-a{overflow:hidden;font-size:13.5px;line-height:1.7;color:var(--ink-2)}
.lg-mroot .m-faq-a>*{padding-bottom:18px}.lg-mroot .m-faq-a b{color:var(--ink);font-weight:600}

/* ═══ CLOSING ═══ */
.lg-mroot .m-close{text-align:center;padding-bottom:30px}
.lg-mroot .m-close h2{font-family:var(--serif);margin:0;font-weight:600;font-size:30px;line-height:1.2;color:var(--ink);text-wrap:balance}
.lg-mroot .m-close h2 .accent{color:var(--blue-bright)}
.lg-mroot .m-drop{max-width:280px;margin:26px auto 0;padding:22px;border:1.5px dashed var(--hair-2);border-radius:20px;display:flex;flex-direction:column;align-items:center;gap:13px}
.lg-mroot .m-drop .dl{font-size:12.5px;color:var(--ink-3)}.lg-mroot .m-drop .dl b{color:var(--ink);font-weight:600}
.lg-mroot .m-close .bd2{display:inline-flex;align-items:flex-start;gap:9px;margin-top:24px;font-size:12.5px;color:var(--ink-3);line-height:1.6;text-align:left}
.lg-mroot .m-close .bd2 svg{width:15px;height:15px;flex-shrink:0;margin-top:2px}.lg-mroot .m-close .bd2 b{color:var(--ink-2);font-weight:600}
.lg-mroot .m-foot{margin-top:28px;padding-top:20px;border-top:1px solid var(--hair);font-family:var(--mono);font-size:10px;color:var(--ink-3);line-height:1.7}

/* ═══ hero inline CTA ═══ */
.lg-mroot .m-hero-cta{margin-top:24px;display:flex;flex-direction:column;gap:13px}
.lg-mroot .m-hero-cta .trust{display:flex;align-items:center;justify-content:center;gap:11px;font-size:11px;color:var(--ink-3)}
.lg-mroot .m-hero-cta .trust span{display:inline-flex;align-items:center;gap:5px}
.lg-mroot .m-hero-cta .trust span svg{width:13px;height:13px;color:var(--blue-bright);opacity:.9}
.lg-mroot .m-hero-cta .trust i{width:1px;height:11px;background:var(--hair-2)}

/* ═══ WHY band — differentiator claims ═══ */
.lg-mroot .m-why-list{margin-top:8px}
.lg-mroot .m-why-row{display:grid;grid-template-columns:auto 1fr;gap:15px;align-items:start;padding:20px 0;border-top:1px solid var(--hair)}
.lg-mroot .m-why-row:first-child{border-top:0}
.lg-mroot .m-why-row .ic{width:48px;height:48px;border-radius:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;
  background:linear-gradient(150deg,rgba(47,143,255,.24),rgba(47,143,255,.05));border:1px solid rgba(47,143,255,.3);color:var(--blue-bright);box-shadow:inset 0 1px 0 var(--glass-rim)}
.lg-mroot .m-why-row .ic svg{width:23px;height:23px}
.lg-mroot .m-why-row.w2 .ic{background:linear-gradient(150deg,rgba(245,181,61,.22),rgba(245,181,61,.04));border-color:rgba(245,181,61,.28);color:var(--warn)}
.lg-mroot .m-why-row.w3 .ic{background:linear-gradient(150deg,rgba(52,210,123,.22),rgba(52,210,123,.04));border-color:rgba(52,210,123,.28);color:var(--ok)}
.lg-mroot .m-why-row .ct b{font-family:var(--serif);font-size:20px;font-weight:600;color:var(--ink);line-height:1.32;display:block}
.lg-mroot .m-why-row .ct b .accent{color:var(--blue-bright)}
.lg-mroot .m-why-row .ct span{font-size:13px;color:var(--ink-3);line-height:1.6;display:block;margin-top:6px}

/* ═══ closing CTA ═══ */
.lg-mroot .m-close-cta{display:flex;flex-direction:column;gap:11px;margin-top:24px}

/* ═══ caps card accent (marketing punch) ═══ */
.lg-mroot .m-cap{position:relative;overflow:hidden}
.lg-mroot .m-cap::after{content:"";position:absolute;top:0;left:0;width:46px;height:3px;border-radius:0 0 3px 0;background:linear-gradient(90deg,var(--blue),transparent)}

/* ═══ sticky CTA shine ═══ */
.lg-mroot .ctabar .btn-primary{position:relative;overflow:hidden}
.lg-mroot .ctabar.show .btn-primary::after{content:"";position:absolute;top:0;left:-60%;width:38%;height:100%;
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.4),transparent);transform:skewX(-18deg);animation:ctashine 3.4s ease 1.2s infinite}
@keyframes ctashine{0%,58%{left:-60%}100%{left:150%}}
@media (prefers-reduced-motion:reduce){.lg-mroot .ctabar.show .btn-primary::after{animation:none}}

/* ═══ desktop handoff ═══ */
.lg-mroot .m-handoff{margin:22px auto 0;max-width:322px;padding:22px;border-radius:20px;display:flex;flex-direction:column;gap:13px}
.lg-mroot .m-handoff .hd{display:flex;justify-content:center;padding-bottom:2px}
.lg-mroot .m-addr{display:flex;align-items:center;gap:9px;padding:11px 14px;border-radius:12px;background:var(--tint);border:1px solid var(--hair);font-family:var(--mono);font-size:13px;color:var(--ink)}
.lg-mroot .m-addr .lock{color:var(--ink-3);display:flex}.lg-mroot .m-addr .lock svg{width:13px;height:13px}
.lg-mroot .m-addr b{font-weight:600}
.lg-mroot .m-addr .blink{margin-left:auto;width:1.5px;height:15px;background:var(--blue);animation:mblink 1.1s steps(1) infinite}
.lg-mroot .m-handoff .note{font-size:12px;color:var(--ink-3);line-height:1.6;text-align:center}
.lg-mroot .m-handoff .note b{color:var(--ink);font-weight:600}
.lg-mroot .m-close .kick{display:flex;justify-content:center}
.lg-mroot .ctabar .meta b svg{width:13px;height:13px;vertical-align:-2px;margin-right:3px;color:var(--blue-bright)}
`;

export const MOBILE_CSS = TOKENS_CSS + SECTIONS_CSS;
