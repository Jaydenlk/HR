// Direction A · Daily Quest 求职日历
// Concept: 把求职变成 daily practice，像 Habit-tracker + 学习陪伴 App。
// Tone: 温暖、激励、有节奏感、像晨间咖啡。

const DIR_A_CSS = `
.dir-a{
  --bg:#f6efe2;
  --bg-2:#faf5ea;
  --card:#ffffff;
  --ink:#1c1a16;
  --ink-2:#3d3933;
  --ink-3:#7c756a;
  --ink-4:#aea795;
  --line:#e4dcc8;
  --line-2:#d3c9b1;
  --accent:#e9572b;
  --accent-2:#fce9e0;
  --honey:#e8b94a;
  --honey-2:#f6e8b3;
  --leaf:#5a8f5e;
  --leaf-2:#dde9d8;

  position:absolute;inset:0;background:var(--bg);color:var(--ink);
  font-family:"Geist","Noto Sans SC",sans-serif;font-size:14px;line-height:1.55;
  -webkit-font-smoothing:antialiased;letter-spacing:-.005em;
  overflow:hidden;
}
.dir-a *{box-sizing:border-box}
.dir-a .display{font-family:"Instrument Serif","Noto Serif SC",serif;font-style:italic;letter-spacing:-.02em}

.dir-a .a-nav{display:flex;align-items:center;justify-content:space-between;padding:22px 36px;border-bottom:1px solid var(--line)}
.dir-a .a-logo{display:flex;align-items:center;gap:10px;font-weight:600;font-size:15px}
.dir-a .a-logo .mark{width:30px;height:30px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-family:"Instrument Serif",serif;font-style:italic;font-size:20px;line-height:1}
.dir-a .a-nav-links{display:flex;gap:28px;font-size:13px;color:var(--ink-2)}
.dir-a .a-nav-links a{color:inherit;text-decoration:none;display:flex;align-items:center;gap:5px}
.dir-a .a-lang{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink-3);border:1px solid var(--line);padding:5px 10px;border-radius:999px}
.dir-a .a-lang b{color:var(--ink);font-weight:500}
.dir-a .a-cta{padding:8px 18px;background:var(--ink);color:#fff;border-radius:999px;border:0;font-size:13px;font-weight:500;cursor:pointer}
.dir-a .a-cta.ghost{background:transparent;color:var(--ink);border:1px solid var(--ink)}

.dir-a .a-hero{display:grid;grid-template-columns:1.1fr 1fr;gap:36px;padding:48px 36px 36px;align-items:center}
.dir-a .a-tag{display:inline-flex;align-items:center;gap:8px;padding:5px 12px;border-radius:999px;background:var(--bg-2);border:1px solid var(--line);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin-bottom:18px}
.dir-a .a-tag .dot{width:6px;height:6px;border-radius:50%;background:var(--accent)}
.dir-a .a-h1{font-family:"Instrument Serif","Noto Serif SC",serif;font-size:72px;line-height:1;letter-spacing:-.02em;margin:0;font-weight:400}
.dir-a .a-h1 em{font-style:italic;color:var(--accent)}
.dir-a .a-h1 .alt{display:block;font-family:"Geist","Noto Sans SC",sans-serif;font-style:normal;font-size:18px;line-height:1.4;color:var(--ink-3);font-weight:400;margin-top:14px;letter-spacing:0;max-width:32ch}
.dir-a .a-hero-cta{display:flex;gap:10px;margin-top:26px;align-items:center}
.dir-a .a-hero-meta{display:flex;gap:24px;margin-top:32px;font-size:12px;color:var(--ink-3)}
.dir-a .a-hero-meta b{display:block;font-family:"Instrument Serif",serif;font-style:italic;font-size:26px;color:var(--ink);line-height:1}

/* visual: stacked day cards */
.dir-a .a-stack{position:relative;height:420px}
.dir-a .a-day{
  position:absolute;background:var(--card);border:1px solid var(--line);border-radius:18px;
  padding:18px;box-shadow:0 8px 24px -8px rgba(0,0,0,.08);
}
.dir-a .a-day .d-num{font-family:"Instrument Serif",serif;font-style:italic;font-size:36px;line-height:1;color:var(--accent)}
.dir-a .a-day .d-day{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);margin-bottom:6px}
.dir-a .a-day .d-task{font-size:12px;color:var(--ink-2);margin-top:8px;display:flex;align-items:center;gap:6px}
.dir-a .a-day .d-task .chk{width:14px;height:14px;border:1.5px solid var(--line-2);border-radius:50%;flex-shrink:0}
.dir-a .a-day .d-task.done .chk{background:var(--leaf);border-color:var(--leaf)}
.dir-a .a-day .d-task.done{color:var(--ink-3);text-decoration:line-through;text-decoration-color:var(--ink-4)}
.dir-a .a-day-1{top:0;left:30px;width:260px;transform:rotate(-3deg)}
.dir-a .a-day-2{top:50px;left:160px;width:280px;transform:rotate(2deg);background:var(--honey-2)}
.dir-a .a-day-3{top:200px;left:40px;width:300px;background:var(--accent-2)}
.dir-a .a-streak-badge{position:absolute;top:-16px;right:0;background:var(--ink);color:#fff;border-radius:999px;padding:8px 14px;font-size:12px;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(0,0,0,.15)}
.dir-a .a-streak-badge b{font-family:"Instrument Serif",serif;font-style:italic;font-size:16px;color:var(--honey)}

/* feature grid */
.dir-a .a-features{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:0 36px 28px}
.dir-a .a-feat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 16px;display:flex;flex-direction:column;gap:10px;min-height:130px}
.dir-a .a-feat .ic{width:36px;height:36px;border-radius:10px;background:var(--bg-2);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--ink-2)}
.dir-a .a-feat.fav{background:var(--accent);color:#fff;border-color:var(--accent)}
.dir-a .a-feat.fav .ic{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.2);color:#fff}
.dir-a .a-feat.fav .desc{color:rgba(255,255,255,.85)}
.dir-a .a-feat .name{font-weight:600;font-size:14px;display:flex;align-items:baseline;gap:6px}
.dir-a .a-feat .name .en{font-size:10px;color:var(--ink-4);letter-spacing:.06em;text-transform:uppercase;font-weight:400}
.dir-a .a-feat.fav .name .en{color:rgba(255,255,255,.6)}
.dir-a .a-feat .desc{font-size:11.5px;line-height:1.5;color:var(--ink-3)}
`;

