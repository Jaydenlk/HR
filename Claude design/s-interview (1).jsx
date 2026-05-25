// Interview Lab — list + detail. Disciplined, semantic-only color.

const IV_CSS = `
.coach .iv{display:flex;flex-direction:column;gap:18px;height:100%;min-height:0;overflow:hidden}

/* stats — 4 white cards, ONE highlighted as ink black */
.coach .iv-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;flex-shrink:0}
.coach .iv-stat{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px 22px;display:flex;flex-direction:column;gap:6px;min-height:128px;justify-content:space-between}
.coach .iv-stat.dark{background:var(--ink);color:#fff;border-color:var(--ink)}
.coach .iv-stat .v{font-size:36px;font-weight:800;letter-spacing:-.03em;line-height:1;color:var(--ink)}
.coach .iv-stat.dark .v{color:#fff}
.coach .iv-stat .v .delta{font-family:var(--font-mono);font-size:12px;font-weight:700;color:var(--success);margin-left:6px;letter-spacing:0}
.coach .iv-stat .l{font-size:12.5px;color:var(--ink-3);font-weight:500}
.coach .iv-stat.dark .l{color:rgba(255,255,255,.7)}
.coach .iv-stat .extra{font-size:11.5px;color:var(--ink-3);font-weight:500;display:flex;align-items:center;gap:5px}
.coach .iv-stat .extra .dot{width:6px;height:6px;border-radius:50%;background:var(--ink-3)}
.coach .iv-stat .extra.success{color:#1f7a31}
.coach .iv-stat .extra.success .dot{background:var(--success)}
.coach .iv-stat .extra.danger{color:#bf2418}
.coach .iv-stat .extra.danger .dot{background:var(--danger)}
.coach .iv-stat.dark .extra{color:rgba(255,255,255,.7)}
.coach .iv-stat.dark .extra .dot{background:rgba(255,255,255,.5)}
.coach .iv-stat .chart{display:flex;align-items:flex-end;gap:2px;height:24px;margin-top:auto}
.coach .iv-stat .chart i{flex:1;background:var(--surface-2);border-radius:2px}
.coach .iv-stat .chart i.on{background:var(--ink)}
.coach .iv-stat.dark .chart i{background:rgba(255,255,255,.16)}
.coach .iv-stat.dark .chart i.on{background:#fff}

/* capture — ONE ink card */
.coach .capture{background:var(--ink);color:#fff;border-radius:24px;padding:24px 28px;display:flex;align-items:center;gap:24px;flex-shrink:0;position:relative;overflow:hidden}
.coach .capture::before{content:"";position:absolute;inset:0;background:radial-gradient(500px 280px at 90% -10%,rgba(10,132,255,.24),transparent 60%)}
.coach .capture > *{position:relative;z-index:2}
.coach .capture .left{flex:1}
.coach .capture h3{margin:0;font-size:22px;font-weight:700;letter-spacing:-.02em;line-height:1.1}
.coach .capture p{margin:6px 0 0;font-size:13.5px;color:rgba(255,255,255,.7);font-weight:500;max-width:64ch;line-height:1.55}
.coach .capture .actions{display:flex;gap:8px}
.coach .capture .btn.brand{background:var(--brand);border-color:var(--brand);color:#fff}
.coach .capture .btn.outline{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.16);color:#fff;backdrop-filter:blur(8px)}

/* filter row */
.coach .fltr{display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.coach .fltr .tabs{display:flex;gap:2px;background:var(--surface-2);border-radius:999px;padding:3px}
.coach .fltr .tab{appearance:none;border:0;background:transparent;color:var(--ink-3);padding:7px 14px;font-size:13px;font-weight:600;border-radius:999px;cursor:default;display:flex;align-items:center;gap:6px}
.coach .fltr .tab.active{background:var(--surface);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.coach .fltr .tab .cnt{font-family:var(--font-mono);font-size:10px;color:var(--ink-4);font-weight:600}
.coach .fltr .right{display:flex;gap:8px;align-items:center}

/* list */
.coach .iv-rows{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;flex:1;min-height:0;overflow:auto;align-content:start;padding:2px 0}
.coach .iv-row{
  background:var(--surface);border:1px solid var(--line);border-radius:16px;
  padding:16px 18px;display:grid;grid-template-columns:54px 1fr auto;gap:14px;align-items:center;
}
.coach .iv-row:hover{border-color:var(--line-2)}
.coach .iv-row .grade{
  width:54px;height:54px;border-radius:14px;display:flex;align-items:center;justify-content:center;
  font-size:24px;font-weight:800;color:#fff;letter-spacing:-.03em;
}
.coach .iv-row .grade.g-a{background:var(--success)}
.coach .iv-row .grade.g-b{background:var(--ink)}
.coach .iv-row .grade.g-c{background:var(--warn)}
.coach .iv-row .grade.g-d{background:var(--danger)}
.coach .iv-row .body .co{font-size:14.5px;font-weight:600;color:var(--ink);letter-spacing:-.005em}
.coach .iv-row .body .co .role{color:var(--ink-3);font-weight:500;font-size:13px}
.coach .iv-row .body .round{font-size:12.5px;color:var(--ink-3);font-weight:500;margin-top:2px}
.coach .iv-row .body .meta{margin-top:7px;display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.coach .iv-row .body .meta .ts-meta{font-family:var(--font-mono);font-size:11px;color:var(--ink-4);font-weight:500;margin-left:auto}
.coach .iv-row .chev{color:var(--ink-3)}

/* patterns */
.coach .pat-card{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:22px 26px;flex-shrink:0}
.coach .pat-card .hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px}
.coach .pat-card h3{margin:0;font-size:18px;font-weight:700;letter-spacing:-.012em}
.coach .pat-card .meta{font-size:12px;color:var(--ink-3);font-weight:500}
.coach .pat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
.coach .pat-col .name{font-size:13px;font-weight:700;color:var(--ink);margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:baseline}
.coach .pat-col .name .sm{font-family:var(--font-mono);font-size:10px;font-weight:600;color:var(--ink-3)}
.coach .pat-row{display:grid;grid-template-columns:1fr 60px 40px;gap:8px;align-items:center;padding:5px 0;font-size:12.5px;color:var(--ink-2);font-weight:500}
.coach .pat-row .bar{height:5px;background:var(--surface-2);border-radius:3px;overflow:hidden}
.coach .pat-row .bar i{display:block;height:100%;background:var(--ink);border-radius:3px}
.coach .pat-row .pct{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);text-align:right;font-weight:600}

/* ─── detail ─── */
.coach .iv-d{display:grid;grid-template-columns:1.6fr 1fr;gap:18px;height:100%;min-height:0;overflow:hidden}
.coach .iv-d > .col-l{display:flex;flex-direction:column;gap:14px;min-width:0;min-height:0;overflow:hidden}
.coach .iv-d > .col-r{display:flex;flex-direction:column;gap:14px;min-width:0;overflow:hidden}

/* header */
.coach .iv-hd{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:24px 28px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start;flex-shrink:0}
.coach .iv-hd h1{margin:0;font-size:30px;font-weight:700;letter-spacing:-.025em;line-height:1.1}
.coach .iv-hd h1 .light{color:var(--ink-3);font-weight:600}
.coach .iv-hd .meta-row{margin-top:10px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.coach .iv-hd .meta-row .sep{color:var(--ink-4);font-size:12px}
.coach .iv-hd .meta-row .m{font-size:12.5px;color:var(--ink-3);font-weight:500}
.coach .iv-hd .meta-row .m b{color:var(--ink-2);font-weight:600}
.coach .iv-hd .grade-blk{width:92px;height:92px;border-radius:22px;background:var(--ink);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0}
.coach .iv-hd .grade-blk .g{font-size:42px;font-weight:800;letter-spacing:-.04em;line-height:1}
.coach .iv-hd .grade-blk .l{font-size:10.5px;font-weight:600;opacity:.7;letter-spacing:.04em;text-transform:uppercase;margin-top:4px}

/* audio */
.coach .audio{margin-top:14px;padding-top:14px;border-top:1px solid var(--line);display:flex;align-items:center;gap:14px}
.coach .audio .play{width:38px;height:38px;border-radius:50%;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;border:0;flex-shrink:0}
.coach .audio .wave{flex:1;display:flex;align-items:center;gap:1.5px;height:34px}
.coach .audio .wave i{flex:1;background:var(--surface-2);border-radius:1px}
.coach .audio .wave i.played{background:var(--ink-3)}
.coach .audio .wave i.head{background:var(--brand)}
.coach .audio .time{font-family:var(--font-mono);font-size:12px;color:var(--ink-3);font-weight:600}
.coach .audio .ts{margin-left:6px;font-size:11.5px;color:#1f7a31;font-weight:600;display:inline-flex;align-items:center;gap:4px}

/* scores */
.coach .scores{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px 24px;flex-shrink:0}
.coach .scores .hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px}
.coach .scores .hd h3{margin:0;font-size:17px;font-weight:700;letter-spacing:-.012em}
.coach .scores .hd .meta{font-size:12px;color:var(--ink-3);font-weight:500}
.coach .scores .ai-line{background:var(--surface-2);border-radius:10px;padding:11px 14px;font-size:13px;color:var(--ink-2);margin-bottom:14px;line-height:1.5;font-weight:500;display:flex;align-items:flex-start;gap:8px}
.coach .scores .ai-line .ic{color:var(--brand);flex-shrink:0;margin-top:2px}
.coach .scores .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 28px}
.coach .score-row .h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px;font-size:13px}
.coach .score-row .h .name{font-weight:600;color:var(--ink-2)}
.coach .score-row .h .v{font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--ink)}
.coach .score-row .h .v .mx{color:var(--ink-4);font-size:11px;font-weight:500}
.coach .score-row .bar{height:6px;background:var(--surface-2);border-radius:3px;overflow:hidden}
.coach .score-row .bar i{display:block;height:100%;background:var(--ink);border-radius:3px}
.coach .score-row.success .bar i{background:var(--success)}
.coach .score-row.warn .bar i{background:var(--warn)}
.coach .score-row.danger .bar i{background:var(--danger)}

/* questions list */
.coach .qs{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:2px 2px 8px}
.coach .qs .hd{display:flex;justify-content:space-between;align-items:baseline;padding:0 2px;flex-shrink:0}
.coach .qs h3{margin:0;font-size:17px;font-weight:700;letter-spacing:-.012em}
.coach .qs .meta{font-size:12px;color:var(--ink-3);font-weight:500}

.coach .q{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px 20px}
.coach .q.warn{background:#fffbf2;border-color:#f5dca8}
.coach .q.bad{background:#fff5f3;border-color:#f5beb8}

.coach .q .head{display:flex;align-items:flex-start;gap:14px;margin-bottom:12px}
.coach .q .num{width:32px;height:32px;border-radius:10px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;letter-spacing:-.02em;flex-shrink:0}
.coach .q.warn .num{background:var(--warn)}
.coach .q.bad .num{background:var(--danger)}
.coach .q .head-body{flex:1;min-width:0}
.coach .q .tt-row{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px;align-items:center}
.coach .q .q-text{font-size:15px;font-weight:600;color:var(--ink);line-height:1.4;letter-spacing:-.005em}
.coach .q .ts{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);font-weight:600;flex-shrink:0;white-space:nowrap;background:var(--surface-2);padding:5px 9px;border-radius:7px}
.coach .q.warn .ts{background:rgba(255,149,0,.12);color:#a86200}
.coach .q.bad .ts{background:rgba(255,59,48,.1);color:#bf2418}

.coach .q .pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.coach .q .cell{padding:12px 14px;border-radius:12px;font-size:13px;line-height:1.55;font-weight:500}
.coach .q .cell .lbl{display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px}
.coach .q .cell.you{background:var(--surface-2);color:var(--ink-2)}
.coach .q .cell.you .lbl{color:var(--ink-3)}
.coach .q .cell.ai{background:var(--brand-soft);color:var(--ink-2)}
.coach .q .cell.ai .lbl{color:var(--brand-ink)}
.coach .q.warn .cell.ai{background:var(--warn-soft);color:#5c3700}
.coach .q.warn .cell.ai .lbl{color:#a86200}
.coach .q.bad .cell.ai{background:var(--danger-soft);color:#831a13}
.coach .q.bad .cell.ai .lbl{color:#bf2418}

.coach .q .better{background:var(--success-soft);border-radius:12px;padding:11px 14px;font-size:13px;color:#1e5a2a;line-height:1.55;font-weight:500;display:flex;align-items:flex-start;gap:8px;margin-top:10px}
.coach .q .better b{color:#0e4a18;font-weight:700}
.coach .q .better .ic{color:#1e7a3a;flex-shrink:0;margin-top:1px}

.coach .q .gap{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink-3);font-weight:500;margin-top:8px}
.coach .q .gap a{color:var(--brand);font-weight:600;text-decoration:none}

.coach .q .foot-q{display:flex;justify-content:space-between;align-items:center;padding-top:10px;margin-top:10px;border-top:1px dashed rgba(0,0,0,.08)}
.coach .q .status{font-size:11.5px;font-weight:700;display:inline-flex;align-items:center;gap:5px}
.coach .q .status.good{color:var(--success)}
.coach .q .status.warn{color:#a86200}
.coach .q .status.bad{color:var(--danger)}
.coach .q .status .dot{width:6px;height:6px;border-radius:50%;background:currentColor}

/* prediction (dark hero on right) */
.coach .pred{background:var(--ink);color:#fff;border-radius:22px;padding:24px;position:relative;overflow:hidden;flex-shrink:0}
.coach .pred::before{content:"";position:absolute;inset:0;background:radial-gradient(500px 280px at 100% -20%,rgba(10,132,255,.32),transparent 60%)}
.coach .pred > *{position:relative;z-index:2}
.coach .pred .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.12);padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:12px;backdrop-filter:blur(8px)}
.coach .pred h3{margin:0;font-size:22px;font-weight:700;letter-spacing:-.018em;line-height:1.15}
.coach .pred h3 .acc{color:var(--brand)}
.coach .pred .when-line{margin-top:6px;font-size:12px;color:rgba(255,255,255,.55);font-family:var(--font-mono);font-weight:500;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.12)}

.coach .pred-row{display:flex;align-items:center;gap:10px;padding:9px 0;font-size:13px;border-bottom:1px solid rgba(255,255,255,.06)}
.coach .pred-row:last-of-type{border-bottom:0}
.coach .pred-row .topic{flex:1;line-height:1.45;color:rgba(255,255,255,.92);font-weight:500}
.coach .pred-row .pct{font-family:var(--font-mono);font-size:11px;font-weight:700;padding:3px 9px;border-radius:6px;background:rgba(255,255,255,.1);color:#fff}
.coach .pred-row .pct.high{background:var(--brand);color:#fff}
.coach .pred .ctas{margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.12);display:flex;flex-direction:column;gap:6px}
.coach .pred .ctas .b{font-size:12.5px;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;gap:8px;font-weight:600;cursor:default}
.coach .pred .ctas .b.brand{background:var(--brand);border-color:var(--brand);font-weight:700}

/* gap card */
.coach .gap-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px 20px}
.coach .gap-card h3{margin:0 0 12px;font-size:14px;font-weight:700;letter-spacing:-.005em;display:flex;justify-content:space-between;align-items:baseline}
.coach .gap-card h3 .cnt{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);background:var(--surface-2);padding:2px 8px;border-radius:999px;font-weight:600}
.coach .gap-item{display:grid;grid-template-columns:28px 1fr;gap:12px;padding:10px 0;border-top:1px solid var(--line);align-items:start}
.coach .gap-item:first-of-type{border-top:0;padding-top:2px}
.coach .gap-item .n-mark{width:24px;height:24px;border-radius:7px;background:var(--surface-2);color:var(--ink);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px}
.coach .gap-item b{display:block;font-size:13px;font-weight:600;color:var(--ink);letter-spacing:-.003em;line-height:1.35}
.coach .gap-item span{font-size:11.5px;color:var(--ink-3);font-weight:500;display:block;margin-top:2px}

/* trend card */
.coach .trend-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px 20px}
.coach .trend-card h3{margin:0 0 12px;font-size:14px;font-weight:700;letter-spacing:-.005em}
.coach .tr{display:grid;grid-template-columns:1fr auto;align-items:center;padding:6px 0;font-size:13px;font-weight:500;border-bottom:1px solid var(--line)}
.coach .tr:last-of-type{border-bottom:0}
.coach .tr .name{color:var(--ink-2)}
.coach .tr .name.now{color:var(--ink);font-weight:700}
.coach .tr .mini-g{font-family:var(--font-mono);font-weight:700;padding:3px 9px;border-radius:6px;font-size:12px;color:#fff}
.coach .tr .mini-g.g-a{background:var(--success)}
.coach .tr .mini-g.g-b{background:var(--ink)}
.coach .tr .mini-g.g-c{background:var(--warn)}
.coach .tr-note{margin-top:12px;padding:11px 14px;background:var(--success-soft);border-radius:10px;font-size:12.5px;color:#1f5a2a;font-weight:500;line-height:1.55}
.coach .tr-note b{color:#0e4a18;font-weight:700}
`;

