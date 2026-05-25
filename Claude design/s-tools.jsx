// Tool screens — 简历馆 / 模拟面试 / 求职信 / 薪资雷达 / 投递追踪 / 职业地图
// All match v4 light theme: white surfaces, blue brand accent, semantic colors only.

const TOOLS_CSS = `
/* shared tool layout */
.coach .tool{display:flex;flex-direction:column;gap:16px;height:100%;min-height:0;overflow:hidden}
.coach .tool-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px 22px}
.coach .tool-card.lg{border-radius:22px;padding:24px 26px}
.coach .tool-grid{display:grid;gap:14px}

/* generic stat tile */
.coach .stat-tile{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px 22px;display:flex;flex-direction:column;gap:6px;min-height:104px;justify-content:space-between}
.coach .stat-tile .l{font-size:12px;color:var(--ink-3);font-weight:500}
.coach .stat-tile .v{font-size:32px;font-weight:800;letter-spacing:-.025em;line-height:1;color:var(--ink)}
.coach .stat-tile .v .delta{font-family:var(--font-mono);font-size:12px;font-weight:700;margin-left:6px;letter-spacing:0}
.coach .stat-tile .v .delta.up{color:var(--success)}
.coach .stat-tile .v .delta.down{color:var(--danger)}
.coach .stat-tile .extra{font-size:11.5px;color:var(--ink-3);font-weight:500;display:flex;align-items:center;gap:5px}
.coach .stat-tile .extra .dot{width:6px;height:6px;border-radius:50%}
.coach .stat-tile .extra.success .dot{background:var(--success)}
.coach .stat-tile .extra.success{color:#1f7a31}
.coach .stat-tile .extra.warn .dot{background:var(--warn)}
.coach .stat-tile .extra.warn{color:#a86200}
.coach .stat-tile .extra.danger .dot{background:var(--danger)}
.coach .stat-tile .extra.danger{color:#bf2418}

/* big hero (light tint) — used in tool tops */
.coach .tool-hero{background:#eaf2ff;border:1px solid rgba(10,132,255,.16);border-radius:22px;padding:22px 26px;position:relative;overflow:hidden;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center}
.coach .tool-hero::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,132,255,.08) 0%,transparent 60%);pointer-events:none}
.coach .tool-hero > *{position:relative;z-index:2}
.coach .tool-hero h1{margin:0;font-size:28px;font-weight:700;letter-spacing:-.025em;line-height:1.1}
.coach .tool-hero h1 .acc{color:var(--brand)}
.coach .tool-hero p{margin:6px 0 0;font-size:14px;color:var(--ink-2);font-weight:500;line-height:1.55;max-width:62ch}
.coach .tool-hero .right{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.coach .tool-hero .right .num{font-size:36px;font-weight:800;letter-spacing:-.025em;color:var(--brand);line-height:1}
.coach .tool-hero .right .lbl{font-size:11px;color:var(--ink-3);font-weight:600;letter-spacing:.04em;text-transform:uppercase}

/* === 简历馆 === */
.coach .resume-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:14px;flex:1;min-height:0;overflow:hidden}
.coach .resume-grid > .col{display:flex;flex-direction:column;gap:14px;min-width:0;min-height:0;overflow:hidden}

.coach .resume-stack{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:10px}

.coach .resume-row{
  display:grid;grid-template-columns:auto 1fr auto auto;gap:14px;align-items:center;
  padding:16px 20px;background:var(--surface);border:1px solid var(--line);border-radius:16px;
}
.coach .resume-row.primary{border-color:rgba(10,132,255,.24);background:#fafcff}
.coach .resume-row .thumb{
  width:54px;height:68px;border-radius:6px;background:var(--surface-2);border:1px solid var(--line);
  display:flex;align-items:center;justify-content:center;color:var(--ink-3);
  background-image:repeating-linear-gradient(180deg,transparent 0 8px,rgba(0,0,0,.04) 8px 10px);
  flex-shrink:0;position:relative;
}
.coach .resume-row .thumb::after{content:"";position:absolute;top:6px;left:6px;right:6px;height:6px;background:var(--brand);border-radius:2px;opacity:.55}
.coach .resume-row.primary .thumb{border-color:rgba(10,132,255,.4)}
.coach .resume-row .body .name{font-size:15px;font-weight:700;letter-spacing:-.005em;color:var(--ink)}
.coach .resume-row .body .name .pin{font-size:11px;color:var(--brand);font-weight:600;margin-left:6px}
.coach .resume-row .body .meta{font-size:12px;color:var(--ink-3);font-weight:500;margin-top:3px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.coach .resume-row .body .meta b{color:var(--ink-2);font-weight:600}
.coach .resume-row .score{font-size:24px;font-weight:800;letter-spacing:-.02em;color:var(--brand);width:60px;text-align:right;font-family:var(--font-mono)}
.coach .resume-row .score .max{font-family:var(--font);color:var(--ink-3);font-size:11px;font-weight:600}

/* JD slot — paste/upload area */
.coach .jd-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:0;overflow:hidden}
.coach .jd-card .hd{padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line)}
.coach .jd-card .hd h3{margin:0;font-size:14px;font-weight:700;letter-spacing:-.005em}
.coach .jd-card .hd .badge{font-family:var(--font-mono);font-size:11px;color:var(--brand);font-weight:700;background:var(--brand-soft);padding:3px 8px;border-radius:5px}
.coach .jd-card .body{padding:18px 20px;font-size:13.5px;line-height:1.65;color:var(--ink-2);font-weight:500;white-space:pre-wrap;background:var(--surface-2);max-height:200px;overflow:auto}
.coach .jd-card .body .hl{background:var(--brand-soft);color:var(--brand-ink);padding:0 3px;border-radius:3px;font-weight:600}
.coach .jd-card .body .miss{background:var(--danger-soft);color:#bf2418;padding:0 3px;border-radius:3px;font-weight:600;text-decoration:underline;text-decoration-color:rgba(255,59,48,.4);text-decoration-thickness:1.5px}

.coach .kw-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.coach .kw-block{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.coach .kw-block h4{margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.02em;display:flex;justify-content:space-between;align-items:baseline}
.coach .kw-block h4 .n{font-family:var(--font-mono);color:var(--ink-3);font-size:11px;font-weight:600}
.coach .kw-block.good h4{color:#1f7a31}
.coach .kw-block.miss h4{color:#bf2418}
.coach .kw-cloud{display:flex;flex-wrap:wrap;gap:5px}

/* suggestions list */
.coach .sug-card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px 18px}
.coach .sug-card.urgent{border-color:rgba(255,59,48,.22);background:#fffaf9}
.coach .sug-card .head{display:flex;gap:12px;align-items:flex-start;margin-bottom:8px}
.coach .sug-card .n-mark{width:28px;height:28px;border-radius:8px;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0}
.coach .sug-card.urgent .n-mark{background:var(--danger)}
.coach .sug-card.warn .n-mark{background:var(--warn)}
.coach .sug-card .head-body h4{margin:0;font-size:14px;font-weight:700;letter-spacing:-.005em;line-height:1.35}
.coach .sug-card .head-body p{margin:3px 0 0;font-size:12.5px;color:var(--ink-3);font-weight:500;line-height:1.5}
.coach .ba-mini{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.coach .ba-mini .c{padding:10px 12px;border-radius:10px;font-size:12px;line-height:1.55;font-weight:500}
.coach .ba-mini .c.before{background:var(--danger-soft);color:#831e16}
.coach .ba-mini .c.after{background:var(--success-soft);color:#1e5a2a}
.coach .ba-mini .lbl{font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:4px}
.coach .ba-mini .c.before .lbl{color:#bf2418}
.coach .ba-mini .c.after .lbl{color:#1f7a31}

/* === 模拟面试 === */
.coach .mock-stage{
  background:var(--surface);border:1px solid var(--line);border-radius:22px;
  padding:0;overflow:hidden;flex:1;min-height:0;
  display:grid;grid-template-rows:auto 1fr auto;
}
.coach .mock-top{padding:16px 22px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);background:var(--surface-2)}
.coach .mock-top .who{display:flex;align-items:center;gap:10px}
.coach .mock-top .who b{font-size:14px;font-weight:700}
.coach .mock-top .who .sub{font-size:12px;color:var(--ink-3);font-weight:500;display:block;margin-top:1px}
.coach .mock-top .stat-row{display:flex;gap:14px;font-size:12px;color:var(--ink-3);font-weight:500}
.coach .mock-top .stat-row .s{display:flex;align-items:baseline;gap:4px}
.coach .mock-top .stat-row .s b{color:var(--ink);font-family:var(--font-mono);font-weight:700;font-size:14px}

.coach .mock-mid{padding:32px 32px;display:grid;grid-template-columns:1fr;gap:24px;justify-items:center;align-content:center;background:linear-gradient(180deg,#fafbff 0%,#fff 50%)}
.coach .mock-q{max-width:680px;text-align:center}
.coach .mock-q .role-line{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--brand);background:var(--brand-soft);padding:5px 11px;border-radius:999px}
.coach .mock-q h2{margin:14px 0 0;font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1.3}
.coach .mock-q .hint{margin-top:14px;font-size:13px;color:var(--ink-3);font-weight:500;font-style:normal}

.coach .mock-mic{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:6px}
.coach .mock-mic-btn{
  width:84px;height:84px;border-radius:50%;background:var(--brand);color:#fff;
  display:flex;align-items:center;justify-content:center;border:0;
  box-shadow:0 8px 24px -8px rgba(10,132,255,.5);
  position:relative;
}
.coach .mock-mic-btn::before,
.coach .mock-mic-btn::after{
  content:"";position:absolute;inset:0;border-radius:50%;
  border:2px solid rgba(10,132,255,.35);
  animation:mic-pulse 2.4s cubic-bezier(.2,.7,.4,1) infinite;
}
.coach .mock-mic-btn::after{animation-delay:1.2s}
@keyframes mic-pulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(2);opacity:0}}
.coach .mock-mic .hint{font-size:12.5px;color:var(--ink-3);font-weight:500;font-family:var(--font-mono)}
.coach .mock-mic .hint b{color:var(--brand)}

.coach .mock-wave{display:flex;align-items:flex-end;gap:2px;height:40px;width:240px}
.coach .mock-wave i{flex:1;background:var(--brand);border-radius:1.5px;opacity:.5}
.coach .mock-wave i.active{opacity:1}

.coach .mock-bot{padding:14px 22px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);background:var(--surface-2)}
.coach .mock-bot .progress{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--ink-3);font-weight:500}
.coach .mock-bot .progress .bar{width:140px;height:6px;background:var(--surface-3);border-radius:3px;overflow:hidden}
.coach .mock-bot .progress .bar i{display:block;height:100%;background:var(--brand);border-radius:3px}
.coach .mock-bot .progress b{color:var(--ink);font-weight:700}

/* === 求职信 === */
.coach .cover-grid{display:grid;grid-template-columns:1fr 1.4fr;gap:14px;flex:1;min-height:0;overflow:hidden}
.coach .cover-grid > .col{display:flex;flex-direction:column;gap:12px;min-width:0;min-height:0;overflow:hidden}

.coach .cover-form .field{margin-bottom:14px}
.coach .cover-form label{display:block;font-size:12px;font-weight:700;color:var(--ink-2);letter-spacing:.02em;margin-bottom:6px;text-transform:uppercase}
.coach .cover-form .input{
  width:100%;padding:10px 14px;background:var(--surface);border:1px solid var(--line);
  border-radius:10px;font-family:inherit;font-size:13.5px;color:var(--ink);font-weight:500;
}
.coach .cover-form .seg{display:flex;gap:0;background:var(--surface-2);border-radius:10px;padding:3px}
.coach .cover-form .seg button{
  appearance:none;border:0;background:transparent;color:var(--ink-3);font-family:inherit;
  padding:7px 0;font-size:12.5px;font-weight:600;border-radius:8px;flex:1;cursor:default;letter-spacing:-.003em;
}
.coach .cover-form .seg button.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.06)}

.coach .letter{
  flex:1;min-height:0;overflow:auto;
  background:var(--surface);border:1px solid var(--line);border-radius:18px;
  padding:32px 38px;
  font-size:14px;line-height:1.75;color:var(--ink);font-weight:500;
}
.coach .letter h3{margin:0 0 18px;font-size:18px;font-weight:700;letter-spacing:-.01em}
.coach .letter p{margin:0 0 14px}
.coach .letter .sign{margin-top:24px;font-weight:600}
.coach .letter mark{background:var(--brand-soft);color:var(--brand-ink);padding:0 4px;border-radius:3px;font-weight:600}

/* === 薪资雷达 === */
.coach .sal-page{display:flex;flex-direction:column;gap:14px;flex:1;min-height:0;overflow:auto}
.coach .sal-headline-card{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:24px 28px;display:grid;grid-template-columns:1fr 1.5fr;gap:32px;align-items:center}
.coach .sal-big{display:flex;flex-direction:column;gap:4px}
.coach .sal-big .role{font-size:13px;color:var(--ink-3);font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.coach .sal-big .v{font-size:56px;font-weight:800;color:var(--brand);letter-spacing:-.035em;line-height:1;display:flex;align-items:baseline;gap:6px}
.coach .sal-big .v .unit{font-size:18px;color:var(--ink-3);font-weight:600}
.coach .sal-big .v .delta{font-family:var(--font-mono);font-size:13px;color:var(--success);font-weight:700;margin-left:auto;background:var(--success-soft);padding:3px 9px;border-radius:6px}
.coach .sal-big .sub{font-size:12.5px;color:var(--ink-3);font-weight:500;margin-top:6px}

.coach .sal-dist{position:relative;padding-top:28px}
.coach .sal-dist .bars{display:flex;align-items:flex-end;gap:3px;height:90px}
.coach .sal-dist .bars i{flex:1;background:var(--surface-3);border-radius:3px 3px 0 0}
.coach .sal-dist .bars i.peak{background:var(--ink)}
.coach .sal-dist .bars i.you{background:var(--brand);position:relative}
.coach .sal-dist .bars i.you::after{content:"你 ¥36k";position:absolute;top:-26px;left:50%;transform:translateX(-50%);font-family:var(--font-mono);font-size:10.5px;color:#fff;background:var(--brand);padding:3px 7px;border-radius:5px;white-space:nowrap;font-weight:700}
.coach .sal-dist .ax{display:flex;justify-content:space-between;margin-top:7px;font-family:var(--font-mono);font-size:10px;color:var(--ink-4);font-weight:600}

.coach .px-row{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding-top:14px;margin-top:14px;border-top:1px solid var(--line)}
.coach .px-cell{padding:12px 14px;background:var(--surface-2);border-radius:10px;text-align:center}
.coach .px-cell b{display:block;font-family:var(--font-mono);font-size:17px;font-weight:800;color:var(--ink);letter-spacing:-.005em}
.coach .px-cell.you-px{background:var(--brand-soft)}
.coach .px-cell.you-px b{color:var(--brand)}
.coach .px-cell span{font-size:11px;color:var(--ink-3);font-weight:600;display:block;margin-top:3px}

.coach .sal-tbl{background:var(--surface);border:1px solid var(--line);border-radius:18px;overflow:hidden}
.coach .sal-tbl .hd{padding:14px 20px;display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--line)}
.coach .sal-tbl .hd h3{margin:0;font-size:15px;font-weight:700;letter-spacing:-.008em}
.coach .sal-tbl .hd .meta{font-size:11.5px;color:var(--ink-3);font-weight:500;font-family:var(--font-mono)}
.coach .sal-tbl table{width:100%;border-collapse:collapse;font-size:13px}
.coach .sal-tbl th{padding:10px 20px;text-align:left;font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-3);font-weight:700;background:var(--surface-2);border-bottom:1px solid var(--line)}
.coach .sal-tbl td{padding:11px 20px;border-bottom:1px solid var(--line);color:var(--ink-2);font-weight:500;font-family:var(--font-mono)}
.coach .sal-tbl td.co{font-family:var(--font);color:var(--ink);font-weight:700}
.coach .sal-tbl td.total{color:var(--brand);font-weight:800;font-size:14px}
.coach .sal-tbl tr.hi td{background:var(--brand-soft)}
.coach .sal-tbl tr:last-child td{border-bottom:0}

/* === 投递追踪 (Kanban) === */
.coach .kanban{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;flex:1;min-height:0;overflow:hidden}
.coach .kanban-col{background:var(--surface-2);border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:8px;min-height:0;overflow:hidden}
.coach .kanban-col .col-h{display:flex;justify-content:space-between;align-items:center;padding:2px 4px 8px;border-bottom:1px solid var(--line)}
.coach .kanban-col .col-h .ttl{font-size:12px;font-weight:700;color:var(--ink);letter-spacing:-.003em;display:flex;align-items:center;gap:6px}
.coach .kanban-col .col-h .ttl .dot{width:8px;height:8px;border-radius:50%}
.coach .kanban-col .col-h .cnt{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);font-weight:700;background:var(--surface);padding:2px 8px;border-radius:999px}
.coach .kanban-col.todo .col-h .ttl .dot{background:var(--ink-4)}
.coach .kanban-col.applied .col-h .ttl .dot{background:var(--brand)}
.coach .kanban-col.interview .col-h .ttl .dot{background:var(--warn)}
.coach .kanban-col.final .col-h .ttl .dot{background:#a855f7}
.coach .kanban-col.offer .col-h .ttl .dot{background:var(--success)}
.coach .kanban-list{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:8px}
.coach .k-card{background:var(--surface);border:1px solid var(--line);border-radius:11px;padding:11px 13px;cursor:default;transition:.12s}
.coach .k-card:hover{border-color:var(--line-2);transform:translateY(-1px)}
.coach .k-card .co{font-size:13px;font-weight:700;color:var(--ink);letter-spacing:-.003em}
.coach .k-card .role{font-size:11.5px;color:var(--ink-3);font-weight:500;margin-top:1px}
.coach .k-card .meta{margin-top:7px;display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:var(--ink-3);font-weight:600;font-family:var(--font-mono)}
.coach .k-card .meta .salary{color:var(--ink-2);font-weight:700}
.coach .k-card.urgent{background:#fffaf2;border-color:rgba(255,149,0,.3)}
.coach .k-card.urgent .meta .when{color:var(--warn)}
.coach .k-card .tag{font-family:var(--font);font-size:10px;font-weight:700;padding:1px 7px;border-radius:4px;display:inline-block;margin-top:6px;letter-spacing:.02em}
.coach .k-card .tag.warn{background:var(--warn-soft);color:#a86200}
.coach .k-card .tag.brand{background:var(--brand-soft);color:var(--brand)}
.coach .k-card .tag.success{background:var(--success-soft);color:#1f7a31}
.coach .k-card.add{background:transparent;border:1px dashed var(--line-2);color:var(--ink-3);text-align:center;font-size:11.5px;font-weight:600;padding:9px 0}
.coach .k-card.add:hover{border-color:var(--brand);color:var(--brand)}

/* === 职业地图 === */
.coach .career-page{display:flex;flex-direction:column;gap:14px;flex:1;min-height:0;overflow:auto}
.coach .career-roles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.coach .role-card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px 20px;display:flex;flex-direction:column;gap:8px;position:relative}
.coach .role-card.chosen{border:1.5px solid var(--brand);background:#fafcff}
.coach .role-card .head{display:flex;align-items:center;justify-content:space-between}
.coach .role-card .head h4{margin:0;font-size:15px;font-weight:700;letter-spacing:-.005em}
.coach .role-card .head .fit{font-family:var(--font-mono);font-size:13px;font-weight:800;color:var(--brand);background:var(--brand-soft);padding:3px 9px;border-radius:6px}
.coach .role-card .head .fit.med{color:#a86200;background:var(--warn-soft)}
.coach .role-card p{margin:0;font-size:12.5px;color:var(--ink-3);font-weight:500;line-height:1.45}
.coach .role-card .skills{display:flex;flex-wrap:wrap;gap:4px;margin-top:3px}
.coach .role-card .skills .s{font-size:10.5px;padding:2px 8px;background:var(--surface-2);color:var(--ink-2);border-radius:5px;font-weight:600}
.coach .role-card .meta{margin-top:auto;padding-top:8px;border-top:1px solid var(--line);display:flex;justify-content:space-between;font-size:11px;color:var(--ink-3);font-weight:500}
.coach .role-card .meta b{color:var(--ink);font-family:var(--font-mono);font-weight:700}

.coach .path{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:22px 26px}
.coach .path-h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px}
.coach .path-h h3{margin:0;font-size:17px;font-weight:700;letter-spacing:-.012em}
.coach .path-line{position:relative;display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.coach .path-line::before{content:"";position:absolute;top:16px;left:6%;right:6%;height:2px;background:linear-gradient(90deg,var(--brand) 0%,var(--brand) 22%,var(--surface-3) 22%);border-radius:2px}
.coach .path-node{position:relative;text-align:center;padding-top:32px}
.coach .path-node .pin{position:absolute;top:6px;left:50%;transform:translateX(-50%);width:20px;height:20px;border-radius:50%;background:var(--surface-3);border:2px solid var(--surface);box-shadow:0 0 0 1px var(--line);z-index:2}
.coach .path-node.done .pin{background:var(--brand);box-shadow:none;border-color:#fff}
.coach .path-node.done .pin::after{content:"✓";color:#fff;font-size:11px;font-weight:800;position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.coach .path-node.now .pin{background:#fff;box-shadow:0 0 0 3px var(--brand)}
.coach .path-node .year{font-family:var(--font-mono);font-size:10.5px;color:var(--ink-3);font-weight:700;letter-spacing:.04em}
.coach .path-node b{display:block;font-size:13px;color:var(--ink);font-weight:700;margin-top:3px}
.coach .path-node .note{display:block;font-size:11px;color:var(--ink-3);font-weight:500;margin-top:2px;line-height:1.4}
.coach .path-node.now b{color:var(--brand)}
`;

