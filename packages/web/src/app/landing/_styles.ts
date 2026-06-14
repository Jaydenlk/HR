// landing/_styles.ts — page-scoped CSS for the Night Atelier landing, concatenated from
// ver2.02/lg-tokens.css + HERO_CSS (lg-hero) + STORY_CSS (lg-story) + TAIL_CSS (lg-app).
//
// 改造点(相对原型):
//   1) body 级样式不全局污染:原 `body{background/color/font...}` 改挂到页面根 wrapper `.lg-root`;
//      原 `#root` 改为 `.lg-root`。`html{scroll-behavior}` 保留(只影响锚点滚动,可接受)。
//   2) 字体变量接 Next 字体管线:--news/--mono 引用 next/font 注入的 --font-news/--font-mono-jb,
//      --serif/--sans 保留 CJK link 字体 + 系统回退链(PingFang/YaHei/Songti/SimSun),墙内降级不阻塞。
//   3) :root / [data-theme="light"] 仍作用于 documentElement —— 主题切换改 html data-theme,与原型一致。
//   4) .replay 的一次性旋转类 .spin 改名 .spin-rev,避免与 globals.css 的全局 .spin(无限旋转)冲突。
//
// 该 CSS 仅由 landing/page.tsx 通过 <style> 注入,类名(.lg/.section/.hero…)只在本路由生效。

