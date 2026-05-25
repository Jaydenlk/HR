// Shared visual system + nav chrome for Coach.
// Style language consolidated from "Direction D" — minimal, warm, Claude / Pi.ai aesthetic.

const COACH_CSS = `
.coach{
  /* tokens */
  --bg:#fafaf7;
  --bg-2:#f3f1ea;
  --bg-3:#ebe8dd;
  --card:#ffffff;
  --ink:#191917;
  --ink-2:#3d3c38;
  --ink-3:#7a7973;
  --ink-4:#b5b3aa;
  --line:#ece9df;
  --line-2:#dcd8c9;
  --accent:#5963f5;
  --accent-2:#ecedff;
  --accent-3:#454fd6;
  --warm:#d97757;
  --warm-2:#fbe9e0;
  --good:#5a8f5e;
  --good-2:#dfeadd;
  --warn:#d4a73c;
  --warn-2:#f7edd0;
  --bad:#cf5544;
  --bad-2:#f5dcd6;

  position:absolute;inset:0;background:var(--bg);color:var(--ink);
  font-family:"Geist","Noto Sans SC",ui-sans-serif,system-ui,sans-serif;
  font-size:14px;line-height:1.55;-webkit-font-smoothing:antialiased;
  letter-spacing:-.005em;overflow:hidden;
}
.coach *{box-sizing:border-box}
.coach .display{font-family:"Instrument Serif","Noto Serif SC",ui-serif,serif;letter-spacing:-.015em}
.coach .it{font-family:"Instrument Serif","Noto Serif SC",serif;font-style:italic}
.coach .mono{font-family:"Geist Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums}

/* ─── app shell ─── */
.coach .app{display:grid;grid-template-columns:248px 1fr;height:100%}
.coach .side{
  background:var(--bg-2);border-right:1px solid var(--line);
  display:flex;flex-direction:column;padding:18px 14px;overflow:hidden;
}
.coach .side-top{display:flex;align-items:center;justify-content:space-between;padding:0 6px 14px;border-bottom:1px solid var(--line);margin-bottom:14px}
.coach .side-top .who{display:flex;align-items:center;gap:10px;font-size:13.5px;font-weight:500;letter-spacing:-.005em}
.coach .side-top .av{
  width:30px;height:30px;border-radius:50%;background:var(--ink);color:var(--bg);
  display:flex;align-items:center;justify-content:center;
  font-family:"Instrument Serif",serif;font-style:italic;font-size:16px;line-height:1;
}
.coach .side-top .who .meta{font-size:10px;color:var(--ink-3);letter-spacing:.04em;display:block;margin-top:1px}
.coach .side-top .more{color:var(--ink-3);cursor:pointer;display:flex;align-items:center;padding:4px}

.coach .nav-cta{
  display:flex;align-items:center;justify-content:space-between;
  padding:9px 12px;background:var(--ink);color:var(--bg);border-radius:10px;
  font-size:13px;font-weight:500;margin-bottom:14px;cursor:default;
}
.coach .nav-cta .left{display:flex;align-items:center;gap:8px}
.coach .nav-cta .kbd{font-family:"Geist Mono",monospace;font-size:10px;color:rgba(255,255,255,.55);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);padding:1px 5px;border-radius:3px;letter-spacing:.04em}

.coach .nav-head{
  font-size:10px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--ink-4);font-weight:500;margin:14px 8px 6px;
}
.coach .nav-item{
  display:flex;align-items:center;gap:11px;padding:8px 12px;border-radius:9px;
  font-size:13.5px;color:var(--ink-2);cursor:default;letter-spacing:-.003em;
}
.coach .nav-item:hover{background:rgba(0,0,0,.03)}
.coach .nav-item.active{background:var(--card);color:var(--ink);font-weight:500;box-shadow:0 1px 2px rgba(0,0,0,.04);border:1px solid var(--line)}
.coach .nav-item .ic{display:flex;align-items:center;color:var(--ink-3);width:18px;justify-content:center}
.coach .nav-item.active .ic{color:var(--accent)}
.coach .nav-item .badge{margin-left:auto;font-family:"Geist Mono",monospace;font-size:10px;background:var(--accent);color:#fff;padding:1px 6px;border-radius:999px;letter-spacing:.02em}
.coach .nav-item .badge.warm{background:var(--warm)}
.coach .nav-item .badge.mute{background:transparent;color:var(--ink-3);border:1px solid var(--line)}

.coach .nav-thread{
  display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:7px;
  font-size:12.5px;color:var(--ink-2);cursor:default;
}
.coach .nav-thread:hover{background:rgba(0,0,0,.03)}
.coach .nav-thread .title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.coach .nav-thread .ago{font-family:"Geist Mono",monospace;font-size:10px;color:var(--ink-4)}
.coach .nav-thread.pin .title{color:var(--warm)}

.coach .side-foot{margin-top:auto;padding-top:14px;border-top:1px solid var(--line);font-size:11.5px;color:var(--ink-3);display:flex;justify-content:space-between;align-items:center}
.coach .side-foot .lang{display:flex;gap:0;border:1px solid var(--line);border-radius:6px;overflow:hidden}
.coach .side-foot .lang span{padding:3px 8px;cursor:pointer}
.coach .side-foot .lang .on{background:var(--ink);color:var(--bg)}

/* ─── main area ─── */
.coach .main{display:flex;flex-direction:column;height:100%;overflow:hidden;background:var(--bg)}
.coach .topbar{
  display:flex;justify-content:space-between;align-items:center;
  padding:14px 28px;border-bottom:1px solid var(--line);background:var(--bg);
}
.coach .topbar .crumb{font-size:13px;color:var(--ink-3);display:flex;align-items:center;gap:8px}
.coach .topbar .crumb b{color:var(--ink);font-weight:500}
.coach .topbar .crumb .sep{color:var(--ink-4)}
.coach .topbar .crumb .title{font-family:"Instrument Serif",serif;font-style:italic;font-size:20px;color:var(--ink);letter-spacing:-.01em}
.coach .topbar .actions{display:flex;gap:6px;align-items:center}

.coach .icon-btn{
  width:32px;height:32px;border-radius:8px;border:1px solid var(--line);
  background:var(--card);display:flex;align-items:center;justify-content:center;
  color:var(--ink-2);cursor:default;
}
.coach .icon-btn:hover{border-color:var(--ink-4);color:var(--ink)}

.coach .btn{
  padding:8px 16px;border-radius:999px;border:1px solid var(--line);
  background:var(--card);color:var(--ink);font-size:13px;font-weight:500;
  cursor:default;display:inline-flex;align-items:center;gap:6px;
}
.coach .btn:hover{border-color:var(--ink-3)}
.coach .btn.primary{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.coach .btn.accent{background:var(--accent);color:#fff;border-color:var(--accent)}
.coach .btn.ghost{background:transparent}
.coach .btn.sm{padding:6px 12px;font-size:12px}

.coach .scroll{flex:1;overflow:hidden;padding:24px 28px}

/* ─── typography helpers ─── */
.coach h1.page{margin:0;font-family:"Instrument Serif","Noto Serif SC",serif;font-style:italic;font-size:34px;line-height:1.1;letter-spacing:-.02em;font-weight:400;color:var(--ink)}
.coach h1.page em{color:var(--accent);font-style:italic}
.coach .page-sub{margin-top:6px;font-size:13.5px;color:var(--ink-3)}

.coach .section-hd{display:flex;justify-content:space-between;align-items:baseline;margin:24px 0 12px}
.coach .section-hd h3{margin:0;font-size:14px;font-weight:600;letter-spacing:-.005em}
.coach .section-hd .meta{font-size:12px;color:var(--ink-3)}
.coach .section-hd .meta a{color:var(--accent);text-decoration:none;font-weight:500}

.coach .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
.coach .card.flat{box-shadow:none;background:var(--bg-2);border-color:var(--line)}

/* ─── chips / pills ─── */
.coach .chip{
  display:inline-flex;align-items:center;gap:5px;
  padding:3px 9px;border-radius:999px;font-size:11px;
  background:var(--bg-2);border:1px solid var(--line);color:var(--ink-2);
  letter-spacing:-.003em;
}
.coach .chip.acc{background:var(--accent-2);border-color:transparent;color:var(--accent-3)}
.coach .chip.warm{background:var(--warm-2);border-color:transparent;color:var(--warm)}
.coach .chip.good{background:var(--good-2);border-color:transparent;color:var(--good)}
.coach .chip.warn{background:var(--warn-2);border-color:transparent;color:#a07b1f}
.coach .chip.bad{background:var(--bad-2);border-color:transparent;color:var(--bad)}
.coach .chip.dark{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.coach .chip .dot{width:5px;height:5px;border-radius:50%;background:currentColor}

/* utility */
.coach .row{display:flex;align-items:center;gap:8px}
.coach .col{display:flex;flex-direction:column;gap:8px}
.coach .grow{flex:1}
.coach .muted{color:var(--ink-3)}
.coach .small{font-size:12px}
.coach .tiny{font-size:11px}
.coach .num{font-family:"Geist Mono",monospace;font-variant-numeric:tabular-nums}
.coach .underline-acc{text-decoration:underline;text-decoration-color:var(--accent);text-underline-offset:3px;text-decoration-thickness:1.5px}
.coach .pulse{position:relative}
.coach .pulse::before{content:"";position:absolute;width:6px;height:6px;background:var(--good);border-radius:50%;top:50%;left:-12px;transform:translateY(-50%);box-shadow:0 0 6px var(--good)}
`;

