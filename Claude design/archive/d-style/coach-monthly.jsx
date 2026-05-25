// 月刊 — 时效内容层 (面经为主)
// Two screens: Feed (list) + Article (detail)

const COACH_MONTHLY_CSS = `
.coach .monthly-wrap{display:grid;grid-template-columns:1fr 280px;gap:24px;height:100%;align-items:start;min-height:0}
.coach .monthly-wrap > .feed{display:flex;flex-direction:column;gap:14px;min-width:0;min-height:0;overflow:hidden}

/* feed hero — current issue cover */
.coach .issue-cover{background:var(--ink);color:var(--bg);border-radius:16px;padding:0;display:grid;grid-template-columns:1.2fr 1fr;gap:0;overflow:hidden;border:1px solid var(--ink)}
.coach .issue-cover .text{padding:28px 30px;display:flex;flex-direction:column}
.coach .issue-cover .tag{display:flex;justify-content:space-between;font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.1em;color:rgba(255,255,255,.55);text-transform:uppercase;margin-bottom:18px;border-bottom:1px solid rgba(255,255,255,.15);padding-bottom:8px}
.coach .issue-cover h2{margin:0;font-family:"Instrument Serif",serif;font-size:50px;line-height:1;font-weight:400;letter-spacing:-.02em;color:var(--bg)}
.coach .issue-cover h2 em{color:var(--warm);font-style:italic}
.coach .issue-cover .deck{font-family:"Instrument Serif",serif;font-style:italic;font-size:17px;line-height:1.5;color:rgba(255,255,255,.78);margin-top:18px;max-width:42ch}
.coach .issue-cover .meta{display:flex;justify-content:space-between;margin-top:auto;padding-top:18px;border-top:1px solid rgba(255,255,255,.12);font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.08em;color:rgba(255,255,255,.5);text-transform:uppercase}
.coach .issue-cover .vis{background:linear-gradient(135deg,#c4a878,#8b7148);position:relative;min-height:220px}
.coach .issue-cover .vis::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 30% 20%,rgba(255,255,255,.25) 0%,transparent 50%),radial-gradient(circle at 70% 80%,rgba(0,0,0,.18) 0%,transparent 50%)}
.coach .issue-cover .vis .overlay{position:absolute;top:24px;left:24px;font-family:"Instrument Serif",serif;font-style:italic;color:rgba(255,255,255,.95);font-size:36px;line-height:.98;z-index:2;max-width:80%}
.coach .issue-cover .vis .credit{position:absolute;bottom:14px;right:18px;color:rgba(255,255,255,.7);font-family:"Geist Mono",monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;z-index:2}

/* feed filter tabs */
.coach .feed-tabs{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:0}
.coach .feed-tabs .tabs{display:flex;gap:2px}
.coach .feed-tab{appearance:none;border:0;background:transparent;color:var(--ink-3);padding:10px 14px;font-size:13.5px;font-weight:500;letter-spacing:-.003em;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:default;display:flex;align-items:center;gap:6px}
.coach .feed-tab.active{color:var(--ink);border-bottom-color:var(--accent)}
.coach .feed-tab .cnt{font-family:"Geist Mono",monospace;font-size:10px;color:var(--ink-4);background:var(--bg-2);padding:1px 6px;border-radius:999px}
.coach .feed-tab.active .cnt{background:var(--accent-2);color:var(--accent-3)}
.coach .feed-toolbar{display:flex;gap:8px;align-items:center;font-size:12px;color:var(--ink-3)}

/* feed list */
.coach .feed-list{display:flex;flex-direction:column;gap:0;overflow:hidden;min-height:0}
.coach .feed-card{display:grid;grid-template-columns:1fr 200px;gap:20px;padding:20px 4px 20px 4px;border-bottom:1px solid var(--line);align-items:start}
.coach .feed-card.personal{background:linear-gradient(90deg,var(--accent-2) 0%,transparent 60%);border-radius:12px;border:1px solid var(--accent-2);padding:18px 20px;margin-bottom:6px}
.coach .feed-card .meta-row{display:flex;align-items:center;gap:10px;font-size:11.5px;color:var(--ink-3);margin-bottom:8px;font-family:"Geist",sans-serif}
.coach .feed-card .meta-row .ch{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;font-size:10.5px;letter-spacing:.04em}
.coach .feed-card .meta-row .ch.interview{background:var(--good-2);color:var(--good)}
.coach .feed-card .meta-row .ch.hot{background:var(--bad-2);color:var(--bad)}
.coach .feed-card .meta-row .ch.story{background:var(--warm-2);color:var(--warm)}
.coach .feed-card .meta-row .ch.qbank{background:var(--accent-2);color:var(--accent-3)}
.coach .feed-card .meta-row .ch.personal{background:var(--ink);color:var(--bg)}
.coach .feed-card h3{margin:0 0 8px;font-family:"Instrument Serif",serif;font-size:24px;line-height:1.2;font-weight:400;letter-spacing:-.01em;color:var(--ink)}
.coach .feed-card p{margin:0;font-size:13.5px;line-height:1.55;color:var(--ink-3);max-width:62ch}
.coach .feed-card .stats-line{margin-top:10px;font-size:11.5px;color:var(--ink-4);font-family:"Geist Mono",monospace;display:flex;gap:14px}
.coach .feed-card .stats-line b{color:var(--ink-3);font-weight:500}
.coach .feed-card .photo{height:120px;border-radius:8px;position:relative;overflow:hidden}
.coach .feed-card .photo::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.25),transparent 55%),radial-gradient(circle at 70% 75%,rgba(0,0,0,.18),transparent 55%)}
.coach .feed-card .photo .badge{position:absolute;bottom:10px;left:12px;font-family:"Geist Mono",monospace;font-size:10px;color:rgba(255,255,255,.85);letter-spacing:.08em;text-transform:uppercase;z-index:2}

/* right rail */
.coach .monthly-rail{display:flex;flex-direction:column;gap:14px}
.coach .rail-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.coach .rail-card h4{margin:0 0 10px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);font-weight:500;display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--line);padding-bottom:8px}
.coach .rail-card h4 a{font-family:"Geist",sans-serif;color:var(--accent);text-decoration:none;font-weight:500;font-size:11px;letter-spacing:0;text-transform:none}

.coach .topic-cloud{display:flex;flex-wrap:wrap;gap:5px}
.coach .topic-cloud .t{font-size:11px;padding:3px 9px;border-radius:999px;background:var(--bg-2);color:var(--ink-2);border:1px solid var(--line);font-family:"Geist",sans-serif}
.coach .topic-cloud .t.hot{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.coach .topic-cloud .t.hot::before{content:"●";color:var(--bad);margin-right:4px;font-size:8px;vertical-align:middle}

.coach .ranking-row{display:grid;grid-template-columns:18px 1fr auto;gap:8px;align-items:baseline;font-size:12px;padding:6px 0;border-bottom:1px dotted var(--line)}
.coach .ranking-row:last-child{border-bottom:0}
.coach .ranking-row .n{font-family:"Instrument Serif",serif;font-style:italic;color:var(--accent);font-size:14px;line-height:1}
.coach .ranking-row .name{color:var(--ink);font-weight:500}
.coach .ranking-row .name .role{display:block;font-size:10.5px;color:var(--ink-3);font-weight:400}
.coach .ranking-row .v{font-family:"Geist Mono",monospace;font-size:10.5px;color:var(--ink-3)}

/* ─── article view ─── */
.coach .article-wrap{display:grid;grid-template-columns:160px 1fr 280px;gap:36px;height:100%;align-items:start;min-height:0}
.coach .article-side{font-size:11px;letter-spacing:.08em;color:var(--ink-3);text-transform:uppercase}
.coach .article-side h6{margin:0 0 10px;font-size:10px;font-weight:600}
.coach .article-side .ts{font-family:"Instrument Serif",serif;font-style:italic;font-size:24px;color:var(--accent);text-transform:none;letter-spacing:-.01em;line-height:1}
.coach .article-side .ts-sub{font-family:"Geist",sans-serif;font-size:11px;color:var(--ink-3);text-transform:none;letter-spacing:0;margin-top:2px}
.coach .article-side .toc{margin-top:18px;display:flex;flex-direction:column;gap:6px}
.coach .article-side .toc-item{font-family:"Geist",sans-serif;font-size:12px;color:var(--ink-2);text-transform:none;letter-spacing:0;display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dotted var(--line)}
.coach .article-side .toc-item.active{color:var(--accent);font-weight:500}
.coach .article-side .toc-item .pg{font-family:"Geist Mono",monospace;color:var(--ink-4)}

.coach .article-body{overflow:hidden;min-height:0}
.coach .article-body .crumb-tags{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
.coach .article-body h1.title{margin:0;font-family:"Instrument Serif",serif;font-size:52px;line-height:1.04;letter-spacing:-.02em;font-weight:400;color:var(--ink)}
.coach .article-body h1.title em{color:var(--accent);font-style:italic}
.coach .article-body .deck{font-family:"Instrument Serif",serif;font-style:italic;font-size:20px;line-height:1.4;color:var(--ink-2);margin:16px 0;max-width:42ch}
.coach .article-body .byline{font-family:"Geist Mono",monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:8px 0;display:flex;justify-content:space-between;margin-bottom:20px}
.coach .article-body .byline b{color:var(--ink);font-weight:500}
.coach .article-body .lede{column-count:2;column-gap:28px;font-size:14px;line-height:1.7;color:var(--ink-2);max-height:165px;overflow:hidden}
.coach .article-body .lede p{margin:0 0 10px}
.coach .article-body .lede p:first-child::first-letter{font-family:"Instrument Serif",serif;font-style:italic;font-size:64px;line-height:.85;float:left;padding:6px 8px 0 0;color:var(--accent)}

/* questions extracted */
.coach .q-extracted{margin-top:24px;background:var(--bg-2);border-radius:12px;padding:18px;border:1px solid var(--line)}
.coach .q-extracted .h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px}
.coach .q-extracted .h h3{margin:0;font-family:"Instrument Serif",serif;font-style:italic;font-size:22px;font-weight:400;letter-spacing:-.01em}
.coach .q-extracted .h .meta{font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}
.coach .q-row{display:grid;grid-template-columns:36px 1fr auto;gap:14px;align-items:start;padding:11px 0;border-top:1px solid var(--line);font-size:12.5px}
.coach .q-row:first-of-type{border-top:0;padding-top:4px}
.coach .q-row .n{font-family:"Instrument Serif",serif;font-style:italic;font-size:18px;color:var(--accent);line-height:1.1}
.coach .q-row .qbody .qtype{font-family:"Geist Mono",monospace;font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin-bottom:2px}
.coach .q-row .qbody .qtxt{color:var(--ink);font-size:13px;line-height:1.45}
.coach .q-row .qbody .qyou{font-size:11.5px;color:var(--ink-3);margin-top:4px}
.coach .q-row .qbody .qyou.warn{color:var(--bad)}
.coach .q-row .diff{font-size:10px;color:var(--ink-3);font-family:"Geist Mono",monospace;letter-spacing:.06em;text-transform:uppercase;text-align:right;white-space:nowrap}
.coach .q-row .diff .lv{display:block;font-family:"Instrument Serif",serif;font-style:italic;font-size:16px;color:var(--ink);text-transform:none;letter-spacing:-.01em;margin-bottom:2px;line-height:1}

/* takeaways */
.coach .takeaways{margin-top:20px;padding-top:18px;border-top:1px solid var(--line)}
.coach .takeaways h3{margin:0 0 12px;font-family:"Instrument Serif",serif;font-style:italic;font-size:22px;font-weight:400}
.coach .takeaway{display:grid;grid-template-columns:22px 1fr;gap:10px;padding:8px 0;font-size:13.5px;line-height:1.55;color:var(--ink-2)}
.coach .takeaway .n{font-family:"Instrument Serif",serif;font-style:italic;color:var(--accent);font-size:18px;line-height:1.1}

/* article right rail */
.coach .article-rail{display:flex;flex-direction:column;gap:14px}
.coach .ar-coach{background:var(--ink);color:var(--bg);border-radius:14px;padding:18px}
.coach .ar-coach .who{display:flex;align-items:center;gap:8px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:10px}
.coach .ar-coach .who .av{width:18px;height:18px;border-radius:50%;background:var(--warm);color:var(--ink);display:flex;align-items:center;justify-content:center;font-family:"Instrument Serif",serif;font-style:italic;font-size:11px}
.coach .ar-coach .body{font-family:"Instrument Serif",serif;font-style:italic;font-size:15px;line-height:1.5;color:var(--bg)}
.coach .ar-coach .actions{display:flex;flex-direction:column;gap:6px;margin-top:14px}
.coach .ar-coach .actions .b{font-size:11.5px;padding:7px 12px;border-radius:8px;background:rgba(255,255,255,.08);color:var(--bg);border:1px solid rgba(255,255,255,.12);text-align:left;display:flex;align-items:center;gap:8px;cursor:default;font-family:"Geist",sans-serif}
.coach .ar-coach .actions .b .ic{color:var(--warm)}

.coach .related-row{display:flex;flex-direction:column;gap:4px}
.coach .related{display:flex;gap:10px;padding:8px 0;border-top:1px dotted var(--line);font-size:12px}
.coach .related:first-of-type{border-top:0}
.coach .related .ph{width:46px;height:38px;border-radius:6px;flex-shrink:0;background:linear-gradient(135deg,#d8c9a8,#a89572)}
.coach .related b{display:block;color:var(--ink);font-size:12.5px;font-weight:500;line-height:1.3}
.coach .related span{color:var(--ink-3);font-size:11px}
`;