const TOKENS_CSS = `
:root{
  --blue:#2f8fff;
  --blue-2:#0a84ff;
  --blue-bright:#7cb8ff;
  --blue-deep:#0a5fd0;
  --blue-glow:rgba(47,143,255,.55);
  --au-cyan:#2fd9ff;
  --au-violet:#7b6bff;

  --bg-0:#05060c;
  --bg-1:#080a14;
  --bg-2:#0c0f1d;
  --ink:#f2f5fc;
  --ink-2:rgba(242,245,252,.70);
  --ink-3:rgba(242,245,252,.46);
  --ink-4:rgba(242,245,252,.30);
  --hair:rgba(255,255,255,.10);
  --hair-2:rgba(255,255,255,.16);

  --glass-bg:linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.028) 46%,rgba(255,255,255,.06));
  --glass-bd:rgba(255,255,255,.14);
  --glass-spec:rgba(255,255,255,.18);
  --glass-rim:rgba(255,255,255,.30);
  --glass-sh:0 24px 70px -24px rgba(0,0,0,.72),0 2px 12px -4px rgba(0,0,0,.5);
  --glass-blur:28px;
  --tint:rgba(47,143,255,.05);

  --ok:#34d27b;  --ok-dim:rgba(52,210,123,.16);
  --warn:#f5b53d; --warn-dim:rgba(245,181,61,.16);
  --cut:#8b90a0;  --cut-dim:rgba(139,144,160,.14);
  --danger:#ff5d6b; --danger-dim:rgba(255,93,107,.16);

  --serif:"Noto Serif SC",Georgia,"Songti SC","SimSun",serif;
  --sans:"Noto Sans SC","PingFang SC","Microsoft YaHei",-apple-system,ui-sans-serif,system-ui,sans-serif;
  /* --news / --mono 依赖 next/font 注入的 --font-news / --font-mono-jb,这两个变量挂在 .lg-root
     元素上;CSS 自定义属性的 var() 在「声明处的级联上下文」求值,故 --news/--mono 必须与
     --font-* 同层(.lg-root)声明,放 :root 会因看不到 --font-* 而解析为空,字体掉回退。见下方 .lg-root。 */

  --maxw:1180px;
  --ease:cubic-bezier(.22,.61,.36,1);
  --ease-out:cubic-bezier(.16,1,.3,1);
  --spring:cubic-bezier(.34,1.56,.64,1);
}

[data-theme="light"]{
  --blue:#0a6fe0; --blue-bright:#0a5fc0; --blue-glow:rgba(10,111,224,.4);
  --bg-0:#eef1f8; --bg-1:#f4f6fb; --bg-2:#ffffff;
  --ink:#11131c; --ink-2:rgba(17,19,28,.66); --ink-3:rgba(17,19,28,.46); --ink-4:rgba(17,19,28,.3);
  --hair:rgba(17,19,28,.10); --hair-2:rgba(17,19,28,.16);
  --glass-bg:linear-gradient(135deg,rgba(255,255,255,.86),rgba(255,255,255,.62) 46%,rgba(255,255,255,.78));
  --glass-bd:rgba(255,255,255,.9);
  --glass-spec:rgba(255,255,255,.9);
  --glass-rim:rgba(255,255,255,1);
  --glass-sh:0 24px 64px -26px rgba(20,40,90,.28),0 2px 10px -4px rgba(20,40,90,.12);
  --tint:rgba(10,111,224,.04);
  --ok:#15a35a; --warn:#bd7d06; --cut:#737888; --danger:#e23b48;
}

.lg-root *{box-sizing:border-box}
html{scroll-behavior:smooth}
.lg-root{
  /* 与 next/font 的 --font-news / --font-mono-jb 同层声明,确保 var() 在此正确求值。 */
  --news:var(--font-news),"Newsreader",Georgia,serif;
  --mono:var(--font-mono-jb),"JetBrains Mono","SF Mono",ui-monospace,monospace;
  position:relative;overflow-x:hidden;
  background:var(--bg-0);color:var(--ink);font-family:var(--sans);
  font-size:16px;line-height:1.6;letter-spacing:-.01em;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
  min-height:100vh;
}
.lg-root .mono{font-family:var(--mono);font-variant-numeric:tabular-nums;letter-spacing:0}
.lg-root .serif{font-family:var(--serif)}
.lg-root .news-i{font-family:var(--news);font-style:italic}
.lg-root img,.lg-root svg{display:block}
.lg-root ::selection{background:rgba(47,143,255,.28);color:#fff}

.atmos{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;background:
  radial-gradient(140% 100% at 50% -20%, var(--bg-2), var(--bg-1) 42%, var(--bg-0) 100%)}
.atmos .au{position:absolute;border-radius:50%;filter:blur(80px);opacity:.5;mix-blend-mode:screen;will-change:transform}
[data-theme="light"] .atmos .au{opacity:.4;mix-blend-mode:multiply}
.atmos .a1{width:60vw;height:60vw;left:-10vw;top:-18vw;background:radial-gradient(circle,var(--blue),transparent 62%);animation:drift1 26s var(--ease) infinite alternate}
.atmos .a2{width:48vw;height:48vw;right:-12vw;top:6vw;background:radial-gradient(circle,var(--au-violet),transparent 62%);opacity:.34;animation:drift2 32s var(--ease) infinite alternate}
.atmos .a3{width:52vw;height:52vw;left:18vw;bottom:-22vw;background:radial-gradient(circle,var(--au-cyan),transparent 62%);opacity:.28;animation:drift3 30s var(--ease) infinite alternate}
@keyframes drift1{0%{transform:translate(0,0) scale(1)}100%{transform:translate(14vw,8vw) scale(1.18)}}
@keyframes drift2{0%{transform:translate(0,0) scale(1)}100%{transform:translate(-12vw,10vw) scale(1.22)}}
@keyframes drift3{0%{transform:translate(0,0) scale(1.1)}100%{transform:translate(10vw,-8vw) scale(.9)}}
.atmos .grid{position:absolute;inset:0;opacity:.5;
  background-image:linear-gradient(var(--hair) 1px,transparent 1px),linear-gradient(90deg,var(--hair) 1px,transparent 1px);
  background-size:64px 64px;mask-image:radial-gradient(circle at 50% 30%,#000,transparent 78%)}
.atmos .grain{position:absolute;inset:0;opacity:.05;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.atmos .cursor{position:absolute;width:480px;height:480px;border-radius:50%;left:var(--mx,50%);top:var(--my,30%);
  transform:translate(-50%,-50%);background:radial-gradient(circle,var(--blue-glow),transparent 60%);
  opacity:.22;filter:blur(30px);transition:opacity .5s var(--ease);mix-blend-mode:screen}
[data-theme="light"] .atmos .cursor{mix-blend-mode:multiply;opacity:.12}

.lg{position:relative;border-radius:22px;background:var(--glass-bg);
  -webkit-backdrop-filter:blur(var(--glass-blur)) saturate(180%);backdrop-filter:blur(var(--glass-blur)) saturate(180%);
  border:1px solid var(--glass-bd);
  box-shadow:var(--glass-sh),inset 0 1px 0 var(--glass-rim),inset 0 -1px 1px rgba(255,255,255,.04);
  overflow:hidden;isolation:isolate}
.lg::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:0;
  background:radial-gradient(130% 90% at 0% 0%, var(--glass-spec), transparent 46%);mix-blend-mode:screen;opacity:.9}
.lg > *{position:relative;z-index:1}
.lg.sweep::after{content:"";position:absolute;top:-60%;left:-30%;width:42%;height:220%;z-index:0;pointer-events:none;
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.16),transparent);
  transform:translateX(-160%) rotate(8deg);animation:sweep 7s var(--ease) infinite}
[data-theme="light"] .lg.sweep::after{background:linear-gradient(100deg,transparent,rgba(255,255,255,.5),transparent)}
@keyframes sweep{0%,72%{transform:translateX(-160%) rotate(8deg)}88%,100%{transform:translateX(420%) rotate(8deg)}}

[data-rev]{opacity:0;transition:opacity 1s var(--ease-out),transform 1s var(--ease-out),filter 1s var(--ease-out);will-change:opacity,transform}
[data-rev="up"]{transform:translateY(34px)}
[data-rev="blur"]{filter:blur(14px);transform:translateY(18px)}
[data-rev="scale"]{transform:scale(.92)}
[data-rev="left"]{transform:translateX(-40px)}
[data-rev="right"]{transform:translateX(40px)}
[data-rev].in{opacity:1;transform:none;filter:none}
[data-rd="1"]{transition-delay:.09s}[data-rd="2"]{transition-delay:.18s}[data-rd="3"]{transition-delay:.27s}
[data-rd="4"]{transition-delay:.36s}[data-rd="5"]{transition-delay:.45s}[data-rd="6"]{transition-delay:.54s}

@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  [data-rev]{opacity:1!important;transform:none!important;filter:none!important;transition:none!important}
  .atmos .au,.lg.sweep::after,.float{animation:none!important}
  .lg-root *{animation-duration:.001ms!important;animation-iteration-count:1!important}
}

.float{animation:floaty 7s var(--ease) infinite alternate}
.float-2{animation:floaty 9s var(--ease) infinite alternate-reverse}
@keyframes floaty{0%{transform:translateY(0)}100%{transform:translateY(-12px)}}

.section{position:relative;z-index:1;padding:clamp(76px,9vw,132px) clamp(22px,5vw,60px)}
.wrap{max-width:var(--maxw);margin:0 auto}
.kicker{font-family:var(--mono);font-size:11.5px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;
  color:var(--blue-bright);display:inline-flex;align-items:center;gap:10px;white-space:nowrap}
.kicker .dot{width:6px;height:6px;border-radius:50%;background:var(--blue);box-shadow:0 0 12px var(--blue-glow)}
.h-serif{font-family:var(--serif);font-weight:600;letter-spacing:-.01em;color:var(--ink);text-wrap:balance}
.accent{color:var(--blue-bright)}

.btn{font-family:var(--sans);appearance:none;cursor:pointer;border:1px solid transparent;display:inline-flex;
  align-items:center;gap:9px;font-weight:600;letter-spacing:-.01em;border-radius:980px;padding:13px 24px;
  font-size:15.5px;transition:.24s var(--ease);white-space:nowrap;position:relative;overflow:hidden;text-decoration:none}
.btn svg{transition:transform .25s var(--ease)}
.btn-primary{background:linear-gradient(135deg,var(--blue),var(--blue-deep));color:#fff;
  box-shadow:0 10px 30px -10px var(--blue-glow),inset 0 1px 0 rgba(255,255,255,.4)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 18px 40px -10px var(--blue-glow),inset 0 1px 0 rgba(255,255,255,.4)}
.btn-primary:hover svg{transform:translateX(3px)}
.btn-glass{background:var(--glass-bg);-webkit-backdrop-filter:blur(20px) saturate(160%);backdrop-filter:blur(20px) saturate(160%);
  color:var(--ink);border-color:var(--glass-bd);box-shadow:inset 0 1px 0 var(--glass-rim)}
.btn-glass:hover{border-color:var(--blue);color:var(--ink);transform:translateY(-2px)}
.btn-lg{padding:15px 28px;font-size:16.5px}
.btn-sm{padding:9px 17px;font-size:14px}
`;

