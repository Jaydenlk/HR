// Monthly — disciplined masonry feed. Cards are white; "color" comes from a single cover image hue.

const MONTHLY_CSS = `
.coach .mthly{display:flex;flex-direction:column;gap:18px;height:100%;min-height:0;overflow:hidden}

/* hero strip: ONE editor's pick (dark card) + 2 supporting white cards */
.coach .feat-row{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:14px;flex-shrink:0}
.coach .feat-hero{
  background:var(--ink);color:#fff;border-radius:24px;padding:28px 30px;
  position:relative;overflow:hidden;display:flex;flex-direction:column;gap:14px;min-height:200px;
}
.coach .feat-hero::before{
  content:"";position:absolute;inset:0;
  background:radial-gradient(600px 320px at 90% -10%,rgba(10,132,255,.22),transparent 60%);
}
.coach .feat-hero > *{position:relative;z-index:2}
.coach .feat-hero .topline{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.55);display:flex;gap:10px;align-items:center}
.coach .feat-hero h2{margin:0;font-size:36px;line-height:1.05;letter-spacing:-.03em;font-weight:800}
.coach .feat-hero p{margin:0;font-size:14px;color:rgba(255,255,255,.7);font-weight:500;line-height:1.55;max-width:48ch}
.coach .feat-hero .meta{font-size:11.5px;color:rgba(255,255,255,.5);font-weight:500;margin-top:auto;display:flex;gap:14px}

.coach .feat-side{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px;display:flex;flex-direction:column;gap:8px}
.coach .feat-side .top{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:var(--ink-3);letter-spacing:.04em;text-transform:uppercase}
.coach .feat-side .top.hot{color:var(--danger)}
.coach .feat-side .top.you{color:var(--brand)}
.coach .feat-side h3{margin:0;font-size:17px;font-weight:700;color:var(--ink);line-height:1.3;letter-spacing:-.008em}
.coach .feat-side p{margin:0;font-size:12.5px;color:var(--ink-3);font-weight:500;line-height:1.5}
.coach .feat-side .by{margin-top:auto;font-size:11.5px;color:var(--ink-3);font-weight:500;display:flex;align-items:center;gap:6px}
.coach .feat-side .by b{color:var(--ink-2);font-weight:600}

/* tabs */
.coach .tabs-row{display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.coach .tabs{display:flex;gap:2px;background:var(--surface-2);border-radius:999px;padding:3px}
.coach .tab{appearance:none;border:0;background:transparent;color:var(--ink-3);padding:7px 14px;font-size:13px;font-weight:600;border-radius:999px;display:flex;align-items:center;gap:6px;letter-spacing:-.003em;cursor:default}
.coach .tab.active{background:var(--surface);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.coach .tab .cnt{font-family:var(--font-mono);font-size:10px;color:var(--ink-4);font-weight:600}
.coach .tab.active .cnt{color:var(--ink-3)}
.coach .tabs-row .right{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink-3);font-weight:500}

/* trending */
.coach .trending{display:flex;align-items:center;gap:14px;flex-shrink:0;padding:10px 4px;font-size:12.5px;color:var(--ink-3);font-weight:500;overflow:hidden}
.coach .trending .label{flex-shrink:0;font-weight:700;color:var(--ink);display:flex;align-items:center;gap:5px;font-size:12px}
.coach .trending .topics{display:flex;gap:6px;overflow:auto}
.coach .trending .t{flex-shrink:0;padding:4px 12px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font-weight:600;color:var(--ink-2);font-size:12px;letter-spacing:-.003em}
.coach .trending .t.hot{background:var(--ink);color:#fff;border-color:var(--ink)}
.coach .trending .t.hot::before{content:"";display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--danger);margin-right:5px;vertical-align:middle}

/* feed grid */
.coach .feed{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;flex:1;min-height:0;overflow:auto;align-content:start;padding:2px 0}

.coach .post{background:var(--surface);border:1px solid var(--line);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;break-inside:avoid;transition:.12s}
.coach .post:hover{border-color:var(--line-2)}
.coach .post .cover{
  aspect-ratio:1.5/1;position:relative;overflow:hidden;
  background:var(--surface-2);
  display:flex;align-items:flex-end;padding:14px;
}
.coach .post .cover .blob{
  position:absolute;width:200px;height:200px;border-radius:50%;
  background:rgba(0,0,0,.06);right:-40px;top:-40px;filter:blur(2px);
}
.coach .post .cover.b1{background:linear-gradient(135deg,#dee5ed 0%,#c2cdd8 100%)}
.coach .post .cover.b2{background:linear-gradient(135deg,#f1ddd5 0%,#dec3b6 100%)}
.coach .post .cover.b3{background:linear-gradient(135deg,#dcebe1 0%,#bfd3c5 100%)}
.coach .post .cover.b4{background:linear-gradient(135deg,#e5e0eb 0%,#cac0d4 100%)}
.coach .post .cover.b5{background:linear-gradient(135deg,#ebe6d2 0%,#d4cba8 100%)}
.coach .post .cover.b6{background:linear-gradient(135deg,#dedee8 0%,#b8b8c8 100%)}
.coach .post .cover .co-mark{
  position:relative;z-index:2;font-size:14px;font-weight:700;color:var(--ink);letter-spacing:-.01em;
}
.coach .post .cover .co-mark .small{display:block;font-size:11px;color:var(--ink-3);font-weight:500;margin-top:2px;letter-spacing:0}
.coach .post .cover .tag-text{
  position:absolute;top:12px;left:14px;z-index:2;
  font-size:10.5px;font-weight:700;color:var(--ink);
  letter-spacing:.04em;background:rgba(255,255,255,.7);
  padding:3px 9px;border-radius:6px;backdrop-filter:blur(8px);
}
.coach .post .cover .tag-text.hot{background:var(--ink);color:#fff}
.coach .post .cover .tag-text.coach{background:var(--brand);color:#fff}
.coach .post .cover .like-text{
  position:absolute;top:12px;right:14px;z-index:2;
  font-size:11px;font-weight:600;color:var(--ink);
  letter-spacing:0;background:rgba(255,255,255,.7);
  padding:3px 9px;border-radius:6px;backdrop-filter:blur(8px);
  display:flex;align-items:center;gap:4px;
}
.coach .post .cover .like-text svg{width:11px;height:11px}

.coach .post .body{padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px;flex:1}
.coach .post .ttl{font-size:14.5px;font-weight:600;color:var(--ink);line-height:1.35;letter-spacing:-.005em}
.coach .post .ex{font-size:12.5px;color:var(--ink-3);font-weight:500;line-height:1.5}
.coach .post .foot{display:flex;align-items:center;gap:8px;margin-top:auto;padding-top:6px;font-size:11.5px;color:var(--ink-3);font-weight:500}
.coach .post .foot .av-init{
  width:20px;height:20px;border-radius:50%;background:var(--surface-2);
  display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--ink-2);flex-shrink:0;
  border:1px solid var(--line);
}
.coach .post .foot b{color:var(--ink);font-weight:600}
.coach .post .foot .stats{margin-left:auto;display:flex;gap:8px;color:var(--ink-3);font-family:var(--font-mono);font-size:11px;font-weight:600}

/* personal Coach card */
.coach .post.personal{border:1.5px solid var(--brand)}
.coach .post.personal .cover{background:linear-gradient(135deg,#e8efff 0%,#cad9f4 100%)}
`;

