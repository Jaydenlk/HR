// Vibe Landing — public marketing page.
// Apple-keynote / 小红书 bento aesthetic.

const VIBE_LANDING_CSS = `
.vibe.landing{overflow:hidden}
.vibe.landing .nav{display:flex;align-items:center;justify-content:space-between;padding:18px 56px;background:rgba(245,245,247,.8);backdrop-filter:blur(20px) saturate(180%);position:sticky;top:0;border-bottom:1px solid rgba(0,0,0,.04);z-index:5}
.vibe.landing .logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:16px;letter-spacing:-.01em}
.vibe.landing .logo .mark{width:30px;height:30px;border-radius:9px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;letter-spacing:-.02em}
.vibe.landing .nav-links{display:flex;gap:28px;font-size:13.5px;color:var(--ink-2);font-weight:500}
.vibe.landing .nav-right{display:flex;align-items:center;gap:12px;font-size:13.5px;color:var(--ink-2);font-weight:500}

/* hero */
.vibe.landing .hero{padding:64px 56px 40px;display:grid;grid-template-columns:1.4fr 1fr;gap:48px;align-items:center}
.vibe.landing .hero .tag{display:inline-flex;align-items:center;gap:7px;padding:6px 13px;border-radius:999px;background:var(--bg-card);border:1px solid var(--line);font-size:12.5px;font-weight:600;color:var(--ink-2);margin-bottom:22px;letter-spacing:-.003em}
.vibe.landing .hero .tag .dot{width:7px;height:7px;border-radius:50%;background:var(--c-green)}
.vibe.landing .hero h1{margin:0;font-size:80px;line-height:1;letter-spacing:-.04em;font-weight:800;color:var(--ink)}
.vibe.landing .hero h1 .acc{color:var(--c-blue)}
.vibe.landing .hero .sub{margin-top:22px;font-size:19px;color:var(--ink-2);max-width:32ch;line-height:1.5;font-weight:500;letter-spacing:-.005em}
.vibe.landing .hero .ctas{display:flex;gap:12px;margin-top:32px}

/* hero visual right */
.vibe.landing .hero-card{position:relative;background:var(--c-yellow);border-radius:var(--r-card-xl);padding:32px;aspect-ratio:1.05/1;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}
.vibe.landing .hero-card .blob{position:absolute;border-radius:50%;filter:blur(2px);opacity:.55}
.vibe.landing .hero-card .b1{width:200px;height:200px;background:var(--c-pink);top:-50px;right:-40px}
.vibe.landing .hero-card .b2{width:140px;height:140px;background:var(--c-orange);bottom:-40px;left:-30px;opacity:.6}
.vibe.landing .hero-card .small{position:relative;z-index:2;font-size:14px;font-weight:600;color:#5a4500;letter-spacing:-.003em;display:flex;justify-content:space-between;align-items:center}
.vibe.landing .hero-card .quote{position:relative;z-index:2;font-size:28px;font-weight:700;line-height:1.2;color:var(--ink);letter-spacing:-.02em;margin:14px 0}
.vibe.landing .hero-card .avatars{position:relative;z-index:2;display:flex;align-items:center;gap:-10px;margin-top:auto}
.vibe.landing .hero-card .avatars > *{margin-right:-12px}
.vibe.landing .hero-card .more-count{margin-right:0 !important;margin-left:18px;font-size:13px;font-weight:600;color:#5a4500}

/* number stats strip */
.vibe.landing .strip{padding:0 56px 24px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.vibe.landing .strip .stat{background:var(--bg-card);border-radius:var(--r-card);padding:18px 22px;border:1px solid var(--line)}
.vibe.landing .strip .v{font-size:34px;font-weight:800;color:var(--ink);letter-spacing:-.02em;line-height:1}
.vibe.landing .strip .v .acc{font-size:14px;font-weight:600;margin-left:6px}
.vibe.landing .strip .l{font-size:12.5px;color:var(--ink-3);margin-top:6px;font-weight:500}

/* pillars */
.vibe.landing .pillars-wrap{padding:48px 56px 24px}
.vibe.landing .ph-hd{margin-bottom:24px;display:flex;justify-content:space-between;align-items:end}
.vibe.landing .ph-hd h2{margin:0;font-size:44px;font-weight:800;letter-spacing:-.03em;color:var(--ink);line-height:1.05}
.vibe.landing .ph-hd .meta{font-size:14px;color:var(--ink-3);text-align:right;max-width:30ch;line-height:1.45;font-weight:500}

.vibe.landing .pillars{display:grid;grid-template-columns:1.3fr 1fr 1fr;grid-template-rows:auto auto;grid-template-areas:"a b c" "a d e";gap:14px}
.vibe.landing .pillar{border-radius:var(--r-card-lg);padding:24px;position:relative;overflow:hidden;color:#fff;display:flex;flex-direction:column;gap:14px;min-height:240px}
.vibe.landing .pillar.a{grid-area:a;background:var(--c-orange);min-height:496px}
.vibe.landing .pillar.b{grid-area:b;background:var(--c-blue)}
.vibe.landing .pillar.c{grid-area:c;background:var(--c-pink)}
.vibe.landing .pillar.d{grid-area:d;background:var(--c-purple)}
.vibe.landing .pillar.e{grid-area:e;background:var(--c-mint)}
.vibe.landing .pillar .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.22);padding:4px 11px;border-radius:999px;font-size:11.5px;font-weight:700;letter-spacing:.01em;width:fit-content;backdrop-filter:blur(8px)}
.vibe.landing .pillar h3{margin:0;font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1.05;color:#fff}
.vibe.landing .pillar.a h3{font-size:42px}
.vibe.landing .pillar .desc{font-size:14px;font-weight:500;color:rgba(255,255,255,.86);line-height:1.45;max-width:42ch}

/* today pillar (large): show task chips */
.vibe.landing .today-preview{margin-top:auto;display:flex;flex-direction:column;gap:8px}
.vibe.landing .today-task{display:flex;align-items:center;gap:11px;background:rgba(255,255,255,.22);padding:11px 14px;border-radius:14px;font-size:13.5px;color:#fff;font-weight:600;backdrop-filter:blur(8px)}
.vibe.landing .today-task.done{background:rgba(255,255,255,.94);color:var(--ink)}
.vibe.landing .today-task .chk{width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff}
.vibe.landing .today-task.done .chk{background:var(--c-green);color:#fff}
.vibe.landing .today-task .dur{margin-left:auto;font-size:11.5px;opacity:.8;font-family:"JetBrains Mono",monospace;font-weight:500}
.vibe.landing .today-task.done .dur{opacity:.5}

/* monthly: cover thumbnail */
.vibe.landing .mthly-cover{margin-top:auto;background:rgba(255,255,255,.96);border-radius:18px;padding:14px;color:var(--ink)}
.vibe.landing .mthly-cover .hot-row{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:var(--c-red);margin-bottom:6px}
.vibe.landing .mthly-cover .title{font-size:14.5px;font-weight:700;line-height:1.3;letter-spacing:-.005em}
.vibe.landing .mthly-cover .author{font-size:11.5px;color:var(--ink-3);margin-top:6px;display:flex;align-items:center;gap:5px}

/* interview pillar */
.vibe.landing .iv-preview{margin-top:auto;display:flex;align-items:center;gap:14px}
.vibe.landing .iv-grade-big{width:74px;height:74px;border-radius:20px;background:rgba(255,255,255,.96);color:var(--c-purple);display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:800;letter-spacing:-.03em}
.vibe.landing .iv-info b{font-size:14px;font-weight:700;display:block}
.vibe.landing .iv-info span{font-size:12px;color:rgba(255,255,255,.78);font-weight:500}
.vibe.landing .iv-info .row{margin-top:6px;display:flex;flex-direction:column;gap:3px;width:120px}
.vibe.landing .iv-info .bar{height:5px;background:rgba(255,255,255,.25);border-radius:3px;overflow:hidden}
.vibe.landing .iv-info .bar i{display:block;height:100%;background:#fff;border-radius:3px}

/* overview pillar */
.vibe.landing .ov-rings{margin-top:auto;display:flex;align-items:center;gap:14px}
.vibe.landing .ov-rings svg{flex-shrink:0}
.vibe.landing .ov-ring-info b{display:block;font-size:14px;font-weight:700}
.vibe.landing .ov-ring-info span{font-size:12px;color:rgba(255,255,255,.78);font-weight:500}

/* feature row — softer pastel tiles */
.vibe.landing .features{padding:0 56px 48px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}
.vibe.landing .feature{background:var(--bg-card);border:1px solid var(--line);border-radius:var(--r-card);padding:22px 24px;display:flex;flex-direction:column;gap:10px}
.vibe.landing .feature .pic{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff}
.vibe.landing .feature .pic.b1{background:var(--c-indigo)}
.vibe.landing .feature .pic.b2{background:var(--c-cyan)}
.vibe.landing .feature .pic.b3{background:var(--c-green)}
.vibe.landing .feature .pic.b4{background:var(--c-red)}
.vibe.landing .feature .pic.b5{background:var(--c-orange)}
.vibe.landing .feature .pic.b6{background:var(--c-pink)}
.vibe.landing .feature h4{margin:0;font-size:17px;font-weight:700;letter-spacing:-.01em;color:var(--ink)}
.vibe.landing .feature p{margin:0;font-size:13px;color:var(--ink-3);line-height:1.5;font-weight:500}
.vibe.landing .feature .slash{margin-top:auto;padding-top:8px;font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-4);letter-spacing:.02em;font-weight:500}

/* proof */
.vibe.landing .proof{background:var(--ink);color:#fff;padding:56px 56px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;align-items:start}
.vibe.landing .proof .left h3{margin:0;font-size:42px;font-weight:800;line-height:1.05;letter-spacing:-.025em}
.vibe.landing .proof .left h3 .acc{color:var(--c-yellow)}
.vibe.landing .proof .testimonial{background:rgba(255,255,255,.06);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);border-radius:var(--r-card);padding:22px}
.vibe.landing .proof .testimonial .q{font-size:15px;line-height:1.55;color:#fff;font-weight:500}
.vibe.landing .proof .testimonial .a{margin-top:18px;display:flex;align-items:center;gap:12px}
.vibe.landing .proof .testimonial .name{font-size:13px;font-weight:700}
.vibe.landing .proof .testimonial .meta{font-size:11.5px;color:rgba(255,255,255,.55);font-weight:500;margin-top:2px}

/* footer cta */
.vibe.landing .foot{padding:64px 56px;text-align:center;background:var(--bg)}
.vibe.landing .foot h2{margin:0;font-size:54px;font-weight:800;letter-spacing:-.03em;line-height:1.05}
.vibe.landing .foot h2 .acc{color:var(--c-blue)}
.vibe.landing .foot p{font-size:16px;color:var(--ink-3);margin:14px 0 24px;font-weight:500}
.vibe.landing .foot .ctas{display:flex;gap:10px;justify-content:center}
.vibe.landing .foot-info{margin-top:34px;font-size:12px;color:var(--ink-4);font-weight:500;display:flex;justify-content:center;gap:24px}
`;