const HERO_CSS = `
.hero{position:relative;z-index:1;min-height:100vh;display:flex;align-items:center;
  padding:128px clamp(22px,5vw,60px) 88px}
.hero .inner{max-width:var(--maxw);margin:0 auto;width:100%;display:grid;
  grid-template-columns:1.12fr .88fr;gap:clamp(28px,4vw,52px);align-items:center}

.hero .pill{display:inline-flex;align-items:center;gap:9px;white-space:nowrap;font-family:var(--mono);
  font-size:11.5px;font-weight:600;letter-spacing:.14em;padding:8px 15px;border-radius:999px;
  background:var(--glass-bg);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);
  border:1px solid var(--glass-bd);color:var(--ink-2);box-shadow:inset 0 1px 0 var(--glass-rim);margin-bottom:28px}
.hero .pill .dot{width:6px;height:6px;border-radius:50%;background:var(--blue);box-shadow:0 0 0 0 var(--blue-glow);animation:hpulse 2.4s infinite}
@keyframes hpulse{0%{box-shadow:0 0 0 0 rgba(47,143,255,.5)}70%{box-shadow:0 0 0 8px rgba(47,143,255,0)}100%{box-shadow:0 0 0 0 rgba(47,143,255,0)}}
.hero h1{font-family:var(--serif);margin:0;font-weight:600;line-height:1.2;letter-spacing:-.01em;
  font-size:clamp(33px,4.2vw,52px);color:var(--ink);text-wrap:balance}
.hero h1 .accent{color:var(--blue-bright);position:relative}
.hero h1 .uline{position:relative;white-space:nowrap}
.hero h1 .uline svg{position:absolute;left:0;right:0;bottom:-.14em;width:100%;height:.22em;overflow:visible}
.hero h1 .uline path{stroke:var(--blue);stroke-width:3.5;fill:none;stroke-linecap:round;
  stroke-dasharray:240;stroke-dashoffset:240;transition:stroke-dashoffset 1.1s var(--ease-out) .5s}
.hero.lit h1 .uline path{stroke-dashoffset:0}
.hero .sub{margin:26px 0 0;max-width:27em;font-size:clamp(15.5px,1.2vw,18px);line-height:1.7;color:var(--ink-2);text-wrap:pretty}
.hero .sub b{color:var(--ink);font-weight:600}
.hero .cta{display:flex;flex-wrap:wrap;gap:14px;margin-top:36px}
.hero .meta{display:flex;align-items:center;gap:16px;margin-top:26px;font-size:13px;color:var(--ink-3);flex-wrap:wrap}
.hero .meta .mi{display:inline-flex;align-items:center;gap:7px}
.hero .meta .mi svg{color:var(--blue);opacity:.9}
.hero .meta .sep{width:1px;height:13px;background:var(--hair-2)}

.scene{position:relative;height:clamp(480px,52vw,620px);perspective:1700px}
.scene3d{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .5s var(--ease-out);will-change:transform}
.scene .card{position:absolute;border-radius:22px;transition:opacity .8s var(--ease-out),transform .9s var(--spring)}

.scene .dispatch{width:min(66%,366px);left:0;top:0;z-index:3;padding:0}
.hero.var-guardrail .scene .dispatch{width:min(54%,318px);top:0}
.cap-head{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid var(--hair)}
.cap-head .lab{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);display:flex;align-items:center;gap:8px;white-space:nowrap}
.cap-head .lab .live{width:6px;height:6px;border-radius:50%;background:var(--blue);box-shadow:0 0 8px var(--blue-glow);animation:hpulse 2s infinite}
.cap-head .tag{font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:var(--ink-3);border:1px solid var(--hair-2);border-radius:6px;padding:2px 7px}
.disp-body{padding:15px 16px;display:flex;flex-direction:column;gap:11px;min-height:96px}
.bub{max-width:90%;opacity:0;transform:translateY(8px);transition:.45s var(--ease-out)}
.bub.show{opacity:1;transform:none}
.bub.me{align-self:flex-end}
.bub.me .t{background:linear-gradient(135deg,var(--blue),var(--blue-deep));color:#fff;border-radius:15px 15px 5px 15px;padding:10px 14px;font-size:13.5px;line-height:1.55;min-height:1.2em}
.bub.me .cur{display:inline-block;width:2px;height:1em;background:#fff;margin-left:1px;vertical-align:-2px;animation:blink .9s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.bub.ai{align-self:flex-start;display:flex;gap:9px;align-items:flex-end}
.bub.ai .t{background:var(--tint);color:var(--ink);border:1px solid var(--hair);border-radius:15px 15px 15px 5px;padding:10px 14px;font-size:13.5px;line-height:1.55}
.typing{display:inline-flex;gap:4px;padding:12px 14px}
.typing i{width:6px;height:6px;border-radius:50%;background:var(--ink-3);animation:tdot 1.2s infinite}
.typing i:nth-child(2){animation-delay:.18s}.typing i:nth-child(3){animation-delay:.36s}
@keyframes tdot{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-4px);opacity:1}}
.acts3{display:flex;gap:7px;padding:0 16px 16px 50px}
.acts3 .a{flex:1;background:var(--tint);border:1px solid var(--hair);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:6px;
  opacity:0;transform:translateY(10px) scale(.96);transition:.5s var(--spring);cursor:pointer}
.acts3 .a.show{opacity:1;transform:none}
.acts3 .a:hover{border-color:var(--blue);transform:translateY(-3px)}
.acts3 .a .i{width:26px;height:26px;border-radius:8px;background:rgba(47,143,255,.18);color:var(--blue-bright);display:flex;align-items:center;justify-content:center}
.acts3 .a b{font-size:11.5px;font-weight:600;color:var(--ink)}
.acts3 .a span{font-size:9.5px;color:var(--ink-3)}

.scene .guard{width:min(58%,348px);right:0;bottom:0;z-index:4}
.hero.var-guardrail .scene .guard{width:min(64%,398px);right:0;top:12%;bottom:auto}
.guard .gh{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid var(--hair)}
.guard .gh .lab{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);white-space:nowrap}
.guard .flip{display:flex;align-items:center;gap:7px;font-family:var(--mono);font-weight:700}
.guard .flip .from{font-size:14px;color:var(--ink-3);text-decoration:line-through}
.guard .flip .ar{color:var(--ink-3);font-size:11px}
.guard .flip .to{font-size:19px;color:var(--danger);transition:color .3s}
.guard .flip .why{font-size:9.5px;font-weight:700;color:#fff;background:var(--danger);padding:2px 7px;border-radius:5px}
.guard .gbody{padding:13px 14px;display:flex;flex-direction:column;gap:8px}
.gl{display:grid;grid-template-columns:auto 1fr;gap:9px;padding:9px 11px;border-radius:11px;font-size:11.5px;line-height:1.5;align-items:start;
  opacity:0;transform:translateX(10px);transition:.5s var(--ease-out)}
.gl.show{opacity:1;transform:none}
.gl .bdg{font-size:8.5px;font-weight:700;letter-spacing:.02em;padding:3px 7px;border-radius:5px;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;margin-top:1px}
.gl.ok{background:var(--ok-dim)}.gl.ok .bdg{background:var(--ok);color:#04130a}.gl.ok .t{color:var(--ink-2)}
.gl.warn{background:var(--warn-dim)}.gl.warn .bdg{background:var(--warn);color:#1a1304}.gl.warn .t{color:var(--ink-2)}
.gl.cut{background:var(--cut-dim)}.gl.cut .bdg{background:var(--cut);color:#fff}.gl.cut .t{color:var(--ink-3)}
.gl .t b{color:var(--ink);font-weight:600}.gl .t s{opacity:.65}
.gl .bdg svg{width:11px;height:11px}
.guard .foot{display:flex;gap:8px;align-items:flex-start;padding:11px 14px;border-top:1px solid var(--hair);font-size:11px;line-height:1.5;color:var(--ink-2)}
.guard .foot svg{color:var(--blue);flex-shrink:0;margin-top:1px}.guard .foot b{color:var(--ink);font-weight:600}

.scene .rfloat{position:absolute;left:2%;bottom:3%;z-index:2;padding:10px 13px;display:flex;align-items:center;gap:10px;border-radius:16px}
.hero.var-guardrail .scene .rfloat{left:auto;right:4%;bottom:4%}
.scene .rfloat .rp{width:30px;height:38px;border-radius:5px;background:#f6f7f9;position:relative;flex-shrink:0;box-shadow:0 4px 12px rgba(0,0,0,.4)}
.scene .rfloat .rp::before{content:"";position:absolute;left:6px;top:6px;width:9px;height:9px;border-radius:2px;background:var(--blue)}
.scene .rfloat .rp::after{content:"";position:absolute;left:6px;top:19px;right:6px;height:2px;border-radius:1px;background:#c4c8d0;box-shadow:0 5px 0 #d7dae0,0 10px 0 #d7dae0}
.scene .rfloat .rt b{display:block;font-size:11px;font-weight:600;color:var(--ink)}
.scene .rfloat .rt span{font-size:9.5px;color:var(--blue-bright);font-family:var(--mono)}

.replay{position:absolute;left:50%;bottom:-10px;transform:translateX(-50%);z-index:6;display:inline-flex;align-items:center;gap:7px;
  font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.04em;color:var(--ink-3);
  background:var(--glass-bg);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid var(--glass-bd);
  border-radius:999px;padding:6px 14px;cursor:pointer;transition:.2s;box-shadow:inset 0 1px 0 var(--glass-rim)}
.replay:hover{color:var(--ink);border-color:var(--blue)}
.replay svg{transition:transform .5s var(--ease)}.replay.spin-rev svg{transform:rotate(-360deg)}

.scroll-cue{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);z-index:2;display:flex;flex-direction:column;
  align-items:center;gap:7px;color:var(--ink-3);font-family:var(--mono);font-size:9.5px;letter-spacing:.2em;text-transform:uppercase}
.scroll-cue .m{width:20px;height:31px;border-radius:11px;border:1.5px solid currentColor;position:relative}
.scroll-cue .m::after{content:"";position:absolute;left:50%;top:6px;width:2.5px;height:6px;border-radius:2px;background:currentColor;transform:translateX(-50%);animation:sdot 1.8s infinite}
@keyframes sdot{0%{opacity:0;transform:translate(-50%,0)}40%{opacity:1}80%{opacity:0;transform:translate(-50%,8px)}}

@media (max-width:920px){
  .hero{min-height:auto;padding-top:108px}
  .hero .inner{grid-template-columns:1fr;gap:52px}
  .scene{height:460px}.scroll-cue{display:none}
}
`;