const MonthlyFeed = () => {
  const feed = window.COACH_FEED;
  const coverClass = ["b1", "b2", "b3", "b4", "b5", "b6"];
  return (
    <div className="coach">
      <style>{window.CORE_CSS}</style>
      <style>{MONTHLY_CSS}</style>
      <div className="app">
        <window.CoachSide active="monthly" />
        <div className="main">
          <window.CoachTopbar
            title="月刊 · 面经"
            sub="叫月刊，更新是实时的 · 24h 内新增 128 篇"
            actions={<>
              <button className="btn sm">{window.IK.search}<span>搜面经</span></button>
              <button className="btn sm">{window.IK.filter}<span>筛选</span></button>
              <button className="btn primary sm">{window.IK.plus}<span>写一篇</span></button>
            </>}
          />

          <div className="scroll">
            <div className="mthly">
              {/* feat row */}
              <div className="feat-row">
                <div className="feat-hero">
                  <div className="topline">
                    <span>📌 编辑精选 · Vol. 24</span>
                    <span>·</span>
                    <span>本周话题</span>
                  </div>
                  <h2>「具体」<br/>是最被低估的能力。</h2>
                  <p>我们看了 1,247 份应届简历，发现最大的问题不是排版 —— 是它们读起来像同一个人写的：模糊、谦虚、安全。</p>
                  <div className="meta">
                    <span>12 min 阅读</span>
                    <span>·</span>
                    <span>编辑部</span>
                    <span>·</span>
                    <span>248 收藏</span>
                  </div>
                </div>

                <div className="feat-side">
                  <div className="top hot">🔥 24h 热点 · 拼多多</div>
                  <h3>PDD 校招前端真实 base 38–46k，但有个 catch</h3>
                  <p>我们核对了 32 位拿到 PDD offer 的同学。数字漂亮，但 996.5 你需要先知道。</p>
                  <div className="by">
                    <div className="av-init" style={{ width: 18, height: 18, fontSize: 9 }}>C</div>
                    <span><b>Coach 编辑部</b> · 5h · 1.2k ❤</span>
                  </div>
                </div>

                <div className="feat-side">
                  <div className="top you">● 你的复盘</div>
                  <h3>你刚结束的美团二面 —— 8 分钟复盘已生成</h3>
                  <p>面试官前 20 分钟在 dig 项目细节，你卡在「最难做的决策」上停顿了 17 秒。</p>
                  <div className="by">
                    <div className="av-init" style={{ width: 18, height: 18, fontSize: 9, background: "var(--brand)", color: "#fff", borderColor: "transparent" }}>M</div>
                    <span><b>自动生成</b> · 仅你可见 · 等你查看</span>
                  </div>
                </div>
              </div>

              {/* tabs */}
              <div className="tabs-row">
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

              {/* trending */}
              <div className="trending">
                <span className="label">本周热词</span>
                <div className="topics">
                  <span className="t hot">字节二面</span>
                  <span className="t hot">PDD 996</span>
                  <span className="t">Tech Lead 信号</span>
                  <span className="t">SSR / hydration</span>
                  <span className="t">offer 谈判</span>
                  <span className="t">秋招倒计时</span>
                  <span className="t">海外校招</span>
                  <span className="t">STAR 法则</span>
                  <span className="t">反问环节</span>
                </div>
              </div>

              {/* feed */}
              <div className="feed">
                {feed.map((f, i) => (
                  <div key={i} className={"post" + (f.isPersonal ? " personal" : "")}>
                    <div className={"cover " + coverClass[i % 6]}>
                      <div className="blob"></div>
                      <span className={"tag-text" + (f.tag === "热点" ? " hot" : f.isPersonal ? " coach" : "")}>{f.tag}</span>
                      {f.likes > 0 && (
                        <span className="like-text">{window.IK.heart}<span>{f.likes >= 1000 ? (f.likes / 1000).toFixed(1) + "k" : f.likes}</span></span>
                      )}
                      <div className="co-mark">
                        {f.co !== "—" ? f.co : f.tag}
                        <span className="small">{f.role !== "—" ? f.role : "Coach 整理"}</span>
                      </div>
                    </div>
                    <div className="body">
                      <div className="ttl">{f.title}</div>
                      <p className="ex">{f.excerpt}</p>
                      <div className="foot">
                        <span className="av-init">{f.who.slice(0, 1).toUpperCase()}</span>
                        <span><b>{f.who}</b> · {f.whoMeta}</span>
                        <span className="stats">
                          <span>·</span>
                          <span>{f.when}</span>
                          {f.comments > 0 && <span>· 💬 {f.comments}</span>}
                        </span>
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