// Reusable left sidebar — same across every in-app screen.
const CoachSide = ({ active = "today", threadCount = 8 }) => {
  const nav = [
    { id: "chat",      label: "与 Coach 对话",  ic: window.IK.msg,       en: "Chat",       primary: true },
    { id: "today",     label: "今天",           ic: window.IK.calendar,  en: "Today",      badge: "3" },
    { id: "monthly",   label: "校招月刊",        ic: window.IK.doc,       en: "Monthly",    dot: true },
    { id: "interview", label: "面试复盘",        ic: window.IK.mic,       en: "Interview Lab", badge: "12", badgeKind: "mute" },
    { id: "overview",  label: "求职总览",        ic: window.IK.chart,     en: "Overview" },
  ];
  const tools = [
    { id: "resume",  label: "简历馆",     ic: window.IK.spark },
    { id: "match",   label: "JD 匹配",   ic: window.IK.bolt },
    { id: "mock",    label: "模拟面试",   ic: window.IK.play },
    { id: "cover",   label: "求职信",     ic: window.IK.send },
    { id: "salary",  label: "薪资雷达",   ic: window.IK.money },
    { id: "tracker", label: "投递追踪",   ic: window.IK.brief, badge: "18" },
  ];
  return (
    <div className="side">
      <div className="side-top">
        <div className="who">
          <span className="av">明</span>
          <div>
            张明 · 大四
            <span className="meta">华东师大 · 软件 · 2026 届</span>
          </div>
        </div>
        <span className="more">{window.IK.more}</span>
      </div>

      <div className="nav-cta">
        <span className="left">{window.IK.plus}<span>新对话</span></span>
        <span className="kbd">⌘ N</span>
      </div>

      <div>
        {nav.map(n => (
          <div key={n.id} className={"nav-item " + (active === n.id ? "active" : "")}>
            <span className="ic">{n.ic}</span>
            <span>{n.label}</span>
            {n.badge && <span className={"badge " + (n.badgeKind === "mute" ? "mute" : "")}>{n.badge}</span>}
            {n.dot && <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: 999, background: "var(--warm)" }}></span>}
          </div>
        ))}
      </div>

      <div className="nav-head">工具</div>
      {tools.map(t => (
        <div key={t.id} className={"nav-item " + (active === t.id ? "active" : "")}>
          <span className="ic">{t.ic}</span>
          <span>{t.label}</span>
          {t.badge && <span className="badge mute">{t.badge}</span>}
        </div>
      ))}

      <div className="nav-head">最近对话 · {threadCount}</div>
      <div className="nav-thread pin"><span>📌</span><span className="title">我的简历 · 主版本</span></div>
      <div className="nav-thread"><span className="title">改简历 · 字节前端</span><span className="ago">2m</span></div>
      <div className="nav-thread"><span className="title">美团二面复盘</span><span className="ago">1h</span></div>
      <div className="nav-thread"><span className="title">Offer 比较 · 字节 vs Shopee</span><span className="ago">2d</span></div>

      <div className="side-foot">
        <span>Coach v 2.0</span>
        <span className="lang"><span className="on">中</span><span>EN</span></span>
      </div>
    </div>
  );
};

