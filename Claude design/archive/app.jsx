// 简历健诊 — main app
// State machine: 'input' (paste JD + resume) → 'scanning' → 'result'

const { useState, useEffect, useRef, useMemo } = React;

// ────────────────────────────────────────────────────────────
// Icons (tiny inline set — line, 18px)
// ────────────────────────────────────────────────────────────
const Icon = ({ d, size = 18, stroke = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const I = {
  back: <Icon d={<><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></>} />,
  history: <Icon d={<><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></>} />,
  sun: <Icon d={<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>} />,
  arrow: <Icon d={<><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></>} />,
  check: <Icon d={<path d="M20 6L9 17l-5-5"/>} size={14} />,
  copy: <Icon d={<><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>} size={14} />,
  swap: <Icon d={<><path d="M7 4v16M3 8l4-4 4 4"/><path d="M17 20V4M13 16l4 4 4-4"/></>} size={14} />,
  send: <Icon d={<><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></>} />,
  sparkle: <Icon d={<><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>} size={14} />,
  upload: <Icon d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></>} size={14} />,
  reset: <Icon d={<><path d="M3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5"/></>} size={14} />,
};

// ────────────────────────────────────────────────────────────
// Score ring (SVG)
// ────────────────────────────────────────────────────────────
const ScoreRing = ({ score }) => {
  const R = 86, C = 2 * Math.PI * R;
  const offset = C - (score / 100) * C;
  const [animOffset, setAnimOffset] = useState(C);
  useEffect(() => {
    const t = setTimeout(() => setAnimOffset(offset), 120);
    return () => clearTimeout(t);
  }, [offset]);
  return (
    <div className="score-ring">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--line)" strokeWidth="2"/>
        <circle
          cx="100" cy="100" r={R} fill="none"
          stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={animOffset}
          transform="rotate(-90 100 100)"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.7,.2,1)" }}
        />
        {/* tick marks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
          const r1 = 70, r2 = 74;
          const x1 = 100 + Math.cos(a) * r1, y1 = 100 + Math.sin(a) * r1;
          const x2 = 100 + Math.cos(a) * r2, y2 = 100 + Math.sin(a) * r2;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line-2)" strokeWidth="0.6" />;
        })}
      </svg>
      <div className="score-num">
        <div><span className="n">{score}</span><span className="pct">/100</span></div>
        <div className="lbl">Match Score</div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// TopBar
// ────────────────────────────────────────────────────────────
const TopBar = ({ onReset, dark, onToggleDark }) => (
  <div className="topbar">
    <div className="crumb">
      <span className="logo">C</span>
      <span>工具箱</span>
      <span className="sep">/</span>
      <span>求职助手</span>
      <span className="sep">/</span>
      <b>简历健诊</b>
    </div>
    <div className="topbar-right">
      <button className="icon-btn" title="历史诊断">{I.history}</button>
      <button className="icon-btn" title="主题" onClick={onToggleDark}>{I.sun}</button>
      <div className="avatar">M</div>
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────
// Hero
// ────────────────────────────────────────────────────────────
const Hero = ({ state, analysis }) => (
  <div className="hero">
    <div>
      <div className="hero-tag">
        <span className="dot"></span>
        <span>RESUME · DIAGNOSTICS</span>
      </div>
      <h1>把简历投准<br/><em>每一个机会。</em></h1>
      <p className="hero-sub">
        贴上一份岗位 JD，再贴上你的简历。
        几秒钟，得到一份逐行可执行的改写清单 ——
        而不是一句空洞的「再润色一下」。
      </p>
    </div>
    <div className="hero-meta">
      <div className="row">
        <span>累计诊断</span>
        <b>1,247</b>
      </div>
      <div className="row">
        <span>平均提分</span>
        <b className="big">+24</b>
      </div>
      <div className="row">
        <span>本月活跃岗位池</span>
        <b>3,802</b>
      </div>
      <div className="row">
        <span>当前模型</span>
        <b>v4.2 · 中文优化版</b>
      </div>
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────
// Input workspace (state === 'input')
// ────────────────────────────────────────────────────────────
const InputWorkspace = ({ jd, setJd, resume, setResume, onAnalyze, scanning }) => {
  const ready = jd.trim().length > 30 && resume.trim().length > 30;
  return (
    <>
      <div className="section-hd">
        <div>
          <div className="label">STEP 01 — 02</div>
          <h2>粘贴 JD 与你的简历</h2>
        </div>
        <div className="actions">
          <button className="btn ghost sm" onClick={() => { setJd(window.MOCK_JD); setResume(window.MOCK_RESUME); }}>
            {I.sparkle}<span>载入示例</span>
          </button>
        </div>
      </div>

      <div className="workspace">
        <div className="card">
          <div className="card-hd">
            <h3>① 目标 JD</h3>
            <span className="meta">{jd.trim().split(/\s+/).filter(Boolean).length} 词</span>
          </div>
          <textarea
            className="paste"
            placeholder="把你心仪岗位的 JD 完整贴在这里。越细越好 —— 岗位职责、要求、加分项都保留。"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
          <div className="upload">
            <span>也可以直接<b>粘贴招聘链接</b> · 我们会自动抓取</span>
            <button className="btn ghost sm">{I.upload}<span>从链接导入</span></button>
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <h3>② 你的简历</h3>
            <span className="meta">{resume.trim().split(/\s+/).filter(Boolean).length} 词</span>
          </div>
          <textarea
            className="paste"
            placeholder="把简历文本粘进来。不必排版漂亮 —— 我们看的是内容。"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
          />
          <div className="upload">
            <span>支持 <b>PDF / DOCX / Markdown</b> 直接上传</span>
            <button className="btn ghost sm">{I.upload}<span>上传文件</span></button>
          </div>
        </div>

        <div className="full-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0 8px" }}>
          <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
            {ready
              ? <>准备就绪。诊断需要约 <b style={{ color: "var(--ink)" }}>10–15 秒</b>，全程在本地浏览器加密。</>
              : <>把两段文本都填上，<em style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--ink-2)" }}>就能开始诊断</em>。</>}
          </div>
          <button className="btn accent" disabled={!ready || scanning} onClick={onAnalyze}>
            {scanning ? "诊断中…" : <>开始诊断{I.arrow}</>}
          </button>
        </div>

        {scanning && (
          <div className="full-card" style={{ marginTop: 0 }}>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--ink-3)", marginBottom: 12 }}>
                <span>正在分析关键词、量化成果、岗位信号…</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>04 / 06</span>
              </div>
              <div className="scan"><i></i></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ────────────────────────────────────────────────────────────
// Result view (state === 'result')
// ────────────────────────────────────────────────────────────
const ResultView = ({ analysis, onReset }) => {
  const [tab, setTab] = useState("suggestions");
  return (
    <>
      <div className="section-hd">
        <div>
          <div className="label">DIAGNOSTIC · {analysis.analyzedAt}</div>
          <h2>{analysis.company} — {analysis.role}</h2>
        </div>
        <div className="actions">
          <button className="btn ghost sm" onClick={onReset}>{I.reset}<span>换一份</span></button>
          <button className="btn sm">{I.copy}<span>导出 PDF 报告</span></button>
        </div>
      </div>

      {/* Score + dimensions */}
      <div className="card full-card" style={{ marginBottom: "var(--gap)" }}>
        <div className="score-wrap">
          <ScoreRing score={analysis.score} />
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 6 }}>
              <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 30, color: "var(--ink)" }}>
                {analysis.band}
              </span>
              <span style={{ color: "var(--ink-3)", fontSize: 13 }}>{analysis.bandNote}</span>
            </div>
            <div className="pull-quote">
              你的经验和这个岗位非常对口 ——
              真正的瓶颈是<u style={{ textDecorationColor: "var(--accent)", textDecorationThickness: 2, textUnderlineOffset: 4 }}>表达方式</u>，而不是能力本身。
            </div>
            <div className="dim-list">
              {analysis.dimensions.map((d) => (
                <div key={d.name} className={"dim " + d.tone}>
                  <span className="name">{d.name}</span>
                  <div className="bar"><i style={{ width: d.pct + "%" }}></i></div>
                  <span className="pct">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Keywords */}
      <div className="workspace">
        <div className="card">
          <div className="card-hd">
            <h3>命中的关键词 <span style={{ color: "var(--ink-3)", fontWeight: 400, marginLeft: 6 }}>· {analysis.matchedKeywords.length}</span></h3>
            <span className="meta">{I.check} 你已经写到</span>
          </div>
          <div className="kw-cloud">
            {analysis.matchedKeywords.map(k => <span key={k} className="chip match"><span className="dot"></span>{k}</span>)}
          </div>
        </div>
        <div className="card">
          <div className="card-hd">
            <h3>缺失的关键词 <span style={{ color: "var(--ink-3)", fontWeight: 400, marginLeft: 6 }}>· {analysis.missingKeywords.length}</span></h3>
            <span className="meta" style={{ color: "var(--bad)" }}>需要补充</span>
          </div>
          <div className="kw-cloud">
            {analysis.missingKeywords.map(k => <span key={k} className="chip miss"><span className="dot"></span>{k}</span>)}
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 14, marginBottom: 0, lineHeight: 1.55 }}>
            这些是 JD 里出现频次最高、但在你简历中<u>找不到</u>的词。
            不必硬塞 —— 找你<em style={{ fontFamily: "var(--font-display)" }}>真做过</em>的事情，用对方的话再说一遍。
          </p>
        </div>
      </div>

      {/* Tabs section */}
      <div style={{ marginTop: "calc(var(--gap) * 2)" }}>
        <div className="tabs">
          <button className={"tab " + (tab === "suggestions" ? "active" : "")} onClick={() => setTab("suggestions")}>
            改写建议 · {analysis.suggestions.length}
          </button>
          <button className={"tab " + (tab === "doc" ? "active" : "")} onClick={() => setTab("doc")}>
            原文标注
          </button>
          <button className={"tab " + (tab === "chat" ? "active" : "")} onClick={() => setTab("chat")}>
            继续追问
          </button>
          <button className={"tab " + (tab === "history" ? "active" : "")} onClick={() => setTab("history")}>
            历史记录
          </button>
        </div>

        {tab === "suggestions" && <Suggestions list={analysis.suggestions} />}
        {tab === "doc" && <AnnotatedDoc />}
        {tab === "chat" && <Chat analysis={analysis} />}
        {tab === "history" && <HistoryList list={analysis.history} />}
      </div>
    </>
  );
};