const STORY_CSS = `
.night{position:relative;overflow:hidden}
.night .inner{display:grid;grid-template-columns:1.04fr .96fr;gap:clamp(34px,5vw,72px);align-items:center}
.night .big{font-family:var(--serif);font-weight:600;font-size:clamp(28px,4vw,52px);line-height:1.22;letter-spacing:-.015em;color:var(--ink);margin:22px 0 0;text-wrap:balance}
.night .big .sm{color:var(--ink-3);font-size:.62em;font-weight:400}
.night .voices{display:flex;flex-direction:column;gap:16px;margin:30px 0 34px}
.night .v{display:flex;gap:13px;align-items:flex-start;font-size:clamp(15px,1.4vw,17.5px);line-height:1.6;color:var(--ink-2);text-wrap:pretty}
.night .v .q{font-family:var(--news);font-style:italic;color:var(--blue-bright);font-size:1.5em;line-height:.8;flex-shrink:0}
.night .v b{color:var(--ink);font-weight:600}
.night .turn{font-family:var(--serif);font-weight:600;font-size:clamp(21px,2.7vw,33px);line-height:1.32;letter-spacing:-.012em;color:var(--ink);max-width:20em;text-wrap:balance;padding-left:18px;border-left:2px solid var(--blue)}
.night .turn .accent{color:var(--blue-bright)}
.night .turn .sub{display:block;font-family:var(--sans);font-size:.5em;font-weight:400;color:var(--ink-3);margin-top:12px;line-height:1.5}

.lamp{position:relative;height:clamp(330px,36vw,440px);display:flex;align-items:center;justify-content:center}
.lamp .halo{position:absolute;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(47,143,255,.3),transparent 60%);filter:blur(40px)}
.lamp .doc{position:absolute;width:200px;border-radius:14px;box-shadow:0 40px 80px -30px rgba(0,0,0,.8)}
.lamp .d3{transform:rotate(-10deg) translate(-72px,26px) scale(.86);opacity:.4}
.lamp .d2{transform:rotate(7deg) translate(64px,12px) scale(.92);opacity:.62}
.lamp .d1{transform:rotate(-2deg);z-index:2}
.lamp .ver{position:absolute;top:-12px;left:16px;font-family:var(--mono);font-size:10px;font-weight:600;color:var(--blue-bright);
  background:var(--glass-bg);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid var(--glass-bd);border-radius:7px;padding:3px 9px;z-index:3}
.lamp .qm{position:absolute;right:14%;top:6%;font-family:var(--news);font-style:italic;font-size:46px;color:var(--blue);opacity:.45}

.rchip{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10.5px;font-weight:600;color:var(--ink-2);
  background:var(--tint);border:1px solid var(--hair);border-radius:999px;padding:5px 12px 5px 6px}
.rchip .pg{width:15px;height:19px;border-radius:3px;background:#f6f7f9;position:relative;flex-shrink:0;box-shadow:0 2px 5px rgba(0,0,0,.4)}
.rchip .pg::before{content:"";position:absolute;left:3px;top:3px;width:5px;height:5px;border-radius:2px;background:var(--blue)}
.rchip .pg::after{content:"";position:absolute;left:3px;top:10px;right:3px;height:1.5px;border-radius:1px;background:#c4c8d0;box-shadow:0 3px 0 #d7dae0}
.rchip b{color:var(--ink);font-weight:700}.rchip .st{color:var(--blue-bright)}

.acts{position:relative}
.acts .wrap{position:relative}
.act{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:clamp(36px,5vw,80px);align-items:center;padding:clamp(54px,6.5vw,94px) 0}
.act.flip .act-copy{order:2}
.chap{font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.14em;color:var(--blue-bright);text-transform:uppercase;display:flex;align-items:center;gap:10px;margin-bottom:18px;white-space:nowrap}
.chap .n{font-family:var(--serif);font-size:30px;font-weight:700;color:var(--ink-4);letter-spacing:0;line-height:1}
.act h2{font-family:var(--serif);margin:0;font-weight:600;font-size:clamp(27px,3.5vw,42px);line-height:1.22;letter-spacing:-.012em;color:var(--ink);text-wrap:balance}
.act h2 .accent{color:var(--blue-bright)}
.act .get{margin:18px 0 0;display:inline-flex;align-items:center;gap:9px;font-size:12.5px;font-weight:600;color:var(--blue-bright);
  background:var(--tint);border:1px solid var(--hair);border-radius:999px;padding:6px 14px}
.act .get svg{width:15px;height:15px}
.act .lead{margin:22px 0 0;font-size:clamp(15px,1.2vw,17.5px);line-height:1.7;color:var(--ink-2);max-width:30em;text-wrap:pretty}
.act .lead b{color:var(--ink);font-weight:600}
.act .pt{margin:20px 0 0;display:grid;grid-template-columns:auto 1fr;gap:11px;font-size:14px;color:var(--ink-2);line-height:1.55;align-items:start}
.act .pt .pi{color:var(--blue-bright);flex-shrink:0;margin-top:2px}.act .pt b{color:var(--ink);font-weight:600}
.act .pt .pi svg{width:16px;height:16px}

.viz{padding:20px}
.vh{display:flex;align-items:center;justify-content:space-between;margin-bottom:15px;gap:10px}
.vh .vt{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}

.said{background:var(--tint);border:1px solid var(--hair);border-radius:14px;padding:15px 16px;font-size:15px;line-height:1.7;color:var(--ink)}
.said .ent{position:relative;font-weight:700;color:var(--blue-bright);background:rgba(47,143,255,.16);border-radius:5px;padding:1px 5px;white-space:nowrap}
.said .ent .tg{position:absolute;top:-15px;left:0;font-family:var(--mono);font-size:8px;letter-spacing:.06em;color:var(--blue);font-weight:600;white-space:nowrap}
.flow{display:flex;align-items:center;gap:9px;color:var(--ink-3);margin:15px 0 12px}
.flow .ln{height:1px;flex:1;background:var(--hair)}
.flow .bd{font-family:var(--mono);font-size:10px;font-weight:600;color:var(--blue-bright);border:1px solid var(--hair);background:var(--tint);border-radius:999px;padding:4px 11px}
.ac3{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.ac3 .c{background:var(--tint);border:1px solid var(--hair);border-radius:13px;padding:13px;display:flex;flex-direction:column;gap:8px;transition:.2s var(--ease)}
.ac3 .c:hover{border-color:var(--blue);transform:translateY(-3px)}
.ac3 .c .i{width:30px;height:30px;border-radius:9px;background:rgba(47,143,255,.16);color:var(--blue-bright);display:flex;align-items:center;justify-content:center}
.ac3 .c b{font-size:12.5px;font-weight:600;color:var(--ink)}.ac3 .c span{font-size:10.5px;color:var(--ink-3)}

.rails{display:flex;flex-direction:column;gap:10px}
.rail{border:1px solid var(--hair);border-radius:14px;padding:14px 15px;background:var(--tint);display:grid;grid-template-columns:auto 1fr auto;gap:13px;align-items:center}
.rail .ri{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rail.r1 .ri{background:var(--danger-dim);color:var(--danger)}.rail.r2 .ri{background:var(--warn-dim);color:var(--warn)}.rail.r3 .ri{background:var(--ok-dim);color:var(--ok)}
.rail .rt b{display:block;font-size:14px;font-weight:600;color:var(--ink);letter-spacing:-.01em}
.rail .rt span{font-size:12px;color:var(--ink-3);line-height:1.45;display:block;margin-top:2px}
.rail .rt .ex{font-family:var(--mono);font-size:10.5px;margin-top:7px;padding:5px 9px;border-radius:7px;background:rgba(0,0,0,.22);color:var(--ink-2);display:inline-flex;align-items:center;gap:7px}
[data-theme="light"] .rail .rt .ex{background:rgba(17,19,28,.05)}
.rail .rt .ex .bad{color:var(--danger);text-decoration:line-through}.rail .rt .ex .arr{color:var(--ink-3)}.rail .rt .ex .good{color:var(--ok);font-weight:600}
.rail .vd{font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.03em;padding:5px 9px;border-radius:7px;white-space:nowrap;flex-shrink:0}
.rail.r1 .vd{background:var(--danger-dim);color:var(--danger)}.rail.r2 .vd{background:var(--warn-dim);color:var(--warn)}.rail.r3 .vd{background:var(--ok-dim);color:var(--ok)}

.journey{display:flex;flex-direction:column}
.js{display:grid;grid-template-columns:auto 1fr;gap:15px}
.js .jr{display:flex;flex-direction:column;align-items:center}
.js .jd{width:32px;height:32px;border-radius:10px;background:var(--tint);border:1px solid var(--hair);display:flex;align-items:center;justify-content:center;color:var(--ink-3);flex-shrink:0;transition:.3s}
.js.on .jd{background:var(--blue);border-color:var(--blue);color:#fff;box-shadow:0 0 0 5px rgba(47,143,255,.18),0 0 18px var(--blue-glow)}
.js .jl{width:1.5px;flex:1;background:var(--hair);min-height:18px}.js:last-child .jl{display:none}
.js .jb{padding-bottom:18px}.js .jb b{font-size:15px;font-weight:600;color:var(--ink)}
.js .jb .now{font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.05em;color:var(--blue-bright);background:rgba(47,143,255,.16);border-radius:5px;padding:2px 6px;margin-left:8px}
.js .jb p{margin:4px 0 0;font-size:12.5px;color:var(--ink-3);line-height:1.5}

.compare{position:relative}
.compare .head{text-align:center;max-width:760px;margin:0 auto 46px}
.compare .head h2{font-family:var(--serif);margin:14px 0 0;font-weight:600;font-size:clamp(27px,3.6vw,46px);line-height:1.2;letter-spacing:-.012em;color:var(--ink);text-wrap:balance}
.compare .head h2 .accent{color:var(--blue-bright)}
.compare .head .kicker{justify-content:center}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:880px;margin:0 auto}
.vcard{border-radius:22px;padding:28px 30px}
.vcard .vk{font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:18px;display:flex;align-items:center;gap:9px}
.vcard.them .vk{color:var(--ink-3)}
.vcard.us{background:linear-gradient(150deg,rgba(47,143,255,.22),rgba(47,143,255,.06));border:1px solid rgba(47,143,255,.34);box-shadow:0 30px 70px -38px rgba(10,50,120,.7),0 0 70px -34px var(--blue-glow)}
.vcard.us .vk{color:var(--blue-bright)}
.vcard.us .vk .bd{font-size:9px;letter-spacing:.04em;padding:2px 7px;border-radius:5px;background:rgba(47,143,255,.3);color:#dcecff}
.vr{display:grid;grid-template-columns:auto 1fr;gap:12px;padding:14px 0;font-size:15px;line-height:1.45;align-items:start}
.vcard.them .vr{color:var(--ink-2);border-top:1px solid var(--hair)}
.vcard.us .vr{color:var(--ink);border-top:1px solid rgba(255,255,255,.12)}
.vr:first-of-type{border-top:0!important}.vr .vi{flex-shrink:0;margin-top:2px}
.vcard.them .vr .vi{color:var(--ink-3)}.vcard.us .vr .vi{color:var(--blue-bright)}.vcard.us .vr b{color:var(--ink);font-weight:700}

@media (max-width:840px){
  .night .inner{grid-template-columns:1fr;gap:40px}
  .act,.act.flip .act-copy{grid-template-columns:1fr;order:0}.act .act-viz{order:2}
  .cols{grid-template-columns:1fr}
}
`;

