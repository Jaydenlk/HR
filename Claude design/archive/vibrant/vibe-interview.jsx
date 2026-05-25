// Vibe Interview Lab — list + detail (key feature)
// Apple Activity-style data viz, vivid colors, friendly tone.

const VIBE_IV_CSS = `
.vibe .iv-page{display:flex;flex-direction:column;gap:14px;height:100%;min-height:0;overflow:hidden}

/* stats bento */
.vibe .iv-stats{display:grid;grid-template-columns:1.3fr 1fr 1fr 1fr;gap:14px;flex-shrink:0}
.vibe .iv-stat{background:var(--bg-card);border-radius:var(--r-card);padding:18px 22px;border:1px solid var(--line);display:flex;flex-direction:column;gap:6px;position:relative;overflow:hidden}
.vibe .iv-stat.blue{background:var(--c-blue);color:#fff;border-color:var(--c-blue)}
.vibe .iv-stat.green{background:var(--c-green);color:#fff;border-color:var(--c-green)}
.vibe .iv-stat.yellow{background:var(--c-yellow);color:var(--ink);border-color:var(--c-yellow)}
.vibe .iv-stat .v{font-size:46px;font-weight:800;letter-spacing:-.035em;line-height:1}
.vibe .iv-stat .v .acc{font-size:14px;font-weight:600;margin-left:6px;letter-spacing:0}
.vibe .iv-stat .l{font-size:12.5px;font-weight:600;opacity:.78}
.vibe .iv-stat.blue .l,.vibe .iv-stat.green .l,.vibe .iv-stat.yellow .l{opacity:.85}
.vibe .iv-stat .extra{font-size:11.5px;font-weight:600;opacity:.7;margin-top:2px}
.vibe .iv-stat .mini-chart{margin-top:auto;display:flex;align-items:flex-end;gap:2px;height:36px}
.vibe .iv-stat .mini-chart i{flex:1;background:rgba(255,255,255,.3);border-radius:2px 2px 0 0}
.vibe .iv-stat .mini-chart i.on{background:#fff}
.vibe .iv-stat.yellow .mini-chart i{background:rgba(0,0,0,.18)}
.vibe .iv-stat.yellow .mini-chart i.on{background:var(--ink)}

/* capture banner */
.vibe .iv-capture{background:linear-gradient(135deg,var(--c-pink) 0%,var(--c-purple) 100%);color:#fff;border-radius:var(--r-card-lg);padding:22px 28px;display:flex;align-items:center;gap:24px;flex-shrink:0;position:relative;overflow:hidden}
.vibe .iv-capture::after{content:"";position:absolute;width:280px;height:280px;border-radius:50%;background:rgba(255,255,255,.12);right:-80px;top:-100px}
.vibe .iv-capture > *{position:relative;z-index:2}
.vibe .iv-capture .left{flex:1}
.vibe .iv-capture h3{margin:0;font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1.1}
.vibe .iv-capture p{margin:6px 0 0;font-size:13.5px;opacity:.88;max-width:60ch;font-weight:500}
.vibe .iv-capture .actions{display:flex;gap:8px}
.vibe .iv-capture .actions .btn{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.2);color:#fff;font-weight:700;backdrop-filter:blur(8px)}
.vibe .iv-capture .actions .btn.primary{background:#fff;color:var(--c-pink);border-color:#fff}

/* filter row */
.vibe .iv-fltr{display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.vibe .iv-fltr .tabs{display:flex;gap:4px;background:var(--bg-card);border-radius:999px;padding:4px;border:1px solid var(--line)}
.vibe .iv-fltr .tab{appearance:none;border:0;background:transparent;color:var(--ink-3);padding:7px 14px;font-size:13px;font-weight:600;border-radius:999px;cursor:default;display:flex;align-items:center;gap:6px}
.vibe .iv-fltr .tab.active{background:var(--ink);color:#fff}
.vibe .iv-fltr .tab .cnt{font-family:"JetBrains Mono",monospace;font-size:10px;background:rgba(255,255,255,.2);padding:1px 6px;border-radius:999px}
.vibe .iv-fltr .tab .cnt.gray{background:var(--bg-tint);color:var(--ink-3)}
.vibe .iv-fltr .right{display:flex;gap:8px;align-items:center}

/* list */
.vibe .iv-list{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;flex:1;min-height:0;overflow:auto;padding:2px 0;align-content:start}
.vibe .iv-card{background:var(--bg-card);border:1px solid var(--line);border-radius:var(--r-card);padding:16px 20px;display:grid;grid-template-columns:56px 1fr auto;gap:16px;align-items:center;transition:.15s}
.vibe .iv-card:hover{transform:translateY(-1px);border-color:var(--line-2)}
.vibe .iv-grade{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#fff;letter-spacing:-.025em}
.vibe .iv-grade.green{background:var(--c-green)}
.vibe .iv-grade.blue{background:var(--c-blue)}
.vibe .iv-grade.orange{background:var(--c-orange)}
.vibe .iv-grade.red{background:var(--c-red)}
.vibe .iv-grade.mint{background:var(--c-mint)}
.vibe .iv-grade.purple{background:var(--c-purple)}
.vibe .iv-card-body .co{font-size:15px;font-weight:700;color:var(--ink);letter-spacing:-.005em}
.vibe .iv-card-body .role{font-size:12.5px;color:var(--ink-3);font-weight:500;margin-top:2px}
.vibe .iv-card-body .meta-row{margin-top:8px;display:flex;flex-wrap:wrap;gap:5px}
.vibe .iv-card-body .ms-row{margin-top:6px;display:flex;gap:10px;font-size:11.5px;color:var(--ink-3);font-weight:500;font-family:"JetBrains Mono",monospace}
.vibe .iv-card .open{background:var(--bg-tint);border:0;color:var(--ink);padding:7px;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center}

/* patterns */
.vibe .iv-pat{background:var(--bg-card);border:1px solid var(--line);border-radius:var(--r-card-lg);padding:22px 24px;flex-shrink:0}
.vibe .iv-pat h3{margin:0 0 4px;font-size:20px;font-weight:700;letter-spacing:-.015em}
.vibe .iv-pat .sub{font-size:13px;color:var(--ink-3);font-weight:500;margin-bottom:16px}
.vibe .iv-pat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.vibe .pat-tile{border-radius:14px;padding:14px 16px}
.vibe .pat-tile.blue{background:var(--c-blue-2)}
.vibe .pat-tile.yellow{background:var(--c-yellow-2)}
.vibe .pat-tile.green{background:var(--c-green-2)}
.vibe .pat-tile.orange{background:var(--c-orange-2)}
.vibe .pat-tile .co{font-size:14px;font-weight:700;color:var(--ink);margin-bottom:10px;display:flex;justify-content:space-between}
.vibe .pat-tile .co .sm{font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--ink-3);font-weight:600}
.vibe .pat-tile .topic{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;padding:5px 0;font-size:12.5px;color:var(--ink-2);font-weight:500;border-top:1px dashed rgba(0,0,0,.06)}
.vibe .pat-tile .topic:first-of-type{border-top:0}
.vibe .pat-tile .topic .pct{font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:700;color:var(--ink)}

/* ─── detail ─── */
.vibe .iv-d{display:grid;grid-template-columns:1.6fr 1fr;gap:14px;height:100%;min-height:0;overflow:hidden}
.vibe .iv-d > .main-col{display:flex;flex-direction:column;gap:14px;min-width:0;min-height:0;overflow:hidden}

/* header card */
.vibe .iv-d-hd{background:var(--bg-card);border:1px solid var(--line);border-radius:var(--r-card-lg);padding:22px 26px;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:start;flex-shrink:0}
.vibe .iv-d-hd h1{margin:0;font-size:28px;font-weight:800;letter-spacing:-.025em;line-height:1.1}
.vibe .iv-d-hd h1 .light{color:var(--ink-3);font-weight:700}
.vibe .iv-d-hd .meta-row{margin-top:10px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.vibe .iv-d-hd .meta-row .sep{color:var(--ink-4);font-weight:500;font-size:13px}
.vibe .iv-d-hd .meta-row .m{font-size:13px;color:var(--ink-3);font-weight:500}
.vibe .iv-d-hd .meta-row .m b{color:var(--ink-2);font-weight:700}
.vibe .iv-d-hd .grade-blk{width:96px;height:96px;border-radius:24px;background:var(--c-orange);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0}
.vibe .iv-d-hd .grade-blk .g{font-size:46px;font-weight:800;letter-spacing:-.04em;line-height:1}
.vibe .iv-d-hd .grade-blk .l{font-size:10.5px;font-weight:700;opacity:.88;letter-spacing:.04em;text-transform:uppercase;margin-top:4px}

/* audio */
.vibe .audio{margin-top:14px;padding-top:14px;border-top:1px solid var(--line);display:flex;align-items:center;gap:14px}
.vibe .audio .play-btn{width:40px;height:40px;border-radius:50%;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:0}
.vibe .audio .wave{flex:1;display:flex;align-items:center;gap:1.5px;height:34px}
.vibe .audio .wave i{flex:1;background:var(--bg-tint);border-radius:1px}
.vibe .audio .wave i.played{background:var(--ink-3)}
.vibe .audio .wave i.head{background:var(--c-blue)}
.vibe .audio .time{font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--ink-3);font-weight:600}
.vibe .audio .ts-tag{margin-left:8px;font-size:11.5px;color:var(--c-green);font-weight:700;display:inline-flex;align-items:center;gap:4px}

/* scores card */
.vibe .scores{background:var(--bg-card);border:1px solid var(--line);border-radius:var(--r-card);padding:20px 22px;flex-shrink:0}
.vibe .scores .hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
.vibe .scores h3{margin:0;font-size:17px;font-weight:700;letter-spacing:-.01em}
.vibe .scores .meta{font-size:12px;color:var(--ink-3);font-weight:500}
.vibe .scores .ai-line{background:var(--c-yellow-2);border-radius:12px;padding:11px 14px;font-size:13px;color:var(--ink);margin-bottom:14px;line-height:1.5;font-weight:600;display:flex;align-items:center;gap:8px}
.vibe .scores .ai-line .ic{color:#7a5b00;flex-shrink:0}
.vibe .scores .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 22px}
.vibe .score{font-size:13px}
.vibe .score .row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px}
.vibe .score .name{font-weight:600;color:var(--ink-2)}
.vibe .score .num{font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:700;color:var(--ink)}
.vibe .score .num .max{color:var(--ink-4);font-weight:500;font-size:11px}
.vibe .score .bar{height:7px;border-radius:4px;background:var(--bg-tint);overflow:hidden}
.vibe .score .bar i{display:block;height:100%;border-radius:4px}
.vibe .score.green .bar i{background:var(--c-green)}
.vibe .score.blue .bar i{background:var(--c-blue)}
.vibe .score.yellow .bar i{background:var(--c-yellow)}
.vibe .score.red .bar i{background:var(--c-red)}
.vibe .score.orange .bar i{background:var(--c-orange)}
.vibe .score.mint .bar i{background:var(--c-mint)}

/* questions */
.vibe .qs{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:2px 2px 8px}
.vibe .qs .hd{display:flex;justify-content:space-between;align-items:baseline;padding:0 2px;flex-shrink:0}
.vibe .qs h3{margin:0;font-size:18px;font-weight:700;letter-spacing:-.01em}
.vibe .qs .meta{font-size:12px;color:var(--ink-3);font-weight:500}

.vibe .q-card{background:var(--bg-card);border:1px solid var(--line);border-radius:var(--r-card);padding:18px 20px}
.vibe .q-card.warn{background:#fffaeb;border-color:#f5e3a3}
.vibe .q-card.bad{background:#fff1ef;border-color:#f5c8c4}
.vibe .q-card .head{display:flex;align-items:flex-start;gap:14px;margin-bottom:12px}
.vibe .q-card .num{width:36px;height:36px;border-radius:12px;background:var(--c-blue);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0;letter-spacing:-.02em}
.vibe .q-card.warn .num{background:var(--c-orange)}
.vibe .q-card.bad .num{background:var(--c-red)}
.vibe .q-card .head-mid{flex:1;min-width:0}
.vibe .q-card .tt-row{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px;align-items:center}
.vibe .q-card .q-text{font-size:16px;font-weight:700;color:var(--ink);line-height:1.4;letter-spacing:-.005em}
.vibe .q-card .ts{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3);font-weight:600;flex-shrink:0;white-space:nowrap;background:var(--bg-tint);padding:5px 9px;border-radius:7px}
.vibe .q-card.warn .ts{background:rgba(255,159,0,.12);color:#a07b1f}
.vibe .q-card.bad .ts{background:rgba(255,59,48,.1);color:#cb1c14}

.vibe .q-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.vibe .q-pair .cell{padding:12px 14px;border-radius:12px;font-size:13px;line-height:1.55}
.vibe .q-pair .cell .lbl{display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px}
.vibe .q-pair .cell.you{background:var(--bg-tint)}
.vibe .q-pair .cell.you .lbl{color:var(--ink-3)}
.vibe .q-pair .cell.ai{background:#f0f8ff;border:1px solid #cee2f5}
.vibe .q-pair .cell.ai .lbl{color:var(--c-blue)}
.vibe .q-pair .cell.ai .lbl .av-coach{width:18px;height:18px;border-radius:50%;background:var(--c-purple);display:inline-block}
.vibe .q-card.warn .q-pair .cell.ai{background:#fff5d6;border-color:#f5dc8a}
.vibe .q-card.warn .q-pair .cell.ai .lbl{color:#a07b1f}
.vibe .q-card.bad .q-pair .cell.ai{background:#ffe0db;border-color:#f5b3aa}
.vibe .q-card.bad .q-pair .cell.ai .lbl{color:#cb1c14}

.vibe .q-card .better{background:var(--c-green-2);border-radius:12px;padding:11px 14px;font-size:13px;color:#1e5a2a;line-height:1.55;font-weight:500;display:flex;align-items:flex-start;gap:8px;margin-bottom:8px}
.vibe .q-card .better b{color:#1e7a3a;font-weight:700}
.vibe .q-card .better .ic{color:#1e7a3a;flex-shrink:0;margin-top:1px}

.vibe .q-card .gap-row{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink-3);font-weight:500;margin-bottom:10px}
.vibe .q-card .gap-row a{color:var(--c-blue);font-weight:700;text-decoration:none}

.vibe .q-card .foot{display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px dashed rgba(0,0,0,.08)}
.vibe .q-card .foot .status{font-size:11.5px;font-weight:700;display:inline-flex;align-items:center;gap:5px}
.vibe .q-card .foot .actions{display:flex;gap:6px}

/* prediction (right rail) */
.vibe .pred{background:linear-gradient(180deg,var(--ink) 0%,#0a0a0c 100%);color:#fff;border-radius:var(--r-card-lg);padding:22px 24px;position:relative;overflow:hidden;flex-shrink:0}
.vibe .pred::after{content:"";position:absolute;width:200px;height:200px;border-radius:50%;background:var(--c-pink);right:-80px;top:-80px;opacity:.5}
.vibe .pred > *{position:relative;z-index:2}
.vibe .pred .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.16);padding:4px 11px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:10px;backdrop-filter:blur(8px)}
.vibe .pred h3{margin:0;font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1.15}
.vibe .pred h3 .acc{color:var(--c-yellow)}
.vibe .pred .when-line{margin-top:6px;font-size:11.5px;color:rgba(255,255,255,.65);font-family:"JetBrains Mono",monospace;letter-spacing:.04em;font-weight:600;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.12)}

.vibe .pred-row{display:flex;align-items:center;gap:10px;padding:8px 0;font-size:13px}
.vibe .pred-row .topic{flex:1;line-height:1.45;color:rgba(255,255,255,.92);font-weight:500}
.vibe .pred-row .pct-pill{padding:3px 10px;border-radius:999px;font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:700;color:var(--ink)}
.vibe .pred-row .pct-pill.high{background:var(--c-yellow)}
.vibe .pred-row .pct-pill.mid{background:#fff;color:var(--ink)}
.vibe .pred-row .pct-pill.low{background:rgba(255,255,255,.25);color:#fff}

.vibe .pred .ctas{margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.12);display:flex;flex-direction:column;gap:6px}
.vibe .pred .ctas .b{font-size:13px;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.16);display:flex;align-items:center;gap:8px;font-weight:600;backdrop-filter:blur(8px)}
.vibe .pred .ctas .b.acc{background:var(--c-yellow);color:var(--ink);border-color:var(--c-yellow);font-weight:700}

/* rail cards */
.vibe .iv-d-rail{display:flex;flex-direction:column;gap:14px;overflow:hidden}
.vibe .gap-card{background:var(--bg-card);border:1px solid var(--line);border-radius:var(--r-card);padding:18px 20px}
.vibe .gap-card h3{margin:0 0 12px;font-size:14px;font-weight:700;letter-spacing:-.01em;display:flex;justify-content:space-between;align-items:baseline}
.vibe .gap-card h3 .cnt{font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--ink-3);background:var(--bg-tint);padding:2px 8px;border-radius:999px}
.vibe .gap-item{display:grid;grid-template-columns:32px 1fr;gap:12px;padding:10px 0;border-top:1px solid var(--line);align-items:center}
.vibe .gap-item:first-of-type{border-top:0}
.vibe .gap-item .ic-box{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px}
.vibe .gap-item .ic-box.r{background:var(--c-red)}
.vibe .gap-item .ic-box.o{background:var(--c-orange)}
.vibe .gap-item .ic-box.b{background:var(--c-blue)}
.vibe .gap-item b{display:block;font-size:13.5px;font-weight:700;color:var(--ink);letter-spacing:-.003em}
.vibe .gap-item span{font-size:11.5px;color:var(--ink-3);font-weight:500}

.vibe .trend-card{background:var(--bg-card);border:1px solid var(--line);border-radius:var(--r-card);padding:18px 20px}
.vibe .trend-card h3{margin:0 0 12px;font-size:14px;font-weight:700;letter-spacing:-.01em}
.vibe .trend-row{display:grid;grid-template-columns:1fr auto;align-items:center;padding:7px 0;font-size:13px;font-weight:600}
.vibe .trend-row .name{color:var(--ink-2)}
.vibe .trend-row .name.active{color:var(--ink)}
.vibe .trend-row .grade-mini{font-family:"JetBrains Mono",monospace;font-weight:700;padding:3px 9px;border-radius:7px;font-size:12.5px;color:#fff}
.vibe .trend-row .grade-mini.green{background:var(--c-green)}
.vibe .trend-row .grade-mini.blue{background:var(--c-blue)}
.vibe .trend-row .grade-mini.orange{background:var(--c-orange)}
.vibe .trend-card .summary{margin-top:12px;padding:11px 14px;background:var(--c-green-2);border-radius:12px;font-size:12.5px;color:#1e5a2a;font-weight:500;line-height:1.5}
.vibe .trend-card .summary b{color:#1e7a3a;font-weight:700}
`;

