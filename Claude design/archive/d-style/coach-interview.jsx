// 面试复盘 — Interview Lab. List + Detail.
// 核心新功能：每场面试录音/记录 → 自动转写 → AI 逐题评估 → 知识盲点 → 下一轮预测

const COACH_IV_CSS = `
.coach .iv-wrap{display:flex;flex-direction:column;gap:18px;height:100%;min-height:0;overflow:hidden}

/* stats strip */
.coach .iv-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:0;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 0;overflow:hidden}
.coach .iv-stats .s{padding:0 20px;border-right:1px solid var(--line);display:flex;flex-direction:column;gap:4px}
.coach .iv-stats .s:last-child{border-right:0}
.coach .iv-stats .s .v{font-family:"Instrument Serif",serif;font-style:italic;font-size:30px;line-height:1;color:var(--ink);letter-spacing:-.02em}
.coach .iv-stats .s .v .acc{color:var(--accent);font-family:"Geist Mono",monospace;font-size:12px;font-style:normal;margin-left:5px}
.coach .iv-stats .s .l{font-size:11px;color:var(--ink-3);letter-spacing:.04em}
.coach .iv-stats .s .tiny-chart{display:flex;align-items:flex-end;gap:2px;height:18px;margin-top:2px}
.coach .iv-stats .s .tiny-chart i{flex:1;background:var(--bg-2);border-radius:1px}
.coach .iv-stats .s .tiny-chart i.on{background:var(--accent)}

/* quick capture banner */
.coach .iv-capture{background:linear-gradient(180deg,var(--accent-2) 0%,#f4f1ff 100%);border:1px solid var(--accent-2);border-radius:14px;padding:18px 22px;display:flex;align-items:center;gap:18px}
.coach .iv-capture .left{flex:1}
.coach .iv-capture h3{margin:0;font-family:"Instrument Serif",serif;font-style:italic;font-size:24px;font-weight:400;color:var(--ink);letter-spacing:-.01em}
.coach .iv-capture p{margin:4px 0 0;font-size:13px;color:var(--ink-2);max-width:60ch}
.coach .iv-capture .actions{display:flex;gap:8px}

/* filter row */
.coach .iv-filter{display:flex;align-items:center;justify-content:space-between;padding-bottom:0;border-bottom:1px solid var(--line)}
.coach .iv-filter .tabs{display:flex;gap:2px}
.coach .iv-filter .tab{appearance:none;border:0;background:transparent;color:var(--ink-3);padding:8px 14px;font-size:13px;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:default;display:flex;align-items:center;gap:6px}
.coach .iv-filter .tab.active{color:var(--ink);border-bottom-color:var(--accent);font-weight:500}
.coach .iv-filter .tab .cnt{font-family:"Geist Mono",monospace;font-size:10px;color:var(--ink-4);background:var(--bg-2);padding:1px 6px;border-radius:999px}
.coach .iv-filter .right{display:flex;gap:8px;align-items:center}

/* list */
.coach .iv-list{display:flex;flex-direction:column;gap:8px;overflow:hidden;min-height:0;flex:1}
.coach .iv-row{display:grid;grid-template-columns:60px 1fr 1fr auto auto;gap:18px;align-items:center;padding:14px 18px;background:var(--card);border:1px solid var(--line);border-radius:12px}
.coach .iv-row .grade{font-family:"Instrument Serif",serif;font-style:italic;font-size:32px;line-height:1;letter-spacing:-.02em;text-align:center}
.coach .iv-row .grade.good{color:var(--good)}
.coach .iv-row .grade.warm{color:var(--warm)}
.coach .iv-row .grade.bad{color:var(--bad)}
.coach .iv-row .grade .delta{font-family:"Geist",sans-serif;font-style:normal;font-size:10px;color:var(--ink-3);display:block;font-weight:400;letter-spacing:0;margin-top:1px}
.coach .iv-row .meta-co{font-size:14.5px;font-weight:500;color:var(--ink)}
.coach .iv-row .meta-co .sub{display:block;font-size:11.5px;color:var(--ink-3);font-weight:400;margin-top:2px}
.coach .iv-row .meta-when{font-size:12.5px;color:var(--ink-3);display:flex;flex-direction:column;gap:2px}
.coach .iv-row .meta-when b{color:var(--ink-2);font-weight:500;font-family:"Geist Mono",monospace;font-size:12px}
.coach .iv-row .meta-when .ts{font-family:"Geist Mono",monospace;color:var(--ink-4);font-size:10.5px;letter-spacing:.04em}
.coach .iv-row .insights{display:flex;gap:6px;font-size:11px}
.coach .iv-row .insights .chip{margin:0}
.coach .iv-row .openbtn{padding:8px 14px;font-size:12px}

/* patterns panel (cross-interview insight) */
.coach .iv-patterns{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin-top:6px}
.coach .iv-patterns .hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px}
.coach .iv-patterns h3{margin:0;font-family:"Instrument Serif",serif;font-style:italic;font-size:22px;font-weight:400;letter-spacing:-.01em}
.coach .iv-patterns .meta{font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
.coach .iv-pattern-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.coach .iv-pattern{font-size:12.5px}
.coach .iv-pattern .co{font-weight:600;color:var(--ink);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:baseline}
.coach .iv-pattern .co .sm{font-size:10px;color:var(--ink-3);font-family:"Geist Mono",monospace;font-weight:400}
.coach .iv-pattern .topic{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;padding:5px 0;font-size:12px;color:var(--ink-2)}
.coach .iv-pattern .topic .bar{height:4px;background:var(--bg-2);border-radius:2px;overflow:hidden;margin:0 8px;flex:1;min-width:30px}
.coach .iv-pattern .topic .bar i{display:block;height:100%;background:var(--accent);border-radius:2px}
.coach .iv-pattern .topic .pct{font-family:"Geist Mono",monospace;font-size:10px;color:var(--ink-3);text-align:right}

/* ─── detail screen ─── */
.coach .iv-detail{display:grid;grid-template-columns:1fr 320px;gap:24px;height:100%;align-items:start;min-height:0;overflow:hidden}
.coach .iv-detail > .main-col{display:flex;flex-direction:column;gap:14px;min-width:0;min-height:0;overflow:hidden}

/* header card */
.coach .iv-header{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 24px;display:grid;grid-template-columns:1fr auto;gap:18px;align-items:start}
.coach .iv-header h1{margin:0;font-family:"Instrument Serif",serif;font-style:italic;font-size:36px;line-height:1.05;letter-spacing:-.02em;font-weight:400;color:var(--ink)}
.coach .iv-header h1 .light{color:var(--ink-3);font-style:italic}
.coach .iv-header .sub{margin-top:10px;font-size:13px;color:var(--ink-3);display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.coach .iv-header .sub b{color:var(--ink);font-weight:500}
.coach .iv-header .sub .dot{color:var(--ink-4)}
.coach .iv-header .grade-blk{text-align:center;border-left:1px solid var(--line);padding-left:22px}
.coach .iv-header .grade-blk .g{font-family:"Instrument Serif",serif;font-style:italic;font-size:64px;color:var(--accent);line-height:1;letter-spacing:-.03em}
.coach .iv-header .grade-blk .l{font-size:11px;color:var(--ink-3);letter-spacing:.06em;text-transform:uppercase;margin-top:4px}

/* audio player */
.coach .iv-audio{margin-top:14px;padding-top:14px;border-top:1px solid var(--line);display:flex;align-items:center;gap:14px;font-size:12.5px;color:var(--ink-3)}
.coach .iv-audio .play{width:36px;height:36px;border-radius:50%;background:var(--ink);color:var(--bg);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.coach .iv-audio .wave{flex:1;display:flex;align-items:center;gap:1.5px;height:32px}
.coach .iv-audio .wave i{flex:1;background:var(--line-2);border-radius:1px}
.coach .iv-audio .wave i.played{background:var(--ink)}
.coach .iv-audio .wave i.current{background:var(--accent);height:100%}
.coach .iv-audio .time{font-family:"Geist Mono",monospace;font-size:11.5px;color:var(--ink-3)}

/* score breakdown */
.coach .iv-scores{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 22px}
.coach .iv-scores .hd{display:flex;justify-content:space-between;margin-bottom:14px;align-items:baseline}
.coach .iv-scores h3{margin:0;font-size:14px;font-weight:600}
.coach .iv-scores .meta{font-size:11.5px;color:var(--ink-3)}
.coach .iv-scores .ai-note{font-family:"Instrument Serif",serif;font-style:italic;font-size:15px;color:var(--ink-2);margin:0 0 16px;line-height:1.5;padding:10px 14px;background:var(--bg-2);border-radius:8px;border-left:3px solid var(--accent)}
.coach .iv-score-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 28px}
.coach .iv-score{display:grid;grid-template-columns:1fr 60px;gap:10px;align-items:center;font-size:13px}
.coach .iv-score .name{color:var(--ink-2)}
.coach .iv-score .bar-wrap{grid-column:1 / -1;height:5px;background:var(--bg-2);border-radius:3px;overflow:hidden}
.coach .iv-score .bar-wrap i{display:block;height:100%;border-radius:3px;background:var(--ink-3)}
.coach .iv-score.good .bar-wrap i{background:var(--good)}
.coach .iv-score.warn .bar-wrap i{background:var(--warn)}
.coach .iv-score.bad .bar-wrap i{background:var(--bad)}
.coach .iv-score .num{font-family:"Geist Mono",monospace;font-size:12px;color:var(--ink-3);text-align:right;font-variant-numeric:tabular-nums}

/* questions section */
.coach .iv-questions{flex:1;display:flex;flex-direction:column;gap:10px;overflow:hidden;min-height:0}
.coach .iv-questions .hd{display:flex;justify-content:space-between;align-items:baseline;padding:0 4px}
.coach .iv-questions h3{margin:0;font-family:"Instrument Serif",serif;font-style:italic;font-size:24px;font-weight:400;letter-spacing:-.01em}
.coach .iv-questions .meta{font-size:11.5px;color:var(--ink-3)}

.coach .iv-q{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 20px}
.coach .iv-q.bad{border-color:var(--bad-2);background:#fdf7f5}
.coach .iv-q.warn{border-color:var(--warn-2);background:#fcf9f0}
.coach .iv-q .head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:14px}
.coach .iv-q .head .l{display:flex;gap:10px;align-items:baseline}
.coach .iv-q .n{font-family:"Instrument Serif",serif;font-style:italic;font-size:22px;color:var(--accent);line-height:1;letter-spacing:-.01em;min-width:28px}
.coach .iv-q .tt{font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
.coach .iv-q .q-text{font-family:"Instrument Serif",serif;font-style:italic;font-size:18px;line-height:1.4;color:var(--ink);margin:6px 0 12px}
.coach .iv-q .pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.coach .iv-q .pair .cell{padding:10px 14px;border-radius:8px;font-size:12.5px;line-height:1.55}
.coach .iv-q .pair .cell.you{background:var(--bg-2);border:1px solid var(--line)}
.coach .iv-q .pair .cell.ai{background:var(--accent-2);border:1px solid var(--accent-2)}
.coach .iv-q .pair .cell.ai.warn{background:var(--warn-2)}
.coach .iv-q .pair .cell.ai.bad{background:var(--bad-2)}
.coach .iv-q .pair .cell .lbl{font-family:"Geist Mono",monospace;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px;display:block;font-weight:500}
.coach .iv-q .pair .cell.ai .lbl{color:var(--accent-3)}
.coach .iv-q .pair .cell.ai.warn .lbl{color:#a07b1f}
.coach .iv-q .pair .cell.ai.bad .lbl{color:var(--bad)}
.coach .iv-q .better{margin-top:10px;padding:11px 14px;background:var(--good-2);border-radius:8px;font-size:12.5px;color:var(--ink-2);line-height:1.55;display:flex;gap:10px;align-items:flex-start}
.coach .iv-q .better .ic{color:var(--good);flex-shrink:0;margin-top:2px}
.coach .iv-q .better b{color:var(--good)}
.coach .iv-q .gap-line{margin-top:8px;font-size:11.5px;color:var(--ink-3);display:flex;align-items:center;gap:6px}
.coach .iv-q .gap-line a{color:var(--accent);text-decoration:none;font-weight:500}
.coach .iv-q .meta-row{margin-top:10px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--ink-3);font-family:"Geist Mono",monospace;letter-spacing:.04em}
.coach .iv-q .meta-row .actions{display:flex;gap:6px}

/* right rail */
.coach .iv-rail{display:flex;flex-direction:column;gap:14px;overflow:hidden}
.coach .pred-card{background:var(--ink);color:var(--bg);border-radius:14px;padding:18px}
.coach .pred-card h4{margin:0 0 4px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.55);font-weight:500;display:flex;justify-content:space-between}
.coach .pred-card .title{font-family:"Instrument Serif",serif;font-style:italic;font-size:22px;color:var(--bg);line-height:1.2;margin-bottom:14px}
.coach .pred-card .title em{color:var(--warm);font-style:italic}
.coach .pred-card .when{font-family:"Geist Mono",monospace;font-size:10.5px;color:rgba(255,255,255,.55);letter-spacing:.06em;text-transform:uppercase;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,.12);padding-bottom:8px}
.coach .pred-card .pred-row{display:grid;grid-template-columns:1fr auto;gap:8px;padding:6px 0;font-size:12px;border-bottom:1px dashed rgba(255,255,255,.1)}
.coach .pred-card .pred-row:last-of-type{border-bottom:0}
.coach .pred-card .pred-row .topic{color:rgba(255,255,255,.85);line-height:1.4}
.coach .pred-card .pred-row .pct{font-family:"Geist Mono",monospace;color:var(--warm);font-size:11px;align-self:start;padding-top:2px}
.coach .pred-card .cta-row{display:flex;flex-direction:column;gap:6px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.12)}
.coach .pred-card .cta-row .b{font-size:11.5px;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,.08);color:var(--bg);border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;gap:8px;cursor:default;font-family:"Geist",sans-serif}
.coach .pred-card .cta-row .b.acc{background:var(--warm);border-color:var(--warm);color:var(--ink)}

.coach .iv-rail-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.coach .iv-rail-card h4{margin:0 0 10px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);font-weight:500;border-bottom:1px solid var(--line);padding-bottom:6px}
.coach .gap-item{display:grid;grid-template-columns:auto 1fr;gap:10px;padding:8px 0;border-top:1px dotted var(--line);font-size:12.5px}
.coach .gap-item:first-of-type{border-top:0}
.coach .gap-item .num{font-family:"Instrument Serif",serif;font-style:italic;color:var(--accent);font-size:18px;line-height:1.1}
.coach .gap-item b{display:block;color:var(--ink);font-size:12.5px;font-weight:500;line-height:1.3}
.coach .gap-item span{color:var(--ink-3);font-size:11px}

.coach .transcript-pill{display:flex;align-items:center;gap:8px;font-size:12px;padding:7px 12px;border:1px solid var(--line);border-radius:999px;background:var(--bg-2);color:var(--ink-2);cursor:default}
.coach .transcript-pill .ic{color:var(--good)}
`;