// Top bar — every screen uses this.
const CoachTopbar = ({ crumb = [], title, actions }) => (
  <div className="topbar">
    <div className="crumb">
      {crumb.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="sep">/</span>}
          {i === crumb.length - 1 && title
            ? <span className="title">{c}</span>
            : <b>{c}</b>}
        </React.Fragment>
      ))}
    </div>
    <div className="actions">{actions}</div>
  </div>
);

// Cosmetic gradient placeholder for "photos" in the magazine sections.
const Photo = ({ w = "100%", h = 160, hue = 30, sat = 30, label, style = {} }) => (
  <div style={{
    width: w, height: h, borderRadius: 10,
    background: `linear-gradient(135deg, hsl(${hue} ${sat}% 65%), hsl(${hue + 25} ${sat - 5}% 45%))`,
    position: "relative", overflow: "hidden",
    ...style,
  }}>
    <div style={{
      position: "absolute", inset: 0,
      background: "radial-gradient(circle at 25% 25%, rgba(255,255,255,.25), transparent 55%), radial-gradient(circle at 75% 75%, rgba(0,0,0,.15), transparent 55%)",
    }}></div>
    {label && (
      <div style={{
        position: "absolute", bottom: 10, left: 12,
        fontFamily: "Geist Mono, monospace", fontSize: 10, letterSpacing: ".1em",
        color: "rgba(255,255,255,.85)", textTransform: "uppercase",
      }}>{label}</div>
    )}
  </div>
);

Object.assign(window, { COACH_CSS, CoachSide, CoachTopbar, Photo });
