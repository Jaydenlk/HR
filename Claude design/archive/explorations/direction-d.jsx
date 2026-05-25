// Direction D · Coach 对话教练
// Concept: 一个对话入口通向所有功能。AI 是 "教练" 而不是 "助手"。
// Tone: 极简、温暖、Claude / Pi.ai 美学。

const DIR_D_CSS = `
.dir-d{
  --bg:#fafaf7;
  --bg-2:#f3f2eb;
  --card:#ffffff;
  --ink:#191917;
  --ink-2:#3d3c38;
  --ink-3:#7a7973;
  --ink-4:#b5b3aa;
  --line:#ece9df;
  --line-2:#dcd8c9;
  --accent:#5963f5;
  --accent-2:#e8eaff;
  --warm:#d97757;

  position:absolute;inset:0;background:var(--bg);color:var(--ink);
  font-family:"Geist","Noto Sans SC",sans-serif;font-size:14.5px;line-height:1.6;
  -webkit-font-smoothing:antialiased;letter-spacing:-.003em;
  overflow:hidden;
}
.dir-d *{box-sizing:border-box}
.dir-d .display{font-family:"Instrument Serif","Noto Serif SC",serif;font-style:italic;letter-spacing:-.015em}

/* ─── Landing ─── */
.dir-d .d-nav{display:flex;align-items:center;justify-content:space-between;padding:22px 36px}
.dir-d .d-logo{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;letter-spacing:-.005em}
.dir-d .d-logo .mark{
  width:28px;height:28px;border-radius:50%;background:var(--ink);color:var(--bg);
  display:flex;align-items:center;justify-content:center;
  font-family:"Instrument Serif",serif;font-style:italic;font-size:18px;line-height:1;
}
.dir-d .d-nav-links{display:flex;gap:28px;font-size:13px;color:var(--ink-3)}
.dir-d .d-nav-links a{color:inherit;text-decoration:none}
.dir-d .d-nav-right{display:flex;align-items:center;gap:14px;font-size:13px;color:var(--ink-3)}
.dir-d .d-pill{padding:6px 12px;border:1px solid var(--line);border-radius:999px;font-size:12px;color:var(--ink-2);background:var(--card)}
.dir-d .d-cta{padding:8px 18px;background:var(--ink);color:var(--bg);border-radius:999px;border:0;font-size:13px;font-weight:500;cursor:pointer}

/* hero centered */
.dir-d .d-hero{display:flex;flex-direction:column;align-items:center;padding:60px 36px 36px;text-align:center}
.dir-d .d-greet{font-family:"Instrument Serif","Noto Serif SC",serif;font-style:italic;font-size:76px;line-height:1.05;letter-spacing:-.02em;margin:0;color:var(--ink);font-weight:400}
.dir-d .d-greet .wave{display:inline-block;animation:wave 2s ease-in-out infinite;transform-origin:70% 70%}
@keyframes wave{0%,60%,100%{transform:rotate(0)}10%,30%{transform:rotate(14deg)}20%,40%{transform:rotate(-8deg)}}
.dir-d .d-sub{font-size:18px;color:var(--ink-3);margin-top:16px;max-width:38ch;line-height:1.5}

/* the input */
.dir-d .d-input{
  margin-top:36px;max-width:760px;width:100%;
  background:var(--card);border:1px solid var(--line);border-radius:24px;
  padding:18px 22px 14px;
  box-shadow:0 12px 40px -16px rgba(89,99,245,.18), 0 2px 0 rgba(89,99,245,.04);
  position:relative;
}
.dir-d .d-input .placeholder{font-size:16px;color:var(--ink-3);text-align:left;padding:6px 0 14px}
.dir-d .d-input .placeholder b{color:var(--ink);font-weight:400}
.dir-d .d-input-row{display:flex;align-items:center;justify-content:space-between;padding-top:14px;border-top:1px solid var(--line)}
.dir-d .d-input-tools{display:flex;gap:8px}
.dir-d .d-tool-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:1px solid var(--line);background:var(--bg);color:var(--ink-2);border-radius:999px;font-size:12.5px;cursor:default}
.dir-d .d-tool-btn .ic{color:var(--ink-3)}
.dir-d .d-send{width:38px;height:38px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;border:0}

/* commands menu */
.dir-d .d-cmd-list{margin-top:14px;max-width:760px;width:100%}
.dir-d .d-cmd-head{font-size:11px;letter-spacing:.1em;color:var(--ink-3);text-transform:uppercase;margin-bottom:10px;display:flex;justify-content:space-between;font-weight:500}
.dir-d .d-cmd-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.dir-d .d-cmd{
  display:grid;grid-template-columns:34px 1fr auto;gap:12px;align-items:center;
  padding:12px 14px;background:var(--card);border:1px solid var(--line);border-radius:14px;cursor:default;
  transition:.15s;
}
.dir-d .d-cmd:hover{border-color:var(--ink-4);transform:translateY(-1px)}
.dir-d .d-cmd .ic{width:34px;height:34px;border-radius:10px;background:var(--bg-2);display:flex;align-items:center;justify-content:center;color:var(--ink-2)}
.dir-d .d-cmd.acc .ic{background:var(--accent-2);color:var(--accent)}
.dir-d .d-cmd .name{font-size:13.5px;font-weight:500;color:var(--ink)}
.dir-d .d-cmd .name .slash{font-family:"Geist Mono",monospace;font-size:11px;color:var(--ink-3);font-weight:400;margin-left:8px}
.dir-d .d-cmd .desc{font-size:12px;color:var(--ink-3);margin-top:2px}
.dir-d .d-cmd .kbd{font-family:"Geist Mono",monospace;font-size:10px;color:var(--ink-4);background:var(--bg-2);border:1px solid var(--line);padding:2px 6px;border-radius:4px;letter-spacing:.04em}

/* footer hint */
.dir-d .d-foot{position:absolute;bottom:24px;left:0;right:0;text-align:center;font-size:12px;color:var(--ink-3)}
.dir-d .d-foot kbd{font-family:"Geist Mono",monospace;font-size:11px;padding:2px 6px;border-radius:4px;border:1px solid var(--line);background:var(--card);color:var(--ink-2);margin:0 3px}

/* ─── Product (chat in progress) ─── */
.dir-d .pd{display:grid;grid-template-columns:240px 1fr;height:100%}
.dir-d .pd-side{background:var(--bg-2);border-right:1px solid var(--line);padding:20px 14px;display:flex;flex-direction:column;gap:4px;overflow:hidden}
.dir-d .pd-side-top{display:flex;align-items:center;justify-content:space-between;padding:0 6px 16px;border-bottom:1px solid var(--line);margin-bottom:14px}
.dir-d .pd-side-top .who{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:500}
.dir-d .pd-side-top .who .av{width:28px;height:28px;border-radius:50%;background:var(--ink);color:var(--bg);display:flex;align-items:center;justify-content:center;font-family:"Instrument Serif",serif;font-style:italic;font-size:14px}
.dir-d .pd-side .new-btn{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--card);border:1px solid var(--line);border-radius:10px;font-size:13px;margin-bottom:14px;color:var(--ink);cursor:default}
.dir-d .pd-side .new-btn .kbd{font-family:"Geist Mono",monospace;font-size:10px;color:var(--ink-3);background:var(--bg);border:1px solid var(--line);padding:1px 5px;border-radius:3px}
.dir-d .pd-side h6{margin:14px 8px 6px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);font-weight:500}
.dir-d .pd-thread{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;font-size:12.5px;color:var(--ink-2);cursor:default}
.dir-d .pd-thread:hover{background:var(--card)}
.dir-d .pd-thread.active{background:var(--card);color:var(--ink);border:1px solid var(--line)}
.dir-d .pd-thread .dot{width:5px;height:5px;border-radius:50%;background:var(--accent)}
.dir-d .pd-thread .title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dir-d .pd-thread .ago{font-size:10px;color:var(--ink-4);font-family:"Geist Mono",monospace}

.dir-d .pd-main{display:flex;flex-direction:column;height:100%;overflow:hidden}
.dir-d .pd-top{padding:14px 28px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--ink-3)}
.dir-d .pd-top .title{color:var(--ink);font-family:"Instrument Serif",serif;font-style:italic;font-size:18px}
.dir-d .pd-top .actions{display:flex;gap:8px}
.dir-d .icon-btn-d{width:32px;height:32px;border-radius:8px;border:1px solid var(--line);background:var(--card);display:flex;align-items:center;justify-content:center;color:var(--ink-2)}

.dir-d .pd-feed{flex:1;overflow:hidden;padding:24px 36px 8px;display:flex;flex-direction:column;gap:22px}
.dir-d .msg{display:flex;gap:14px;max-width:780px;width:100%;margin:0 auto}
.dir-d .msg .av{width:32px;height:32px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;background:var(--bg-2);border:1px solid var(--line);color:var(--ink-2)}
.dir-d .msg.ai .av{background:var(--ink);color:var(--bg);border-color:var(--ink);font-family:"Instrument Serif",serif;font-style:italic;font-weight:400}
.dir-d .msg.me{flex-direction:row-reverse;text-align:right}
.dir-d .msg.me .bub{background:var(--accent-2);color:var(--ink);border-radius:18px 18px 6px 18px;padding:12px 16px;max-width:520px}
.dir-d .msg.ai .bub{font-size:15px;line-height:1.65;max-width:none;color:var(--ink)}
.dir-d .msg.ai .bub p{margin:0 0 10px}
.dir-d .msg.ai .bub b{color:var(--ink);font-weight:600}

/* rich card embedded in chat */
.dir-d .rich-card{margin-top:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;font-size:13px;line-height:1.55}
.dir-d .rich-card .rc-h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--line)}
.dir-d .rich-card .rc-h .t{font-family:"Instrument Serif",serif;font-style:italic;font-size:18px;color:var(--ink)}
.dir-d .rich-card .rc-h .badge{font-family:"Geist Mono",monospace;font-size:10px;background:var(--accent-2);color:var(--accent);padding:3px 8px;border-radius:4px;letter-spacing:.04em}

.dir-d .ba-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.dir-d .ba-cell{padding:12px 14px;border-radius:8px;font-size:12.5px;line-height:1.55}
.dir-d .ba-cell.before{background:#fef2f0;color:var(--ink-2);border:1px solid #f2d7d2}
.dir-d .ba-cell.after{background:#eef4ee;color:var(--ink);border:1px solid #c9dec9}
.dir-d .ba-cell .lbl{font-family:"Geist Mono",monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px;font-weight:500;display:block}

.dir-d .rc-actions{display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}
.dir-d .rc-btn{padding:7px 14px;border:1px solid var(--line);background:var(--bg-2);color:var(--ink-2);border-radius:999px;font-size:12px;cursor:default;display:inline-flex;align-items:center;gap:5px}
.dir-d .rc-btn.acc{background:var(--ink);color:#fff;border-color:var(--ink)}

/* suggestion chips below feed */
.dir-d .pd-sugg{display:flex;gap:8px;padding:0 36px 12px;flex-wrap:wrap;max-width:840px;margin:0 auto}
.dir-d .pd-sugg-chip{font-size:12.5px;padding:7px 14px;background:var(--card);border:1px solid var(--line);border-radius:999px;color:var(--ink-2);cursor:default;display:inline-flex;align-items:center;gap:5px}
.dir-d .pd-sugg-chip .ic{color:var(--accent)}

/* input bar at bottom */
.dir-d .pd-input{padding:14px 36px 20px;max-width:840px;margin:0 auto;width:100%}
.dir-d .pd-input-box{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:14px 18px 10px;box-shadow:0 6px 24px -10px rgba(0,0,0,.06)}
.dir-d .pd-input-box .ph{font-size:14px;color:var(--ink-3);padding-bottom:10px}
.dir-d .pd-input-row{display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid var(--line)}
`;

