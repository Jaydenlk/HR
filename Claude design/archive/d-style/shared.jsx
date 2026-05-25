// Shared utilities, icons, mock data shared across directions.

const { useState, useEffect, useRef, useMemo } = React;

// ─── Icons (line, 18px default) ─────────────────────────────────────────
const SvgIcon = ({ d, size = 18, sw = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const IK = {
  arrow:    <SvgIcon d={<><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></>} />,
  arrowD:   <SvgIcon d={<><path d="M12 5v14"/><path d="M5 12l7 7 7-7"/></>} />,
  check:    <SvgIcon d={<path d="M20 6L9 17l-5-5"/>} />,
  plus:     <SvgIcon d={<><path d="M12 5v14"/><path d="M5 12h14"/></>} />,
  search:   <SvgIcon d={<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>} />,
  bell:     <SvgIcon d={<><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M14 21a2 2 0 0 1-4 0"/></>} />,
  spark:    <SvgIcon d={<><path d="M12 2l1.6 4.8L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.2L12 2z"/><path d="M19 14l.8 2.4L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.6L19 14z"/></>} />,
  flame:    <SvgIcon d={<path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 1-3s-2 2-2 5a6 6 0 0 0 12 0c0-6-7-10-7-10z"/>} />,
  trophy:   <SvgIcon d={<><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M17 4h3v2a3 3 0 0 1-3 3M7 4H4v2a3 3 0 0 0 3 3"/></>} />,
  calendar: <SvgIcon d={<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>} />,
  doc:      <SvgIcon d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>} />,
  brief:    <SvgIcon d={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>} />,
  msg:      <SvgIcon d={<path d="M21 12a8 8 0 1 1-3.4-6.5L21 4l-1.5 3.5A8 8 0 0 1 21 12z"/>} />,
  mic:      <SvgIcon d={<><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/></>} />,
  send:     <SvgIcon d={<><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></>} />,
  chart:    <SvgIcon d={<><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-7"/></>} />,
  money:    <SvgIcon d={<><circle cx="12" cy="12" r="9"/><path d="M9 9h4.5a2.5 2.5 0 0 1 0 5H9M9 14h4.5a2.5 2.5 0 0 1 0 5H8M12 6v3M12 15v3"/></>} />,
  globe:    <SvgIcon d={<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>} />,
  user:     <SvgIcon d={<><circle cx="12" cy="7" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/></>} />,
  bookmark: <SvgIcon d={<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>} />,
  pin:      <SvgIcon d={<><path d="M12 22s8-4.5 8-12a8 8 0 0 0-16 0c0 7.5 8 12 8 12z"/><circle cx="12" cy="10" r="3"/></>} />,
  star:     <SvgIcon d={<path d="M12 2l3 6.5 7 .8-5.2 4.9 1.4 7.1L12 17.8l-6.2 3.5 1.4-7.1L2 9.3l7-.8z"/>} />,
  more:     <SvgIcon d={<><circle cx="12" cy="6" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="18" r="1.4"/></>} />,
  filter:   <SvgIcon d={<path d="M3 6h18M6 12h12M10 18h4"/>} />,
  play:     <SvgIcon d={<path d="M6 4l14 8-14 8V4z"/>} />,
  bolt:     <SvgIcon d={<path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z"/>} />,
  command:  <SvgIcon d={<path d="M9 6a3 3 0 1 1-3 3h12a3 3 0 1 1-3-3v12a3 3 0 1 1 3-3H6a3 3 0 1 1 3 3V6z"/>} />,
  help:     <SvgIcon d={<><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5M12 17h.01"/></>} />,
  lock:     <SvgIcon d={<><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>} />,
  link:     <SvgIcon d={<><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>} />,
  download: <SvgIcon d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></>} />,
  refresh:  <SvgIcon d={<><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></>} />,
};

// ─── Fake placeholder image (gradient block) ────────────────────────────
const Placeholder = ({ w = "100%", h = 100, label, c1 = "#d8c9a8", c2 = "#a89572", r = 6, style = {} }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: `linear-gradient(135deg, ${c1}, ${c2})`,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "rgba(255,255,255,.85)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase",
    fontFamily: "Geist Mono, monospace",
    ...style,
  }}>{label}</div>
);

// ─── Common feature catalog (each direction names them differently) ────
const FEATURES = [
  { id: "match",   zh: "JD 匹配诊断", en: "JD Match",       desc: "贴一份 JD，给到逐条改写建议",   icon: IK.doc },
  { id: "resume",  zh: "简历优化",    en: "Resume Doctor",  desc: "面向具体岗位的 AI 改写与版式优化", icon: IK.spark },
  { id: "mock",    zh: "模拟面试",    en: "Mock Interview", desc: "语音 / 文字模拟，岗位定制题库",   icon: IK.mic },
  { id: "tracker", zh: "投递追踪",    en: "Tracker",        desc: "看板管理所有投递，节点提醒",     icon: IK.brief },
  { id: "salary",  zh: "薪资查询",    en: "Salary Lab",     desc: "校招 Offer 数据库 + 比较",      icon: IK.money },
  { id: "cover",   zh: "求职信生成",  en: "Cover Letter",   desc: "针对 JD 量身定制 cover letter",  icon: IK.send },
  { id: "career",  zh: "职业规划",    en: "Career Map",     desc: "技能盘点 + 三年路径建议",       icon: IK.globe },
  { id: "discover",zh: "岗位发现",    en: "Discover",       desc: "校招岗位每日更新 + 智能推荐",   icon: IK.search },
];

// ─── Mock streak / daily tasks / metrics ────────────────────────────────
const TODAY_PLAN = [
  { id: 1, type: "练习", title: "腾讯前端 · 算法 1 题",   duration: "20 min", done: true,  tag: "题库" },
  { id: 2, type: "投递", title: "字节跳动 · 客户端实习",   duration: "15 min", done: true,  tag: "投递" },
  { id: 3, type: "复盘", title: "美团二面 · 录音转写",     duration: "10 min", done: false, tag: "面试" },
  { id: 4, type: "学习", title: "Behavioral · STAR 法则", duration: "25 min", done: false, tag: "学习" },
  { id: 5, type: "更新", title: "简历 · 项目栏目润色",     duration: "30 min", done: false, tag: "简历" },
];

const FUNNEL = [
  { stage: "目标岗位", count: 24, last: 22, color: "#9aa5b1" },
  { stage: "已投递",   count: 18, last: 14, color: "#79a5e6" },
  { stage: "笔试通过", count: 11, last: 8,  color: "#79c8e6" },
  { stage: "一面",     count: 6,  last: 5,  color: "#a3e679" },
  { stage: "二面/终面",count: 3,  last: 3,  color: "#e6c179" },
  { stage: "Offer",   count: 1,  last: 0,  color: "#e67985" },
];

const MOCK_OFFERS = [
  { co: "字节跳动",   role: "前端工程师 · 校招",  city: "上海", base: 32, bonus: 6, stock: 8,  total: 46, level: "2-1" },
  { co: "腾讯",       role: "前端工程师 · 校招",  city: "深圳", base: 30, bonus: 4, stock: 6,  total: 40, level: "T1.2" },
  { co: "美团",       role: "前端工程师 · 校招",  city: "北京", base: 28, bonus: 4, stock: 4,  total: 36, level: "M3" },
  { co: "Shopee",     role: "前端工程师 · 校招",  city: "新加坡",base: 36, bonus: 5, stock: 5,  total: 46, level: "—"  },
  { co: "拼多多",     role: "前端工程师 · 校招",  city: "上海", base: 38, bonus: 8, stock: 0,  total: 46, level: "—"  },
];

const MOCK_JOBS = [
  { co: "字节跳动",  role: "前端工程师 · 校招",   loc: "上海·徐汇",   tags: ["React","TypeScript","实习转正"],          salary: "30–45k", match: 92 },
  { co: "腾讯 IEG", role: "客户端开发 · 校招",   loc: "深圳·南山",   tags: ["C++","游戏引擎"],                         salary: "28–40k", match: 78 },
  { co: "Shopee",   role: "Frontend · Grad",     loc: "Singapore",  tags: ["Next.js","English","海外"],               salary: "S$5.5–7k",match: 85 },
  { co: "美团",      role: "数据分析 · 校招",     loc: "北京·望京",   tags: ["SQL","Python","商业分析"],                salary: "25–35k", match: 64 },
];

const STREAK = { days: 17, goal: 30, hours: 142, applied: 18 };

Object.assign(window, {
  IK, SvgIcon, Placeholder, FEATURES, TODAY_PLAN, FUNNEL, MOCK_OFFERS, MOCK_JOBS, STREAK,
});
