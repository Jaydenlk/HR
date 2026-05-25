// Vibe Monthly — 小红书 / Notion bento masonry feed.

const VIBE_MONTHLY_CSS = `
.vibe .mthly-wrap{display:flex;flex-direction:column;gap:14px;height:100%;min-height:0;overflow:hidden}

/* top — featured horizontal row */
.vibe .feat-row{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:14px;flex-shrink:0}
.vibe .feat-hero{background:var(--c-orange);color:#fff;border-radius:var(--r-card-lg);padding:24px;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;min-height:200px}
.vibe .feat-hero .blob{position:absolute;width:200px;height:200px;border-radius:50%;background:var(--c-yellow);right:-50px;bottom:-50px;opacity:.85}
.vibe .feat-hero .blob2{position:absolute;width:120px;height:120px;border-radius:50%;background:var(--c-pink);top:-30px;right:60px;opacity:.5}
.vibe .feat-hero > *{position:relative;z-index:2}
.vibe .feat-hero .top{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.vibe .feat-hero h2{margin:0;font-size:34px;font-weight:800;letter-spacing:-.025em;line-height:1.05}
.vibe .feat-hero .reading{font-size:13px;font-weight:600;opacity:.9}

.vibe .feat-side{background:var(--bg-card);border:1px solid var(--line);border-radius:var(--r-card);padding:18px;display:flex;flex-direction:column;gap:8px}
.vibe .feat-side .tag-line{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;letter-spacing:.02em}
.vibe .feat-side h3{margin:0;font-size:18px;font-weight:700;color:var(--ink);line-height:1.25;letter-spacing:-.01em}
.vibe .feat-side .author{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink-3);font-weight:500;margin-top:auto}
.vibe .feat-side .author b{color:var(--ink);font-weight:600}

/* tabs */
.vibe .feed-tabs{display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.vibe .feed-tabs .tabs{display:flex;gap:4px;background:var(--bg-card);border-radius:999px;padding:4px;border:1px solid var(--line)}
.vibe .feed-tabs .tab{appearance:none;border:0;background:transparent;color:var(--ink-3);padding:7px 14px;font-size:13px;font-weight:600;border-radius:999px;cursor:default;display:flex;align-items:center;gap:6px;letter-spacing:-.003em}
.vibe .feed-tabs .tab.active{background:var(--ink);color:#fff}
.vibe .feed-tabs .tab .cnt{font-family:"JetBrains Mono",monospace;font-size:10px;background:rgba(255,255,255,.18);padding:1px 5px;border-radius:999px;letter-spacing:.04em}
.vibe .feed-tabs .tab.active .cnt{background:rgba(255,255,255,.22)}
.vibe .feed-tabs .right{display:flex;gap:8px;align-items:center;font-size:12px;color:var(--ink-3);font-weight:500}

/* masonry-ish grid */
.vibe .feed-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;align-items:start;flex:1;min-height:0;overflow:auto;padding:2px 0}

.vibe .post-card{background:var(--bg-card);border-radius:var(--r-card);overflow:hidden;border:1px solid var(--line);display:flex;flex-direction:column;break-inside:avoid}
.vibe .post-card .cover{aspect-ratio:1.4/1;position:relative;display:flex;align-items:flex-end;padding:14px;overflow:hidden}
.vibe .post-card .cover.blue{background:linear-gradient(135deg,#3a8fff,#0058c4)}
.vibe .post-card .cover.indigo{background:linear-gradient(135deg,#7e7af0,#363281)}
.vibe .post-card .cover.red{background:linear-gradient(135deg,#ff7164,#c91e14)}
.vibe .post-card .cover.purple{background:linear-gradient(135deg,#ce82e8,#7e3eaa)}
.vibe .post-card .cover.green{background:linear-gradient(135deg,#5be07a,#1e7a3a)}
.vibe .post-card .cover.orange{background:linear-gradient(135deg,#ffaa3c,#cb6500)}
.vibe .post-card .cover .blob-deco{position:absolute;border-radius:50%;background:rgba(255,255,255,.16);width:140px;height:140px;top:-50px;right:-50px}
.vibe .post-card .cover .co-stamp{position:relative;z-index:2;font-size:14px;font-weight:800;color:#fff;letter-spacing:-.015em;line-height:1.05}
.vibe .post-card .cover .co-stamp .small{display:block;font-size:11px;opacity:.85;font-weight:600;margin-top:4px;letter-spacing:0}
.vibe .post-card .cover .tag-pill{position:absolute;top:14px;left:14px;background:rgba(0,0,0,.35);color:#fff;font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:999px;backdrop-filter:blur(8px);letter-spacing:.02em}
.vibe .post-card .cover .heart-count{position:absolute;top:14px;right:14px;background:rgba(0,0,0,.35);color:#fff;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;backdrop-filter:blur(8px);display:flex;align-items:center;gap:4px}
.vibe .post-card .cover .heart-count svg{width:11px;height:11px}

.vibe .post-card .body{padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px;flex:1}
.vibe .post-card .title{font-size:15px;font-weight:700;color:var(--ink);line-height:1.3;letter-spacing:-.005em}
.vibe .post-card .excerpt{font-size:12.5px;color:var(--ink-3);line-height:1.45;font-weight:500}
.vibe .post-card .foot{display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:8px}
.vibe .post-card .foot .who{display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--ink-3);font-weight:500}
.vibe .post-card .foot .who b{color:var(--ink);font-weight:600}
.vibe .post-card .foot .stats{display:flex;gap:8px;font-size:11px;color:var(--ink-3);font-weight:600}
.vibe .post-card .foot .stats span{display:inline-flex;align-items:center;gap:3px}

/* personal Coach-generated card */
.vibe .post-card.personal{background:linear-gradient(180deg,var(--c-purple-2) 0%,#f3eaff 100%);border-color:var(--c-purple-2)}
.vibe .post-card.personal .cover{background:var(--c-purple)}
.vibe .post-card.personal .tag-pill{background:var(--c-yellow);color:var(--ink)}

/* trending row */
.vibe .trending{display:flex;align-items:center;gap:10px;flex-shrink:0;font-size:12.5px;color:var(--ink-3);font-weight:500;background:var(--bg-card);border:1px solid var(--line);border-radius:var(--r-card);padding:10px 16px;overflow:hidden}
.vibe .trending .label{flex-shrink:0;font-weight:700;color:var(--ink);display:flex;align-items:center;gap:5px}
.vibe .trending .label .fire{color:var(--c-red)}
.vibe .trending .topics{display:flex;gap:6px;overflow:auto}
.vibe .trending .topic{flex-shrink:0;padding:4px 11px;border-radius:999px;background:var(--bg-tint);font-weight:600;color:var(--ink-2);font-size:12px;letter-spacing:-.003em;display:flex;align-items:center;gap:4px}
.vibe .trending .topic.hot{background:var(--c-red);color:#fff}
.vibe .trending .topic.hot::before{content:"●";color:#fff;font-size:8px}
.vibe .trending .topic.new{background:var(--c-green);color:#fff}
`;