// ─── D. Landing ─────────────────────────────────────────────────────────
const D_Landing = () => (
  <div className="dir-d">
    <style>{DIR_D_CSS}</style>

    <div className="d-nav">
      <div className="d-logo">
        <span className="mark">C</span>
        <span>Coach · <i style={{fontFamily:"Instrument Serif",fontStyle:"italic",color:"var(--ink-3)",fontWeight:400}}>your career copilot</i></span>
      </div>
      <div className="d-nav-links">
        <a>能力</a><a>定价</a><a>校招故事</a><a>团队</a>
      </div>
      <div className="d-nav-right">
        <span className="d-pill">EN / 中</span>
        <span>登录</span>
        <button className="d-cta">开始对话</button>
      </div>
    </div>

    <div className="d-hero">
      <h1 className="d-greet">
        你好，明 <span className="wave">👋</span><br/>
        今天<em style={{color:"var(--accent)"}}>怎么帮你？</em>
      </h1>
      <p className="d-sub">
        把你正在卡住的地方告诉我 —— 简历、面试、薪资、选择、焦虑都可以。
        我是你的 AI 求职教练，<em style={{fontFamily:"Instrument Serif",fontStyle:"italic"}}>整个工具箱</em>就在这一个对话里。
      </p>

      <div className="d-input">
        <div className="placeholder">
          <b>例：</b>"帮我把这份简历改成投字节前端的版本" · "我想模拟一次美团二面" · "今天投了 0 份简历，我该不该休息" ……
        </div>
        <div className="d-input-row">
          <div className="d-input-tools">
            <div className="d-tool-btn"><span className="ic">{window.IK.doc}</span><span>附简历</span></div>
            <div className="d-tool-btn"><span className="ic">{window.IK.link}</span><span>贴 JD</span></div>
            <div className="d-tool-btn"><span className="ic">{window.IK.mic}</span><span>语音</span></div>
            <div className="d-tool-btn" style={{background:"var(--accent-2)",borderColor:"var(--accent-2)",color:"var(--accent)"}}>
              <span className="ic" style={{color:"var(--accent)"}}>{window.IK.command}</span><span>命令</span>
            </div>
          </div>
          <button className="d-send">{window.IK.send}</button>
        </div>
      </div>

      <div className="d-cmd-list">
        <div className="d-cmd-head">
          <span>命令面板 · 一句话直达任何工具</span>
          <span style={{fontFamily:"Geist Mono",fontSize:10,color:"var(--ink-4)"}}>按 / 快速调用</span>
        </div>
        <div className="d-cmd-grid">
          <div className="d-cmd acc">
            <div className="ic">{window.IK.doc}</div>
            <div>
              <div className="name">诊断这份简历 <span className="slash">/diagnose</span></div>
              <div className="desc">贴 JD + 简历 → 匹配度 + 改写建议</div>
            </div>
            <span className="kbd">⌘ D</span>
          </div>
          <div className="d-cmd">
            <div className="ic">{window.IK.mic}</div>
            <div>
              <div className="name">来一次模拟面试 <span className="slash">/mock</span></div>
              <div className="desc">岗位定制 · 语音 · 自动评分</div>
            </div>
            <span className="kbd">⌘ M</span>
          </div>
          <div className="d-cmd">
            <div className="ic">{window.IK.money}</div>
            <div>
              <div className="name">这个薪资值得签吗 <span className="slash">/salary</span></div>
              <div className="desc">同岗同校 P 分位 · 谈判建议</div>
            </div>
            <span className="kbd">⌘ S</span>
          </div>
          <div className="d-cmd">
            <div className="ic">{window.IK.send}</div>
            <div>
              <div className="name">写一封求职信 <span className="slash">/cover</span></div>
              <div className="desc">针对 JD 定制 · 三种语气</div>
            </div>
            <span className="kbd">⌘ L</span>
          </div>
          <div className="d-cmd">
            <div className="ic">{window.IK.brief}</div>
            <div>
              <div className="name">看看我的投递进度 <span className="slash">/pipeline</span></div>
              <div className="desc">funnel · 节点提醒 · 下一步</div>
            </div>
            <span className="kbd">⌘ P</span>
          </div>
          <div className="d-cmd">
            <div className="ic">{window.IK.globe}</div>
            <div>
              <div className="name">三年后我会在哪 <span className="slash">/career</span></div>
              <div className="desc">技能盘点 · 路径建议 · 校友参考</div>
            </div>
            <span className="kbd">⌘ C</span>
          </div>
        </div>
      </div>
    </div>

    <div className="d-foot">
      <kbd>/</kbd> 调出命令 · <kbd>⌘ K</kbd> 搜索 · <kbd>⌘ ↵</kbd> 发送 · <span style={{opacity:.7}}>所有对话端到端加密 · 不用于训练</span>
    </div>
  </div>
);

