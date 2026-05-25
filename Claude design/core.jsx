// Core — design system + chrome + character marks.
// v4 · disciplined Apple-inspired aesthetic: neutrals + 1 brand color + semantic colors only.

const CORE_CSS = `
.coach{
  /* surfaces */
  --bg:#fbfbfd;
  --surface:#ffffff;
  --surface-2:#f5f5f7;
  --surface-3:#eeeef0;

  /* ink */
  --ink:#1d1d1f;
  --ink-2:#424245;
  --ink-3:#6e6e73;
  --ink-4:#a1a1a6;

  /* hairlines */
  --line:#e5e5e7;
  --line-2:#d2d2d7;

  /* THE ONE brand color (sparing use only) */
  --brand:#0a84ff;
  --brand-hover:#006fdb;
  --brand-soft:#eaf2ff;
  --brand-ink:#003f8a;

  /* semantic — used ONLY for state */
  --success:#34c759;   --success-soft:#e2f6e6;
  --warn:#ff9500;      --warn-soft:#fff0d9;
  --danger:#ff3b30;    --danger-soft:#ffe1de;

  /* premium dark surface */
  --night:#0a0a0c;
  --night-2:#17171a;

  /* radii */
  --r:14px;
  --r-lg:20px;
  --r-xl:28px;
  --r-pill:999px;

  /* font */
  --font:"Plus Jakarta Sans","PingFang SC","Noto Sans SC","Helvetica Neue",ui-sans-serif,system-ui,sans-serif;
  --font-mono:"JetBrains Mono",ui-monospace,monospace;

  position:absolute;inset:0;background:var(--bg);color:var(--ink);
  font-family:var(--font);font-size:14px;line-height:1.5;letter-spacing:-.003em;
  -webkit-font-smoothing:antialiased;overflow:hidden;
}
.coach *{box-sizing:border-box}
.coach .mono{font-family:var(--font-mono);font-variant-numeric:tabular-nums}

/* ─────────── shell ─────────── */
.coach .app{display:grid;grid-template-columns:248px 1fr;height:100%}

.coach .side{
  background:var(--surface-2);
  padding:18px 14px;display:flex;flex-direction:column;gap:2px;
  border-right:1px solid var(--line);
}
.coach .side-top{display:flex;align-items:center;justify-content:space-between;padding:2px 6px 16px;margin-bottom:6px;border-bottom:1px solid var(--line)}
.coach .side-top .who{display:flex;align-items:center;gap:10px}
.coach .side-top .name{font-size:14px;font-weight:600;letter-spacing:-.005em}
.coach .side-top .meta{font-size:11px;color:var(--ink-3);font-weight:500;display:block;margin-top:1px}
.coach .side-top .ico-more{color:var(--ink-3)}

.coach .nav-cta{
  display:flex;align-items:center;justify-content:space-between;
  padding:10px 14px;background:var(--ink);color:#fff;border-radius:12px;
  font-size:13.5px;font-weight:600;margin:8px 0 16px;letter-spacing:-.005em;
}
.coach .nav-cta .l{display:flex;align-items:center;gap:8px}
.coach .nav-cta .kbd{font-family:var(--font-mono);font-size:10px;color:rgba(255,255,255,.55);background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.12);padding:1px 6px;border-radius:4px;letter-spacing:.04em;font-weight:500}

.coach .nav-head{font-size:11px;color:var(--ink-4);font-weight:600;margin:14px 10px 4px;letter-spacing:.04em;text-transform:uppercase}

.coach .nav-item{
  display:flex;align-items:center;gap:11px;padding:8px 12px;border-radius:10px;
  font-size:13.5px;color:var(--ink-2);font-weight:500;letter-spacing:-.003em;cursor:default;
}
.coach .nav-item:hover{background:var(--surface-3)}
.coach .nav-item.active{background:var(--surface);color:var(--ink);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.coach .nav-item .ic{display:flex;align-items:center;width:18px;justify-content:center;color:var(--ink-3)}
.coach .nav-item.active .ic{color:var(--ink)}
.coach .nav-item .ic-badge{margin-left:auto;width:8px;height:8px;border-radius:50%;background:var(--brand)}
.coach .nav-item .badge{margin-left:auto;font-family:var(--font-mono);font-size:10px;color:var(--ink-3);background:var(--surface-3);padding:2px 7px;border-radius:999px;font-weight:600}

.coach .nav-thread{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:8px;font-size:13px;color:var(--ink-2);font-weight:500;cursor:default}
.coach .nav-thread:hover{background:var(--surface-3)}
.coach .nav-thread .t{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.003em}
.coach .nav-thread .ago{font-family:var(--font-mono);font-size:10px;color:var(--ink-4);font-weight:500}
.coach .nav-thread.pin .t{display:flex;align-items:center;gap:5px}
.coach .nav-thread.pin .t::before{content:"📌";font-size:11px;flex-shrink:0}

.coach .side-foot{margin-top:auto;padding-top:14px;border-top:1px solid var(--line);font-size:12px;color:var(--ink-3);display:flex;justify-content:space-between;align-items:center}
.coach .lang{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.coach .lang span{padding:3px 9px;font-weight:500;cursor:pointer}
.coach .lang .on{background:var(--ink);color:#fff}

/* ─────────── main ─────────── */
.coach .main{display:flex;flex-direction:column;height:100%;overflow:hidden}
.coach .topbar{display:flex;justify-content:space-between;align-items:center;padding:16px 32px}
.coach .topbar .title-blk h1{margin:0;font-size:24px;line-height:1.15;font-weight:700;letter-spacing:-.02em}
.coach .topbar .title-blk .sub{margin-top:2px;font-size:13px;color:var(--ink-3);font-weight:500}
.coach .topbar .actions{display:flex;gap:6px;align-items:center}

.coach .scroll{flex:1;overflow:auto;padding:8px 32px 32px}

/* ─────────── buttons ─────────── */
.coach .btn{
  font-family:inherit;
  appearance:none;border:1px solid var(--line);background:var(--surface);color:var(--ink);
  padding:8px 16px;border-radius:10px;font-size:13.5px;font-weight:600;letter-spacing:-.003em;
  cursor:default;display:inline-flex;align-items:center;gap:7px;
  transition:.12s;
}
.coach .btn:hover{background:var(--surface-2)}
.coach .btn.primary{background:var(--ink);color:#fff;border-color:var(--ink)}
.coach .btn.primary:hover{background:#000}
.coach .btn.brand{background:var(--brand);color:#fff;border-color:var(--brand)}
.coach .btn.brand:hover{background:var(--brand-hover)}
.coach .btn.ghost{background:transparent;border-color:transparent}
.coach .btn.ghost:hover{background:var(--surface-2)}
.coach .btn.sm{padding:6px 12px;font-size:12.5px;border-radius:8px}
.coach .btn.lg{padding:12px 22px;font-size:15px;border-radius:12px}
.coach .btn.pill{border-radius:var(--r-pill)}

.coach .ico-btn{
  width:34px;height:34px;border-radius:10px;
  border:1px solid var(--line);background:var(--surface);color:var(--ink-2);
  display:flex;align-items:center;justify-content:center;cursor:default;
}
.coach .ico-btn:hover{background:var(--surface-2);color:var(--ink)}

/* ─────────── cards ─────────── */
.coach .card{
  background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);
  padding:20px 22px;
}
.coach .card.lg{border-radius:var(--r-xl);padding:28px 30px}
.coach .card.flat{background:var(--surface-2);border-color:transparent}
.coach .card.dark{background:var(--night);color:#fff;border-color:var(--night)}
.coach .card.brand{background:var(--brand);color:#fff;border-color:var(--brand)}

/* ─────────── chips (semantic only) ─────────── */
.coach .chip{
  display:inline-flex;align-items:center;gap:5px;
  padding:3px 9px;border-radius:999px;font-size:11.5px;font-weight:600;
  background:var(--surface-2);color:var(--ink-2);border:1px solid var(--line);
  letter-spacing:-.003em;line-height:1.3;
}
.coach .chip.brand{background:var(--brand-soft);color:var(--brand-ink);border-color:transparent}
.coach .chip.success{background:var(--success-soft);color:#1f7a31;border-color:transparent}
.coach .chip.warn{background:var(--warn-soft);color:#a86200;border-color:transparent}
.coach .chip.danger{background:var(--danger-soft);color:#bf2418;border-color:transparent}
.coach .chip.dark{background:var(--ink);color:#fff;border-color:var(--ink)}
.coach .chip .dot{width:5px;height:5px;border-radius:50%;background:currentColor}

/* ─────────── typography helpers ─────────── */
.coach .h-display{font-size:64px;line-height:1.02;font-weight:800;letter-spacing:-.035em}
.coach .h1{font-size:32px;line-height:1.1;font-weight:700;letter-spacing:-.025em}
.coach .h2{font-size:22px;line-height:1.2;font-weight:700;letter-spacing:-.015em}
.coach .h3{font-size:16px;line-height:1.3;font-weight:600;letter-spacing:-.005em}
.coach .lbl{font-size:11px;color:var(--ink-3);font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.coach .num-big{font-size:46px;font-weight:800;letter-spacing:-.035em;line-height:1}
.coach .num-mid{font-size:30px;font-weight:700;letter-spacing:-.025em;line-height:1}
.coach .small{font-size:12px;color:var(--ink-3);font-weight:500}

/* row helpers */
.coach .row{display:flex;align-items:center;gap:10px}
.coach .col{display:flex;flex-direction:column;gap:10px}
.coach .grow{flex:1}
.coach .muted{color:var(--ink-3)}
`;

