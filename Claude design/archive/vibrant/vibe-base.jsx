// Vibe-base — shared visual system + chrome + character illustrations.
// New direction: Apple-style + 小红书 bento, vibrant colorful cards.

const VIBE_CSS = `
.vibe{
  /* base */
  --bg:#f5f5f7;
  --bg-card:#ffffff;
  --bg-soft:#fafafa;
  --bg-tint:#f0f0f3;
  --ink:#1d1d1f;
  --ink-2:#424245;
  --ink-3:#6e6e73;
  --ink-4:#a1a1a6;
  --line:#e5e5e7;
  --line-2:#d2d2d7;

  /* Apple System Colors */
  --c-blue:#007AFF;     --c-blue-2:#d9ecff;
  --c-indigo:#5856D6;   --c-indigo-2:#dedcff;
  --c-purple:#AF52DE;   --c-purple-2:#f1dcfa;
  --c-pink:#FF2D55;     --c-pink-2:#ffd6df;
  --c-red:#FF3B30;      --c-red-2:#ffd5d3;
  --c-orange:#FF9500;   --c-orange-2:#ffe5c2;
  --c-yellow:#FFCC00;   --c-yellow-2:#fff2b8;
  --c-green:#34C759;    --c-green-2:#cdf3d8;
  --c-mint:#00C7BE;     --c-mint-2:#bef3ef;
  --c-teal:#30B0C7;     --c-teal-2:#c3e8ef;
  --c-cyan:#32ADE6;     --c-cyan-2:#c8e7f7;
  --c-brown:#A2845E;    --c-brown-2:#e8dbc7;
  --c-graphite:#2e2e30; --c-graphite-2:#dadade;

  /* radii */
  --r-pill:999px;
  --r-card:22px;
  --r-card-lg:28px;
  --r-card-xl:36px;
  --r-inner:14px;
  --r-tiny:8px;

  position:absolute;inset:0;background:var(--bg);color:var(--ink);
  font-family:"Plus Jakarta Sans","PingFang SC","Noto Sans SC","Helvetica Neue",ui-sans-serif,system-ui,sans-serif;
  font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;letter-spacing:-.005em;
  overflow:hidden;
}
.vibe *{box-sizing:border-box}
.vibe .mono{font-family:"JetBrains Mono","Geist Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums}

/* ─── app shell ─── */
.vibe .app{display:grid;grid-template-columns:240px 1fr;height:100%}
.vibe .side{
  background:var(--bg);border-right:1px solid var(--line);padding:18px 14px;
  display:flex;flex-direction:column;gap:4px;overflow:hidden;
}
.vibe .side-top{display:flex;align-items:center;justify-content:space-between;padding:0 6px 14px;border-bottom:1px solid var(--line);margin-bottom:14px}
.vibe .side-top .who{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600}
.vibe .side-top .meta{font-size:11px;color:var(--ink-3);font-weight:400;display:block;margin-top:1px;letter-spacing:0}
.vibe .side-top .more{color:var(--ink-3);padding:4px}

.vibe .nav-cta{
  display:flex;align-items:center;justify-content:space-between;
  padding:11px 14px;background:var(--ink);color:#fff;border-radius:14px;
  font-size:13.5px;font-weight:600;margin-bottom:14px;letter-spacing:-.005em;cursor:default;
}
.vibe .nav-cta .left{display:flex;align-items:center;gap:8px}
.vibe .nav-cta .kbd{font-family:"JetBrains Mono",monospace;font-size:10px;color:rgba(255,255,255,.55);background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.12);padding:1px 6px;border-radius:4px;letter-spacing:.04em;font-weight:500}

.vibe .nav-head{font-size:11px;letter-spacing:.04em;color:var(--ink-4);font-weight:600;margin:14px 10px 6px}
.vibe .nav-item{
  display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:11px;
  font-size:14px;color:var(--ink-2);cursor:default;letter-spacing:-.003em;font-weight:500;
}
.vibe .nav-item:hover{background:var(--bg-tint)}
.vibe .nav-item.active{background:var(--bg-card);color:var(--ink);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.04),0 0 0 1px var(--line)}
.vibe .nav-item .ic{display:flex;align-items:center;width:20px;justify-content:center;color:var(--ink-3)}
.vibe .nav-item.active .ic{color:var(--c-blue)}
.vibe .nav-item .badge{margin-left:auto;font-size:10.5px;background:var(--c-red);color:#fff;padding:1px 7px;border-radius:999px;font-weight:600;font-family:"JetBrains Mono",monospace;letter-spacing:.02em}
.vibe .nav-item .badge.gray{background:var(--bg-tint);color:var(--ink-3);font-weight:500}
.vibe .nav-item .badge.dot{background:var(--c-red);width:8px;height:8px;padding:0;border-radius:50%}

.vibe .nav-thread{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:9px;font-size:13px;color:var(--ink-2);cursor:default;font-weight:500}
.vibe .nav-thread:hover{background:var(--bg-tint)}
.vibe .nav-thread .title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.003em}
.vibe .nav-thread .ago{font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--ink-4);font-weight:500}
.vibe .nav-thread .pin-ic{font-size:13px;width:14px}

.vibe .side-foot{margin-top:auto;padding-top:14px;border-top:1px solid var(--line);font-size:12px;color:var(--ink-3);display:flex;justify-content:space-between;align-items:center}
.vibe .side-foot .lang{display:flex;gap:0;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.vibe .side-foot .lang span{padding:3px 8px;cursor:pointer;font-weight:500}
.vibe .side-foot .lang .on{background:var(--ink);color:#fff}

/* main */
.vibe .main{display:flex;flex-direction:column;height:100%;overflow:hidden;background:var(--bg)}
.vibe .topbar{display:flex;justify-content:space-between;align-items:center;padding:14px 28px;background:var(--bg)}
.vibe .crumb{font-size:14px;color:var(--ink-3);display:flex;align-items:center;gap:8px;font-weight:500}
.vibe .crumb b{color:var(--ink);font-weight:700;font-size:22px;letter-spacing:-.02em}
.vibe .crumb .sep{color:var(--ink-4);font-weight:400}
.vibe .topbar .actions{display:flex;gap:6px;align-items:center}

.vibe .icon-btn{width:36px;height:36px;border-radius:12px;border:1px solid var(--line);background:var(--bg-card);display:flex;align-items:center;justify-content:center;color:var(--ink-2);cursor:default}
.vibe .icon-btn:hover{background:var(--bg-tint)}
.vibe .icon-btn.dark{background:var(--ink);border-color:var(--ink);color:#fff}

.vibe .btn{padding:9px 18px;border-radius:12px;border:1px solid var(--line);background:var(--bg-card);color:var(--ink);font-size:13.5px;font-weight:600;cursor:default;display:inline-flex;align-items:center;gap:7px;letter-spacing:-.003em;font-family:inherit}
.vibe .btn:hover{background:var(--bg-tint)}
.vibe .btn.primary{background:var(--ink);color:#fff;border-color:var(--ink)}
.vibe .btn.blue{background:var(--c-blue);color:#fff;border-color:var(--c-blue)}
.vibe .btn.pink{background:var(--c-pink);color:#fff;border-color:var(--c-pink)}
.vibe .btn.green{background:var(--c-green);color:#fff;border-color:var(--c-green)}
.vibe .btn.pill{border-radius:var(--r-pill)}
.vibe .btn.sm{padding:6px 13px;font-size:12.5px;border-radius:10px}
.vibe .btn.sm.pill{border-radius:var(--r-pill)}
.vibe .btn.lg{padding:13px 24px;font-size:15px;border-radius:14px}

.vibe .scroll{flex:1;overflow:auto;padding:8px 28px 28px}

/* tags / chips */
.vibe .chip{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;font-size:12px;font-weight:600;background:var(--bg-tint);color:var(--ink-2);letter-spacing:-.003em;border:1px solid transparent}
.vibe .chip .dot{width:6px;height:6px;border-radius:50%;background:currentColor}
.vibe .chip.blue{background:var(--c-blue-2);color:var(--c-blue)}
.vibe .chip.green{background:var(--c-green-2);color:#1e7a3a}
.vibe .chip.orange{background:var(--c-orange-2);color:#b86500}
.vibe .chip.red{background:var(--c-red-2);color:#cb1c14}
.vibe .chip.pink{background:var(--c-pink-2);color:#cb1c4a}
.vibe .chip.purple{background:var(--c-purple-2);color:#7e3eaa}
.vibe .chip.yellow{background:var(--c-yellow-2);color:#7a5b00}
.vibe .chip.mint{background:var(--c-mint-2);color:#007a76}
.vibe .chip.dark{background:var(--ink);color:#fff}

/* bento card base */
.vibe .bento{background:var(--bg-card);border-radius:var(--r-card);padding:22px;position:relative;overflow:hidden}
.vibe .bento.lg{border-radius:var(--r-card-lg);padding:28px}

/* page heading */
.vibe h1.page{margin:0;font-size:32px;line-height:1.1;letter-spacing:-.025em;font-weight:700;color:var(--ink)}
.vibe .page-sub{margin-top:4px;font-size:14.5px;color:var(--ink-3);font-weight:500}
`;