// ─── D. Product (chat in progress with rich card) ───────────────────────
const D_Product = () => (
  <div className="dir-d">
    <style>{DIR_D_CSS}</style>
    <div className="pd">
      {/* side */}
      <div className="pd-side">
        <div className="pd-side-top">
          <div className="who"><span className="av">M</span><span>明</span></div>
          <span style={{fontSize:12,color:"var(--ink-3)"}}>···</span>
        </div>

        <div className="new-btn">
          <span style={{display:"flex",alignItems:"center",gap:8}}>{window.IK.plus}<span>新对话</span></span>
          <span className="kbd">⌘ N</span>
        </div>

        <h6>今天</h6>
        <div className="pd-thread active">
          <span className="dot"></span>
          <span className="title">改简历 · 字节前端</span>
          <span className="ago">2m</span>
        </div>
        <div className="pd-thread">
          <span className="title">美团二面复盘</span>
          <span className="ago">1h</span>
        </div>

        <h6>本周</h6>
        <div className="pd-thread">
          <span className="title">offer 比较 · 字节 vs Shopee</span>
          <span className="ago">2d</span>
        </div>
        <div className="pd-thread">
          <span className="title">三年后做产品还是技术</span>
          <span className="ago">3d</span>
        </div>
        <div className="pd-thread">
          <span className="title">投递焦虑 · 怎么办</span>
          <span className="ago">5d</span>
        </div>

        <h6>固定</h6>
        <div className="pd-thread">
          <span className="title" style={{color:"var(--warm)"}}>📌 我的简历 · 主版本</span>
        </div>
        <div className="pd-thread">
          <span className="title" style={{color:"var(--warm)"}}>📌 心仪岗位 · 6 个</span>
        </div>
      </div>

      {/* main */}
      <div className="pd-main">
        <div className="pd-top">
          <div className="title">改简历 · 字节前端</div>
          <div style={{display:"flex",gap:12,fontSize:12,alignItems:"center"}}>
            <span style={{color:"var(--ink-3)"}}>使用 <b style={{color:"var(--ink)"}}>简历馆 · JD 匹配</b> 工具</span>
            <div className="actions">
              <button className="icon-btn-d">{window.IK.download}</button>
              <button className="icon-btn-d">{window.IK.bookmark}</button>
              <button className="icon-btn-d">{window.IK.more}</button>
            </div>
          </div>
        </div>

        <div className="pd-feed">
          <div className="msg me">
            <div className="av">M</div>
            <div className="bub">
              帮我把这一条 bullet 改成投<b>字节前端</b>的版本，<br/>
              原文："使用 React 重构了一个旧项目，提升了页面加载速度"
            </div>
          </div>

          <div className="msg ai">
            <div className="av">C</div>
            <div className="bub">
              <p>好。这条 bullet 最大的问题是 <b>没有数字</b> —— 字节 HR 平均 6 秒扫一份简历，没有数字就没有记忆点。我从你之前贴过的项目背景里抽了几个数据点，给你三个改法：</p>

              <div className="rich-card">
                <div className="rc-h">
                  <div className="t">3 个改写方向 ——</div>
                  <span className="badge">JD MATCH +18%</span>
                </div>

                <div className="ba-pair">
                  <div className="ba-cell before">
                    <span className="lbl">原文 · BEFORE</span>
                    使用 React 重构了一个旧项目，提升了页面加载速度。
                  </div>
                  <div className="ba-cell after">
                    <span className="lbl">方向 A · 数据驱动</span>
                    主导 jQuery 项目向 React 18 + SSR 迁移，<b>FCP −72%（3.2s → 0.9s）</b>，日活 PV +18%。
                  </div>
                </div>

                <div className="ba-pair">
                  <div className="ba-cell after" style={{gridColumn:"1 / -1"}}>
                    <span className="lbl">方向 B · 强调架构能力（更贴 JD "架构" 关键词）</span>
                    重新设计前端架构：jQuery → React 18 + Next.js SSR，引入 Turborepo Monorepo，FCP 从 3.2s 降至 0.9s，团队迭代效率 +40%。
                  </div>
                </div>

                <div className="ba-pair">
                  <div className="ba-cell after" style={{gridColumn:"1 / -1"}}>
                    <span className="lbl">方向 C · 强调影响力（更贴 "Tech Lead" 关键词）</span>
                    作为 Tech Lead 推动旧版 jQuery 重构至 React 18 + SSR：交付后 FCP −72%、PV +18%；同时 mentor 3 名工程师，沉淀团队前端规范。
                  </div>
                </div>

                <div className="rc-actions">
                  <button className="rc-btn acc">{window.IK.check}<span>采纳 A</span></button>
                  <button className="rc-btn">采纳 B</button>
                  <button className="rc-btn">采纳 C</button>
                  <button className="rc-btn" style={{marginLeft:"auto"}}>{window.IK.refresh}<span>再来三个</span></button>
                </div>
              </div>

              <p style={{marginTop:14}}>顺便提醒 —— 你简历里类似"参与"、"负责"、"使用"的动词还有 <b>4 处</b>，要不要一起改了？</p>
            </div>
          </div>
        </div>

        <div className="pd-sugg">
          <div className="pd-sugg-chip"><span className="ic">{window.IK.spark}</span><span>一起改掉那 4 处</span></div>
          <div className="pd-sugg-chip"><span className="ic">{window.IK.doc}</span><span>看看整份简历的匹配度</span></div>
          <div className="pd-sugg-chip"><span className="ic">{window.IK.mic}</span><span>用这份简历模拟字节一面</span></div>
          <div className="pd-sugg-chip"><span className="ic">{window.IK.help}</span><span>字节前端面试常问什么</span></div>
        </div>

        <div className="pd-input">
          <div className="pd-input-box">
            <div className="ph">继续追问 —— 例如"那把第二段实习经历也按 A 方向改一下"</div>
            <div className="pd-input-row">
              <div style={{display:"flex",gap:8}}>
                <div className="d-tool-btn"><span className="ic">{window.IK.doc}</span><span>附件</span></div>
                <div className="d-tool-btn"><span className="ic">{window.IK.command}</span><span>/ 命令</span></div>
                <div className="d-tool-btn"><span className="ic">{window.IK.mic}</span></div>
              </div>
              <button className="d-send">{window.IK.send}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

Object.assign(window, { D_Landing, D_Product });