const TAIL_CSS = `
.l-nav{position:fixed;top:0;left:0;right:0;z-index:50;transition:background .35s var(--ease),border-color .35s}
.l-nav .nv-in{max-width:var(--maxw);margin:0 auto;padding:15px clamp(22px,5vw,60px);display:flex;align-items:center;gap:24px}
.l-nav .nv-logo{display:flex;align-items:center;gap:10px;font-family:var(--serif);font-weight:700;font-size:19px;letter-spacing:-.01em;color:var(--ink);text-decoration:none}
.l-nav .nv-logo .mk{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,var(--blue),var(--blue-deep));color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;box-shadow:0 6px 16px -5px var(--blue-glow),inset 0 1px 0 rgba(255,255,255,.4)}
.l-nav .nv-links{display:flex;gap:28px;margin-left:18px}
.l-nav .nv-links a{font-size:14.5px;font-weight:500;color:var(--ink-2);text-decoration:none;transition:color .2s;white-space:nowrap}
.l-nav .nv-links a:hover{color:var(--ink)}
.l-nav .nv-r{margin-left:auto;display:flex;align-items:center;gap:16px}
.l-nav .nv-login{font-size:14px;font-weight:500;color:var(--ink-2);text-decoration:none;transition:color .2s}
.l-nav .nv-login:hover{color:var(--ink)}
.l-nav.solid{background:var(--glass-bg);-webkit-backdrop-filter:blur(24px) saturate(170%);backdrop-filter:blur(24px) saturate(170%);border-bottom:1px solid var(--glass-bd)}
.nv-theme{appearance:none;width:36px;height:36px;border-radius:50%;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;
  background:var(--glass-bg);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid var(--glass-bd);color:var(--ink-2);
  transition:.2s var(--ease);box-shadow:inset 0 1px 0 var(--glass-rim);flex-shrink:0}
.nv-theme:hover{color:var(--ink);border-color:var(--blue);transform:translateY(-1px)}
.nv-theme svg{transition:transform .5s var(--ease)}.nv-theme:hover svg{transform:rotate(40deg)}
.nv-prog{position:absolute;left:0;bottom:0;height:2px;width:100%;background:linear-gradient(90deg,var(--blue),var(--au-cyan));transform-origin:left;transform:scaleX(0);box-shadow:0 0 10px var(--blue-glow)}

.caps-head{margin-bottom:40px}
.caps-head h2{margin:14px 0 0;font-size:clamp(27px,3.5vw,44px);line-height:1.2}
.caps-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.cap{padding:22px;display:flex;flex-direction:column;gap:11px;transition:transform .25s var(--spring),border-color .25s}
.cap:hover{transform:translateY(-5px);border-color:rgba(47,143,255,.4)}
.cap .cap-ic{width:42px;height:42px;border-radius:12px;background:var(--tint);border:1px solid var(--hair);display:flex;align-items:center;justify-content:center;color:var(--ink-2);transition:.25s}
.cap:hover .cap-ic{background:rgba(47,143,255,.2);border-color:transparent;color:var(--blue-bright);transform:scale(1.08)}
.cap h4{margin:0;font-family:var(--serif);font-size:17px;font-weight:600;color:var(--ink)}
.cap p{margin:0;font-size:12.5px;color:var(--ink-3);line-height:1.55}

.proof-grid{display:grid;grid-template-columns:.82fr 1.18fr;gap:clamp(32px,5vw,72px);align-items:start}
.proof-l h2{margin:16px 0 0;font-size:clamp(27px,3.5vw,42px);line-height:1.2}
.proof-l h2 .accent{color:var(--blue-bright)}
.proof-r p{margin:0 0 18px;font-size:clamp(15px,1.2vw,17.5px);line-height:1.72;color:var(--ink-2);text-wrap:pretty}
.proof-r p b{color:var(--ink);font-weight:600}
.proof-note{display:grid;grid-template-columns:auto 1fr;gap:13px;align-items:start;margin-top:26px;padding:18px 20px;font-size:13.5px;line-height:1.65;color:var(--ink-3)}
.proof-note svg{color:var(--blue-bright);margin-top:2px}.proof-note b{color:var(--ink);font-weight:600}

.faq-head{margin-bottom:32px}
.faq-head h2{margin:14px 0 0;font-size:clamp(27px,3.5vw,44px);line-height:1.2}
.faq-list{max-width:840px;display:flex;flex-direction:column;gap:11px}
.faq-item{padding:4px 22px;cursor:pointer;transition:border-color .25s}
.faq-item:hover{border-color:rgba(47,143,255,.34)}
.faq-q{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:19px 0;font-family:var(--serif);font-size:clamp(16px,1.4vw,19px);font-weight:600;color:var(--ink);line-height:1.4}
.faq-ic{flex-shrink:0;color:var(--ink-3);transition:transform .35s var(--ease),color .2s}
.faq-item.open .faq-ic{transform:rotate(180deg);color:var(--blue-bright)}
.faq-a-wrap{display:grid;grid-template-rows:0fr;transition:grid-template-rows .4s var(--ease)}
.faq-item.open .faq-a-wrap{grid-template-rows:1fr}
.faq-a{overflow:hidden;font-size:15px;line-height:1.7;color:var(--ink-2)}
.faq-a > *{padding-bottom:22px;max-width:62ch}.faq-a b{color:var(--ink);font-weight:600}

.closing{position:relative;text-align:center;overflow:hidden}
.closing .wrap{max-width:880px}
.closing h2{font-size:clamp(34px,5vw,62px);line-height:1.12}
.closing h2 .accent{color:var(--blue-bright)}
.cl-drop{max-width:330px;margin:38px auto 0;padding:24px;border:1.5px dashed var(--hair-2);display:flex;flex-direction:column;align-items:center;gap:14px;transition:.25s var(--ease);border-radius:22px}
.cl-drop:hover{border-color:var(--blue)}
.cl-drop .dl{font-size:13px;color:var(--ink-3)}.cl-drop .dl b{color:var(--ink);font-weight:600}
.cl-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:30px}
.cl-bd{display:inline-flex;align-items:flex-start;gap:10px;margin-top:32px;font-size:13.5px;color:var(--ink-3);line-height:1.6;text-align:left;max-width:46ch}
.cl-bd svg{color:var(--ink-3);flex-shrink:0;margin-top:2px}.cl-bd b{color:var(--ink-2);font-weight:600}
.l-foot{margin-top:clamp(70px,9vw,118px);border-top:1px solid var(--hair)}
.l-foot .ft-in{max-width:var(--maxw);margin:0 auto;padding:26px clamp(22px,5vw,60px);display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap}
.l-foot .ft-logo{display:flex;align-items:center;gap:9px;font-family:var(--serif);font-weight:700;font-size:16px;color:var(--ink)}
.l-foot .ft-logo .mk{width:24px;height:24px;border-radius:7px;background:linear-gradient(135deg,var(--blue),var(--blue-deep));color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}
.l-foot .ft-meta{font-family:var(--mono);font-size:11.5px;color:var(--ink-3)}

@media (max-width:840px){
  .caps-grid{grid-template-columns:repeat(2,1fr)}
  .proof-grid{grid-template-columns:1fr}
  .l-nav .nv-links{display:none}
}
@media (max-width:560px){.caps-grid{grid-template-columns:1fr}}
`;

// CJK 字体:@import + display=swap。放在拼接 CSS 最前(@import 必须先于其它规则)。
// 用 @import 而非 <link> 是为了把字体加载限定在本路由的 <style> 内、且不触发 next 的
// no-page-custom-font(只针对 <link> 元素);display=swap + --serif/--sans 系统回退链
// 保证墙内 CDN 拿不到时优雅降级、绝不阻塞首屏。
const CJK_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700;900&family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap');\n";

export const LANDING_CSS = CJK_IMPORT + TOKENS_CSS + HERO_CSS + STORY_CSS + TAIL_CSS;