// ─── 2D Apple-style character SVG ───────────────────────────────────────
// Round head, simple flat 2D illustrations.
const Avatar = ({ kind = "ming", size = 80, bg = null, style = {} }) => {
  const defs = {
    ming:  { skin: "#f5d4b0", hair: "#2c2418", shirt: "#007AFF", glasses: true,  hairStyle: "short" },
    yiyi:  { skin: "#fadcc4", hair: "#1f1812", shirt: "#FFCC00", glasses: false, hairStyle: "pony" },
    ahai:  { skin: "#e8c2a0", hair: "#3a2820", shirt: "#34C759", glasses: false, hairStyle: "cap" },
    linxiao:{ skin: "#f8d8c0", hair: "#2a1f18", shirt: "#FF2D55", glasses: false, hairStyle: "bob" },
    wpei:  { skin: "#eac8a4", hair: "#1a1410", shirt: "#5856D6", glasses: true,  hairStyle: "short" },
    coach: { skin: null, hair: null, shirt: "#AF52DE", glasses: false, hairStyle: "ai" },
  };
  const d = defs[kind] || defs.ming;
  const inner = d.hairStyle === "ai" ? renderCoachMark(d) : renderHumanFace(d);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg || (kind === "coach" ? d.shirt : "transparent"),
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", flexShrink: 0, ...style,
    }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
        {inner}
      </svg>
    </div>
  );
};

