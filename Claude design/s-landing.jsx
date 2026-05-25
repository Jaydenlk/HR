// Landing — Apple-disciplined, single brand color, generous whitespace.

const LANDING_CSS = `
.coach.landing{overflow:hidden}

.coach.landing .nav{
  display:flex;align-items:center;justify-content:space-between;
  padding:18px 56px;background:rgba(251,251,253,.85);
  backdrop-filter:blur(20px) saturate(180%);
  position:sticky;top:0;z-index:5;border-bottom:1px solid rgba(0,0,0,.04);
}
.coach.landing .logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:16px;letter-spacing:-.01em}
.coach.landing .logo-mark{
  width:30px;height:30px;border-radius:10px;background:var(--ink);color:#fff;
  display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;letter-spacing:-.02em;
}
.coach.landing .nav-links{display:flex;gap:32px;font-size:13.5px;color:var(--ink-2);font-weight:500}
.coach.landing .nav-r{display:flex;align-items:center;gap:14px;font-size:13.5px;color:var(--ink-2);font-weight:500}

/* hero */
.coach.landing .hero{padding:72px 56px 56px;display:grid;grid-template-columns:1.2fr 1fr;gap:48px;align-items:center}
.coach.landing .hero .tag{
  display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;
  background:var(--surface);border:1px solid var(--line);
  font-size:12.5px;font-weight:600;color:var(--ink-2);margin-bottom:24px;
}
.coach.landing .hero .tag .dot{width:6px;height:6px;border-radius:50%;background:var(--success)}
.coach.landing .hero h1{
  margin:0;font-size:80px;line-height:1;letter-spacing:-.04em;font-weight:800;color:var(--ink);
}
.coach.landing .hero h1 .accent{color:var(--brand)}
.coach.landing .hero .sub{
  margin-top:24px;font-size:18px;color:var(--ink-2);max-width:36ch;line-height:1.55;font-weight:500;
}
.coach.landing .hero .ctas{display:flex;gap:10px;margin-top:36px}
.coach.landing .hero .meta-line{margin-top:24px;font-size:12.5px;color:var(--ink-3);font-weight:500;display:flex;gap:18px;align-items:center}
.coach.landing .hero .meta-line .b{display:inline-flex;align-items:center;gap:5px}
.coach.landing .hero .meta-line .b svg{color:var(--ink-3)}

/* hero card — the ONE colored hero on this page */
.coach.landing .hero-card{
  background:var(--ink);color:#fff;border-radius:28px;
  padding:32px;aspect-ratio:1/1.05;position:relative;overflow:hidden;
  display:flex;flex-direction:column;justify-content:space-between;
}
.coach.landing .hero-card .ambient{
  position:absolute;inset:0;
  background:radial-gradient(800px 400px at 80% -20%,rgba(10,132,255,.32),transparent 60%),
             radial-gradient(600px 400px at -10% 110%,rgba(10,132,255,.18),transparent 60%);
  pointer-events:none;
}
.coach.landing .hero-card > *{position:relative;z-index:2}
.coach.landing .hero-card .topline{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.5)}
.coach.landing .hero-card .convo{display:flex;flex-direction:column;gap:14px;margin-top:auto;margin-bottom:24px}
.coach.landing .hero-card .bub{display:flex;gap:10px;align-items:flex-end}
.coach.landing .hero-card .bub.ai .text{background:rgba(255,255,255,.1);color:#fff;border-radius:16px 16px 16px 4px;padding:10px 14px;font-size:13.5px;line-height:1.5;max-width:80%;font-weight:500;backdrop-filter:blur(8px)}
.coach.landing .hero-card .bub.me{flex-direction:row-reverse}
.coach.landing .hero-card .bub.me .text{background:var(--brand);color:#fff;border-radius:16px 16px 4px 16px;padding:10px 14px;font-size:13.5px;line-height:1.5;max-width:80%;font-weight:500}
.coach.landing .hero-card .signature{font-size:11.5px;color:rgba(255,255,255,.45);font-weight:500;letter-spacing:.04em}

/* stat strip */
.coach.landing .strip{padding:0 56px 32px;display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid var(--line)}
.coach.landing .strip .stat{padding:24px 4px 0;border-right:1px solid var(--line)}
.coach.landing .strip .stat:first-child{padding-left:0}
.coach.landing .strip .stat:last-child{border-right:0}
.coach.landing .strip .v{font-size:34px;font-weight:700;letter-spacing:-.025em;line-height:1;color:var(--ink)}
.coach.landing .strip .v .acc{font-size:13px;font-weight:600;margin-left:6px;color:var(--success)}
.coach.landing .strip .l{font-size:12px;color:var(--ink-3);margin-top:6px;font-weight:500}

/* "Four layers" pillars */
.coach.landing .pillars{padding:64px 56px 24px}
.coach.landing .ph-hd{margin-bottom:32px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
.coach.landing .ph-hd h2{margin:0;font-size:48px;font-weight:800;letter-spacing:-.035em;line-height:1.05;max-width:18ch}
.coach.landing .ph-hd .lead{font-size:15px;color:var(--ink-2);max-width:36ch;line-height:1.55;font-weight:500}

.coach.landing .pillar-grid{display:grid;grid-template-columns:1.3fr 1fr 1fr;grid-template-rows:auto auto;grid-template-areas:"a b c" "a d e";gap:14px}
.coach.landing .pil{border-radius:20px;padding:24px;display:flex;flex-direction:column;gap:14px;min-height:240px;border:1px solid var(--line);background:var(--surface)}
.coach.landing .pil.a{grid-area:a;background:var(--ink);color:#fff;border-color:var(--ink);min-height:494px;position:relative;overflow:hidden}
.coach.landing .pil.a::before{content:"";position:absolute;inset:0;background:radial-gradient(500px 300px at 80% 20%,rgba(10,132,255,.16),transparent 60%);pointer-events:none}
.coach.landing .pil.a > *{position:relative;z-index:2}
.coach.landing .pil.b{grid-area:b}
.coach.landing .pil.c{grid-area:c}
.coach.landing .pil.d{grid-area:d}
.coach.landing .pil.e{grid-area:e}

.coach.landing .pil .tag{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);display:inline-flex;align-items:center;gap:6px}
.coach.landing .pil.a .tag{color:rgba(255,255,255,.55)}
.coach.landing .pil h3{margin:0;font-size:28px;font-weight:700;letter-spacing:-.025em;line-height:1.05;color:var(--ink)}
.coach.landing .pil.a h3{color:#fff;font-size:40px;letter-spacing:-.03em;font-weight:800}
.coach.landing .pil .desc{font-size:13.5px;color:var(--ink-3);line-height:1.5;font-weight:500;max-width:36ch}
.coach.landing .pil.a .desc{color:rgba(255,255,255,.7)}

/* today pillar (large): live preview */
.coach.landing .today-preview{margin-top:auto;display:flex;flex-direction:column;gap:6px}
.coach.landing .today-preview .row{display:flex;align-items:center;gap:10px;padding:11px 14px;background:rgba(255,255,255,.06);border-radius:12px;font-size:13.5px;color:rgba(255,255,255,.92);font-weight:500;backdrop-filter:blur(8px)}
.coach.landing .today-preview .row.done{background:rgba(52,199,89,.16);color:rgba(255,255,255,.7)}
.coach.landing .today-preview .chk{width:18px;height:18px;border-radius:50%;border:1.5px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.coach.landing .today-preview .row.done .chk{background:var(--success);border-color:var(--success);color:#fff}
.coach.landing .today-preview .row .dur{margin-left:auto;font-family:var(--font-mono);font-size:11px;opacity:.7;font-weight:500}

/* monthly preview */
.coach.landing .mthly-prev{margin-top:auto;display:flex;flex-direction:column;gap:8px}
.coach.landing .mthly-prev .row{display:flex;flex-direction:column;gap:3px;padding:11px 0;border-top:1px solid var(--line)}
.coach.landing .mthly-prev .row:first-child{border-top:0;padding-top:0}
.coach.landing .mthly-prev .meta{font-size:10.5px;font-weight:600;color:var(--ink-3);letter-spacing:.02em}
.coach.landing .mthly-prev .meta b{color:var(--danger)}
.coach.landing .mthly-prev .ttl{font-size:13px;color:var(--ink);font-weight:600;line-height:1.35}

/* interview pillar */
.coach.landing .iv-prev{margin-top:auto;display:flex;align-items:center;gap:14px}
.coach.landing .iv-prev .gr{width:60px;height:60px;border-radius:14px;background:var(--surface-2);color:var(--ink);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;letter-spacing:-.03em;border:1px solid var(--line)}
.coach.landing .iv-prev .info b{display:block;font-size:13.5px;font-weight:600;color:var(--ink)}
.coach.landing .iv-prev .info span{font-size:11.5px;color:var(--ink-3);font-weight:500}
.coach.landing .iv-prev .bars{margin-top:7px;display:flex;flex-direction:column;gap:3px;width:80px}
.coach.landing .iv-prev .bars i{height:4px;background:var(--surface-3);border-radius:2px;display:block;position:relative;overflow:hidden}
.coach.landing .iv-prev .bars i::after{content:"";position:absolute;left:0;top:0;height:100%;background:var(--ink);border-radius:2px}
.coach.landing .iv-prev .bars i:nth-child(1)::after{width:86%}
.coach.landing .iv-prev .bars i:nth-child(2)::after{width:78%;background:var(--success)}
.coach.landing .iv-prev .bars i:nth-child(3)::after{width:42%;background:var(--danger)}

/* overview pillar */
.coach.landing .ov-prev{margin-top:auto;display:flex;align-items:center;gap:16px}
.coach.landing .ov-prev .ring-blk{position:relative;width:64px;height:64px;flex-shrink:0}
.coach.landing .ov-prev .ring-blk .v{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;letter-spacing:-.02em;color:var(--ink)}
.coach.landing .ov-prev .info b{display:block;font-size:13.5px;font-weight:600;color:var(--ink)}
.coach.landing .ov-prev .info span{font-size:11.5px;color:var(--ink-3);font-weight:500}
.coach.landing .ov-prev .info .delta{font-family:var(--font-mono);font-size:11px;color:var(--success);font-weight:600;margin-top:3px;display:block}

/* features grid */
.coach.landing .feat{padding:0 56px 24px;margin-top:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.coach.landing .feat .tile{
  background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px 22px;display:flex;flex-direction:column;gap:8px;
}
.coach.landing .feat .tile .ic{width:34px;height:34px;border-radius:10px;background:var(--surface-2);display:flex;align-items:center;justify-content:center;color:var(--ink-2);border:1px solid var(--line)}
.coach.landing .feat .tile h4{margin:0;font-size:15.5px;font-weight:600;letter-spacing:-.005em}
.coach.landing .feat .tile p{margin:0;font-size:12.5px;color:var(--ink-3);line-height:1.5;font-weight:500}
.coach.landing .feat .tile .slash{margin-top:auto;padding-top:6px;font-family:var(--font-mono);font-size:10.5px;color:var(--ink-4);font-weight:500;letter-spacing:.02em}

/* proof */
.coach.landing .proof{margin:48px 56px 0;padding:48px 0;border-top:1px solid var(--line)}
.coach.landing .proof .hd{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:28px}
.coach.landing .proof h3{margin:0;font-size:36px;font-weight:800;letter-spacing:-.03em;line-height:1.1;max-width:22ch}
.coach.landing .proof .meta{font-size:13px;color:var(--ink-3);font-weight:500;max-width:30ch;text-align:right}
.coach.landing .proof-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.coach.landing .quote-card{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:28px 30px;display:flex;flex-direction:column;gap:22px}
.coach.landing .quote-card .q{font-size:18px;line-height:1.45;color:var(--ink);font-weight:500;letter-spacing:-.005em}
.coach.landing .quote-card .a{display:flex;align-items:center;gap:12px}
.coach.landing .quote-card .av{width:40px;height:40px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--ink);font-size:14px}
.coach.landing .quote-card .name{font-size:13.5px;font-weight:600;letter-spacing:-.003em}
.coach.landing .quote-card .name-meta{font-size:11.5px;color:var(--ink-3);font-weight:500;margin-top:1px}

/* footer */
.coach.landing .foot{padding:64px 56px 80px;text-align:center}
.coach.landing .foot h2{margin:0;font-size:64px;font-weight:800;letter-spacing:-.04em;line-height:1.05}
.coach.landing .foot h2 .acc{color:var(--brand)}
.coach.landing .foot p{margin:18px 0 28px;font-size:17px;color:var(--ink-3);font-weight:500}
.coach.landing .foot .ctas{display:flex;gap:10px;justify-content:center}
.coach.landing .foot-info{margin-top:36px;font-size:12px;color:var(--ink-4);font-weight:500;display:flex;justify-content:center;gap:24px}
`;

