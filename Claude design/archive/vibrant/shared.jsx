// shared.jsx — Icons (line, 18px default) + mock data for all screens.

const { useState, useEffect, useRef, useMemo } = React;

const SvgIcon = ({ d, size = 18, sw = 1.7 }) => (
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
  calendar: <SvgIcon d={<><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></>} />,
  doc:      <SvgIcon d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>} />,
  brief:    <SvgIcon d={<><rect x="2" y="7" width="20" height="14" rx="3"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>} />,
  msg:      <SvgIcon d={<path d="M21 12a8 8 0 1 1-3.4-6.5L21 4l-1.5 3.5A8 8 0 0 1 21 12z"/>} />,
  mic:      <SvgIcon d={<><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/></>} />,
  send:     <SvgIcon d={<><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></>} />,
  chart:    <SvgIcon d={<><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-7"/></>} />,
  money:    <SvgIcon d={<><circle cx="12" cy="12" r="9"/><path d="M9 9h4.5a2.5 2.5 0 0 1 0 5H9M9 14h4.5a2.5 2.5 0 0 1 0 5H8M12 6v3M12 15v3"/></>} />,
  globe:    <SvgIcon d={<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>} />,
  user:     <SvgIcon d={<><circle cx="12" cy="7" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/></>} />,
  bookmark: <SvgIcon d={<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>} />,
  heart:    <SvgIcon d={<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/>} />,
  star:     <SvgIcon d={<path d="M12 2l3 6.5 7 .8-5.2 4.9 1.4 7.1L12 17.8l-6.2 3.5 1.4-7.1L2 9.3l7-.8z"/>} />,
  more:     <SvgIcon d={<><circle cx="12" cy="6" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="18" r="1.4"/></>} />,
  filter:   <SvgIcon d={<path d="M3 6h18M6 12h12M10 18h4"/>} />,
  play:     <SvgIcon d={<path d="M6 4l14 8-14 8V4z"/>} />,
  pause:    <SvgIcon d={<><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></>} />,
  bolt:     <SvgIcon d={<path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z"/>} />,
  command:  <SvgIcon d={<path d="M9 6a3 3 0 1 1-3 3h12a3 3 0 1 1-3-3v12a3 3 0 1 1 3-3H6a3 3 0 1 1 3 3V6z"/>} />,
  help:     <SvgIcon d={<><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5M12 17h.01"/></>} />,
  lock:     <SvgIcon d={<><rect x="4" y="11" width="16" height="10" rx="3"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>} />,
  link:     <SvgIcon d={<><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>} />,
  download: <SvgIcon d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></>} />,
  refresh:  <SvgIcon d={<><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></>} />,
  pin:      <SvgIcon d={<><path d="M12 22s8-4.5 8-12a8 8 0 0 0-16 0c0 7.5 8 12 8 12z"/><circle cx="12" cy="10" r="3"/></>} />,
  chevR:    <SvgIcon d={<path d="M9 6l6 6-6 6"/>} />,
  ext:      <SvgIcon d={<><path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></>} />,
  trend:    <SvgIcon d={<><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></>} />,
  fire:     <SvgIcon d={<><path d="M12 2c2 3 5 5 5 9a5 5 0 0 1-10 0c0-1 0-2 1-3-1 2-3 4-3 7a7 7 0 0 0 14 0c0-6-7-10-7-13z"/></>} />,
  award:    <SvgIcon d={<><circle cx="12" cy="9" r="6"/><path d="M8.5 13L7 22l5-3 5 3-1.5-9"/></>} />,
};

// ─── Mock data ──────────────────────────────────────────────────────────
const COACH_TODAY = {
  date: "5 月 23 日 · 周五",
  countdown: "距离秋招正式批 还有 38 天",
  streak: { days: 17, goal: 30, week: 4, weekTotal: 5 },
  next: {
    co: "美团", role: "前端工程师 · 二面", when: "5 月 26 日 周一 14:00",
    daysLeft: 3, prep: 72,
    rounds: ["HR", "技术 1", "技术 + 主管", "HRBP"],
    activeRound: 2,
  },
  tasks: [
    { id: 1, title: "腾讯前端真题 · 二叉树 #8", dur: 20, done: true,  tag: "题库",  color: "indigo", why: "周三复盘里你卡在 LCA 类问题" },
    { id: 2, title: "字节客户端实习 · 投递",     dur: 15, done: true,  tag: "投递",  color: "blue",  why: "今天截止 · 内推码已生效" },
    { id: 3, title: "美团二面 · 录音转写 + 评估", dur: 10, done: false, tag: "面试",  color: "pink",  why: "昨天结束的 · 趁热复盘最有效" },
    { id: 4, title: "行为面试 · STAR 法则 ch.2", dur: 25, done: false, tag: "学习",  color: "orange",why: "美团二面会问 leadership" },
    { id: 5, title: "简历 · 项目栏目润色 3 处",   dur: 30, done: false, tag: "简历",  color: "green", why: "上次给的高优先级建议" },
  ],
};

const COACH_FEED = [
  {
    tag: "面经", tagColor: "blue", co: "字节跳动", role: "前端 · 校招 · 二面",
    when: "2 小时前", who: "小雨", whoAvatar: "yiyi", whoMeta: "复旦 · 已 offer",
    title: "字节二面 5 道题 + 一个 Tech Lead 陷阱",
    excerpt: "面试官明显在问 SSR 和 hydration —— 不要只准备 useState / useEffect。",
    likes: 234, comments: 48, color: "blue",
  },
  {
    tag: "热点", tagColor: "red", co: "拼多多", role: "校招前端",
    when: "5 小时前", who: "Coach 编辑部", whoAvatar: "coach", whoMeta: "实时整理",
    title: "PDD 校招前端 base 38–46k，但有一个 catch",
    excerpt: "我们核对了 32 位拿到 PDD offer 的同学。数字漂亮，但 996.5 你需要先知道。",
    likes: 1208, comments: 312, color: "red",
  },
  {
    tag: "Coach 自动复盘", tagColor: "purple", co: "美团", role: "前端 · 二面",
    when: "刚刚", who: "你的录音", whoAvatar: "ming", whoMeta: "仅你可见",
    title: "你刚结束的美团二面 —— 一份 8 分钟复盘已生成",
    excerpt: "面试官前 20 分钟在 dig 项目细节，后 30 分钟切到行为面试。你卡在「最难做的决策」上停顿了 17 秒。",
    likes: 0, comments: 0, color: "purple", isPersonal: true,
  },
  {
    tag: "故事", tagColor: "green", co: "Shopee", role: "海外校招",
    when: "昨天", who: "阿海", whoAvatar: "ahai", whoMeta: "北邮 · 已签",
    title: "我从被开 4.5k 谈到 7.2k 的全过程",
    excerpt: "你需要的不只是市场数据。你需要让 HR 觉得「你不签也不会受影响」。",
    likes: 892, comments: 187, color: "green",
  },
  {
    tag: "题库", tagColor: "orange", co: "—", role: "—",
    when: "今早 8:00", who: "Coach · 题库组", whoAvatar: "coach", whoMeta: "编辑精选",
    title: "本周高频 30 题 · 字节 / 美团 / 拼多多 5 月真问",
    excerpt: "我们抓取了 5 月 1 日至今的 142 篇面经，去重整理出复现率 ≥ 3 的高频题。",
    likes: 657, comments: 92, color: "orange",
  },
  {
    tag: "面经", tagColor: "blue", co: "腾讯 IEG", role: "客户端 · 校招",
    when: "今早 10:23", who: "林晓", whoAvatar: "linxiao", whoMeta: "复旦",
    title: "腾讯 IEG 客户端校招一面 · 比想象中考基础",
    excerpt: "原以为会问游戏引擎相关，结果整场都在挖 C++ 基础和系统设计基本盘。",
    likes: 312, comments: 67, color: "indigo",
  },
];

const COACH_INTERVIEWS = [
  { id: "iv-9", co: "美团",     role: "前端工程师", round: "二面 · 技术+主管", when: "昨天 16:00", dur: "62 min", quality: "B+", color: "orange",  insights: 3, blind: 2, transcript: true },
  { id: "iv-8", co: "字节跳动", role: "前端 实习",  round: "一面 · 技术",     when: "5/19",      dur: "55 min", quality: "A",  color: "green",   insights: 4, blind: 1, transcript: true },
  { id: "iv-7", co: "腾讯 IEG", role: "客户端",     round: "HR 面",          when: "5/16",      dur: "30 min", quality: "B",  color: "blue",    insights: 2, blind: 0, transcript: false },
  { id: "iv-6", co: "Shopee",   role: "Frontend",   round: "二面 · 英文",    when: "5/12",      dur: "45 min", quality: "B+", color: "mint",    insights: 3, blind: 2, transcript: true },
  { id: "iv-5", co: "拼多多",   role: "前端",      round: "一面 · 技术",     when: "5/08",      dur: "40 min", quality: "C+", color: "red",     insights: 5, blind: 4, transcript: false },
  { id: "iv-4", co: "网易",     role: "前端 · 实习", round: "笔试",           when: "5/05",      dur: "90 min", quality: "B-", color: "purple",  insights: 2, blind: 3, transcript: false },
];

const COACH_REVIEW = {
  co: "美团",
  role: "前端工程师 · 校招",
  round: "二面 · 技术 + 主管",
  when: "2026 / 5 / 22 · 16:00",
  dur: "62 min",
  interviewer: "L5 · 技术主管",
  recordedBy: "Coach 录音 · 自动转写 12,408 字",
  overall: "B+",
  overallNote: "整体稳健，行为面表现弱于技术，建议针对性补一节 STAR 课。",
  scores: [
    { name: "技术深度",      score: 86, color: "green" },
    { name: "清晰表达",      score: 78, color: "blue" },
    { name: "结构化思考",    score: 64, color: "yellow" },
    { name: "行为面试 STAR", score: 42, color: "red" },
    { name: "反问环节",      score: 58, color: "orange" },
    { name: "气场 · 自信",    score: 72, color: "mint" },
  ],
  questions: [
    {
      n: 1, time: "00:08 — 06:14", type: "技术 · React", topic: "React 18 渲染机制", diff: "中", tone: "good",
      q: "讲一讲你对 React 18 concurrent rendering 的理解。",
      you: "我答了三个层面：渲染调度、Suspense、过渡 transition。最后用项目举了例。",
      ai: "结构清楚，举例贴切。可加一句「这给我们带来的最大变化是…」帮面试官知道你不只懂概念。",
      better: "结构 +一句业务价值闭环。从「机制 → 例子 → 我们因此节省了什么」三步答。",
      gap: null,
    },
    {
      n: 2, time: "06:14 — 12:00", type: "技术 · SSR", topic: "SSR / Hydration", diff: "高", tone: "good",
      q: "项目里 hydration 慢，你怎么排查？",
      you: "讲了 selective hydration 和 Suspense streaming，但中间停顿了一次。",
      ai: "回答路径正确。建议提前准备 1 个具体数字（如：从 800ms 优化到 320ms），否则听起来像背书。",
      better: null,
      gap: null,
    },
    {
      n: 3, time: "12:00 — 18:30", type: "技术 · 性能", topic: "FCP 优化前 3 步", diff: "高", tone: "warn",
      q: "如果让你把一个 FCP 3 秒的页面优化到 1 秒内，前 3 个动作是什么？",
      you: "1) 关键资源 preload；2) 压缩 JS / 拆 bundle；3) ... 卡了一下，说了「也许 CDN」。",
      ai: "第 3 步不应该是「也许」。面试官在测你的优先级判断 —— 不熟的领域要承认+给出可验证的下一步。",
      better: "更好答法：「第 3 步我会先量 —— 用 Lighthouse 拿 Critical Path，再决定砍 JS 还是上 SSR。」",
      gap: { topic: "性能优化方法论", url: "题库 · #143" },
    },
    {
      n: 4, time: "18:30 — 30:42", type: "行为 · Lead", topic: "技术决策 + 推动他人", diff: "中", tone: "bad",
      q: "讲一个你做了技术决策但团队最初不认同的案例，最后怎么解决？",
      you: "停顿 17 秒。结构松散，没有 S-T-A-R，最后没说清楚 R（结果）。",
      ai: "这是这次面试的最大失分点。17 秒的沉默告诉对方「我没准备过这个问题」。",
      better: "提前准备 2-3 个可复用的 Lead 故事，每个都按 STAR 结构跑过一遍。Coach 已帮你起草 1 个候选。",
      gap: { topic: "行为面试 STAR 法则", url: "学习 · ch.2" },
    },
    {
      n: 5, time: "30:42 — 38:00", type: "技术 · 协作", topic: "跨团队推动", diff: "中", tone: "good",
      q: "你和后端 / 产品产生分歧时，怎么解决？举一个真实例子。",
      you: "讲了实习时和后端的一次 API 设计分歧，结构相对完整。",
      ai: "OK 的答案。如果加一句「这次让我学到下次怎么做」会更打动 senior。",
      better: null,
      gap: null,
    },
    {
      n: 6, time: "55:00 — 60:30", type: "反问", topic: "反问质量", diff: "—", tone: "warn",
      q: "你有什么想问我的吗？",
      you: "问了「团队氛围」和「日常工作节奏」。",
      ai: "这两个问题太常见了，听起来像没研究过这个组。",
      better: "针对面试官的技术背景反问 —— 比如：「我看到你们组最近在做 Edge SSR，目前最大挑战是 cold start 还是缓存一致性？」",
      gap: { topic: "高质量反问清单", url: "题库 · #88" },
    },
  ],
  prediction: {
    nextRound: "终面 · HRBP + 部门负责人",
    nextWhen: "通常二面后 3-7 天",
    likely: [
      { topic: "为什么选美团 / 为什么不选其他", pct: 88 },
      { topic: "未来 3 年规划 / 你想成为什么样的工程师", pct: 76 },
      { topic: "薪资期望 + offer 情况", pct: 92 },
      { topic: "1-2 道 culture-fit 假设题", pct: 64 },
    ],
  },
};

const COACH_PATTERNS = [
  { co: "字节跳动", color: "blue",   topics: [{ n: "React 18 / SSR", pct: 92 }, { n: "性能优化", pct: 78 }, { n: "Tech Lead", pct: 64 }] },
  { co: "美团",     color: "yellow", topics: [{ n: "工程化", pct: 86 }, { n: "C 端性能", pct: 72 }, { n: "行为 STAR", pct: 80 }] },
  { co: "腾讯",     color: "green",  topics: [{ n: "CSS / JS 基础", pct: 90 }, { n: "网络 / 浏览器", pct: 70 }, { n: "项目细节", pct: 80 }] },
  { co: "Shopee",   color: "orange", topics: [{ n: "英文表达", pct: 100 }, { n: "Next.js", pct: 60 }, { n: "国际化", pct: 50 }] },
];

const COACH_FUNNEL = [
  { stage: "目标岗位", count: 24, rate: 100 },
  { stage: "已投递",   count: 18, rate: 75 },
  { stage: "笔试通过", count: 11, rate: 61 },
  { stage: "一面",     count: 6,  rate: 55 },
  { stage: "二面/终面",count: 3,  rate: 50 },
  { stage: "Offer",   count: 1,  rate: 33 },
];

const COACH_MARKET = [
  { co: "字节跳动", color: "blue",   openings: 18, trend: +5, hot: true },
  { co: "拼多多",   color: "red",    openings: 12, trend: +3, hot: true },
  { co: "美团",     color: "yellow", openings: 9,  trend:  0, hot: false },
  { co: "腾讯 IEG", color: "green",  openings: 6,  trend: -1, hot: false },
  { co: "Shopee",   color: "mint",   openings: 4,  trend: +1, hot: true },
];

Object.assign(window, {
  IK,
  COACH_TODAY, COACH_FEED, COACH_INTERVIEWS, COACH_REVIEW,
  COACH_PATTERNS, COACH_FUNNEL, COACH_MARKET,
});