// ─── A. Landing ─────────────────────────────────────────────────────────
const A_Landing = () => (
  <div className="dir-a">
    <style>{DIR_A_CSS}</style>

    <div className="a-nav">
      <div className="a-logo">
        <span className="mark">每</span>
        <span>每日求职 · <i style={{fontFamily:"Instrument Serif",fontStyle:"italic",color:"var(--accent)"}}>Daily</i></span>
      </div>
      <div className="a-nav-links">
        <a>今日计划</a><a>求职工具</a><a>岗位库</a><a>题库</a><a>故事</a>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div className="a-lang"><span>EN</span>·<b>中文</b></div>
        <button className="a-cta ghost">登录</button>
        <button className="a-cta">免费开始</button>
      </div>
    </div>

    <div className="a-hero">
      <div>
        <div className="a-tag"><span className="dot"></span>FOR CAMPUS RECRUITING · 应届校招</div>
        <h1 className="a-h1">
          求职像晨跑，<br/>
          重要的是<em>每天来一次</em>。
          <span className="alt">把秋招拆成 30 个早晨的小任务。我们替你安排好今天要做的 5 件事 —— 投递、题目、复盘、修改简历，做完就可以去过别的生活。</span>
        </h1>
        <div className="a-hero-cta">
          <button className="a-cta" style={{padding:"12px 24px",fontSize:14,display:"inline-flex",alignItems:"center",gap:8}}>开启今天的计划 {window.IK.arrow}</button>
          <button className="a-cta ghost" style={{padding:"12px 20px",fontSize:14,display:"inline-flex",alignItems:"center",gap:8}}>{window.IK.play}<span>看 30 秒介绍</span></button>
        </div>
        <div className="a-hero-meta">
          <div><b>17 天</b><span>当前连续打卡</span></div>
          <div><b>12,408</b><span>本届校招用户</span></div>
          <div><b>4.9</b><span>App Store 评分</span></div>
        </div>
      </div>

      <div className="a-stack">
        <div className="a-streak-badge">
          {window.IK.flame}<span>连续</span><b>17 天</b>
        </div>
        <div className="a-day a-day-1">
          <div className="d-day">星期一 · 5/18</div>
          <div className="d-num">04 / 05</div>
          <div className="d-task done"><span className="chk"></span>腾讯一面复盘</div>
          <div className="d-task done"><span className="chk"></span>投递 · 字节客户端</div>
          <div className="d-task done"><span className="chk"></span>算法 · 二叉树第 8 题</div>
        </div>
        <div className="a-day a-day-2">
          <div className="d-day">星期二 · 5/19</div>
          <div className="d-num">05 / 05 <span style={{fontSize:12,color:"var(--leaf)",marginLeft:6,fontStyle:"normal",fontFamily:"Geist"}}>✓ 全部完成</span></div>
          <div className="d-task done"><span className="chk"></span>简历 · 项目栏目重写</div>
          <div className="d-task done"><span className="chk"></span>STAR 法则学习</div>
        </div>
        <div className="a-day a-day-3">
          <div className="d-day" style={{color:"var(--accent)"}}>今天 · 5/23 · 周五</div>
          <div className="d-num">02 / 05</div>
          <div className="d-task done"><span className="chk"></span>腾讯前端算法 1 题</div>
          <div className="d-task done"><span className="chk"></span>字节客户端实习投递</div>
          <div className="d-task"><span className="chk"></span>美团二面录音转写</div>
          <div className="d-task"><span className="chk"></span>Behavioral · STAR 复习</div>
          <div className="d-task"><span className="chk"></span>简历项目栏润色</div>
        </div>
      </div>
    </div>

    <div className="a-features">
      <div className="a-feat fav">
        <div className="ic">{window.IK.calendar}</div>
        <div className="name">今日计划<span className="en">DAILY</span></div>
        <div className="desc">把秋招拆成每天 30 分钟的小任务，做完今天的就可以休息。</div>
      </div>
      <div className="a-feat">
        <div className="ic">{window.IK.doc}</div>
        <div className="name">简历优化<span className="en">RESUME</span></div>
        <div className="desc">针对具体岗位的 AI 改写建议，逐条 before / after。</div>
      </div>
      <div className="a-feat">
        <div className="ic">{window.IK.mic}</div>
        <div className="name">模拟面试<span className="en">MOCK</span></div>
        <div className="desc">语音面试模拟 + 自动转写复盘，针对岗位定制。</div>
      </div>
      <div className="a-feat">
        <div className="ic">{window.IK.brief}</div>
        <div className="name">投递追踪<span className="en">TRACKER</span></div>
        <div className="desc">看板管理所有投递，到期前自动提醒。</div>
      </div>
    </div>
  </div>
);

