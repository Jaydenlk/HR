// Landing — public-facing marketing page.

const COACH_LANDING_CSS = `
.coach.landing{overflow:hidden}
.coach.landing .nav{
  display:flex;align-items:center;justify-content:space-between;
  padding:22px 56px;border-bottom:1px solid var(--line);
}
.coach.landing .nav .logo{display:flex;align-items:center;gap:10px;font-weight:500}
.coach.landing .nav .logo .mark{width:28px;height:28px;border-radius:50%;background:var(--ink);color:var(--bg);display:flex;align-items:center;justify-content:center;font-family:"Instrument Serif",serif;font-style:italic;font-size:17px}
.coach.landing .nav-links{display:flex;gap:30px;font-size:13.5px;color:var(--ink-3)}
.coach.landing .nav-right{display:flex;align-items:center;gap:14px;font-size:13px;color:var(--ink-3)}
.coach.landing .nav .lang{font-family:"Geist Mono",monospace;font-size:11px;border:1px solid var(--line);padding:4px 10px;border-radius:999px}

.coach.landing .hero{padding:72px 56px 36px;text-align:center;display:flex;flex-direction:column;align-items:center}
.coach.landing .hero .stub{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;border:1px solid var(--line);background:var(--card);font-size:12px;color:var(--ink-3);margin-bottom:24px}
.coach.landing .hero .stub b{color:var(--ink);font-weight:500}
.coach.landing .hero .stub .dot{width:6px;height:6px;border-radius:50%;background:var(--good)}
.coach.landing h1{
  font-family:"Instrument Serif","Noto Serif SC",serif;font-style:italic;
  font-size:84px;line-height:1.04;letter-spacing:-.02em;margin:0;font-weight:400;color:var(--ink);
  max-width:18ch;
}
.coach.landing h1 .normal{font-style:normal;font-family:"Geist","Noto Sans SC",sans-serif;font-weight:500}
.coach.landing h1 .acc{color:var(--accent)}
.coach.landing .sub{font-size:18px;color:var(--ink-3);margin-top:20px;max-width:46ch;line-height:1.5}

.coach.landing .chat-box{
  margin-top:36px;background:var(--card);border:1px solid var(--line);
  border-radius:22px;padding:16px 18px 12px;width:720px;max-width:100%;
  box-shadow:0 16px 48px -20px rgba(89,99,245,.22),0 2px 0 rgba(89,99,245,.04);
  text-align:left;
}
.coach.landing .chat-box .ph{font-size:15.5px;color:var(--ink-3);padding:6px 0 12px;letter-spacing:-.003em}
.coach.landing .chat-box .ph .you{color:var(--ink-4)}
.coach.landing .chat-box .row{display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid var(--line)}
.coach.landing .chat-box .tool{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--line);border-radius:999px;background:var(--bg);color:var(--ink-2);font-size:12.5px;cursor:default}
.coach.landing .chat-box .tool .ic{color:var(--ink-3)}
.coach.landing .chat-box .tool.acc{background:var(--accent-2);border-color:var(--accent-2);color:var(--accent-3)}
.coach.landing .chat-box .tool.acc .ic{color:var(--accent)}
.coach.landing .chat-box .send{width:38px;height:38px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;border:0}
.coach.landing .chat-box .tools-l{display:flex;gap:6px}

.coach.landing .hint{margin-top:14px;font-size:12.5px;color:var(--ink-3);display:flex;gap:18px;justify-content:center;flex-wrap:wrap}
.coach.landing .hint .h{display:inline-flex;align-items:center;gap:5px}
.coach.landing .hint .h .ic{color:var(--accent)}

.coach.landing .stats{display:flex;gap:0;justify-content:center;margin-top:44px;padding:20px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);width:100%}
.coach.landing .stats .s{padding:0 36px;border-right:1px solid var(--line);text-align:left}
.coach.landing .stats .s:last-child{border-right:0}
.coach.landing .stats .v{font-family:"Instrument Serif",serif;font-style:italic;font-size:32px;color:var(--ink);line-height:1;letter-spacing:-.01em}
.coach.landing .stats .v .acc{color:var(--accent);font-size:14px;margin-left:6px;font-style:normal;font-family:"Geist Mono",monospace}
.coach.landing .stats .l{font-size:11.5px;color:var(--ink-3);margin-top:6px;letter-spacing:.04em}

/* 4 pillars mosaic */
.coach.landing .pillars{padding:64px 56px 24px}
.coach.landing .pillars .hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:24px}
.coach.landing .pillars .hd h2{font-family:"Instrument Serif",serif;font-style:italic;font-size:42px;margin:0;letter-spacing:-.02em;font-weight:400}
.coach.landing .pillars .hd .meta{font-size:13px;color:var(--ink-3);max-width:32ch;text-align:right;line-height:1.5}

.coach.landing .pillar-grid{
  display:grid;
  grid-template-columns:1.4fr 1fr 1fr;
  grid-template-rows:auto auto;
  grid-template-areas:
    "today monthly monthly"
    "today interview overview";
  gap:14px;
}
.coach.landing .pillar{
  background:var(--card);border:1px solid var(--line);border-radius:16px;
  padding:22px;display:flex;flex-direction:column;gap:14px;position:relative;overflow:hidden;
}
.coach.landing .pillar.today{grid-area:today;background:linear-gradient(160deg,var(--card) 0%,var(--accent-2) 110%)}
.coach.landing .pillar.monthly{grid-area:monthly;background:var(--ink);color:var(--bg)}
.coach.landing .pillar.monthly .line{background:rgba(255,255,255,.12)}
.coach.landing .pillar.interview{grid-area:interview}
.coach.landing .pillar.overview{grid-area:overview}
.coach.landing .pillar .tag{display:inline-flex;align-items:center;gap:6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);font-family:"Geist Mono",monospace}
.coach.landing .pillar.monthly .tag{color:rgba(255,255,255,.55)}
.coach.landing .pillar h3{margin:0;font-family:"Instrument Serif",serif;font-style:italic;font-size:30px;line-height:1.1;letter-spacing:-.01em;font-weight:400}
.coach.landing .pillar.monthly h3{color:var(--bg)}
.coach.landing .pillar .desc{font-size:13px;color:var(--ink-3);line-height:1.55}
.coach.landing .pillar.monthly .desc{color:rgba(255,255,255,.7)}

/* today pillar sample */
.coach.landing .today-tasks{margin-top:auto;display:flex;flex-direction:column;gap:8px}
.coach.landing .today-task{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--card);border:1px solid var(--line);border-radius:10px;font-size:13px}
.coach.landing .today-task.done{background:var(--bg-2);text-decoration:line-through;text-decoration-color:var(--ink-4);color:var(--ink-3)}
.coach.landing .today-task .chk{width:18px;height:18px;border-radius:50%;border:1.5px solid var(--line-2);flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff}
.coach.landing .today-task.done .chk{background:var(--good);border-color:var(--good)}
.coach.landing .today-task .ago{margin-left:auto;font-family:"Geist Mono",monospace;font-size:11px;color:var(--ink-4)}
.coach.landing .streak-row{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--ink);color:var(--bg);border-radius:10px;font-size:12.5px;margin-top:4px}
.coach.landing .streak-row b{font-family:"Instrument Serif",serif;font-style:italic;color:var(--warm);font-size:18px;margin-right:6px}
.coach.landing .streak-row .dots{display:flex;gap:3px}
.coach.landing .streak-row .dots i{width:6px;height:18px;border-radius:2px;background:rgba(255,255,255,.18)}
.coach.landing .streak-row .dots i.on{background:var(--warm)}

/* monthly pillar */
.coach.landing .monthly-cover{display:grid;grid-template-columns:1.2fr 1fr;gap:18px;align-items:end;margin-top:6px}
.coach.landing .monthly-cover .lead{font-family:"Instrument Serif",serif;font-style:italic;font-size:24px;line-height:1.2;color:var(--bg)}
.coach.landing .monthly-cover .lead em{color:var(--warm);font-style:italic}
.coach.landing .monthly-cover .item{padding-top:10px;border-top:1px solid rgba(255,255,255,.15);font-size:12.5px;color:rgba(255,255,255,.75);line-height:1.45}
.coach.landing .monthly-cover .item b{display:block;color:var(--bg);font-family:"Instrument Serif",serif;font-style:italic;font-size:16px;font-weight:400;margin-bottom:4px}
.coach.landing .monthly-cover .meta{font-family:"Geist Mono",monospace;font-size:10px;color:rgba(255,255,255,.45);letter-spacing:.08em;text-transform:uppercase;margin-top:4px;display:block}

/* interview pillar */
.coach.landing .iv-tile{display:flex;align-items:center;gap:14px;margin-top:auto}
.coach.landing .iv-tile .grade{font-family:"Instrument Serif",serif;font-style:italic;font-size:42px;color:var(--accent);line-height:1;letter-spacing:-.02em}
.coach.landing .iv-tile .info{flex:1}
.coach.landing .iv-tile .info b{display:block;color:var(--ink);font-size:13px;font-weight:500}
.coach.landing .iv-tile .info span{font-size:11.5px;color:var(--ink-3)}
.coach.landing .iv-tile .bars{display:flex;flex-direction:column;gap:3px;width:90px}
.coach.landing .iv-tile .bars div{height:5px;border-radius:2px;background:var(--bg-2)}
.coach.landing .iv-tile .bars div i{display:block;height:100%;background:var(--accent);border-radius:2px}

/* overview pillar */
.coach.landing .funnel-mini{display:flex;flex-direction:column;gap:4px;margin-top:auto;font-size:11px;color:var(--ink-3)}
.coach.landing .funnel-mini .r{display:grid;grid-template-columns:60px 1fr 30px;gap:8px;align-items:center}
.coach.landing .funnel-mini .bar{height:8px;background:var(--bg-2);border-radius:2px;overflow:hidden}
.coach.landing .funnel-mini .bar i{display:block;height:100%;background:var(--ink-3);border-radius:2px}
.coach.landing .funnel-mini .r.you .bar i{background:var(--accent)}
.coach.landing .funnel-mini .n{font-family:"Geist Mono",monospace;color:var(--ink);text-align:right}

/* tools row */
.coach.landing .tools-strip{padding:0 56px 24px;display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.coach.landing .tool-tile{
  background:var(--card);border:1px solid var(--line);border-radius:12px;
  padding:14px 14px;display:flex;flex-direction:column;gap:6px;
}
.coach.landing .tool-tile .ic{width:32px;height:32px;border-radius:10px;background:var(--bg-2);display:flex;align-items:center;justify-content:center;color:var(--ink-2)}
.coach.landing .tool-tile b{font-size:13px;font-weight:500;color:var(--ink)}
.coach.landing .tool-tile span{font-size:11px;color:var(--ink-3)}
.coach.landing .tool-tile .slash{font-family:"Geist Mono",monospace;font-size:10px;color:var(--ink-4);margin-top:auto;padding-top:6px}

/* social proof */
.coach.landing .proof{padding:48px 56px;background:var(--bg-2);border-top:1px solid var(--line);border-bottom:1px solid var(--line);text-align:center}
.coach.landing .proof q{font-family:"Instrument Serif",serif;font-style:italic;font-size:30px;line-height:1.35;color:var(--ink);quotes:none;display:block;max-width:34ch;margin:0 auto}
.coach.landing .proof .cite{margin-top:18px;font-size:12.5px;color:var(--ink-3);letter-spacing:.04em}
.coach.landing .proof .cite b{color:var(--ink);font-weight:500}

/* footer */
.coach.landing .foot-cta{padding:60px 56px;text-align:center}
.coach.landing .foot-cta h2{font-family:"Instrument Serif",serif;font-style:italic;font-size:48px;margin:0 0 12px;font-weight:400;letter-spacing:-.02em}
.coach.landing .foot-cta p{font-size:15px;color:var(--ink-3);margin:0 auto 20px;max-width:34ch}
.coach.landing .foot-row{display:flex;gap:10px;justify-content:center}
`;