const MonthlyFeed = () => {
  const hero = window.COACH_MONTHLY_HERO;
  const feed = window.COACH_FEED;
  return (
    <div className="coach">
      <style>{window.COACH_CSS}</style>
      <style>{COACH_MONTHLY_CSS}</style>
      <div className="app">
        <window.CoachSide active="monthly" />
        <div className="main">
          <window.CoachTopbar
            crumb={["校招月刊 · Vol.24 · No.5"]}
            title
            actions={<>
              <button className="btn ghost sm">{window.IK.search}<span>搜面经</span></button>
              <button className="btn sm">{window.IK.plus}<span>写一篇</span></button>
            </>}
          />

          <div className="scroll">
            <div className="monthly-wrap">
              <div className="feed">
                {/* Issue cover */}
                <div className="issue-cover">
                  <div className="text">
                    <div className="tag">
                      <span>{hero.issue}</span>
                      <span>{hero.date} · 实时更新</span>
                    </div>
                    <h2>{hero.headline.pre}<em>{hero.headline.em}</em></h2>
                    <p className="deck">{hero.deck}</p>
                    <div className="meta">
                      <span>{hero.reads}</span>
                      <span>248 阅读 · 32 收藏</span>
                    </div>
                  </div>
                  <div className="vis">
                    <span className="overlay">「具体」<br/>是最被低估的<br/>能力。</span>
                    <span className="credit">封面 / Coach 编辑部</span>
                  </div>
                </div>

                {/* Tabs + toolbar */}
                <div className="feed-tabs">
                  <div className="tabs">
                    <button className="feed-tab active"><span>全部</span><span className="cnt">128</span></button>
                    <button className="feed-tab"><span>面经</span><span className="cnt">64</span></button>
                    <button className="feed-tab"><span>热点</span><span className="cnt">18</span></button>
                    <button className="feed-tab"><span>故事</span><span className="cnt">22</span></button>
                    <button className="feed-tab"><span>题库</span><span className="cnt">12</span></button>
                    <button className="feed-tab"><span>编辑精选</span><span className="cnt">12</span></button>
                  </div>
                  <div className="feed-toolbar">
                    <span>排序</span>
                    <span className="chip">最新发布</span>
                    <button className="icon-btn">{window.IK.filter}</button>
                  </div>
                </div>

                {/* feed cards */}
                <div className="feed-list">
                  {feed.map((f, i) => (
                    <div key={i} className={"feed-card" + (f.kind === "personal" ? " personal" : "")}>
                      <div>
                        <div className="meta-row">
                          <span className={"ch " + f.kind}>{f.tag}</span>
                          <span>·</span>
                          <span>{f.co !== "—" ? f.co + " · " : ""}{f.role !== "—" ? f.role + " · " : ""}{f.when}</span>
                          <span>·</span>
                          <span>{f.who}</span>
                        </div>
                        <h3>{f.title}</h3>
                        <p>{f.excerpt}</p>
                        {f.likes > 0 ? (
                          <div className="stats-line">
                            <span>♥ <b>{f.likes.toLocaleString()}</b></span>
                            <span>💬 <b>{f.comments}</b></span>
                            <span>阅读约 5 分钟</span>
                          </div>
                        ) : (
                          <div className="stats-line">
                            <span style={{ color: "var(--accent)" }}>● 自动生成 · 等你查看</span>
                          </div>
                        )}
                      </div>
                      <div className="photo" style={{ background: `linear-gradient(135deg, hsl(${f.hue} 35% 60%), hsl(${f.hue + 25} 30% 38%))` }}>
                        <span className="badge">{f.co !== "—" ? f.co : f.kind.toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT RAIL */}
              <div className="monthly-rail">
                <div className="rail-card">
                  <h4><span>本周热门话题</span><a>全部</a></h4>
                  <div className="topic-cloud">
                    <span className="t hot">字节二面</span>
                    <span className="t hot">PDD 996</span>
                    <span className="t">Tech Lead</span>
                    <span className="t">SSR / hydration</span>
                    <span className="t hot">offer 谈判</span>
                    <span className="t">秋招倒计时</span>
                    <span className="t">海外校招</span>
                    <span className="t">STAR 法则</span>
                    <span className="t">反问环节</span>
                  </div>
                </div>

                <div className="rail-card">
                  <h4><span>校友 · 5 月 Offer</span><a>提交我的</a></h4>
                  <div className="ranking-row">
                    <span className="n">1</span>
                    <div className="name">张明<span className="role">前端 · 字节 · 上海</span></div>
                    <span className="v">46k×16</span>
                  </div>
                  <div className="ranking-row">
                    <span className="n">2</span>
                    <div className="name">陈远<span className="role">FE · Shopee · SG</span></div>
                    <span className="v">S$ 6.5k</span>
                  </div>
                  <div className="ranking-row">
                    <span className="n">3</span>
                    <div className="name">林晓<span className="role">数据 · 美团</span></div>
                    <span className="v">28k×15</span>
                  </div>
                  <div className="ranking-row">
                    <span className="n">4</span>
                    <div className="name">王沛<span className="role">客户端 · 腾讯</span></div>
                    <span className="v">30k×16</span>
                  </div>
                </div>

                <div className="rail-card">
                  <h4><span>下期预告</span><span style={{ color: "var(--ink-4)" }}>5/30</span></h4>
                  <div style={{ fontFamily: "Instrument Serif, serif", fontStyle: "italic", fontSize: 18, color: "var(--ink)", lineHeight: 1.25 }}>
                    面试官不会告诉你的<span style={{ color: "var(--accent)" }}>3 个真问题</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 8 }}>已预约 1,208 · 上线时提醒我</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MonthlyArticle = () => {
  const a = window.COACH_ARTICLE;
  return (
    <div className="coach">
      <style>{window.COACH_CSS}</style>
      <style>{COACH_MONTHLY_CSS}</style>
      <div className="app">
        <window.CoachSide active="monthly" />
        <div className="main">
          <window.CoachTopbar
            crumb={["校招月刊", "面经 · 字节二面"]}
            title
            actions={<>
              <button className="icon-btn">{window.IK.bookmark}</button>
              <button className="icon-btn">{window.IK.download}</button>
              <button className="btn accent sm">{window.IK.spark}<span>问 Coach</span></button>
            </>}
          />

          <div className="scroll">
            <div className="article-wrap">
              {/* LEFT — meta sidebar */}
              <div className="article-side">
                <h6>—— 阅读</h6>
                <div className="ts">7 min</div>
                <div className="ts-sub">读完时间</div>

                <div className="toc">
                  <h6 style={{ marginTop: 18 }}>—— 章节</h6>
                  <div className="toc-item active"><span>00. 序</span><span className="pg">P1</span></div>
                  <div className="toc-item"><span>01. 5 道题</span><span className="pg">P2</span></div>
                  <div className="toc-item"><span>02. 第 4 道陷阱</span><span className="pg">P4</span></div>
                  <div className="toc-item"><span>03. 反问环节</span><span className="pg">P5</span></div>
                  <div className="toc-item"><span>04. 总结</span><span className="pg">P6</span></div>
                </div>

                <h6 style={{ marginTop: 22 }}>—— 标签</h6>
                <div style={{ fontFamily: "Geist", textTransform: "none", letterSpacing: 0, fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>
                  #字节 #前端 #二面 #SSR<br/>#Tech Lead #反问
                </div>
              </div>

              {/* CENTER — article body */}
              <div className="article-body">
                <div className="crumb-tags">
                  <span className="chip warm"><span className="dot"></span>{a.tag}</span>
                  <span className="chip dark">{a.co}</span>
                  <span className="chip">{a.role}</span>
                  <span className="chip" style={{ marginLeft: "auto" }}>{a.reads}</span>
                </div>

                <h1 className="title">{a.title}</h1>
                <p className="deck">{a.deck}</p>

                <div className="byline">
                  <span><b>{a.author}</b> · {a.authorMeta}</span>
                  <span>{a.date}</span>
                </div>

                <div className="lede">
                  {a.body.map((p, i) => <p key={i}>{p}</p>)}
                </div>

                {/* extracted questions */}
                <div className="q-extracted">
                  <div className="h">
                    <h3>5 道题 · AI 抽取自原文</h3>
                    <span className="meta">已加入你的「字节题库」 · 12 题</span>
                  </div>
                  {a.questions.map((q) => (
                    <div className="q-row" key={q.n}>
                      <span className="n">{q.n}</span>
                      <div className="qbody">
                        <div className="qtype">{q.type}</div>
                        <div className="qtxt">{q.text}</div>
                        <div className={"qyou " + (q.you.includes("⚠️") || q.you.includes("没") ? "warn" : "")}>
                          作者的答 · {q.you}
                        </div>
                      </div>
                      <div className="diff">
                        <span className="lv">{q.diff}</span>
                        <span>难度</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* takeaways */}
                <div className="takeaways">
                  <h3>三条 takeaway</h3>
                  {a.takeaways.map((t, i) => (
                    <div className="takeaway" key={i}>
                      <span className="n">0{i + 1}</span>
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT — Coach + related */}
              <div className="article-rail">
                <div className="ar-coach">
                  <div className="who"><span className="av">C</span><span>Coach 读完了这篇</span></div>
                  <div className="body">
                    你下周一就要面美团二面 —— 这篇里 <span style={{ color: "var(--warm)" }}>「Tech Lead 陷阱」</span> 那一段对你直接相关。我帮你把 STAR 故事先跑一遍？
                  </div>
                  <div className="actions">
                    <span className="b"><span className="ic">{window.IK.bolt}</span>跑一遍 STAR 故事</span>
                    <span className="b"><span className="ic">{window.IK.spark}</span>把这 5 题加进我的题库</span>
                    <span className="b"><span className="ic">{window.IK.play}</span>用这 5 题模拟一次</span>
                  </div>
                </div>

                <div className="rail-card">
                  <h4>同主题 · 推荐</h4>
                  <div className="related-row">
                    <div className="related">
                      <div className="ph" style={{ background: "linear-gradient(135deg, hsl(195 35% 60%), hsl(220 30% 38%))" }}></div>
                      <div>
                        <b>字节 React 18 高频 30 题</b>
                        <span>题库 · 5 月 · 657 ❤</span>
                      </div>
                    </div>
                    <div className="related">
                      <div className="ph" style={{ background: "linear-gradient(135deg, hsl(150 35% 60%), hsl(170 30% 38%))" }}></div>
                      <div>
                        <b>STAR 法则 · 章节 2 / 反例分析</b>
                        <span>学习 · ch.2 · 12 min</span>
                      </div>
                    </div>
                    <div className="related">
                      <div className="ph" style={{ background: "linear-gradient(135deg, hsl(12 35% 60%), hsl(35 30% 38%))" }}></div>
                      <div>
                        <b>反问环节 · 30 个高质量问题</b>
                        <span>题库 · #88</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rail-card">
                  <h4>作者</h4>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, hsl(215 35% 60%), hsl(240 30% 38%))" }}></div>
                    <div style={{ fontSize: 12 }}>
                      <b style={{ color: "var(--ink)", display: "block" }}>@小雨</b>
                      <span style={{ color: "var(--ink-3)" }}>复旦 · 软件 · 已 offer</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 10 }}>
                    本月共发布 4 篇 · 12.4k 阅读
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { MonthlyFeed, MonthlyArticle });