// ─── A. Product (Daily Dashboard) ───────────────────────────────────────
const DIR_A_PROD_CSS = `
.dir-a .pa{display:grid;grid-template-columns:220px 1fr 290px;height:100%;background:var(--bg)}
.dir-a .pa-side{border-right:1px solid var(--line);padding:22px 14px;background:var(--bg-2);display:flex;flex-direction:column;gap:4px}
.dir-a .pa-logo{display:flex;align-items:center;gap:10px;padding:0 8px 22px;border-bottom:1px solid var(--line);margin-bottom:14px;font-weight:600;font-size:14px}
.dir-a .pa-logo .mark{width:28px;height:28px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-family:"Instrument Serif",serif;font-style:italic;font-size:18px;line-height:1}
.dir-a .pa-side h6{margin:14px 8px 6px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-4);font-weight:500}
.dir-a .pa-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;font-size:13px;color:var(--ink-2);cursor:default}
.dir-a .pa-item:hover{background:var(--bg)}
.dir-a .pa-item.active{background:var(--ink);color:#fff}
.dir-a .pa-item .ic{display:flex;align-items:center;color:inherit;opacity:.7}
.dir-a .pa-item.active .ic{opacity:1}
.dir-a .pa-item .badge{margin-left:auto;font-size:10px;background:var(--accent);color:#fff;padding:1px 6px;border-radius:999px}

.dir-a .pa-main{padding:24px 28px;overflow:hidden}
.dir-a .pa-toolbar{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px}
.dir-a .pa-greet{font-family:"Instrument Serif",serif;font-style:italic;font-size:34px;line-height:1;margin:0;letter-spacing:-.01em}
.dir-a .pa-greet em{color:var(--accent)}
.dir-a .pa-sub{font-size:13px;color:var(--ink-3);margin-top:6px}

.dir-a .pa-streakcard{display:grid;grid-template-columns:auto 1fr auto;gap:24px;align-items:center;background:var(--ink);color:#f6efe2;border-radius:16px;padding:18px 22px;margin-bottom:18px}
.dir-a .pa-streakcard .flame{font-family:"Instrument Serif",serif;font-style:italic;font-size:54px;line-height:1;color:var(--honey)}
.dir-a .pa-streakcard .lbl{font-size:11px;letter-spacing:.1em;text-transform:uppercase;opacity:.6}
.dir-a .pa-streakcard .v{font-size:14px;font-weight:500}
.dir-a .pa-streakcard .v b{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;font-size:20px;margin-right:4px}
.dir-a .pa-streakdots{display:flex;gap:4px}
.dir-a .pa-streakdots i{width:8px;height:24px;border-radius:3px;background:rgba(255,255,255,.18)}
.dir-a .pa-streakdots i.on{background:var(--honey)}
.dir-a .pa-streakdots i.today{background:var(--accent);box-shadow:0 0 0 2px rgba(255,255,255,.15)}

.dir-a .pa-tasks-hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
.dir-a .pa-tasks-hd h3{margin:0;font-size:15px;font-weight:600}
.dir-a .pa-tasks-hd .progress{font-size:12px;color:var(--ink-3)}
.dir-a .pa-tasks-hd .progress b{color:var(--ink);font-family:"Instrument Serif",serif;font-style:italic;font-size:16px}

.dir-a .pa-task{display:grid;grid-template-columns:auto 1fr auto auto;gap:14px;align-items:center;padding:14px 16px;background:var(--card);border:1px solid var(--line);border-radius:12px;margin-bottom:8px}
.dir-a .pa-task.done{background:var(--bg-2);opacity:.7}
.dir-a .pa-task .chk{width:22px;height:22px;border:1.5px solid var(--line-2);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
.dir-a .pa-task.done .chk{background:var(--leaf);border-color:var(--leaf)}
.dir-a .pa-task .title{font-size:14px;font-weight:500}
.dir-a .pa-task.done .title{text-decoration:line-through;text-decoration-color:var(--ink-4);color:var(--ink-3)}
.dir-a .pa-task .meta{font-size:11px;color:var(--ink-3);margin-top:2px}
.dir-a .pa-task .meta .tag{display:inline-block;background:var(--bg);border:1px solid var(--line);padding:1px 8px;border-radius:999px;margin-right:6px;color:var(--ink-2);font-weight:500}
.dir-a .pa-task .dur{font-size:11px;color:var(--ink-3);font-family:"Geist Mono",monospace}
.dir-a .pa-task .go{padding:6px 12px;border:1px solid var(--line-2);border-radius:8px;font-size:12px;color:var(--ink-2);background:transparent;cursor:pointer;display:flex;align-items:center;gap:4px}
.dir-a .pa-task .go:hover{border-color:var(--ink)}

.dir-a .pa-rest-card{margin-top:14px;background:var(--leaf-2);border:1px solid var(--line);border-radius:12px;padding:14px 16px;font-size:13px;color:var(--ink-2);display:flex;align-items:center;gap:10px}
.dir-a .pa-rest-card b{color:var(--leaf);font-family:"Instrument Serif",serif;font-style:italic;font-size:16px}

/* right rail */
.dir-a .pa-rail{border-left:1px solid var(--line);padding:24px 20px;background:var(--bg-2);overflow-y:hidden;display:flex;flex-direction:column;gap:18px}
.dir-a .rail-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
.dir-a .rail-card h4{margin:0 0 10px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);font-weight:600;display:flex;justify-content:space-between}
.dir-a .rail-card h4 a{color:var(--accent);text-decoration:none;font-weight:500;font-size:11px}
.dir-a .next-iv{display:flex;flex-direction:column;gap:8px}
.dir-a .next-iv .co{font-family:"Instrument Serif",serif;font-style:italic;font-size:22px;line-height:1.1;color:var(--ink)}
.dir-a .next-iv .role{font-size:12px;color:var(--ink-3)}
.dir-a .next-iv .countdown{margin-top:6px;background:var(--accent-2);border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--ink-2)}
.dir-a .next-iv .countdown b{font-family:"Instrument Serif",serif;font-style:italic;color:var(--accent);font-size:20px}
.dir-a .next-iv .prep{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-2);margin-top:8px;padding:8px;background:var(--bg-2);border-radius:6px}

.dir-a .quote-card{background:var(--ink);color:#f6efe2;border-radius:12px;padding:18px;font-family:"Instrument Serif",serif;font-style:italic;font-size:16px;line-height:1.5}
.dir-a .quote-card .src{display:block;font-family:"Geist",sans-serif;font-style:normal;font-size:11px;color:rgba(255,255,255,.5);margin-top:10px;letter-spacing:.05em}

.dir-a .saved-job{display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid var(--line);font-size:12px}
.dir-a .saved-job:first-of-type{border-top:0}
.dir-a .saved-job .r{color:var(--ink);font-weight:500}
.dir-a .saved-job .c{color:var(--ink-3);font-size:11px}
.dir-a .saved-job .m{color:var(--leaf);font-family:"Geist Mono",monospace;font-size:11px}
`;