const Landing = () => (
  <div className="coach landing">
    <style>{COACH_CSS}</style>
    <style>{COACH_LANDING_CSS}</style>

    <div className="nav">
      <div className="logo">
        <span className="mark">C</span>
        <span>Coach · <span className="it" style={{ color: "var(--ink-3)" }}>your career copilot</span></span>
      </div>
      <div className="nav-links">
        <a>能力</a><a>面经库</a><a>校友故事</a><a>定价</a><a>关于</a>
      </div>
      <div className="nav-right">
        <span className="lang">中 / EN</span>
        <span>登录</span>
        <button className="btn primary sm">免费开始</button>
      </div>
    </div>

    <div className="hero">
      <div className="stub">
        <span className="dot"></span>
        <span><b>2026 届校招</b> · 已陪伴 12,408 位同学走完秋招</span>
      </div>
      <h1>
        把秋招<span className="acc it">这件事</span>，<br/>
        交给一个<span className="acc it">教练</span>。
      </h1>
      <p className="sub">
        不是简历模板，不是题库，不是又一个 AI 改写工具 ——
        是一个真的<span className="it" style={{ color: "var(--ink)" }}> 陪你跑完整个秋招</span> 的 AI 教练。
        每天告诉你做什么，每场面试帮你复盘，每个 offer 帮你判断。
      </p>

      <div className="chat-box">
        <div className="ph">
          <span className="you">你：</span>
          帮我把这份简历改成投字节前端的版本 · 我想模拟一次美团二面 · 今天投了 0 份简历，我该不该休息 ……
        </div>
        <div className="row">
          <div className="tools-l">
            <div className="tool"><span className="ic">{window.IK.doc}</span><span>附简历</span></div>
            <div className="tool"><span className="ic">{window.IK.link}</span><span>贴 JD</span></div>
            <div className="tool"><span className="ic">{window.IK.mic}</span><span>语音</span></div>
            <div className="tool acc"><span className="ic">{window.IK.command}</span><span>/ 命令</span></div>
          </div>
          <button className="send">{window.IK.send}</button>
        </div>
      </div>

      <div className="hint">
        <span className="h"><span className="ic">{window.IK.bolt}</span>无需注册即可试用</span>
        <span className="h"><span className="ic">{window.IK.lock}</span>对话端到端加密 · 不用于训练</span>
        <span className="h"><span className="ic">{window.IK.spark}</span>免费 5 次诊断 / 周</span>
      </div>

      <div className="stats">
        <div className="s"><div className="v">12,408 <span className="acc">↑ 8%</span></div><div className="l">校招用户 / 周</div></div>
        <div className="s"><div className="v">8.4 分钟</div><div className="l">平均诊断时长</div></div>
        <div className="s"><div className="v">+24 分</div><div className="l">简历平均提分</div></div>
        <div className="s"><div className="v">3,802</div><div className="l">24h 新增岗位</div></div>
      </div>
    </div>

    {/* Pillars */}
    <div className="pillars">
      <div className="hd">
        <h2>四个层级 —— 同一个秋招。</h2>
        <div className="meta">求职不是一件事 —— 它是每天的、每周的、每场面试的、和整体的。Coach 给你四个对应的视角。</div>
      </div>

      <div className="pillar-grid">
        {/* TODAY */}
        <div className="pillar today">
          <span className="tag"><span style={{ display: "inline-flex" }}>{window.IK.calendar}</span><span>日 · TODAY</span></span>
          <h3>今天<br/>该做哪 5 件事？</h3>
          <div className="desc">每天清晨自动生成 5 步小任务 —— 投递、练习、复盘、学习、修改简历。做完今天的就可以休息，不必焦虑。</div>
          <div className="streak-row">
            <span><b>17</b>天 连续打卡</span>
            <div className="dots">
              {[1,1,1,1,1,1,1,1,1,1,1,2,0,0].map((s,i)=>(
                <i key={i} className={s===1?"on":""} style={s===2?{background:"var(--accent)"}:undefined}></i>
              ))}
            </div>
          </div>
          <div className="today-tasks">
            <div className="today-task done"><span className="chk">{window.IK.check}</span><span>腾讯算法 · 二叉树 #8</span><span className="ago">20m</span></div>
            <div className="today-task done"><span className="chk">{window.IK.check}</span><span>字节客户端实习 · 投递</span><span className="ago">15m</span></div>
            <div className="today-task"><span className="chk"></span><span>美团二面 · 录音转写复盘</span><span className="ago">10m</span></div>
            <div className="today-task"><span className="chk"></span><span>简历 · 项目栏目润色</span><span className="ago">30m</span></div>
          </div>
        </div>

        {/* MONTHLY */}
        <div className="pillar monthly">
          <span className="tag">期 · MONTHLY · 时效内容</span>
          <h3>本周 12 篇<br/>面经 · 热点 · 编辑精选</h3>
          <div className="desc">从每天的面经、薪资动态、校招热点里筛 12 篇。<span className="it" style={{ color: "var(--warm)" }}>叫月刊，更新却是实时</span>。</div>
          <div className="monthly-cover">
            <div className="lead">
              「具体」是<br/>最被低估的<em>能力。</em>
            </div>
            <div>
              <div className="item">
                <span className="meta">面经 · 2h ago</span>
                <b>字节二面 5 道题 + 一个 Tech Lead 陷阱</b>
                @小雨 · 已 offer · 234 ❤
              </div>
              <div className="item" style={{ marginTop: 12 }}>
                <span className="meta">热点 · 5h ago</span>
                <b>拼多多前端 base 38–46k，但有个 catch</b>
                Coach 编辑部 · 1.2k ❤
              </div>
            </div>
          </div>
        </div>

        {/* INTERVIEW LAB */}
        <div className="pillar interview">
          <span className="tag"><span style={{ display: "inline-flex" }}>{window.IK.mic}</span><span>场 · INTERVIEW LAB</span></span>
          <h3>每场面试，<br/>都该复盘一次。</h3>
          <div className="desc">录音 / 文字记录 → 自动转写 → AI 逐题评估 → 知识盲点定位 → 预测下一轮可能问什么。</div>
          <div className="iv-tile">
            <span className="grade">B+</span>
            <div className="info">
              <b>美团 · 前端二面</b>
              <span>昨天 16:00 · 62 min</span>
            </div>
            <div className="bars">
              <div><i style={{ width: "86%" }}></i></div>
              <div><i style={{ width: "78%", background: "var(--good)" }}></i></div>
              <div><i style={{ width: "42%", background: "var(--bad)" }}></i></div>
            </div>
          </div>
        </div>

        {/* OVERVIEW */}
        <div className="pillar overview">
          <span className="tag"><span style={{ display: "inline-flex" }}>{window.IK.chart}</span><span>面 · OVERVIEW</span></span>
          <h3>整个秋招，<br/>你处在哪一格？</h3>
          <div className="desc">把投递、笔试、面试、offer 当成一条 funnel —— 找到通过率最低的那一层。</div>
          <div className="funnel-mini">
            <div className="r"><span>投递</span><div className="bar"><i style={{ width: "100%" }}></i></div><span className="n">18</span></div>
            <div className="r"><span>笔试</span><div className="bar"><i style={{ width: "61%" }}></i></div><span className="n">11</span></div>
            <div className="r you"><span>面试</span><div className="bar"><i style={{ width: "33%" }}></i></div><span className="n">6</span></div>
            <div className="r"><span>Offer</span><div className="bar"><i style={{ width: "6%" }}></i></div><span className="n">1</span></div>
          </div>
        </div>
      </div>
    </div>

    {/* tools row */}
    <div className="tools-strip">
      <div className="tool-tile">
        <div className="ic">{window.IK.spark}</div>
        <b>简历馆</b><span>JD 匹配 · 逐条改写</span><span className="slash">/diagnose</span>
      </div>
      <div className="tool-tile">
        <div className="ic">{window.IK.play}</div>
        <b>模拟面试</b><span>岗位定制 · 语音评分</span><span className="slash">/mock</span>
      </div>
      <div className="tool-tile">
        <div className="ic">{window.IK.money}</div>
        <b>薪资雷达</b><span>1,247 条真实 offer</span><span className="slash">/salary</span>
      </div>
      <div className="tool-tile">
        <div className="ic">{window.IK.send}</div>
        <b>求职信</b><span>三种语气 · 一键定制</span><span className="slash">/cover</span>
      </div>
      <div className="tool-tile">
        <div className="ic">{window.IK.brief}</div>
        <b>投递追踪</b><span>看板 · 节点提醒</span><span className="slash">/track</span>
      </div>
      <div className="tool-tile">
        <div className="ic">{window.IK.globe}</div>
        <b>职业地图</b><span>技能盘点 · 三年路径</span><span className="slash">/career</span>
      </div>
    </div>

    {/* proof */}
    <div className="proof">
      <q>「我整整一个月没投出去一份简历。后来才明白，问题不是公司挑剔，是我自己看不上自己。Coach 帮我看见这一点。」</q>
      <div className="cite">— <b>张同学</b> · 北京交大 · 字节前端 offer</div>
    </div>

    {/* footer cta */}
    <div className="foot-cta">
      <h2>把今天的 5 步，<span className="acc">先走完。</span></h2>
      <p>剩下的 38 天，慢慢来。</p>
      <div className="foot-row">
        <button className="btn primary">{window.IK.arrow}<span>免费开始 · 用 GitHub 登录</span></button>
        <button className="btn">看 30 秒介绍</button>
      </div>
    </div>
  </div>
);

Object.assign(window, { Landing });