// ─── List ──────────────────────────────────────────────────────────────
const InterviewList = () => {
  const ivs = window.COACH_INTERVIEWS;
  const tinyChart = [3, 4, 4, 5, 6, 5, 7, 6, 8, 7, 9, 8, 9];
  const gradeClass = (q) => {
    if (q.startsWith("A")) return "g-a";
    if (q.startsWith("B")) return "g-b";
    if (q.startsWith("C")) return "g-c";
    return "g-d";
  };
  return (
    <div className="coach">
      <style>{window.CORE_CSS}</style>
      <style>{IV_CSS}</style>
      <div className="app">
        <window.CoachSide active="interview" />
        <div className="main">
          <window.CoachTopbar
            title="面试复盘"
            sub="录音 → 转写 → 评估 → 预测 · 一站搞定"
            actions={<>
              <button className="btn sm">{window.IK.filter}<span>筛选</span></button>
              <button className="btn primary sm">{window.IK.mic}<span>录入新面试</span></button>
            </>}
          />

          <div className="scroll">
            <div className="iv">
              {/* stats */}
              <div className="iv-stats">
                <div className="iv-stat dark">
                  <div>
                    <div className="l">总面试数 · 本届</div>
                    <div className="v">12 <span className="delta">↑ 3</span></div>
                  </div>
                  <div className="chart">{tinyChart.map((h, i) => <i key={i} className={i >= 10 ? "on" : ""} style={{ height: h * 2.5 + "px" }}></i>)}</div>
                </div>
                <div className="iv-stat">
                  <div>
                    <div className="l">综合表现</div>
                    <div className="v">B+</div>
                  </div>
                  <div className="extra success"><span className="dot"></span>↑ 从 4 月的 B−</div>
                </div>
                <div className="iv-stat">
                  <div>
                    <div className="l">需要重点改进</div>
                    <div className="v">3</div>
                  </div>
                  <div className="extra danger"><span className="dot"></span>STAR · 性能 · 反问</div>
                </div>
                <div className="iv-stat">
                  <div>
                    <div className="l">24h 内复盘率</div>
                    <div className="v">87%</div>
                  </div>
                  <div className="extra success"><span className="dot"></span>好习惯</div>
                </div>
              </div>

              {/* capture banner */}
              <div className="capture">
                <window.Avatar kind="coach" size={56} ring="rgba(255,255,255,.08)" />
                <div className="left">
                  <h3>刚结束一场面试？趁热复盘。</h3>
                  <p>3 种方式录入 —— 上传录音 / 手机录制 / 文字记录。AI 8 分钟搞定转写、抽题、对比题库、逐题评估。</p>
                </div>
                <div className="actions">
                  <button className="btn brand lg">{window.IK.mic}<span>上传录音</span></button>
                  <button className="btn outline lg">{window.IK.plus}<span>手动记录</span></button>
                </div>
              </div>

              {/* filter */}
              <div className="fltr">
                <div className="tabs">
                  <button className="tab active"><span>全部</span><span className="cnt">12</span></button>
                  <button className="tab"><span>本周</span><span className="cnt">2</span></button>
                  <button className="tab"><span>需复盘</span><span className="cnt">1</span></button>
                  <button className="tab"><span>有录音</span><span className="cnt">8</span></button>
                  <button className="tab"><span>按公司</span></button>
                </div>
                <div className="right">
                  <span className="chip">最近一次 · 5/22</span>
                  <button className="ico-btn">{window.IK.search}</button>
                </div>
              </div>

              {/* list */}
              <div className="iv-rows">
                {ivs.map((iv) => (
                  <div key={iv.id} className="iv-row">
                    <div className={"grade " + gradeClass(iv.quality)}>{iv.quality}</div>
                    <div className="body">
                      <div className="co">{iv.co}<span className="role"> · {iv.role}</span></div>
                      <div className="round">{iv.round}</div>
                      <div className="meta">
                        {iv.id === "iv-9" && <span className="chip brand"><span className="dot"></span>刚复盘</span>}
                        <span className="chip">{iv.insights} 洞察</span>
                        {iv.blind > 0 && <span className="chip danger">{iv.blind} 盲点</span>}
                        {iv.transcript && <span className="chip success">●有录音</span>}
                        <span className="ts-meta">{iv.when} · {iv.dur}</span>
                      </div>
                    </div>
                    <span className="chev">{window.IK.chevR}</span>
                  </div>
                ))}
              </div>

              {/* patterns */}
              <div className="pat-card">
                <div className="hd">
                  <h3>横向洞察 — 这几家公司爱问什么</h3>
                  <span className="meta">基于你 12 场面试 + 1.2k 同校面经</span>
                </div>
                <div className="pat-grid">
                  {window.COACH_PATTERNS.map((p) => (
                    <div key={p.co} className="pat-col">
                      <div className="name">{p.co}<span className="sm">N=4</span></div>
                      {p.topics.map((t) => (
                        <div key={t.n} className="pat-row">
                          <span>{t.n}</span>
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

// ─── Detail ─────────────────────────────────────────────────────────────
const InterviewDetail = () => {
  const r = window.COACH_REVIEW;
  const audio = Array.from({ length: 100 }).map((_, i) => {
    const m = Math.sin(i * 0.6) * Math.sin(i * 0.13) * Math.sin(i * 0.07);
    return Math.max(10, Math.abs(m) * 100 + 20);
  });
  const headIdx = 30;
  const scoreTone = (n) => n >= 75 ? "success" : n >= 55 ? "warn" : "danger";
  return (
    <div className="coach">
      <style>{window.CORE_CSS}</style>
      <style>{IV_CSS}</style>
      <div className="app">
        <window.CoachSide active="interview" />
        <div className="main">
          <window.CoachTopbar
            title="美团 · 二面"
            sub="2026/5/22 · 62 min · L5 技术主管"
            actions={<>
              <button className="ico-btn">{window.IK.download}</button>
              <button className="ico-btn">{window.IK.bookmark}</button>
              <button className="btn sm">{window.IK.refresh}<span>重新评估</span></button>
              <button className="btn primary sm">{window.IK.msg}<span>问 Coach</span></button>
            </>}
          />

          <div className="scroll">
            <div className="iv-d">
              <div className="col-l">
                {/* header */}
                <div className="iv-hd">
                  <div>
                    <h1>{r.co} <span className="light">· {r.role}</span></h1>
                    <div className="meta-row">
                      <span className="chip dark">{r.round}</span>
                      <span className="m">{r.when}</span>
                      <span className="sep">·</span>
                      <span className="m">时长 <b>{r.dur}</b></span>
                      <span className="sep">·</span>
                      <span className="m">面试官 <b>{r.interviewer}</b></span>
                    </div>
                    <div className="audio">
                      <button className="play">{window.IK.play}</button>
                      <div className="wave">
                        {audio.map((h, i) => (
                          <i key={i} className={i < headIdx ? "played" : i === headIdx ? "head" : ""} style={{ height: h + "%" }}></i>
                        ))}
                      </div>
                      <span className="time">18:24 / 62:00</span>
                      <span className="ts">{window.IK.check}<span>已转写 12,408 字</span></span>
                    </div>
                  </div>
                  <div className="grade-blk">
                    <div className="g">{r.overall}</div>
                    <div className="l">综合</div>
                  </div>
                </div>

                {/* scores */}
                <div className="scores">
                  <div className="hd">
                    <h3>能力分布 · 6 个维度</h3>
                    <span className="meta">基于全场转写 + 题库对比</span>
                  </div>
                  <div className="ai-line">
                    <span className="ic">{window.IK.spark}</span>
                    <span>{r.overallNote}</span>
                  </div>
                  <div className="grid">
                    {r.scores.map((s) => (
                      <div key={s.name} className={"score-row " + scoreTone(s.score)}>
                        <div className="h">
                          <span className="name">{s.name}</span>
                          <span className="v">{s.score} <span className="mx">/ 100</span></span>
                        </div>
                        <div className="bar"><i style={{ width: s.score + "%" }}></i></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* questions */}
                <div className="qs">
                  <div className="hd">
                    <h3>逐题复盘 · {r.questions.length} 道</h3>
                    <span className="meta">3 亮点 · 2 需改 · 1 盲点</span>
                  </div>
                  {r.questions.map((q) => (
                    <div key={q.n} className={"q " + (q.tone === "bad" ? "bad" : q.tone === "warn" ? "warn" : "")}>
                      <div className="head">
                        <div className="num">{String(q.n).padStart(2, "0")}</div>
                        <div className="head-body">
                          <div className="tt-row">
                            <span className="chip">{q.type}</span>
                            <span className="chip">{q.topic}</span>
                            <span className="chip">难度 {q.diff}</span>
                          </div>
                          <div className="q-text">{q.q}</div>
                        </div>
                        <span className="ts">⏱ {q.time}</span>
                      </div>

                      <div className="pair">
                        <div className="cell you">
                          <span className="lbl">
                            <window.Avatar kind="user" size={16} />
                            <span>你 · 转写</span>
                          </span>
                          {q.you}
                        </div>
                        <div className="cell ai">
                          <span className="lbl">
                            <window.Avatar kind="coach" size={16} />
                            <span>Coach 评估</span>
                          </span>
                          {q.ai}
                        </div>
                      </div>

                      {q.better && (
                        <div className="better">
                          <span className="ic">{window.IK.spark}</span>
                          <span><b>更好的答法 ——</b> {q.better}</span>
                        </div>
                      )}

                      {q.gap && (
                        <div className="gap">
                          <span>{window.IK.help}</span>
                          <span>识别到知识盲点 ·</span>
                          <a>{q.gap.url} · {q.gap.topic} →</a>
                        </div>
                      )}

                      <div className="foot-q">
                        <span className={"status " + (q.tone === "good" ? "good" : q.tone === "warn" ? "warn" : "bad")}>
                          <span className="dot"></span>
                          {q.tone === "good" ? "表现 OK" : q.tone === "warn" ? "可改进" : "重点改进"}
                        </span>
                        <div className="actions" style={{ display: "flex", gap: 6 }}>
                          <button className="btn sm">加入题库</button>
                          <button className="btn sm">{window.IK.play}<span>模拟 1 次</span></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT */}
              <div className="col-r">
                <div className="pred">
                  <span className="badge">🔮 预测 · 下一轮</span>
                  <h3>{r.prediction.nextRound}<br/>很可能问到 <span className="acc">——</span></h3>
                  <div className="when-line">通常二面后 {r.prediction.nextWhen}</div>
                  {r.prediction.likely.map((p) => (
                    <div key={p.topic} className="pred-row">
                      <span className="topic">{p.topic}</span>
                      <span className={"pct " + (p.pct >= 85 ? "high" : "")}>{p.pct}%</span>
                    </div>
                  ))}
                  <div className="ctas">
                    <span className="b brand">{window.IK.play}<span>用这些题模拟一遍</span></span>
                    <span className="b">{window.IK.doc}<span>导出准备清单</span></span>
                  </div>
                </div>

                <div className="gap-card">
                  <h3>识别到的知识盲点 <span className="cnt">3</span></h3>
                  <div className="gap-item">
                    <div className="n-mark">01</div>
                    <div>
                      <b>性能优化的优先级判断</b>
                      <span>题库 · #143 · 性能优化 4 步决策法</span>
                    </div>
                  </div>
                  <div className="gap-item">
                    <div className="n-mark">02</div>
                    <div>
                      <b>行为面试 STAR 法则</b>
                      <span>学习 · 行为面试 ch.2 · 25 min</span>
                    </div>
                  </div>
                  <div className="gap-item">
                    <div className="n-mark">03</div>
                    <div>
                      <b>高质量反问技巧</b>
                      <span>题库 · #88 · 30 个反问范本</span>
                    </div>
                  </div>
                </div>

                <div className="trend-card">
                  <h3>对比你过去 3 场</h3>
                  <div className="tr">
                    <span className="name now">美团 · 二面（本次）</span>
                    <span className="mini-g g-b">B+</span>
                  </div>
                  <div className="tr">
                    <span className="name">字节 · 一面 · 5/19</span>
                    <span className="mini-g g-a">A</span>
                  </div>
                  <div className="tr">
                    <span className="name">腾讯 · HR · 5/16</span>
                    <span className="mini-g g-b">B</span>
                  </div>
                  <div className="tr-note">
                    <b>↑ 趋势</b> 你的技术深度在上升，但行为面试一直没准备好。
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