const A_Product = () => {
  const sevenDays = ["一","二","三","四","五","六","日"];
  return (
    <div className="dir-a">
      <style>{DIR_A_CSS}</style>
      <style>{DIR_A_PROD_CSS}</style>
      <div className="pa">
        {/* sidebar */}
        <div className="pa-side">
          <div className="pa-logo"><span className="mark">每</span><span>每日求职</span></div>
          <h6>每日</h6>
          <div className="pa-item active"><span className="ic">{window.IK.calendar}</span><span>今日计划</span></div>
          <div className="pa-item"><span className="ic">{window.IK.flame}</span><span>连续打卡</span><span className="badge">17</span></div>
          <h6>工具</h6>
          <div className="pa-item"><span className="ic">{window.IK.doc}</span><span>简历优化</span></div>
          <div className="pa-item"><span className="ic">{window.IK.spark}</span><span>JD 匹配</span></div>
          <div className="pa-item"><span className="ic">{window.IK.mic}</span><span>模拟面试</span></div>
          <div className="pa-item"><span className="ic">{window.IK.send}</span><span>求职信</span></div>
          <h6>追踪</h6>
          <div className="pa-item"><span className="ic">{window.IK.brief}</span><span>投递记录</span><span className="badge" style={{background:"var(--ink-3)"}}>18</span></div>
          <div className="pa-item"><span className="ic">{window.IK.money}</span><span>薪资库</span></div>
          <div className="pa-item"><span className="ic">{window.IK.globe}</span><span>职业规划</span></div>
        </div>

        {/* main */}
        <div className="pa-main">
          <div className="pa-toolbar">
            <div>
              <h2 className="pa-greet">早安，明 ——<em> 今天还差 3 步。</em></h2>
              <div className="pa-sub">5 月 23 日 · 周五 · 距离秋招正式批 还有 38 天</div>
            </div>
            <button className="a-cta">+ 自定义任务</button>
          </div>

          {/* streak ribbon */}
          <div className="pa-streakcard">
            <div className="flame">17</div>
            <div>
              <div className="lbl">连续打卡</div>
              <div className="v"><b>30</b> 天 / 月度目标 · 已完成 <b>57%</b></div>
              <div className="pa-streakdots" style={{marginTop:10}}>
                {Array.from({length:14}).map((_,i)=>(
                  <i key={i} className={i<11 ? "on" : i===11 ? "today" : ""} title={sevenDays[i%7]}></i>
                ))}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div className="lbl">本周</div>
              <div className="v"><b>4</b>/5 天</div>
              <div className="v" style={{marginTop:6}}><b>2.1h</b> 学习</div>
            </div>
          </div>

          {/* tasks */}
          <div className="pa-tasks-hd">
            <h3>今日 5 步</h3>
            <div className="progress">已完成 <b>2</b> / 5 · 预计 <b>1h 40m</b></div>
          </div>

          {window.TODAY_PLAN.map((t,i)=>(
            <div key={t.id} className={"pa-task" + (t.done?" done":"")}>
              <div className="chk">{t.done && window.IK.check}</div>
              <div>
                <div className="title">{t.title}</div>
                <div className="meta"><span className="tag">{t.tag}</span>{t.type} · 步骤 {String(i+1).padStart(2,"0")}</div>
              </div>
              <span className="dur">{t.duration}</span>
              {!t.done && <button className="go">开始 {window.IK.arrow}</button>}
              {t.done && <span style={{fontSize:11,color:"var(--leaf)"}}>✓ 完成</span>}
            </div>
          ))}

          <div className="pa-rest-card">
            <span style={{fontSize:18}}>🌿</span>
            <span>做完今天剩下的 3 步，<b>休息一下</b>。秋招是马拉松，不必每天加班学习。</span>
          </div>
        </div>

        {/* right rail */}
        <div className="pa-rail">
          <div className="rail-card">
            <h4>下一场面试 <a>查看 →</a></h4>
            <div className="next-iv">
              <div className="co">美团</div>
              <div className="role">前端工程师 · 二面 · 技术 + HR</div>
              <div className="countdown">
                <span>5 月 26 日 · 周一 · 14:00</span>
                <b>3 天</b>
              </div>
              <div className="prep">{window.IK.bolt}<span>面试包准备进度 <b style={{color:"var(--accent)"}}>72%</b></span></div>
            </div>
          </div>

          <div className="quote-card">
            "Show up. Even when you don't feel like it. Especially then."
            <span className="src">— Today's reminder</span>
          </div>

          <div className="rail-card">
            <h4>最近收藏 <a>全部</a></h4>
            <div className="saved-job">
              <div><div className="r">前端工程师</div><div className="c">字节跳动 · 上海</div></div>
              <div className="m">92% 匹配</div>
            </div>
            <div className="saved-job">
              <div><div className="r">Frontend Grad</div><div className="c">Shopee · 新加坡</div></div>
              <div className="m">85% 匹配</div>
            </div>
            <div className="saved-job">
              <div><div className="r">客户端开发</div><div className="c">腾讯 IEG · 深圳</div></div>
              <div className="m">78% 匹配</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { A_Landing, A_Product });