const Landing = () => {
  const R = 26;
  const C = 2 * Math.PI * R;
  return (
    <div className="coach landing">
      <style>{window.CORE_CSS}</style>
      <style>{LANDING_CSS}</style>

      {/* NAV */}
      <div className="nav">
        <div className="logo"><span className="logo-mark">C</span><span>Coach</span></div>
        <div className="nav-links">
          <span>能力</span><span>面经库</span><span>校友故事</span><span>定价</span><span>下载</span>
        </div>
        <div className="nav-r">
          <span>EN</span>
          <span>登录</span>
          <button className="btn primary sm">开始使用</button>
        </div>
      </div>

      {/* HERO */}
      <div className="hero">
        <div>
          <div className="tag"><span className="dot"></span><span>已陪 12,408 位同学走完秋招</span></div>
          <h1>陪你跑完<br/>整个<span className="accent">秋招。</span></h1>
          <p className="sub">不是简历模板，不是题库 —— 是一个真的 AI 教练。<br/>每天告诉你做什么，每场面试帮你复盘。</p>
          <div className="ctas">
            <button className="btn primary lg">免费开始 {window.IK.arrow}</button>
            <button className="btn lg">{window.IK.play}<span>看 30 秒</span></button>
          </div>
          <div className="meta-line">
            <span className="b">{window.IK.lock}<span>对话端到端加密</span></span>
            <span>·</span>
            <span className="b">{window.IK.bolt}<span>免费 5 次诊断 / 周</span></span>
          </div>
        </div>

        <div className="hero-card">
          <div className="ambient"></div>
          <div className="topline">Coach · 进行中 · 5月23日 14:22</div>

          <div className="convo">
            <div className="bub me">
              <div className="text">今天投了 0 份简历，我是不是该休息一下？</div>
            </div>
            <div className="bub ai">
              <window.Avatar kind="coach" size={28} />
              <div className="text">可以。你已经连续 17 天打卡，过去 3 周节奏很稳。今天就 1 件事：跑完 STAR ch.2 ——周一终面有用。</div>
            </div>
            <div className="bub me">
              <div className="text">好。明早再补投递。</div>
            </div>
          </div>

          <div className="signature">— 像真的有人在陪你</div>
        </div>
      </div>

      {/* STATS */}
      <div className="strip">
        <div className="stat"><div className="v">12,408 <span className="acc">↑ 8%</span></div><div className="l">校招用户 · 本周</div></div>
        <div className="stat"><div className="v">+24<span className="acc">分</span></div><div className="l">简历平均提分</div></div>
        <div className="stat"><div className="v">8.4 <span style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 600 }}>min</span></div><div className="l">平均复盘时长</div></div>
        <div className="stat"><div className="v">3,802</div><div className="l">24h 新增岗位</div></div>
      </div>

      {/* PILLARS */}
      <div className="pillars">
        <div className="ph-hd">
          <h2>四个视角 ——<br/>把秋招分成可以做的事。</h2>
          <div className="lead">求职不是一件事 —— 它是每天的、每周的、每场面试的、和整体的。Coach 给你四个对应的视角。</div>
        </div>

        <div className="pillar-grid">
          {/* a · today (hero pillar) */}
          <div className="pil a">
            <span className="tag">日 · TODAY</span>
            <h3>今天<br/>该做哪 5 件事？</h3>
            <p className="desc">每天清晨自动生成 5 步，覆盖投递、练习、复盘、学习。做完今天的就可以休息。</p>
            <div className="today-preview">
              <div className="row done"><span className="chk">{window.IK.check}</span><span>腾讯算法 · 二叉树 #8</span><span className="dur">20m</span></div>
              <div className="row done"><span className="chk">{window.IK.check}</span><span>字节客户端实习 · 投递</span><span className="dur">15m</span></div>
              <div className="row"><span className="chk"></span><span>美团二面 · 录音转写复盘</span><span className="dur">10m</span></div>
              <div className="row"><span className="chk"></span><span>STAR 法则 ch.2</span><span className="dur">25m</span></div>
              <div className="row"><span className="chk"></span><span>简历 · 项目栏目润色</span><span className="dur">30m</span></div>
            </div>
          </div>

          {/* b · monthly */}
          <div className="pil b">
            <span className="tag">期 · MONTHLY</span>
            <h3>面经<br/>每天更新</h3>
            <p className="desc">叫月刊，更新是实时的。编辑部 + 校友 + Coach 整理。</p>
            <div className="mthly-prev">
              <div className="row">
                <div className="meta"><b>🔥 2h ago</b> · 字节</div>
                <div className="ttl">字节二面 5 道题 + 一个 Tech Lead 陷阱</div>
              </div>
              <div className="row">
                <div className="meta"><b>5h ago</b> · 拼多多</div>
                <div className="ttl">PDD 校招前端 base 38–46k，但有个 catch</div>
              </div>
            </div>
          </div>

          {/* c · interview */}
          <div className="pil c">
            <span className="tag">场 · INTERVIEW</span>
            <h3>每场面试<br/>都该复盘</h3>
            <p className="desc">录音 → 转写 → 逐题评估 → 预测下一轮。</p>
            <div className="iv-prev">
              <div className="gr">B+</div>
              <div className="info">
                <b>美团 · 前端二面</b>
                <span>昨天 16:00 · 62 min</span>
                <div className="bars"><i></i><i></i><i></i></div>
              </div>
            </div>
          </div>

          {/* d · resume */}
          <div className="pil d">
            <span className="tag">配 · 简历</span>
            <h3>投准<br/>每个岗位</h3>
            <p className="desc">逐条 before / after 改写 · 关键词匹配诊断。</p>
          </div>

          {/* e · overview */}
          <div className="pil e">
            <span className="tag">面 · OVERVIEW</span>
            <h3>看清<br/>整个秋招</h3>
            <p className="desc">funnel · 薪资 · 市场温度 · 能力盘点。</p>
            <div className="ov-prev">
              <div className="ring-blk">
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="5" />
                  <circle cx="32" cy="32" r={R} fill="none" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={C * (1 - 0.73)} transform="rotate(-90 32 32)" />
                </svg>
                <div className="v">P73</div>
              </div>
              <div className="info">
                <b>同校排名</b>
                <span>2026 届 前端</span>
                <span className="delta">↑ 12 位 / 月</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div className="feat">
        <div className="tile">
          <div className="ic">{window.IK.spark}</div>
          <h4>简历馆</h4>
          <p>逐条改写、关键词匹配 —— 一份简历一个岗位。</p>
          <span className="slash">/diagnose</span>
        </div>
        <div className="tile">
          <div className="ic">{window.IK.play}</div>
          <h4>模拟面试</h4>
          <p>岗位定制题 · 语音 / 文字 · 自动评分。</p>
          <span className="slash">/mock</span>
        </div>
        <div className="tile">
          <div className="ic">{window.IK.money}</div>
          <h4>薪资雷达</h4>
          <p>1,247 条真实 offer · 同岗对比。</p>
          <span className="slash">/salary</span>
        </div>
        <div className="tile">
          <div className="ic">{window.IK.send}</div>
          <h4>求职信</h4>
          <p>三种语气、一键定制。</p>
          <span className="slash">/cover</span>
        </div>
        <div className="tile">
          <div className="ic">{window.IK.brief}</div>
          <h4>投递追踪</h4>
          <p>看板 · 节点提醒 · funnel 复盘。</p>
          <span className="slash">/track</span>
        </div>
        <div className="tile">
          <div className="ic">{window.IK.globe}</div>
          <h4>职业地图</h4>
          <p>技能盘点 · 三年路径 · 校友参考。</p>
          <span className="slash">/career</span>
        </div>
      </div>

      {/* PROOF */}
      <div className="proof">
        <div className="hd">
          <h3>不止我们说好用 —— 校友说也好用。</h3>
          <div className="meta">来自已签 offer 的 2026 届校友 · 已脱敏</div>
        </div>
        <div className="proof-grid">
          <div className="quote-card">
            <div className="q">「整整一个月没投出一份简历。后来才明白，问题不是公司挑剔，是我自己看不上自己 —— Coach 帮我看见这一点。」</div>
            <div className="a">
              <div className="av">张</div>
              <div>
                <div className="name">张同学</div>
                <div className="name-meta">北京交大 · 字节前端 offer</div>
              </div>
            </div>
          </div>
          <div className="quote-card">
            <div className="q">「美团二面前一晚我跑了一次 Coach 模拟，第二天面试官问的 5 道题里有 3 道一样。主线问得心里有底。」</div>
            <div className="a">
              <div className="av">小</div>
              <div>
                <div className="name">陈小雨</div>
                <div className="name-meta">复旦 · 美团数据 offer</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOT */}
      <div className="foot">
        <h2>把今天的 5 步，<br/><span className="acc">先走完。</span></h2>
        <p>剩下的 38 天，慢慢来。</p>
        <div className="ctas">
          <button className="btn primary lg">{window.IK.arrow}<span>免费开始 · 微信扫码</span></button>
          <button className="btn lg">{window.IK.play}<span>看 30 秒介绍</span></button>
        </div>
        <div className="foot-info">
          <span>已陪 12,408 位同学走完秋招</span>
          <span>对话端到端加密 · 不用于训练</span>
          <span>Coach v4</span>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Landing });
