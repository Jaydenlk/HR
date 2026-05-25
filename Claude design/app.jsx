// Real-website app — replaces design canvas with route-based screen nav.

const { useState, useEffect } = React;

const ROUTES = [
  { id: "landing",    label: "首页",      comp: () => <window.Landing /> },
  { id: "today",      label: "今天",      comp: () => <window.TodayScreen /> },
  { id: "monthly",    label: "月刊",      comp: () => <window.MonthlyFeed /> },
  { id: "iv-list",    label: "面试复盘",   comp: () => <window.InterviewList /> },
  { id: "iv-detail",  label: "复盘详情",   comp: () => <window.InterviewDetail /> },
  { id: "overview",   label: "求职总览",   comp: () => <window.Overview /> },
  { id: "chat",       label: "Coach 对话", comp: () => <window.ChatScreen /> },
  // tools
  { id: "resume",     label: "简历馆",     comp: () => <window.ResumeStudio />, group: "tool" },
  { id: "mock",       label: "模拟面试",   comp: () => <window.MockInterview />, group: "tool" },
  { id: "cover",      label: "求职信",     comp: () => <window.CoverLetter />, group: "tool" },
  { id: "salary",     label: "薪资雷达",   comp: () => <window.SalaryLab />, group: "tool" },
  { id: "tracker",    label: "投递追踪",   comp: () => <window.Tracker />, group: "tool" },
  { id: "career",     label: "职业地图",   comp: () => <window.CareerMap />, group: "tool" },
];

function App() {
  const initial = () => {
    const h = (location.hash || "").replace("#", "");
    return ROUTES.find(r => r.id === h) ? h : "landing";
  };
  const [route, setRoute] = useState(initial);

  useEffect(() => {
    const onHash = () => {
      const h = (location.hash || "").replace("#", "");
      if (ROUTES.find(r => r.id === h)) setRoute(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // intercept side-nav clicks → route
  useEffect(() => {
    const map = { "today": "today", "monthly": "monthly", "interview": "iv-list", "overview": "overview", "chat": "chat" };
    const onClick = (e) => {
      const el = e.target.closest(".coach .side .nav-item, .coach .side .nav-cta, .coach .side .nav-thread");
      if (!el) return;
      // best-effort: read label text
      const txt = el.textContent || "";
      let id = null;
      if (txt.includes("今天")) id = "today";
      else if (txt.includes("月刊")) id = "monthly";
      else if (txt.includes("面试复盘")) id = "iv-list";
      else if (txt.includes("求职总览")) id = "overview";
      else if (txt.includes("简历馆")) id = "resume";
      else if (txt.includes("模拟面试")) id = "mock";
      else if (txt.includes("求职信")) id = "cover";
      else if (txt.includes("薪资")) id = "salary";
      else if (txt.includes("投递追踪")) id = "tracker";
      else if (txt.includes("职业地图")) id = "career";
      else if (txt.includes("问 Coach") || txt.includes("改简历")) id = "chat";
      if (id) { location.hash = id; }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const r = ROUTES.find(x => x.id === route) || ROUTES[0];
  return (
    <>
      <RouteBar route={route} setRoute={(id) => { location.hash = id; }} />
      <div className="route-host">{r.comp()}</div>
    </>
  );
}

const RouteBar = ({ route, setRoute }) => {
  const mainRoutes = ROUTES.filter(r => !r.group);
  const tools = ROUTES.filter(r => r.group === "tool");
  return (
    <div className="route-bar">
      <div className="rb-logo">
        <span className="mark">C</span>
        <span>Coach</span>
        <span className="rb-version">v4 · Light</span>
      </div>
      <div className="rb-tabs">
        {mainRoutes.map(r => (
          <button
            key={r.id}
            className={"rb-tab " + (route === r.id ? "active" : "")}
            onClick={() => setRoute(r.id)}
          >{r.label}</button>
        ))}
        <span className="rb-sep">·</span>
        {tools.map(r => (
          <button
            key={r.id}
            className={"rb-tab rb-tool " + (route === r.id ? "active" : "")}
            onClick={() => setRoute(r.id)}
          >{r.label}</button>
        ))}
      </div>
      <div className="rb-meta">设计原型</div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