const MonthlyFeed = () => {
  const feed = window.COACH_FEED;
  return (
    <div className="vibe">
      <style>{window.VIBE_CSS}</style>
      <style>{VIBE_MONTHLY_CSS}</style>
      <div className="app">
        <window.VibeSide active="monthly" />
        <div className="main">
          <window.VibeTopbar
            title="月刊 · 面经"
            sub="叫月刊，更新是实时的 · 5 月 23 日 · 24h 新增 128 篇"
            actions={<>
              <button className="btn sm">{window.IK.search}<span>搜面经</span></button>
              <button className="btn sm">{window.IK.filter}<span>筛选</span></button>
              <button className="btn primary sm">{window.IK.plus}<span>写一篇</span></button>
            </>}
          />

          <div className="scroll">
            <div className="mthly-wrap">
              {/* featured row */}
              <div className="feat-row">
                <div className="feat-hero">
                  <div className="blob"></div>
                  <div className="blob2"></div>
                  <div className="top">
                    <span>📌 编辑精选</span>
                    <span>·</span>
                    <span>本周话题</span>
                  </div>
                  <h2>「具体」<br/>是最被低估<br/>的能力。</h2>
                  <div className="reading">我们看了 1,247 份应届简历 · 12 min 阅读 · 编辑部</div>
                </div>

                <div className="feat-side">
                  <span className="tag-line">
                    <span style={{ color: "var(--c-red)" }}>🔥 24h 热点</span>
                  </span>
                  <h3>PDD 校招前端真实 base 是多少？</h3>
                  <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.45 }}>38–46k × 16，但有个 catch —— 996.5 + 强 OKR。</p>
                  <div className="author">
                    <window.Avatar kind="coach" size={22} bg="var(--c-purple)" />
                    <span><b>Coach 编辑部</b> · 5h · 1.2k ❤</span>
                  </div>
                </div>

                <div className="feat-side">
                  <span className="tag-line">
                    <span style={{ color: "var(--c-purple)" }}>🤖 你的复盘</span>
                  </span>
                  <h3>你刚结束的美团二面 —— 8 分钟复盘</h3>
                  <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.45 }}>面试官前 20 分钟在 dig 项目细节，你卡在「最难做的决策」上停顿了 17 秒。</p>
                  <div className="author">
                    <window.Avatar kind="ming" size={22} />
                    <span><b>自动生成</b> · 仅你可见 · 等你查看</span>
                  </div>
                </div>
              </div>

              {/* trending pills */}
              <div className="trending">
                <span className="label"><span className="fire">🔥</span><span>本周热词</span></span>
                <div className="topics">
                  <span className="topic hot">字节二面</span>
                  <span className="topic hot">PDD 996</span>
                  <span className="topic new">Coach 2.0 上线</span>
                  <span className="topic">Tech Lead 信号</span>
                  <span className="topic">SSR / hydration</span>
                  <span className="topic">offer 谈判</span>
                  <span className="topic">秋招倒计时</span>
                  <span className="topic">海外校招</span>
                  <span className="topic">STAR 法则</span>
                  <span className="topic">反问环节</span>
                  <span className="topic">校招简历</span>
                </div>
              </div>

              {/* tabs */}
              <div className="feed-tabs">
                <div className="tabs">
                  <button className="tab active"><span>全部</span><span className="cnt">128</span></button>
                  <button className="tab"><span>面经</span><span className="cnt">64</span></button>
                  <button className="tab"><span>热点</span><span className="cnt">18</span></button>
                  <button className="tab"><span>故事</span><span className="cnt">22</span></button>
                  <button className="tab"><span>题库</span><span className="cnt">12</span></button>
                  <button className="tab"><span>编辑精选</span></button>
                </div>
                <div className="right">
                  <span>排序：</span>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>最新发布</span>
                  <span>·</span>
                  <span>仅校招</span>
                </div>
              </div>

              {/* feed grid */}
              <div className="feed-grid">
                {feed.map((f, i) => (
                  <div key={i} className={"post-card" + (f.isPersonal ? " personal" : "")}>
                    <div className={"cover " + f.color}>
                      <div className="blob-deco"></div>
                      <span className="tag-pill">{f.tag}</span>
                      {f.likes > 0 && <span className="heart-count">{window.IK.heart}<span>{f.likes >= 1000 ? (f.likes / 1000).toFixed(1) + "k" : f.likes}</span></span>}
                      <div className="co-stamp">
                        {f.co !== "—" ? f.co : f.tag}
                        <span className="small">{f.role !== "—" ? f.role : "Coach"}</span>
                      </div>
                    </div>
                    <div className="body">
                      <div className="title">{f.title}</div>
                      <p className="excerpt">{f.excerpt}</p>
                      <div className="foot">
                        <div className="who">
                          <window.Avatar kind={f.whoAvatar} size={22} />
                          <span><b>{f.who}</b> · {f.whoMeta} · {f.when}</span>
                        </div>
                        {f.comments > 0 && <div className="stats"><span>💬 {f.comments}</span></div>}
                        {f.isPersonal && <span className="chip purple" style={{ fontSize: 10 }}>等你查看</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { MonthlyFeed });