// ─── List screen ────────────────────────────────────────────────────────
const InterviewList = () => {
  const ivs = window.COACH_INTERVIEWS;
  const patterns = window.COACH_COMPANY_PATTERNS;
  const tinyChart = [3,4,4,5,6,5,7,6,8,7,9,8,9];
  return (
    <div className="coach">
      <style>{window.COACH_CSS}</style>
      <style>{COACH_IV_CSS}</style>
      <div className="app">
        <window.CoachSide active="interview" />
        <div className="main">
          <window.CoachTopbar
            crumb={["面试复盘 · Interview Lab"]}
            title
            actions={<>
              <button className="btn ghost sm">{window.IK.filter}<span>导出全部</span></button>
              <button className="btn primary sm">{window.IK.mic}<span>+ 录入新面试</span></button>
            </>}
          />

          <div className="scroll" style={{ overflow: "auto" }}>
            <div className="iv-wrap">
              {/* stats */}
              <div className="iv-stats">
                <div className="s">
                  <div className="v">12<span className="acc">↑ 3</span></div>
                  <div className="l">总面试数 · 本届</div>
                  <div className="tiny-chart">{tinyChart.map((h,i)=><i key={i} className={i>=10?"on":""} style={{height:h*1.5+"px"}}></i>)}</div>
                </div>
                <div className="s">
                  <div className="v">B+</div>
                  <div className="l">综合表现 · 上升中</div>
                  <div style={{ fontSize: 11, color: "var(--good)", marginTop: 4 }}>↑ 从 4 月的 B−</div>
                </div>
                <div className="s">
                  <div className="v">3</div>
                  <div className="l">需要重点改进的题型</div>
                  <div style={{ fontSize: 11, color: "var(--bad)", marginTop: 4 }}>● STAR / 性能优化 / 反问</div>
                </div>
                <div className="s">
                  <div className="v">8.2 <span style={{ fontSize: 14, color: "var(--ink-3)", fontFamily: "Geist", fontStyle: "normal" }}>h</span></div>
                  <div className="l">已复盘总时长</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>≈ 每周 1.8h</div>
                </div>
                <div className="s">
                  <div className="v">87%</div>
                  <div className="l">面试后 24h 内复盘率</div>
                  <div style={{ fontSize: 11, color: "var(--good)", marginTop: 4 }}>↑ 好习惯</div>
                </div>
              </div>

              {/* capture banner */}
              <div className="iv-capture">
                <div className="left">
                  <h3>刚结束一场面试？<span style={{ color: "var(--accent)" }}>趁热复盘</span>。</h3>
                  <p>3 种方式录入：上传录音（≤2h）/ 手机录制 / 直接打字记录。AI 自动转写、抽题、对比题库、给出逐题评估 —— 8 分钟搞定。</p>
                </div>
                <div className="actions">
                  <button className="btn primary"><span>{window.IK.mic}</span><span>上传录音</span></button>
                  <button className="btn">{window.IK.plus}<span>手动记录</span></button>
                </div>
              </div>

              {/* filter tabs */}
              <div className="iv-filter">
                <div className="tabs">
                  <button className="tab active"><span>全部</span><span className="cnt">12</span></button>
                  <button className="tab"><span>本周</span><span className="cnt">2</span></button>
                  <button className="tab"><span>需复盘</span><span className="cnt">1</span></button>
                  <button className="tab"><span>有录音</span><span className="cnt">8</span></button>
                  <button className="tab"><span>按公司</span></button>
                  <button className="tab"><span>按题型</span></button>
                </div>
                <div className="right">
                  <span className="chip">最近一次 · 5/22</span>
                  <button className="icon-btn">{window.IK.search}</button>
                </div>
              </div>

              {/* list */}
              <div className="iv-list">
                {ivs.map((iv) => (
                  <div key={iv.id} className="iv-row">
                    <div className={"grade " + iv.flag}>
                      {iv.quality}
                      <span className="delta">{iv.id === "iv-9" ? "刚刚" : "已复盘"}</span>
                    </div>
                    <div className="meta-co">
                      {iv.co} · {iv.role}
                      <span className="sub">{iv.round}</span>
                    </div>
                    <div className="meta-when">
                      <b>{iv.when}</b>
                      <span className="ts">{iv.dur} · {iv.transcript ? "有录音" : "纯文字记录"}</span>
                    </div>
                    <div className="insights">
                      <span className="chip acc"><span className="dot"></span>{iv.insights} 洞察</span>
                      {iv.blind > 0 && <span className="chip bad"><span className="dot"></span>{iv.blind} 盲点</span>}
                    </div>
                    <button className="btn sm openbtn">查看 →</button>
                  </div>
                ))}
              </div>

              {/* patterns */}
              <div className="iv-patterns">
                <div className="hd">
                  <h3>横向洞察 — 这几家公司爱问什么</h3>
                  <span className="meta">基于你 12 场面试 + 1.2k 同校面经</span>
                </div>
                <div className="iv-pattern-grid">
                  {patterns.map((p) => (
                    <div className="iv-pattern" key={p.co}>
                      <div className="co">{p.co}<span className="sm">N = {p.topics.length}</span></div>
                      {p.topics.map((t) => (
                        <div className="topic" key={t.name}>
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
                          <div className="bar"><i style={{ width: t.pct + "%" }}></i></div>
                          <span className="pct">{t.pct}%</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Detail screen ─────────────────────────────────────────────────────
const InterviewDetail = () => {
  const r = window.COACH_REVIEW;
  const audio = Array.from({ length: 80 }).map((_, i) => {
    // procedural-ish waveform
    const m = Math.sin(i * 0.6) * Math.sin(i * 0.13) * Math.sin(i * 0.07);
    return Math.max(8, Math.abs(m) * 100 + 18);
  });
  return (
    <div className="coach">
      <style>{window.COACH_CSS}</style>
      <style>{COACH_IV_CSS}</style>
      <div className="app">
        <window.CoachSide active="interview" />
        <div className="main">
          <window.CoachTopbar
            crumb={["面试复盘", `${r.co} · ${r.round}`]}
            title
            actions={<>
              <button className="icon-btn">{window.IK.download}</button>
              <button className="icon-btn">{window.IK.bookmark}</button>
              <button className="btn ghost sm">{window.IK.refresh}<span>重新评估</span></button>
              <button className="btn accent sm">{window.IK.spark}<span>问 Coach</span></button>
            </>}
          />

          <div className="scroll" style={{ overflow: "auto" }}>
            <div className="iv-detail">
              <div className="main-col">
                {/* header */}
                <div className="iv-header">
                  <div>
                    <h1>{r.co} <span className="light">· {r.role}</span></h1>
                    <div className="sub">
                      <span><b>{r.round}</b></span>
                      <span className="dot">·</span>
                      <span>{r.when}</span>
                      <span className="dot">·</span>
                      <span>时长 <b>{r.dur}</b></span>
                      <span className="dot">·</span>
                      <span>面试官 <b>{r.interviewer}</b></span>
                      <span className="dot">·</span>
                      <span className="transcript-pill"><span className="ic">{window.IK.check}</span>{r.recordedBy}</span>
                    </div>
                    <div className="iv-audio">
                      <div className="play">{window.IK.play}</div>
                      <div className="wave">
                        {audio.map((h, i) => (
                          <i key={i} className={i < 26 ? "played" : i === 26 ? "current" : ""} style={{ height: h + "%" }}></i>
                        ))}
                      </div>
                      <span className="time">18:24 / 62:00</span>
                    </div>
                  </div>
                  <div className="grade-blk">
                    <div className="g">{r.overall}</div>
                    <div className="l">综合表现</div>
                  </div>
                </div>

                {/* scores */}
                <div className="iv-scores">
                  <div className="hd">
                    <h3>能力分布</h3>
                    <span className="meta">6 个维度 · 基于全场转写 + 题库对比</span>
                  </div>
                  <p className="ai-note">{r.overallNote}</p>
                  <div className="iv-score-grid">
                    {r.scores.map((s) => (
                      <div className={"iv-score " + s.tone} key={s.name}>
                        <span className="name">{s.name}</span>
                        <span className="num">{s.score} / 100</span>
                        <div className="bar-wrap"><i style={{ width: s.score + "%" }}></i></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* questions */}
                <div className="iv-questions">
                  <div className="hd">
                    <h3>逐题复盘 — 6 道</h3>
                    <span className="meta">3 处亮点 · 2 处需要改进 · 1 处盲点</span>
                  </div>

                  {r.questions.map((q) => (
                    <div className={"iv-q " + (q.ai.tone === "bad" ? "bad" : q.ai.tone === "warn" ? "warn" : "")} key={q.n}>
                      <div className="head">
                        <div className="l">
                          <span className="n">{String(q.n).padStart(2, "0")}</span>
                          <div>
                            <span className="tt">{q.type} · {q.topic} · 难度 {q.diff}</span>
                            <div className="q-text">「{q.q}」</div>
                          </div>
                        </div>
                        <span className="chip" style={{ fontFamily: "Geist Mono", fontSize: 10, whiteSpace: "nowrap" }}>
                          ⏱ {q.time}
                        </span>
                      </div>

                      <div className="pair">
                        <div className="cell you">
                          <span className="lbl">你的回答 · 转写</span>
                          {q.you}
                        </div>
                        <div className={"cell ai " + (q.ai.tone !== "good" ? q.ai.tone : "")}>
                          <span className="lbl">Coach 评估</span>
                          {q.ai.text}
                        </div>
                      </div>

                      {q.better && (
                        <div className="better">
                          <span className="ic">{window.IK.spark}</span>
                          <span><b>更好的答法 ——</b> {q.better}</span>
                        </div>
                      )}

                      {q.gap && (
                        <div className="gap-line">
                          <span>{window.IK.help}</span>
                          <span>识别到知识盲点 ·</span>
                          <a>{q.gap.url} →</a>
                        </div>
                      )}

                      <div className="meta-row">
                        <span>{q.ai.tone === "good" ? "● 表现 OK" : q.ai.tone === "warn" ? "● 可改进" : "● 重点改进"}</span>
                        <div className="actions">
                          <button className="btn ghost sm" style={{ padding: "4px 10px", fontSize: 11 }}>加入题库</button>
                          <button className="btn ghost sm" style={{ padding: "4px 10px", fontSize: 11 }}>来 1 次模拟</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT — prediction + gaps */}
              <div className="iv-rail">
                <div className="pred-card">
                  <h4><span>预测 · 下一轮可能问</span><span style={{ color: "var(--warm)" }}>NEW</span></h4>
                  <div className="title">{r.prediction.nextRound}<br/><em>很可能问到 ——</em></div>
                  <div className="when">通常二面后 {r.prediction.nextWhen}</div>
                  {r.prediction.likely.map((p) => (
                    <div className="pred-row" key={p.topic}>
                      <span className="topic">{p.topic}</span>
                      <span className="pct">{p.pct}%</span>
                    </div>
                  ))}
                  <div className="cta-row">
                    <span className="b acc">{window.IK.play}<span>用这些题模拟一遍</span></span>
                    <span className="b">{window.IK.doc}<span>导出准备清单</span></span>
                  </div>
                </div>

                <div className="iv-rail-card">
                  <h4>识别到的知识盲点 · 3</h4>
                  <div className="gap-item">
                    <span className="num">01</span>
                    <div>
                      <b>性能优化的优先级判断</b>
                      <span>题库 · #143 · 性能优化 4 步决策法</span>
                    </div>
                  </div>
                  <div className="gap-item">
                    <span className="num">02</span>
                    <div>
                      <b>行为面试 STAR 法则</b>
                      <span>学习 · 行为面试 ch.2 · 25 min</span>
                    </div>
                  </div>
                  <div className="gap-item">
                    <span className="num">03</span>
                    <div>
                      <b>高质量反问</b>
                      <span>题库 · #88 · 30 个反问范本</span>
                    </div>
                  </div>
                </div>

                <div className="iv-rail-card">
                  <h4>这场对比 · 你过去 3 次</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", padding: "4px 0", fontSize: 12 }}>
                      <span style={{ color: "var(--ink-2)" }}>美团 · 二面（本次）</span>
                      <span className="num" style={{ color: "var(--warm)", fontFamily: "Geist Mono", fontSize: 12 }}>B+</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", padding: "4px 0", fontSize: 12 }}>
                      <span style={{ color: "var(--ink-3)" }}>字节 · 一面 · 5/19</span>
                      <span className="num" style={{ color: "var(--good)", fontFamily: "Geist Mono", fontSize: 12 }}>A</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", padding: "4px 0", fontSize: 12 }}>
                      <span style={{ color: "var(--ink-3)" }}>腾讯 · HR · 5/16</span>
                      <span className="num" style={{ color: "var(--good)", fontFamily: "Geist Mono", fontSize: 12 }}>B</span>
                    </div>
                    <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--good-2)", borderRadius: 8, fontSize: 11.5, color: "var(--ink-2)" }}>
                      <b style={{ color: "var(--good)" }}>↑ 趋势</b> 你的技术深度在上升，但行为面试一直没准备好。
                    </div>
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

Object.assign(window, { InterviewList, InterviewDetail });