const Landing = () => (
  <div className="vibe landing">
    <style>{window.VIBE_CSS}</style>
    <style>{VIBE_LANDING_CSS}</style>

    <div className="nav">
      <div className="logo">
        <span className="mark">C</span>
        <span>Coach</span>
      </div>
      <div className="nav-links">
        <span>能力</span><span>面经库</span><span>校友故事</span><span>定价</span><span>下载 App</span>
      </div>
      <div className="nav-right">
        <span>EN / 中</span>
        <span>登录</span>
        <button className="btn primary sm">免费开始</button>
      </div>
    </div>

    {/* HERO */}
    <div className="hero">
      <div>
        <div className="tag"><span className="dot"></span><span>已陪 12,408 位同学走完秋招 · 2026 届校招</span></div>
        <h1>
          一个真的<br/>
          <span className="acc">陪你跑完</span><br/>
          秋招的 AI。
        </h1>
        <p className="sub">
          每天告诉你做什么，每场面试帮你复盘，每个 offer 帮你判断。
          不是又一个简历模板。
        </p>
        <div className="ctas">
          <button className="btn primary lg">免费开始 {window.IK.arrow}</button>
          <button className="btn lg">{window.IK.play}<span>看 30 秒介绍</span></button>
        </div>
      </div>

      <div className="hero-card">
        <div className="blob b1"></div>
        <div className="blob b2"></div>
        <div className="small">
          <span>今日 · 5 月 23 日 · 周五</span>
          <span style={{ background: "rgba(0,0,0,.08)", padding: "3px 9px", borderRadius: 999 }}>2/5 完成</span>
        </div>
        <div className="quote">"今天你 <br/>还差 <span style={{ color: "var(--c-red)" }}>3 件事。</span>"</div>
        <div className="avatars">
          <window.Avatar kind="ming"    size={56} bg="#fff" style={{ boxShadow: "0 0 0 3px #FFCC00" }} />
          <window.Avatar kind="yiyi"    size={56} bg="#fff" style={{ boxShadow: "0 0 0 3px #FFCC00" }} />
          <window.Avatar kind="ahai"    size={56} bg="#fff" style={{ boxShadow: "0 0 0 3px #FFCC00" }} />
          <window.Avatar kind="linxiao" size={56} bg="#fff" style={{ boxShadow: "0 0 0 3px #FFCC00" }} />
          <span className="more-count">+ 12.4k 同学</span>
        </div>
      </div>
    </div>

    {/* STATS */}
    <div className="strip">
      <div className="stat"><div className="v">12,408 <span className="acc" style={{ color: "var(--c-green)" }}>↑ 8%</span></div><div className="l">校招用户 · 本周</div></div>
      <div className="stat"><div className="v">+24 <span className="acc" style={{ color: "var(--c-green)" }}>分</span></div><div className="l">简历平均提分</div></div>
      <div className="stat"><div className="v">8.4 <span className="acc" style={{ color: "var(--ink-3)" }}>min</span></div><div className="l">平均复盘时长</div></div>
      <div className="stat"><div className="v">3,802</div><div className="l">24h 新增岗位</div></div>
    </div>

    {/* PILLARS */}
    <div className="pillars-wrap">
      <div className="ph-hd">
        <h2>四件事，<br/>一个 Coach 都包了。</h2>
        <div className="meta">求职不是一件事 —— 它是每天的、每周的、每场面试的、和整体的。Coach 给你四个对应的视角。</div>
      </div>

      <div className="pillars">
        {/* A · today */}
        <div className="pillar a">
          <div className="badge">日 · Today</div>
          <h3>今天<br/>该做哪 5 件事？</h3>
          <p className="desc">每天清晨自动生成 5 个 30 分钟以内的小任务 —— 投递、练习、复盘。做完今天的就可以休息。</p>
          <div className="today-preview">
            <div className="today-task done"><span className="chk">{window.IK.check}</span><span>腾讯算法 · 二叉树 #8</span><span className="dur">20m</span></div>
            <div className="today-task done"><span className="chk">{window.IK.check}</span><span>字节客户端实习 · 投递</span><span className="dur">15m</span></div>
            <div className="today-task"><span className="chk"></span><span>美团二面 · 录音转写复盘</span><span className="dur">10m</span></div>
            <div className="today-task"><span className="chk"></span><span>STAR 法则 ch.2</span><span className="dur">25m</span></div>
            <div className="today-task"><span className="chk"></span><span>简历 · 项目栏目润色</span><span className="dur">30m</span></div>
          </div>
        </div>

        {/* B · monthly */}
        <div className="pillar b">
          <div className="badge">期 · Monthly</div>
          <h3>面经<br/>每天更新。</h3>
          <p className="desc">叫月刊，更新是实时的。每天的面经、薪资动态、校招热点，Coach 编辑部筛 12 篇。</p>
          <div className="mthly-cover">
            <div className="hot-row">{window.IK.fire}<span>2 小时前 · 字节</span></div>
            <div className="title">字节二面 5 道题 + 一个 Tech Lead 陷阱</div>
            <div className="author">
              <window.Avatar kind="yiyi" size={20} />
              <span>@小雨 · 复旦 · 已 offer · 234 ❤</span>
            </div>
          </div>
        </div>

        {/* C · interview */}
        <div className="pillar c">
          <div className="badge">场 · Interview Lab</div>
          <h3>每场面试<br/>都该复盘。</h3>
          <p className="desc">录音 → 转写 → AI 逐题评估 → 知识盲点 → 预测下一轮。</p>
          <div className="iv-preview">
            <div className="iv-grade-big">B+</div>
            <div className="iv-info">
              <b>美团 · 前端二面</b>
              <span>昨天 · 62 min</span>
              <div className="row">
                <div className="bar"><i style={{ width: "86%" }}></i></div>
                <div className="bar"><i style={{ width: "78%" }}></i></div>
                <div className="bar"><i style={{ width: "42%" }}></i></div>
              </div>
            </div>
          </div>
        </div>

        {/* D · matches feature */}
        <div className="pillar d">
          <div className="badge">配 · 简历</div>
          <h3>把简历<br/>投准每个机会。</h3>
          <p className="desc">逐条改写 · before / after 对比 · 一键采纳。</p>
        </div>

        {/* E · overview */}
        <div className="pillar e">
          <div className="badge">面 · Overview</div>
          <h3>看清你的<br/>整个秋招。</h3>
          <p className="desc">投递、面试、offer 的转化漏斗 + 市场温度 + 薪资雷达。</p>
          <div className="ov-rings">
            <svg width="68" height="68" viewBox="0 0 68 68">
              <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="6" />
              <circle cx="34" cy="34" r="28" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * 0.45}
                transform="rotate(-90 34 34)" />
            </svg>
            <div className="ov-ring-info">
              <b>P 73 · 你的排名</b>
              <span>同校同届 · ↑ 12</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* FEATURE ROW */}
    <div className="features">
      <div className="feature">
        <div className="pic b1">{window.IK.spark}</div>
        <h4>简历馆</h4>
        <p>逐条改写、关键词匹配、版式优化 —— 一份简历一个岗位。</p>
        <span className="slash">/diagnose</span>
      </div>
      <div className="feature">
        <div className="pic b2">{window.IK.play}</div>
        <h4>模拟面试</h4>
        <p>岗位定制题库 · 语音 / 文字双模 · 自动评分 + 复盘卡。</p>
        <span className="slash">/mock</span>
      </div>
      <div className="feature">
        <div className="pic b3">{window.IK.money}</div>
        <h4>薪资雷达</h4>
        <p>1,247 条真实校招 offer · 同岗对比 · 谈判区间建议。</p>
        <span className="slash">/salary</span>
      </div>
      <div className="feature">
        <div className="pic b4">{window.IK.send}</div>
        <h4>求职信生成</h4>
        <p>三种语气、一键定制 —— 不要再用模板了。</p>
        <span className="slash">/cover</span>
      </div>
      <div className="feature">
        <div className="pic b5">{window.IK.brief}</div>
        <h4>投递追踪</h4>
        <p>看板管理所有投递、节点自动提醒、复盘 funnel。</p>
        <span className="slash">/track</span>
      </div>
      <div className="feature">
        <div className="pic b6">{window.IK.globe}</div>
        <h4>职业地图</h4>
        <p>技能盘点、三年路径建议、校友参考路径。</p>
        <span className="slash">/career</span>
      </div>
    </div>

    {/* PROOF */}
    <div className="proof">
      <div className="left">
        <h3>不止<br/><span className="acc">我们说好用 ——</span><br/>校友说也好用。</h3>
      </div>
      <div className="testimonial">
        <div className="q">「整整一个月没投出一份简历。后来才明白，问题不是公司挑剔，是我自己看不上自己。Coach 帮我看见这一点。」</div>
        <div className="a">
          <window.Avatar kind="ming" size={42} bg="rgba(255,255,255,.1)" />
          <div>
            <div className="name">张明</div>
            <div className="meta">北京交大 · 字节前端 offer</div>
          </div>
        </div>
      </div>
      <div className="testimonial">
        <div className="q">「美团二面前一晚我跑了一次 Coach 模拟。第二天面试官问的 5 道题里有 3 道是同样的，主线问得我心里有底。」</div>
        <div className="a">
          <window.Avatar kind="yiyi" size={42} bg="rgba(255,255,255,.1)" />
          <div>
            <div className="name">陈小雨</div>
            <div className="meta">复旦 · 美团数据 offer</div>
          </div>
        </div>
      </div>
    </div>

    {/* FOOT CTA */}
    <div className="foot">
      <h2>把今天的 5 步，<br/><span className="acc">先走完。</span></h2>
      <p>剩下的 38 天，慢慢来。</p>
      <div className="ctas">
        <button className="btn primary lg">{window.IK.arrow}<span>免费开始 · 用微信扫码</span></button>
        <button className="btn lg">看 30 秒介绍</button>
      </div>
      <div className="foot-info">
        <span>已陪 12,408 位同学走完秋招</span>
        <span>对话端到端加密 · 不用于训练</span>
        <span>Coach 2.0 · 5 月</span>
      </div>
    </div>
  </div>
);

Object.assign(window, { Landing });