// ─── Character marks — simple, restrained ──────────────────────────────
// One main user character + one Coach mark. Used sparingly: sidebar, landing, chat.
const Avatar = ({ kind = "user", size = 36, ring = null, style = {} }) => {
  if (kind === "initial") {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "#1d1d1f", color: "#fff",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.42, fontWeight: 700, letterSpacing: "-.02em",
        boxShadow: ring ? `0 0 0 3px ${ring}` : "none",
        flexShrink: 0, ...style,
      }}>{style.children || "M"}</div>
    );
  }
  if (kind === "coach") {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "#0a0a0c", display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, overflow: "hidden", boxShadow: ring ? `0 0 0 3px ${ring}` : "none", ...style,
      }}>
        <svg viewBox="0 0 100 100" width={size} height={size}>
          {/* abstract round face */}
          <circle cx="50" cy="50" r="32" fill="#fafaf2" />
          {/* hat / glasses suggestion */}
          <rect x="22" y="32" width="56" height="4" rx="1" fill="#0a0a0c" />
          <polygon points="22,32 78,32 50,22" fill="#0a0a0c" />
          {/* eyes */}
          <circle cx="42" cy="52" r="2.4" fill="#0a0a0c" />
          <circle cx="58" cy="52" r="2.4" fill="#0a0a0c" />
          <circle cx="42.8" cy="51.4" r="0.8" fill="#fff" />
          <circle cx="58.8" cy="51.4" r="0.8" fill="#fff" />
          {/* smile */}
          <path d="M 42 62 Q 50 68 58 62" stroke="#0a0a0c" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  // default: user character — round head + glasses + ink shirt
  const skin = "#f5d4b0";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "#eef2ff",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, overflow: "hidden",
      boxShadow: ring ? `0 0 0 3px ${ring}` : "none",
      ...style,
    }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {/* body */}
        <ellipse cx="50" cy="100" rx="42" ry="30" fill="#1d1d1f" />
        {/* neck */}
        <rect x="44" y="62" width="12" height="14" rx="2" fill={skin} />
        {/* head */}
        <circle cx="50" cy="44" r="26" fill={skin} />
        {/* hair (short messy) */}
        <path d="M 24 44 Q 26 18 50 18 Q 74 18 76 44 Q 76 32 50 32 Q 24 32 24 44 Z" fill="#1f1812" />
        {/* eyes */}
        <circle cx="42" cy="46" r="2.4" fill="#1d1d1f" />
        <circle cx="58" cy="46" r="2.4" fill="#1d1d1f" />
        <circle cx="42.8" cy="45.4" r="0.8" fill="#fff" />
        <circle cx="58.8" cy="45.4" r="0.8" fill="#fff" />
        {/* round glasses (signature) */}
        <g fill="none" stroke="#1d1d1f" strokeWidth="1.6">
          <circle cx="42" cy="46" r="6.5" />
          <circle cx="58" cy="46" r="6.5" />
          <line x1="48.5" y1="46" x2="51.5" y2="46" />
        </g>
        {/* smile */}
        <path d="M 43 56 Q 50 62 57 56" stroke="#1d1d1f" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* cheek tint */}
        <circle cx="36" cy="54" r="3" fill="#ff8a9a" opacity="0.28" />
        <circle cx="64" cy="54" r="3" fill="#ff8a9a" opacity="0.28" />
      </svg>
    </div>
  );
};