// ─── 简历馆 ─────────────────────────────────────────────────────────────
const ResumeStudio = () => (
  <div className="coach">
    <style>{window.CORE_CSS}</style>
    <style>{TOOLS_CSS}</style>
    <div className="app">
      <window.CoachSide active="resume" />
      <div className="main">
        <window.CoachTopbar
          title="简历馆"
          sub="一份简历一个岗位 · 关键词 / 量化 / 句式逐条诊断"
          actions={<>
            <button className="btn sm">{window.IK.download}<span>导出主版本</span></button>
            <button className="btn primary sm">{window.IK.plus}<span>新建简历</span></button>
          </>}
        />

        <div className="scroll">
          <div className="tool">
            {/* hero */}
            <div className="tool-hero">
              <div>
                <h1>把简历 <span className="acc">投准</span> 每一个机会。</h1>
                <p>贴上 JD，AI 自动比对你的简历 —— 给出 5 条逐字改写建议，平均提分 +24 分。</p>
              </div>
              <div className="right">
                <span className="num">72<span style={{ fontSize: 18, color: "var(--ink-3)", fontWeight: 600 }}>/100</span></span>
                <span className="lbl">主版本 · 当前匹配</span>
              </div>
            </div>

            <div className="resume-grid">
              <div className="col">
                {/* JD slot */}
                <div className="jd-card">
                  <div className="hd">
                    <h3>目标 JD · 字节跳动 资深前端工程师</h3>
                    <span className="badge">已匹配 · 11s</span>
                  </div>
                  <div className="body">
                    岗位职责
                    1. 负责核心产品 Web 端架构设计与开发，主导大型项目从 0 到 1 落地；
                    2. 推动前端工程化、性能优化、可观测性体系建设；
                    3. 与设计师、产品经理深度协作，对最终交付的用户体验负责；
                    4. 指导初中级工程师，参与团队 <span className="hl">技术决策</span> 与代码评审。

                    岗位要求
                    - 5 年以上前端开发经验，扎实的 <span className="hl">JavaScript / TypeScript</span> 功底；
                    - 精通 <span className="hl">React 生态</span>，熟悉 <span className="miss">Next.js / 服务端渲染 / 边缘计算</span>；
                    - 具备复杂应用架构能力，理解状态管理、模块化、<span className="miss">Monorepo</span>；
                    - 有大型 C 端产品 <span className="hl">性能优化</span>、SEO、可访问性的实战经验；
                    - 有跨团队协作和 <span className="miss">Tech Lead</span> 经验者优先；
                    - 英文工作环境无障碍者优先。
                  </div>
                </div>

                {/* Keywords */}
                <div className="kw-pair">
                  <div className="kw-block good">
                    <h4>命中关键词 <span className="n">7 / 12</span></h4>
                    <div className="kw-cloud">
                      {["React", "TypeScript", "前端工程化", "组件库", "代码评审", "性能优化", "H5"].map(k => (
                        <span key={k} className="chip success"><span className="dot"></span>{k}</span>
                      ))}
                    </div>
                  </div>
                  <div className="kw-block miss">
                    <h4>缺失关键词 <span className="n">5</span></h4>
                    <div className="kw-cloud">
                      {["Next.js / SSR", "Monorepo", "可观测性", "Tech Lead", "可访问性"].map(k => (
                        <span key={k} className="chip danger"><span className="dot"></span>{k}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT — suggestion list */}
              <div className="col">
                <div className="tasks-h" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 4px" }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-.012em" }}>5 条改写建议</h3>
                  <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>按优先级 · 全部展开</span>
                </div>

                <div className="resume-stack">
                  <div className="sug-card urgent">
                    <div className="head">
                      <div className="n-mark">1</div>
                      <div className="head-body">
                        <h4>第一条 bullet 几乎是空话</h4>
                        <p>HR 6 秒扫一份简历，没数字 = 没记忆点。这是今天最高 ROI 项。</p>
                      </div>
                    </div>
                    <div className="ba-mini">
                      <div className="c before"><span className="lbl">原文 · before</span>使用 React 重构了一个旧项目，提升了页面加载速度。</div>
                      <div className="c after"><span className="lbl">建议 · after</span>主导 jQuery 项目向 React 18 + SSR 迁移，FCP −72%（3.2s → 0.9s），日活 PV +18%。</div>
                    </div>
                  </div>

                  <div className="sug-card urgent">
                    <div className="head">
                      <div className="n-mark">2</div>
                      <div className="head-body">
                        <h4>Tech Lead 信号严重缺失</h4>
                        <p>JD 明确要"跨团队协作和 Tech Lead 经验"，简历只写"参与代码评审"远远不够。</p>
                      </div>
                    </div>
                    <div className="ba-mini">
                      <div className="c before"><span className="lbl">原文</span>参与团队的代码评审和新人培训</div>
                      <div className="c after"><span className="lbl">建议</span>牵头制定团队 React 编码规范，mentor 3 名工程师，2 人 12 个月内晋升中级。</div>
                    </div>
                  </div>

                  <div className="sug-card warn">
                    <div className="head">
                      <div className="n-mark">3</div>
                      <div className="head-body">
                        <h4>补一行关键词：Next.js / SSR / Monorepo</h4>
                        <p>你做过类似的事，但没用 JD 的词说出来。ATS 关键词筛选会先于人眼。</p>
                      </div>
                    </div>
                    <div className="ba-mini">
                      <div className="c before"><span className="lbl">原文</span>维护公司的组件库</div>
                      <div className="c after"><span className="lbl">建议</span>基于 Turborepo 搭建组件库 Monorepo，沉淀 40+ 业务组件，节省 600 工时/季度。</div>
                    </div>
                  </div>

                  <div className="sug-card warn">
                    <div className="head">
                      <div className="n-mark">4</div>
                      <div className="head-body">
                        <h4>顶部缺一段"专业摘要"</h4>
                        <p>资深岗位 HR 期望在前 1/4 看到候选人定位与最大亮点。</p>
                      </div>
                    </div>
                  </div>

                  <div className="sug-card">
                    <div className="head">
                      <div className="n-mark">5</div>
                      <div className="head-body">
                        <h4>技能列表过于扁平</h4>
                        <p>JD 区分了"精通"与"熟悉"，简历也应分层。</p>
                      </div>
                    </div>
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

// ─── 模拟面试 ───────────────────────────────────────────────────────────
const MockInterview = () => {
  const bars = Array.from({ length: 36 });
  return (
    <div className="coach">
      <style>{window.CORE_CSS}</style>
      <style>{TOOLS_CSS}</style>
      <div className="app">
        <window.CoachSide active="mock" />
        <div className="main">
          <window.CoachTopbar
            title="模拟面试"
            sub="字节跳动 · 资深前端 · 一面 · 进行中 · 14:08"
            actions={<>
              <button className="btn sm">{window.IK.pause}<span>暂停</span></button>
              <button className="btn sm">{window.IK.refresh}<span>跳过本题</span></button>
              <button className="btn primary sm">结束面试</button>
            </>}
          />

          <div className="scroll">
            <div className="tool">
              {/* mini stats */}
              <div className="tool-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="stat-tile">
                  <div className="l">已用时</div>
                  <div className="v">18 <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-3)" }}>min</span></div>
                  <div className="extra"><span className="dot" style={{ background: "var(--ink-3)" }}></span><span>预计 45 min</span></div>
                </div>
                <div className="stat-tile">
                  <div className="l">题目进度</div>
                  <div className="v">3 / 8</div>
                  <div className="extra success"><span className="dot"></span><span>节奏正常</span></div>
                </div>
                <div className="stat-tile">
                  <div className="l">实时评估</div>
                  <div className="v">B+</div>
                  <div className="extra warn"><span className="dot"></span><span>结构化思考可加强</span></div>
                </div>
                <div className="stat-tile">
                  <div className="l">填充词</div>
                  <div className="v">12 <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-3)" }}>次</span></div>
                  <div className="extra danger"><span className="dot"></span><span>「呃 / 那个」偏多</span></div>
                </div>
              </div>

              {/* Stage */}
              <div className="mock-stage">
                <div className="mock-top">
                  <div className="who">
                    <window.Avatar kind="coach" size={36} />
                    <div>
                      <b>L5 面试官 · Coach</b>
                      <span className="sub">字节跳动 · 资深前端 · 一面</span>
                    </div>
                  </div>
                  <div className="stat-row">
                    <span className="s">题 <b>03/08</b></span>
                    <span className="s">用时 <b>18:24</b></span>
                    <span className="s">评分 <b>B+</b></span>
                  </div>
                </div>

                <div className="mock-mid">
                  <div className="mock-q">
                    <span className="role-line">▸ 第 3 题 · 技术 · 性能</span>
                    <h2>"如果让你把一个 FCP 3 秒的页面优化到 1 秒内，<br/>前 3 个动作是什么？"</h2>
                    <div className="hint">💡 提示：面试官在测优先级判断。不熟的领域要承认 + 给出可验证的下一步。</div>
                  </div>

                  <div className="mock-mic">
                    <button className="mock-mic-btn">{window.IK.mic}</button>
                    <div className="mock-wave">
                      {bars.map((_, i) => (
                        <i key={i}
                           className={i < 22 ? "active" : ""}
                           style={{ height: (15 + Math.abs(Math.sin(i * 0.6)) * 80 * (i < 22 ? 1 : .3)) + "%" }}></i>
                      ))}
                    </div>
                    <div className="hint">●  录音中 · <b>02:14</b></div>
                  </div>
                </div>

                <div className="mock-bot">
                  <div className="progress">
                    <span>面试进度</span>
                    <div className="bar"><i style={{ width: "37%" }}></i></div>
                    <span><b>37%</b></span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn sm">{window.IK.help}<span>申请提示</span></button>
                    <button className="btn primary sm">{window.IK.check}<span>答完进入下一题</span></button>
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

// ─── 求职信 ─────────────────────────────────────────────────────────────
const CoverLetter = () => (
  <div className="coach">
    <style>{window.CORE_CSS}</style>
    <style>{TOOLS_CSS}</style>
    <div className="app">
      <window.CoachSide active="cover" />
      <div className="main">
        <window.CoachTopbar
          title="求职信"
          sub="针对 JD 量身定制 · 三种语气可选"
          actions={<>
            <button className="btn sm">{window.IK.refresh}<span>重新生成</span></button>
            <button className="btn sm">{window.IK.copy || window.IK.doc}<span>复制全文</span></button>
            <button className="btn primary sm">{window.IK.download}<span>导出 PDF</span></button>
          </>}
        />

        <div className="scroll">
          <div className="tool">
            <div className="cover-grid">
              <div className="col cover-form">
                <div className="tool-card">
                  <div className="field">
                    <label>目标岗位</label>
                    <input className="input" defaultValue="字节跳动 · 资深前端工程师 · 上海" readOnly />
                  </div>
                  <div className="field">
                    <label>用哪份简历</label>
                    <input className="input" defaultValue="📌 我的简历主版本 · 已匹配 72/100" readOnly />
                  </div>
                  <div className="field">
                    <label>语气</label>
                    <div className="seg">
                      <button>专业克制</button>
                      <button className="on">真诚热情</button>
                      <button>简短直接</button>
                    </div>
                  </div>
                  <div className="field">
                    <label>长度</label>
                    <div className="seg">
                      <button>200 字</button>
                      <button className="on">350 字</button>
                      <button>500 字</button>
                    </div>
                  </div>
                  <div className="field">
                    <label>强调亮点</label>
                    <div className="kw-cloud">
                      <span className="chip brand"><span className="dot"></span>React 18 重构</span>
                      <span className="chip brand"><span className="dot"></span>FCP −72%</span>
                      <span className="chip brand"><span className="dot"></span>Mentor 3 人</span>
                      <span className="chip">+ 添加</span>
                    </div>
                  </div>

                  <button className="btn brand lg" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>{window.IK.spark}<span>重新生成</span></button>
                </div>

                <div className="tool-card">
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>历史版本</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                      <div className="resume-row" style={{ padding: "10px 14px", gridTemplateColumns: "1fr auto" }}>
                        <div className="body">
                          <div className="name" style={{ fontSize: 13 }}>v3 · 真诚热情 · 350 字</div>
                          <div className="meta" style={{ fontSize: 11 }}>刚才 · 14:18</div>
                        </div>
                        <span className="chip brand">当前</span>
                      </div>
                      <div className="resume-row" style={{ padding: "10px 14px", gridTemplateColumns: "1fr auto" }}>
                        <div className="body">
                          <div className="name" style={{ fontSize: 13 }}>v2 · 专业克制 · 250 字</div>
                          <div className="meta" style={{ fontSize: 11 }}>2 小时前</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col">
                <div className="letter">
                  <h3>尊敬的字节跳动招聘团队，</h3>
                  <p>您好，我是张明，一名来自华东师范大学软件工程专业的 2026 届毕业生。在浏览贵司"<mark>资深前端工程师</mark>"岗位描述时，我注意到团队正在推动 <mark>React 18 + SSR</mark> 架构升级与组件库 Monorepo 治理 —— 这与我过去一年在蚂蚁集团做的事情高度重合。</p>
                  <p>在蚂蚁实习的 12 个月里，我主导了支付宝某业务线从 jQuery 到 React 18 + Next.js 的迁移。最让我自豪的是 <mark>FCP 从 3.2s 降到 0.9s（−72%）</mark>，日活 PV 因此提升 18%。在这个过程中，我也 mentor 了 3 位实习生，其中 2 人已经转正并独立 own 业务线。</p>
                  <p>我深知"资深"二字不仅意味着技术深度 —— 更意味着能在团队遇到分歧时给出有依据的方向，能在系统出问题时第一时间找到根因。这正是我希望在字节继续打磨的能力，也希望能向团队学习如何把这件事做得更好。</p>
                  <p>简历附件已发送至您的邮箱，期待与您进一步交流的机会。</p>
                  <p className="sign">致以诚挚的问候，<br/>张明<br/>2026.5.23</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── 薪资雷达 ───────────────────────────────────────────────────────────
const SalaryLab = () => {
  const dist = [3, 6, 10, 16, 22, 30, 38, 42, 46, 50, 53, 55, 52, 44, 36, 26, 18, 12, 8, 5];
  return (
    <div className="coach">
      <style>{window.CORE_CSS}</style>
      <style>{TOOLS_CSS}</style>
      <div className="app">
        <window.CoachSide active="salary" />
        <div className="main">
          <window.CoachTopbar
            title="薪资雷达"
            sub="基于 1,247 条 2024–2026 届校招真实 offer · 用户上传 + 公开核实 · 已脱敏"
            actions={<>
              <button className="btn sm">{window.IK.filter}<span>筛选</span></button>
              <button className="btn primary sm">{window.IK.plus}<span>提交我的 offer</span></button>
            </>}
          />

          <div className="scroll">
            <div className="sal-page">
              {/* headline */}
              <div className="sal-headline-card">
                <div className="sal-big">
                  <span className="role">前端工程师 · 校招 · 全国</span>
                  <span className="v">¥38.4 <span className="unit">k / 月 · 中位</span><span className="delta">↑ 4% MoM</span></span>
                  <span className="sub">P25 ¥28k · P50 ¥38k · P75 ¥48k · P90 ¥62k · N = 1,247</span>
                </div>
                <div className="sal-dist">
                  <div className="bars">
                    {dist.map((v, i) => (
                      <i key={i}
                         className={i === 10 ? "peak" : i === 8 ? "you" : ""}
                         style={{ height: v * 1.4 + "%" }}></i>
                    ))}
                  </div>
                  <div className="ax">
                    <span>15k</span><span>25k</span><span>35k</span><span>45k</span><span>55k</span><span>65k+</span>
                  </div>
                </div>
              </div>

              {/* px row */}
              <div className="tool-card">
                <div className="path-h" style={{ marginBottom: 12 }}>
                  <h3>分位数 · 自助定位</h3>
                  <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>你目前手里的最高 offer：<b style={{ color: "var(--brand)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>¥36k</b> · P47</span>
                </div>
                <div className="px-row">
                  <div className="px-cell"><b>¥28k</b><span>P25</span></div>
                  <div className="px-cell"><b>¥38k</b><span>P50 · 中位</span></div>
                  <div className="px-cell you-px"><b>¥36k</b><span>你 · P47</span></div>
                  <div className="px-cell"><b>¥48k</b><span>P75</span></div>
                  <div className="px-cell"><b>¥62k</b><span>P90</span></div>
                </div>
              </div>

              {/* compare table */}
              <div className="sal-tbl">
                <div className="hd">
                  <h3>同岗对比 · 你心仪的 5 家</h3>
                  <span className="meta">数据来自校友上传 · 5/2026</span>
                </div>
                <table>
                  <thead>
                    <tr><th>公司</th><th>城市</th><th>月薪</th><th>奖金</th><th>股票</th><th>总包</th><th>等级</th></tr>
                  </thead>
                  <tbody>
                    <tr className="hi"><td className="co">字节跳动</td><td>上海</td><td>32k</td><td>6k</td><td>8</td><td className="total">46k×16</td><td>2-1</td></tr>
                    <tr><td className="co">腾讯</td><td>深圳</td><td>30k</td><td>4k</td><td>6</td><td className="total">40k×15</td><td>T1.2</td></tr>
                    <tr><td className="co">美团</td><td>北京</td><td>28k</td><td>4k</td><td>4</td><td className="total">36k×15</td><td>M3</td></tr>
                    <tr><td className="co">Shopee</td><td>新加坡</td><td>36k</td><td>5k</td><td>5</td><td className="total">46k×13</td><td>—</td></tr>
                    <tr><td className="co">拼多多</td><td>上海</td><td>38k</td><td>8k</td><td>0</td><td className="total">46k×16</td><td>—</td></tr>
                  </tbody>
                </table>
              </div>

              {/* insight */}
              <div className="tool-card" style={{ background: "var(--brand-soft)", borderColor: "transparent" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ color: "var(--brand)", fontSize: 18 }}>{window.IK.spark}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--brand-ink)", marginBottom: 4 }}>Coach 给你的建议</div>
                    <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, fontWeight: 500 }}>
                      你目前 <b>¥36k</b> 的 offer 位于 <b>P47</b>，同校同届前端 <b>53%</b> 拿到了更高数字。本周还有 3 场二面在路上 —— <b>建议再等一周</b>。
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

// ─── 投递追踪 (Kanban) ─────────────────────────────────────────────────
const Tracker = () => {
  const stages = [
    { id: "todo", label: "想投", cnt: 6, color: "var(--ink-4)", cards: [
      { co: "Meta", role: "Frontend · New Grad", loc: "Singapore", when: "DDL 6/05", urgent: true, tag: "warn", tagText: "海外" },
      { co: "京东", role: "前端 · 校招", loc: "北京", when: "DDL 6/12" },
      { co: "B 站", role: "前端 · 校招", loc: "上海", when: "DDL 6/15" },
      { co: "Airwallex", role: "FE Eng · Grad", loc: "Shanghai", when: "DDL 6/20", urgent: false, tag: "warn", tagText: "海外" },
    ]},
    { id: "applied", label: "已投递", cnt: 5, color: "var(--brand)", cards: [
      { co: "拼多多", role: "前端 · 校招", loc: "上海", when: "已投 5/20", salary: "38k", tag: "brand", tagText: "内推" },
      { co: "Shopee SG", role: "Frontend Grad", loc: "Singapore", when: "OA 截止 5/27", urgent: true, salary: "S$5.5k" },
      { co: "网易", role: "前端 · 校招", loc: "杭州", when: "已投 5/18" },
    ]},
    { id: "interview", label: "面试中", cnt: 3, color: "var(--warn)", cards: [
      { co: "字节跳动", role: "客户端 · 实习", loc: "上海", when: "笔试 5/24", urgent: true, tag: "warn", tagText: "笔试" },
      { co: "美团", role: "前端 · 校招", loc: "北京", when: "二面 5/26", urgent: true, salary: "36k", tag: "warn", tagText: "二面" },
      { co: "腾讯 IEG", role: "客户端", loc: "深圳", when: "三面待约" },
    ]},
    { id: "final", label: "终面", cnt: 1, color: "#a855f7", cards: [
      { co: "Shopee", role: "FE · Grad", loc: "Singapore", when: "终面 5/30", salary: "S$6.5k", tag: "brand", tagText: "已约" },
    ]},
    { id: "offer", label: "Offer", cnt: 1, color: "var(--success)", cards: [
      { co: "字节跳动", role: "前端 · 实习", loc: "上海", when: "已签 5/19", salary: "46k×16", tag: "success", tagText: "已接" },
    ]},
  ];
  return (
    <div className="coach">
      <style>{window.CORE_CSS}</style>
      <style>{TOOLS_CSS}</style>
      <div className="app">
        <window.CoachSide active="tracker" />
        <div className="main">
          <window.CoachTopbar
            title="投递追踪"
            sub="看板管理所有投递 · 节点自动提醒 · 当前共 16 家"
            actions={<>
              <button className="btn sm">{window.IK.filter}<span>筛选</span></button>
              <button className="btn sm">{window.IK.chart}<span>看 funnel</span></button>
              <button className="btn primary sm">{window.IK.plus}<span>新增公司</span></button>
            </>}
          />

          <div className="scroll">
            <div className="tool">
              {/* stats */}
              <div className="tool-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                <div className="stat-tile">
                  <div className="l">想投</div>
                  <div className="v">6</div>
                  <div className="extra warn"><span className="dot"></span>2 个本周 DDL</div>
                </div>
                <div className="stat-tile">
                  <div className="l">已投</div>
                  <div className="v">18 <span style={{ fontSize: 12, fontWeight: 600, color: "var(--success)" }}>↑ 5</span></div>
                  <div className="extra"><span className="dot" style={{ background: "var(--brand)" }}></span>本周 +5 家</div>
                </div>
                <div className="stat-tile">
                  <div className="l">面试中</div>
                  <div className="v">6</div>
                  <div className="extra warn"><span className="dot"></span>2 场本周</div>
                </div>
                <div className="stat-tile">
                  <div className="l">终面</div>
                  <div className="v">3</div>
                  <div className="extra"><span className="dot" style={{ background: "#a855f7" }}></span>1 场已约</div>
                </div>
                <div className="stat-tile">
                  <div className="l">Offer</div>
                  <div className="v">1</div>
                  <div className="extra success"><span className="dot"></span>已签 · 字节</div>
                </div>
              </div>

              {/* kanban */}
              <div className="kanban">
                {stages.map(s => (
                  <div key={s.id} className={"kanban-col " + s.id}>
                    <div className="col-h">
                      <span className="ttl"><span className="dot"></span>{s.label}</span>
                      <span className="cnt">{s.cnt}</span>
                    </div>
                    <div className="kanban-list">
                      {s.cards.map((c, i) => (
                        <div key={i} className={"k-card" + (c.urgent ? " urgent" : "")}>
                          <div className="co">{c.co}</div>
                          <div className="role">{c.role}</div>
                          {c.tag && <span className={"tag " + c.tag}>{c.tagText}</span>}
                          <div className="meta">
                            <span>{c.loc}</span>
                            {c.salary
                              ? <span className="salary">{c.salary}</span>
                              : <span className="when">{c.when}</span>}
                          </div>
                          {c.salary && <div className="meta" style={{ marginTop: 3 }}><span className="when">{c.when}</span></div>}
                        </div>
                      ))}
                      <div className="k-card add">+ 添加</div>
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

// ─── 职业地图 ───────────────────────────────────────────────────────────
const CareerMap = () => (
  <div className="coach">
    <style>{window.CORE_CSS}</style>
    <style>{TOOLS_CSS}</style>
    <div className="app">
      <window.CoachSide active="career" />
      <div className="main">
        <window.CoachTopbar
          title="职业地图"
          sub="技能盘点 · 三年路径建议 · 校友参考"
          actions={<>
            <button className="btn sm">{window.IK.refresh}<span>重新评估</span></button>
            <button className="btn primary sm">{window.IK.download}<span>导出报告</span></button>
          </>}
        />

        <div className="scroll">
          <div className="career-page">
            {/* hero */}
            <div className="tool-hero">
              <div>
                <h1>三年后 · <span className="acc">你会在哪？</span></h1>
                <p>基于你的技能盘点 + 12,408 位 2024 届校友的真实轨迹 · Coach 给你 3 个最可能 / 最适合的方向。</p>
              </div>
              <div className="right">
                <span className="num">3</span>
                <span className="lbl">推荐路径</span>
              </div>
            </div>

            {/* 3 paths */}
            <div className="career-roles">
              <div className="role-card chosen">
                <div className="head">
                  <h4>资深前端 → 技术专家</h4>
                  <span className="fit">94%</span>
                </div>
                <p>沿当前轨道深耕 · 3 年到 P7 · 5 年到 P8 · 技术影响力路径</p>
                <div className="skills">
                  <span className="s">React</span>
                  <span className="s">SSR</span>
                  <span className="s">架构</span>
                  <span className="s">Tech Lead</span>
                </div>
                <div className="meta">
                  <span>校友参考</span>
                  <b>312 人 · 字节 / 美团</b>
                </div>
              </div>

              <div className="role-card">
                <div className="head">
                  <h4>前端 → 产品经理</h4>
                  <span className="fit med">71%</span>
                </div>
                <p>2-3 年技术沉淀后转产品 · 用工程视角做技术型产品</p>
                <div className="skills">
                  <span className="s">需求分析</span>
                  <span className="s">数据分析</span>
                  <span className="s">用户研究</span>
                </div>
                <div className="meta">
                  <span>校友参考</span>
                  <b>48 人 · 字节 / 腾讯</b>
                </div>
              </div>

              <div className="role-card">
                <div className="head">
                  <h4>前端 → 全栈 → 创业</h4>
                  <span className="fit med">62%</span>
                </div>
                <p>3 年大厂后 join 早期团队 · Next.js + Edge + AI 工具方向</p>
                <div className="skills">
                  <span className="s">Next.js</span>
                  <span className="s">Edge</span>
                  <span className="s">DB</span>
                  <span className="s">AI</span>
                </div>
                <div className="meta">
                  <span>校友参考</span>
                  <b>12 人 · YC / 独立</b>
                </div>
              </div>
            </div>

            {/* timeline path */}
            <div className="path">
              <div className="path-h">
                <h3>路径 1 · 资深前端 → 技术专家 · 5 年路线</h3>
                <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>已完成 1 / 5 节点</span>
              </div>
              <div className="path-line">
                <div className="path-node done">
                  <span className="pin"></span>
                  <span className="year">2026 春</span>
                  <b>校招 · 入职大厂</b>
                  <span className="note">字节 / 美团 / 腾讯</span>
                </div>
                <div className="path-node now">
                  <span className="pin"></span>
                  <span className="year">2026 - 2027</span>
                  <b>P5 → P6</b>
                  <span className="note">业务深耕 · 主项目 Lead</span>
                </div>
                <div className="path-node">
                  <span className="pin"></span>
                  <span className="year">2028</span>
                  <b>P6 · 工程师</b>
                  <span className="note">跨团队推动 · 体系化</span>
                </div>
                <div className="path-node">
                  <span className="pin"></span>
                  <span className="year">2029 - 2030</span>
                  <b>P7 · 技术专家</b>
                  <span className="note">影响力扩散 · mentor</span>
                </div>
                <div className="path-node">
                  <span className="pin"></span>
                  <span className="year">2031 +</span>
                  <b>P8 · 资深专家</b>
                  <span className="note">技术决策 / 方向</span>
                </div>
              </div>
            </div>

            {/* skill audit */}
            <div className="tool-card">
              <div className="path-h" style={{ marginBottom: 16 }}>
                <h3>能力盘点 · 你 vs 路径要求</h3>
                <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>下一节点（P6）所需技能 · 5 项</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 28px" }}>
                {[
                  { name: "React 生态深度", you: 88, need: 80, ok: true },
                  { name: "工程化 / Monorepo", you: 72, need: 75, ok: false },
                  { name: "性能优化体系", you: 78, need: 80, ok: false },
                  { name: "Tech Lead 经验", you: 35, need: 70, ok: false, gap: true },
                  { name: "跨团队推动", you: 55, need: 70, ok: false },
                  { name: "系统设计", you: 48, need: 65, ok: false },
                ].map(s => (
                  <div key={s.name} style={{ fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontWeight: 600, color: "var(--ink-2)" }}>{s.name}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: s.ok ? "var(--success)" : s.gap ? "var(--danger)" : "var(--ink)" }}>
                        {s.you} <span style={{ color: "var(--ink-4)", fontWeight: 500 }}>/ {s.need}</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden", position: "relative" }}>
                      <i style={{ display: "block", height: "100%", width: s.you + "%", background: s.ok ? "var(--success)" : s.gap ? "var(--danger)" : "var(--brand)", borderRadius: 3 }}></i>
                      <i style={{ position: "absolute", top: -2, left: s.need + "%", width: 2, height: 10, background: "var(--ink-3)" }}></i>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--warn-soft)", borderRadius: 10, fontSize: 13, color: "#a86200", lineHeight: 1.55, fontWeight: 500 }}>
                <b>主要缺口 ——</b> Tech Lead 经验距离 P6 节点还差 35 pt。Coach 已为你生成 12 周专项练习计划，<b>加进今日任务？</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

Object.assign(window, { ResumeStudio, MockInterview, CoverLetter, SalaryLab, Tracker, CareerMap });