// ─── List ──────────────────────────────────────────────────────────────
const InterviewList = () => {
  const ivs = window.COACH_INTERVIEWS;
  const tinyChart = [3, 4, 4, 5, 6, 5, 7, 6, 8, 7, 9, 8, 9];
  return (
    <div className="vibe">
      <style>{window.VIBE_CSS}</style>
      <style>{VIBE_IV_CSS}</style>
      <div className="app">
        <window.VibeSide active="interview" />
        <div className="main">
          <window.VibeTopbar
            title="面试复盘"
            sub="录音 / 转写 / 评估 / 预测 —— 一站搞定"
            actions={<>
              <button className="btn sm">{window.IK.filter}<span>筛选</span></button>
              <button className="btn primary sm">{window.IK.mic}<span>录入新面试</span></button>
            </>}
          />

          <div className="scroll">
            <div className="iv-page">
              {/* stats */}
              <div className="iv-stats">
                <div className="iv-stat blue">
                  <div className="l">总面试数 · 本届</div>
                  <div className="v">12 <span className="acc">↑ 3</span></div>
                  <div className="mini-chart">
                    {tinyChart.map((h, i) => <i key={i} className={i >= 10 ? "on" : ""} style={{ height: h * 3 + "px" }}></i>)}
                  </div>
                </div>
                <div className="iv-stat green">
                  <div className="l">综合表现</div>
                  <div className="v">B+</div>
                  <div className="extra">↑ 从 4 月的 B−</div>
                </div>
                <div className="iv-stat yellow">
                  <div className="l">需要重点改进</div>
                  <div className="v">3</div>
                  <div className="extra">STAR · 性能 · 反问</div>
                </div>
                <div className="iv-stat">
                  <div className="l">24h 内复盘率</div>
                  <div className="v">87%</div>
                  <div className="extra" style={{ color: "var(--c-green)" }}>↑ 好习惯！</div>
                </div>
              </div>

              {/* capture banner */}
              <div className="iv-capture">
                <window.Avatar kind="coach" size={64} bg="rgba(255,255,255,.18)" />
                <div className="left">
                  <h3>刚结束一场面试？趁热复盘。</h3>
                  <p>3 种方式录入 —— 上传录音（≤ 2h）/ 手机录制 / 文字记录。AI 8 分钟搞定转写、抽题、对比题库、逐题评估。</p>
                </div>
                <div className="actions">
                  <button className="btn primary lg">{window.IK.mic}<span>上传录音</span></button>
                  <button className="btn lg">{window.IK.plus}<span>手动记录</span></button>
                </div>
              </div>

              {/* filter */}
              <div className="iv-fltr">
                <div className="tabs">
                  <button className="tab active"><span>全部</span><span className="cnt">12</span></button>
                  <button className="tab"><span>本周</span><span className="cnt gray">2</span></button>
                  <button className="tab"><span>需复盘</span><span className="cnt gray">1</span></button>
                  <button className="tab"><span>有录音</span><span className="cnt gray">8</span></button>
                  <button className="tab"><span>按公司</span></button>
                </div>
                <div className="right">
                  <span className="chip">最近一次 · 5/22</span>
                  <button className="icon-btn">{window.IK.search}</button>
                </div>
              </div>

              {/* list */}
              <div className="iv-list">
                {ivs.map((iv) => (
                  <div key={iv.id} className="iv-card">
                    <div className={"iv-grade " + iv.color}>{iv.quality}</div>
                    <div className="iv-card-body">
                      <div className="co">{iv.co} <span style={{ color: "var(--ink-3)", fontWeight: 500, fontSize: 13 }}>· {iv.role}</span></div>
                      <div className="role">{iv.round}</div>
                      <div className="meta-row">
                        <span className={"chip " + (iv.id === "iv-9" ? "purple" : "")} style={iv.id === "iv-9" ? {} : {}}>
                          {iv.id === "iv-9" ? "● 刚复盘" : "已复盘"}
                        </span>
                        <span className="chip">{iv.insights} 洞察</span>
                        {iv.blind > 0 && <span className="chip red">{iv.blind} 盲点</span>}
                        {iv.transcript && <span className="chip green">{window.IK.mic}<span>有录音</span></span>}
                      </div>
                      <div className="ms-row">
                        <span>{iv.when}</span>
                        <span>·</span>
                        <span>{iv.dur}</span>
                      </div>
                    </div>
                    <button className="open">{window.IK.chevR}</button>
                  </div>
                ))}
              </div>

              {/* patterns */}
              <div className="iv-pat">
                <h3>横向洞察 — 这几家公司爱问什么</h3>
                <div className="sub">基于你 12 场面试 + 1.2k 同校面经</div>
                <div className="iv-pat-grid">
                  {window.COACH_PATTERNS.map((p) => (
                    <div key={p.co} className={"pat-tile " + p.color}>
                      <div className="co">{p.co}<span className="sm">N=4</span></div>
                      {p.topics.map((t) => (
                        <div className="topic" key={t.n}>
                          <span>{t.n}</span>
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
  return (
    <div className="vibe">
      <style>{window.VIBE_CSS}</style>
      <style>{VIBE_IV_CSS}</style>
      <div className="app">
        <window.VibeSide active="interview" />
        <div className="main">
          <window.VibeTopbar
            title="美团 · 二面"
            sub="2026/5/22 · 62 min · L5 技术主管"
            actions={<>
              <button className="icon-btn">{window.IK.download}</button>
              <button className="icon-btn">{window.IK.bookmark}</button>
              <button className="btn sm">{window.IK.refresh}<span>重新评估</span></button>
              <button className="btn primary sm">{window.IK.msg}<span>问 Coach</span></button>
            </>}
          />

          <div className="scroll">
            <div className="iv-d">
              {/* main col */}
              <div className="main-col">
                {/* header */}
                <div className="iv-d-hd">
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
                      <button className="play-btn">{window.IK.play}</button>
                      <div className="wave">
                        {audio.map((h, i) => (
                          <i key={i} className={i < headIdx ? "played" : i === headIdx ? "head" : ""} style={{ height: h + "%" }}></i>
                        ))}
                      </div>
                      <span className="time">18:24 / 62:00</span>
                      <span className="ts-tag">{window.IK.check}<span>已转写 12,408 字</span></span>
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
                      <div className={"score " + s.color} key={s.name}>
                        <div className="row">
                          <span className="name">{s.name}</span>
                          <span className="num">{s.score} <span className="max">/ 100</span></span>
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
                    <div key={q.n} className={"q-card " + (q.tone === "bad" ? "bad" : q.tone === "warn" ? "warn" : "")}>
                      <div className="head">
                        <div className="num">{String(q.n).padStart(2, "0")}</div>
                        <div className="head-mid">
                          <div className="tt-row">
                            <span className="chip">{q.type}</span>
                            <span className="chip">{q.topic}</span>
                            <span className="chip">难度 {q.diff}</span>
                          </div>
                          <div className="q-text">{q.q}</div>
                        </div>
                        <span className="ts">⏱ {q.time}</span>
                      </div>

                      <div className="q-pair">
                        <div className="cell you">
                          <span className="lbl">
                            <window.Avatar kind="ming" size={16} />
                            <span>你 · 转写</span>
                          </span>
                          {q.you}
                        </div>
                        <div className="cell ai">
                          <span className="lbl">
                            <window.Avatar kind="coach" size={16} bg="var(--c-purple)" />
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
                        <div className="gap-row">
                          <span>{window.IK.help}</span>
                          <span>识别到知识盲点 ·</span>
                          <a>{q.gap.url} · {q.gap.topic} →</a>
                        </div>
                      )}

                      <div className="foot">
                        <span className="status" style={{
                          color: q.tone === "good" ? "var(--c-green)" : q.tone === "warn" ? "#a07b1f" : "var(--c-red)",
                        }}>
                          {q.tone === "good" ? "● 表现 OK" : q.tone === "warn" ? "● 可改进" : "● 重点改进"}
                        </span>
                        <div className="actions">
                          <button className="btn sm">加入题库</button>
                          <button className="btn sm">{window.IK.play}<span>模拟 1 次</span></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RAIL */}
              <div className="iv-d-rail">
                <div className="pred">
                  <span className="badge">🔮 预测 · 下一轮</span>
                  <h3>{r.prediction.nextRound}<br/>很可能问到 <span className="acc">——</span></h3>
                  <div className="when-line">通常二面后 {r.prediction.nextWhen}</div>
                  {r.prediction.likely.map((p) => (
                    <div className="pred-row" key={p.topic}>
                      <span className="topic">{p.topic}</span>
                      <span className={"pct-pill " + (p.pct >= 85 ? "high" : p.pct >= 70 ? "mid" : "low")}>{p.pct}%</span>
                    </div>
                  ))}
                  <div className="ctas">
                    <span className="b acc">{window.IK.play}<span>用这些题模拟一遍</span></span>
                    <span className="b">{window.IK.doc}<span>导出准备清单 PDF</span></span>
                  </div>
                </div>

                <div className="gap-card">
                  <h3>识别到的知识盲点 <span className="cnt">3</span></h3>
                  <div className="gap-item">
                    <div className="ic-box r">01</div>
                    <div>
                      <b>性能优化的优先级判断</b>
                      <span>题库 · #143 · 性能优化 4 步决策法</span>
                    </div>
                  </div>
                  <div className="gap-item">
                    <div className="ic-box o">02</div>
                    <div>
                      <b>行为面试 STAR 法则</b>
                      <span>学习 · 行为面试 ch.2 · 25 min</span>
                    </div>
                  </div>
                  <div className="gap-item">
                    <div className="ic-box b">03</div>
                    <div>
                      <b>高质量反问技巧</b>
                      <span>题库 · #88 · 30 个反问范本</span>
                    </div>
                  </div>
                </div>

                <div className="trend-card">
                  <h3>对比你过去 3 场</h3>
                  <div className="trend-row">
                    <span className="name active">美团 · 二面（本次）</span>
                    <span className="grade-mini orange">B+</span>
                  </div>
                  <div className="trend-row">
                    <span className="name">字节 · 一面 · 5/19</span>
                    <span className="grade-mini green">A</span>
                  </div>
                  <div className="trend-row">
                    <span className="name">腾讯 · HR · 5/16</span>
                    <span className="grade-mini blue">B</span>
                  </div>
                  <div className="summary">
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