const renderHumanFace = (d) => (
  <>
    {/* body / shoulders behind head */}
    <ellipse cx="50" cy="100" rx="44" ry="32" fill={d.shirt} />
    {/* neck */}
    <rect x="44" y="62" width="12" height="14" rx="2" fill={d.skin} />
    {/* head */}
    <circle cx="50" cy="44" r="26" fill={d.skin} />
    {/* hair */}
    {d.hairStyle === "short" && (
      <path d={`M 24 44 Q 26 18 50 18 Q 74 18 76 44 Q 76 32 50 32 Q 24 32 24 44 Z`} fill={d.hair} />
    )}
    {d.hairStyle === "pony" && (
      <>
        <path d={`M 24 44 Q 24 16 50 16 Q 76 16 76 46 Q 76 30 50 30 Q 24 30 24 44 Z`} fill={d.hair} />
        <ellipse cx="78" cy="52" rx="6" ry="10" fill={d.hair} />
      </>
    )}
    {d.hairStyle === "cap" && (
      <>
        <path d={`M 22 46 Q 22 14 50 14 Q 78 14 78 46 L 78 38 L 22 38 Z`} fill={d.shirt} />
        <rect x="22" y="38" width="56" height="6" rx="2" fill={d.hair} />
      </>
    )}
    {d.hairStyle === "bob" && (
      <path d={`M 22 50 Q 22 16 50 16 Q 78 16 78 50 Q 78 42 78 44 L 78 56 L 70 50 Q 50 38 30 50 L 22 56 Z`} fill={d.hair} />
    )}
    {/* eyes */}
    <circle cx="42" cy="46" r="2.4" fill="#1d1d1f" />
    <circle cx="58" cy="46" r="2.4" fill="#1d1d1f" />
    {/* small highlight on eyes */}
    <circle cx="42.8" cy="45.4" r="0.8" fill="#fff" />
    <circle cx="58.8" cy="45.4" r="0.8" fill="#fff" />
    {/* glasses */}
    {d.glasses && (
      <g fill="none" stroke="#1d1d1f" strokeWidth="1.6">
        <circle cx="42" cy="46" r="6.5" />
        <circle cx="58" cy="46" r="6.5" />
        <line x1="48.5" y1="46" x2="51.5" y2="46" />
      </g>
    )}
    {/* smile */}
    <path d="M 42 56 Q 50 62 58 56" stroke="#1d1d1f" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* cheek tint */}
    <circle cx="36" cy="54" r="3" fill="#ff8a9a" opacity="0.32" />
    <circle cx="64" cy="54" r="3" fill="#ff8a9a" opacity="0.32" />
  </>
);