// ────────────────────────────────────────────────────────────
// Suggestions list with per-item accept / copy
// ────────────────────────────────────────────────────────────
const Suggestions = ({ list }) => {
  const [accepted, setAccepted] = useState({});
  return (
    <div className="card">
      <div className="card-hd">
        <h3>逐条改写建议</h3>
        <span className="meta">按影响力排序</span>
      </div>
      <div>
        {list.map((s, i) => (
          <div className="sugg" key={s.id}>
            <div className="sugg-num">{String(i + 1).padStart(2, "0")}</div>
            <div className="sugg-body">
              <div className={"severity " + s.severity}>
                <span className="dot"></span>
                <span>
                  {s.severity === "high" ? "高优先级" : s.severity === "medium" ? "中优先级" : "锦上添花"}
                </span>
              </div>
              <h4>{s.title}</h4>
              <p className="why">{s.why}</p>
              <div className="ba">
                <div className="before">
                  <span className="label">原文 · Before</span>
                  {s.before || "（空白）"}
                </div>
                <div className="after" style={{ whiteSpace: "pre-line" }}>
                  <span className="label">AI 改写 · After</span>
                  {s.after}
                </div>
              </div>
            </div>
            <div className="sugg-actions">
              {accepted[s.id]
                ? <button className="btn sm" disabled style={{ background: "var(--good)", borderColor: "var(--good)", color: "#fff", opacity: 1 }}>{I.check}<span>已采纳</span></button>
                : <button className="btn ghost sm" onClick={() => setAccepted(a => ({ ...a, [s.id]: true }))}>{I.check}<span>采纳</span></button>}
              <button className="btn ghost sm">{I.copy}<span>复制</span></button>
              <button className="btn ghost sm">{I.swap}<span>换一版</span></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Annotated original doc view
// ────────────────────────────────────────────────────────────
const AnnotatedDoc = () => (
  <div className="card">
    <div className="card-hd">
      <h3>原文标注</h3>
      <span className="meta">
        <span className="hl-good" style={{ marginRight: 8 }}>命中</span>
        <span className="hl-warn" style={{ marginRight: 8 }}>可强化</span>
        <span className="hl-bad">缺失/弱</span>
      </span>
    </div>
    <div className="doc">
      <h5>张明 · 前端工程师</h5>
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 18 }}>
        zhangming@email.com · +86 138 0000 1234 · 上海
      </div>

      <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", margin: "20px 0 10px" }}>
        工作经历
      </div>

      <div style={{ marginBottom: 18 }}>
        <div className="role">
          <span>蚂蚁集团 · 高级前端工程师</span>
          <span>2022.03 — 至今</span>
        </div>
        <ul>
          <li>负责支付宝某业务线的前端开发工作</li>
          <li><span className="hl-bad">使用 React 重构了一个旧项目，提升了页面加载速度</span> <span style={{ fontSize: 11, color: "var(--bad)" }}>← 无数据</span></li>
          <li><span className="hl-bad">参与团队的代码评审和新人培训</span> <span style={{ fontSize: 11, color: "var(--bad)" }}>← Tech Lead 信号弱</span></li>
          <li>与产品和设计沟通需求</li>
        </ul>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div className="role">
          <span>某互联网公司 · 前端工程师</span>
          <span>2019.07 — 2022.02</span>
        </div>
        <ul>
          <li>开发了多个 <span className="hl-good">H5</span> 活动页面</li>
          <li><span className="hl-warn">维护公司的组件库</span> <span style={{ fontSize: 11, color: "var(--warn)" }}>← 可强化为 Monorepo / 治理</span></li>
          <li>学习并使用了 Vue、<span className="hl-good">React</span> 等框架</li>
        </ul>
      </div>

      <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", margin: "20px 0 10px" }}>
        技能
      </div>
      <p style={{ margin: 0 }}>
        <span className="hl-good">JavaScript</span>, HTML, CSS,{" "}
        <span className="hl-good">React</span>, Vue, Git, Node.js
        <span style={{ display: "block", marginTop: 8, fontSize: 11, color: "var(--warn)" }}>
          ← 建议按「精通 / 熟悉 / 了解」分层；显示 TypeScript / Next.js / SSR 等关键词
        </span>
      </p>
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────
// Chat panel
// ────────────────────────────────────────────────────────────
const Chat = ({ analysis }) => {
  const [history, setHistory] = useState(analysis.chatHistory);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const send = (text) => {
    const t = (text || input).trim();
    if (!t) return;
    setHistory(h => [...h, { role: "user", text: t }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setHistory(h => [...h, {
        role: "ai",
        text: fakeReply(t),
      }]);
    }, 900);
  };
  return (
    <div className="card">
      <div className="card-hd">
        <h3>继续追问</h3>
        <span className="meta">基于本次诊断上下文</span>
      </div>
      <div className="chat">
        {history.map((m, i) => (
          <div key={i} className={"chat-msg " + m.role}>
            <div className="av">{m.role === "ai" ? "C" : "我"}</div>
            <div className="bub" style={{ whiteSpace: "pre-line" }}>{m.text}</div>
          </div>
        ))}
        {thinking && (
          <div className="chat-msg ai">
            <div className="av">C</div>
            <div className="bub" style={{ color: "var(--ink-3)" }}>思考中…</div>
          </div>
        )}
      </div>
      <div className="suggested-q">
        {analysis.suggestedQ.map(q => (
          <button key={q} onClick={() => send(q)}>{q}</button>
        ))}
      </div>
      <div className="chat-input">
        <input
          placeholder="向 AI 继续追问 —— 例如「帮我重写整段蚂蚁经历」"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn accent sm" onClick={() => send()}>
          {I.send}<span>发送</span>
        </button>
      </div>
    </div>
  );
};

const fakeReply = (q) => {
  if (q.includes("蚂蚁")) {
    return "好。这是改写后的整段：\n\n蚂蚁集团 · 高级前端工程师 · 2022.03 — 至今\n— 主导支付宝某业务线 React 18 + SSR 架构升级，FCP −72%，PV +18%；\n— 牵头制定团队前端规范与组件库治理方案，mentor 3 名工程师晋升中级；\n— 推动可观测性体系落地，线上 JS 错误率从 0.12% 降至 0.03%；\n— 与设计、产品形成「双周需求评审」机制，需求返工率降低 40%。";
  }
  if (q.includes("面试")) {
    return "字节资深前端常见题方向：\n1. 大型项目性能优化的整体方法论（关键路径、SSR、边缘渲染）\n2. 一个你做过的「从 0 到 1」项目的架构决策\n3. React 18 并发特性的实战应用\n4. 如何 mentor 初中级工程师\n\n要不要我针对其中一个，做一次模拟面试？";
  }
  if (q.includes("挑战") || q.includes("应该")) {
    return "我的判断：值得挑战。\n\n你 72 分的分布很特殊 —— 经验维度高（86），但表达维度低。这意味着「真实匹配度」其实在 80 分上下，只是简历没说出来。改完顶部那 3 条 bullet，分数会涨到 85+。\n\n比起换岗位，先把表达问题解决。";
  }
  if (q.includes("自我介绍") || q.includes("30 秒")) {
    return "30 秒版本：\n\n「我是张明，6 年前端，最近 3 年在蚂蚁带一个 5 人小组做支付宝业务线。我最擅长把旧系统重构得更快 —— 上一个项目把 FCP 从 3 秒压到 0.9 秒，DAU 因此涨了 18%。除了写代码，我也比较喜欢搭团队基建，组件库、规范、新人 onboarding 都做过。看到你们这个岗位强调架构 + Tech Lead，挺契合我接下来想做的事。」";
  }
  return "好问题。我可以从这个角度展开：你想要更偏「策略建议」还是「具体改写」？";
};

// ────────────────────────────────────────────────────────────
// History tab
// ────────────────────────────────────────────────────────────
const HistoryList = ({ list }) => (
  <div className="card">
    <div className="card-hd">
      <h3>最近的诊断</h3>
      <span className="meta">{list.length} 条记录</span>
    </div>
    <div className="history">
      {list.map((h, i) => (
        <div key={i} className="hist-item">
          <span className="date">{h.date}</span>
          <span className="title">{h.role}<span className="co">· {h.co}</span></span>
          <span className="score">{h.score}<span style={{ fontSize: 12, color: "var(--ink-3)", marginLeft: 4 }}>/100</span></span>
        </div>
      ))}
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────
// Tweaks
// ────────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#d94a25",
  "displayFont": "Instrument Serif",
  "density": "regular",
  "dark": false,
  "showHero": true
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = [
  "#d94a25", // coral red (default)
  "#3b4cca", // indigo
  "#2d5f3f", // forest
  "#7c5cbf", // plum
];

const DISPLAY_FONTS = ["Instrument Serif", "Noto Serif SC"];

// ────────────────────────────────────────────────────────────
// App
// ────────────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [jd, setJd] = useState(window.MOCK_JD);
  const [resume, setResume] = useState(window.MOCK_RESUME);
  const [state, setState] = useState("result"); // 'input' | 'scanning' | 'result'
  const [scanning, setScanning] = useState(false);

  // Apply theme & density
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", t.dark ? "dark" : "light");
    document.documentElement.setAttribute("data-density", t.density);
    document.documentElement.style.setProperty("--accent", t.accent);
    document.documentElement.style.setProperty("--font-display", `"${t.displayFont}","Noto Serif SC",ui-serif,serif`);
  }, [t]);

  const handleAnalyze = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); setState("result"); }, 1700);
  };

  const handleReset = () => {
    setState("input");
    setJd("");
    setResume("");
  };

  return (
    <div className="shell">
      <TopBar dark={t.dark} onToggleDark={() => setTweak("dark", !t.dark)} />

      {t.showHero && <Hero state={state} />}

      {state === "input" && (
        <InputWorkspace
          jd={jd} setJd={setJd}
          resume={resume} setResume={setResume}
          scanning={scanning}
          onAnalyze={handleAnalyze}
        />
      )}

      {state === "result" && <ResultView analysis={window.MOCK_ANALYSIS} onReset={handleReset} />}

      <div className="foot">
        <span>简历健诊 · <em>CV Toolbox</em> · v4.2</span>
        <span>所有诊断仅在浏览器本地完成 · 不上传 · 不留痕</span>
      </div>

      <TweaksPanel>
        <TweakSection label="主题 / Theme" />
        <TweakToggle label="深色模式" value={t.dark} onChange={(v) => setTweak("dark", v)} />
        <TweakColor
          label="强调色"
          value={t.accent}
          options={ACCENT_OPTIONS}
          onChange={(v) => setTweak("accent", v)}
        />

        <TweakSection label="字体 / Type" />
        <TweakRadio
          label="标题字体"
          value={t.displayFont}
          options={DISPLAY_FONTS}
          onChange={(v) => setTweak("displayFont", v)}
        />

        <TweakSection label="排版 / Layout" />
        <TweakRadio
          label="密度"
          value={t.density}
          options={["compact", "regular", "comfy"]}
          onChange={(v) => setTweak("density", v)}
        />
        <TweakToggle label="显示 Hero 标题" value={t.showHero} onChange={(v) => setTweak("showHero", v)} />

        <TweakSection label="演示 / Demo" />
        <TweakButton label="切到输入态" onClick={() => setState("input")} />
        <TweakButton label="切到结果态" onClick={() => setState("result")} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