// ─── Sidebar ───────────────────────────────────────────────────────────
const CoachSide = ({ active = "today" }) => {
  const main = [
    { id: "today",     label: "今天",        ic: window.IK.calendar, dot: true },
    { id: "monthly",   label: "月刊 · 面经",  ic: window.IK.doc },
    { id: "interview", label: "面试复盘",     ic: window.IK.mic, badge: "12" },
    { id: "overview",  label: "求职总览",     ic: window.IK.chart },
  ];
  const tools = [
    { id: "resume",  label: "简历馆",   ic: window.IK.spark },
    { id: "mock",    label: "模拟面试", ic: window.IK.play },
    { id: "salary",  label: "薪资雷达", ic: window.IK.money },
    { id: "tracker", label: "投递追踪", ic: window.IK.brief, badge: "18" },
  ];
  return (
    <div className="side">
      <div className="side-top">
        <div className="who">
          <Avatar kind="user" size={32} />
          <div>
            <div className="name">张明</div>
            <span className="meta">华师大 · 2026 届</span>
          </div>
        </div>
        <span className="ico-more">{window.IK.more}</span>
      </div>

      <div className="nav-cta">
        <span className="l">{window.IK.msg}<span>问 Coach</span></span>
        <span className="kbd">⌘ K</span>
      </div>

      {main.map(n => (
        <div key={n.id} className={"nav-item " + (active === n.id ? "active" : "")}>
          <span className="ic">{n.ic}</span>
          <span>{n.label}</span>
          {n.dot && <span className="ic-badge"></span>}
          {n.badge && <span className="badge">{n.badge}</span>}
        </div>
      ))}

      <div className="nav-head">工具</div>
      {tools.map(t => (
        <div key={t.id} className={"nav-item " + (active === t.id ? "active" : "")}>
          <span className="ic">{t.ic}</span>
          <span>{t.label}</span>
          {t.badge && <span className="badge">{t.badge}</span>}
        </div>
      ))}

      <div className="nav-head">最近</div>
      <div className="nav-thread pin"><span className="t">我的简历主版本</span></div>
      <div className="nav-thread"><span className="t">改简历 · 字节前端</span><span className="ago">2m</span></div>
      <div className="nav-thread"><span className="t">美团二面复盘</span><span className="ago">1h</span></div>
      <div className="nav-thread"><span className="t">Offer 比较 · 字节 vs Shopee</span><span className="ago">2d</span></div>

      <div className="side-foot">
        <span>Coach v 4</span>
        <span className="lang"><span className="on">中</span><span>EN</span></span>
      </div>
    </div>
  );
};

const CoachTopbar = ({ title, sub, actions }) => (
  <div className="topbar">
    <div className="title-blk">
      <h1>{title}</h1>
      {sub && <div className="sub">{sub}</div>}
    </div>
    <div className="actions">{actions}</div>
  </div>
);

Object.assign(window, { CORE_CSS, Avatar, CoachSide, CoachTopbar });