// Coach mark — a friendly geometric mark, not a person
const renderCoachMark = (d) => (
  <>
    <rect x="6" y="6" width="88" height="88" rx="44" fill="#fff" />
    {/* head with mortarboard */}
    <circle cx="50" cy="56" r="22" fill="#f5d4b0" />
    {/* mortarboard cap */}
    <rect x="22" y="32" width="56" height="6" rx="2" fill="#1d1d1f" />
    <polygon points="20,38 80,38 50,28" fill="#1d1d1f" />
    {/* tassel */}
    <line x1="74" y1="36" x2="80" y2="48" stroke="#FFCC00" strokeWidth="1.5" />
    <circle cx="80" cy="50" r="2.5" fill="#FFCC00" />
    {/* eyes */}
    <circle cx="42" cy="58" r="2.4" fill="#1d1d1f" />
    <circle cx="58" cy="58" r="2.4" fill="#1d1d1f" />
    <circle cx="42.8" cy="57.4" r="0.8" fill="#fff" />
    <circle cx="58.8" cy="57.4" r="0.8" fill="#fff" />
    {/* smile */}
    <path d="M 42 68 Q 50 74 58 68" stroke="#1d1d1f" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* cheek */}
    <circle cx="36" cy="66" r="3" fill="#ff8a9a" opacity="0.32" />
    <circle cx="64" cy="66" r="3" fill="#ff8a9a" opacity="0.32" />
  </>
);

// ─── Sidebar (used in all in-app screens) ──────────────────────────────
const VibeSide = ({ active = "today" }) => {
  const nav = [
    { id: "today",     label: "今天",        ic: window.IK.calendar, badge: "3" },
    { id: "monthly",   label: "月刊 · 面经",  ic: window.IK.doc,      badge: "12" },
    { id: "interview", label: "面试复盘",     ic: window.IK.mic },
    { id: "overview",  label: "求职总览",     ic: window.IK.chart },
  ];
  const tools = [
    { id: "resume", label: "简历馆", ic: window.IK.spark },
    { id: "match",  label: "JD 匹配", ic: window.IK.bolt },
    { id: "mock",   label: "模拟面试", ic: window.IK.play },
    { id: "cover",  label: "求职信", ic: window.IK.send },
    { id: "salary", label: "薪资", ic: window.IK.money },
    { id: "tracker",label: "投递追踪", ic: window.IK.brief, badge: "18", badgeKind: "gray" },
  ];
  return (
    <div className="side">
      <div className="side-top">
        <div className="who">
          <Avatar kind="ming" size={36} />
          <div>
            <div>张明</div>
            <span className="meta">华师大 · 软件 · 2026 届</span>
          </div>
        </div>
        <span className="more">{window.IK.more}</span>
      </div>

      <div className="nav-cta">
        <span className="left">{window.IK.msg}<span>问 Coach</span></span>
        <span className="kbd">⌘ K</span>
      </div>

      {nav.map(n => (
        <div key={n.id} className={"nav-item " + (active === n.id ? "active" : "")}>
          <span className="ic">{n.ic}</span>
          <span>{n.label}</span>
          {n.badge && <span className={"badge" + (n.badgeKind === "gray" ? " gray" : "")}>{n.badge}</span>}
        </div>
      ))}

      <div className="nav-head">工具</div>
      {tools.map(t => (
        <div key={t.id} className={"nav-item " + (active === t.id ? "active" : "")}>
          <span className="ic">{t.ic}</span>
          <span>{t.label}</span>
          {t.badge && <span className={"badge gray"}>{t.badge}</span>}
        </div>
      ))}

      <div className="nav-head">最近对话</div>
      <div className="nav-thread"><span className="pin-ic">📌</span><span className="title" style={{ color: "var(--c-orange)" }}>我的简历主版本</span></div>
      <div className="nav-thread"><span className="title">改简历 · 字节前端</span><span className="ago">2m</span></div>
      <div className="nav-thread"><span className="title">美团二面复盘</span><span className="ago">1h</span></div>

      <div className="side-foot">
        <span>Coach v 2.0</span>
        <span className="lang"><span className="on">中</span><span>EN</span></span>
      </div>
    </div>
  );
};

const VibeTopbar = ({ title, sub, actions }) => (
  <div className="topbar">
    <div>
      <div className="crumb"><b>{title}</b></div>
      {sub && <div style={{ fontSize: 13.5, color: "var(--ink-3)", marginTop: 2, fontWeight: 500 }}>{sub}</div>}
    </div>
    <div className="actions">{actions}</div>
  </div>
);

Object.assign(window, { VIBE_CSS, Avatar, VibeSide, VibeTopbar });
