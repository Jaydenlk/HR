// Mock data for the Coach prototype.

// ─── Today's plan ──────────────────────────────────────────────────────
const COACH_TODAY = {
  date: "5 月 23 日 · 周五",
  countdown: "距离秋招正式批 还有 38 天",
  streak: { days: 17, goal: 30, week: 4, weekTotal: 5 },
  next: {
    co: "美团",
    role: "前端工程师 · 二面",
    when: "5 月 26 日 · 周一 · 14:00",
    daysLeft: 3,
    prep: 72,
    rounds: ["HR", "一面 · 技术", "二面 · 技术+主管", "终面 · HRBP"],
    activeRound: 2,
  },
  tasks: [
    { id: 1, type: "练习", title: "腾讯前端真题 · 二叉树第 8 题", dur: "20 min", done: true,  tag: "题库",  why: "周三复盘里你卡在 LCA 类问题" },
    { id: 2, type: "投递", title: "字节跳动 · 客户端开发实习",     dur: "15 min", done: true,  tag: "投递",  why: "今天截止 · 内推码已生效" },
    { id: 3, type: "复盘", title: "美团二面 · 录音转写 + 评估",     dur: "10 min", done: false, tag: "面试",  why: "昨天结束的 · 趁热复盘最有效" },
    { id: 4, type: "学习", title: "行为面试 · STAR 法则 ch.2",     dur: "25 min", done: false, tag: "学习",  why: "美团二面会问 leadership" },
    { id: 5, type: "更新", title: "简历 · 项目栏目润色 3 处",        dur: "30 min", done: false, tag: "简历",  why: "Coach 上次给的高优先级建议" },
  ],
};

// ─── Monthly feed: 时效内容 / 面经 / 编辑精选 ────────────────────────
const COACH_MONTHLY_HERO = {
  date: "2026 / 5 / 23",
  issue: "Vol. 24 · No. 5 · 校招特刊",
  headline: { pre: "投不出去的不是简历，是", em: "焦虑。" },
  deck: "我们看了 1,247 份应届生简历，发现最大的问题不是排版，也不是经验薄 —— 是它们读起来像同一个人写的：模糊、谦虚、安全。",
  reads: "12 min · 编辑部",
  hue: 28,
};

const COACH_FEED = [
  {
    tag: "面经 · 实时", co: "字节跳动", role: "前端 · 校招 · 二面", when: "2 小时前", who: "@小雨 · 已 offer",
    title: "字节二面问了我 5 道题 · React 18 / 性能 / 一道 Tech Lead",
    excerpt: "面试官明显在问 SSR 和 hydration —— 不要只准备 useState / useEffect。三个完整问题逐字奉上：",
    likes: 234, comments: 48, kind: "interview", hue: 215,
  },
  {
    tag: "热点 · 24h", co: "拼多多", role: "—", when: "5 小时前", who: "Coach 编辑部",
    title: "拼多多今年校招前端的真实 base：38–46k × 16，但有个 catch",
    excerpt: "我们核对了 32 位拿到 PDD offer 的同学。base 数字漂亮，但 996.5 + 强 OKR 的代价你需要先知道。",
    likes: 1208, comments: 312, kind: "hot", hue: 12,
  },
  {
    tag: "复盘 · 由你的复盘生成", co: "美团", role: "前端 · 二面 · 1 小时前", when: "刚刚",
    who: "Coach 自动生成 · 仅你可见",
    title: "你刚结束的美团二面 —— 一份 8 分钟复盘",
    excerpt: "面试官前 20 分钟在 dig 项目细节，后 30 分钟切到行为面试。你在「过去最难做的决策」上停顿了 17 秒 —— 那道题我们给你写了 3 个新答法。",
    likes: 0, comments: 0, kind: "personal", hue: 270,
  },
  {
    tag: "故事", co: "Shopee", role: "前端 · 已签", when: "昨天", who: "@阿远 · 北邮 · 2026 届",
    title: "海外校招怎么聊薪资 —— 我从被开 4.5k 谈到 7.2k 的全过程",
    excerpt: "你需要的不只是市场数据。你需要一个让 HR 觉得「你不签也不会受影响」的 BATNA。",
    likes: 892, comments: 187, kind: "story", hue: 152,
  },
  {
    tag: "题库 · 编辑精选", co: "—", role: "—", when: "今早 8:00", who: "Coach · 题库组",
    title: "本周高频 · 30 道 React 真题（含字节 / 美团 / 拼多多 5 月真问）",
    excerpt: "我们抓取了 5 月 1 日至今的 142 篇面经，去重整理出 30 道复现率 ≥ 3 次的高频题。",
    likes: 657, comments: 92, kind: "qbank", hue: 195,
  },
];

// ─── Single monthly article (面经详情) ───────────────────────────────
const COACH_ARTICLE = {
  tag: "面经 · 实时",
  co: "字节跳动",
  role: "前端工程师 · 校招 · 二面",
  date: "2026 / 5 / 23 · 14:08",
  author: "@小雨",
  authorMeta: "复旦大学 · 软件 · 2026 届 · 已拿 offer · 已脱敏",
  reads: "892 阅读 · 7 min",
  title: "字节前端二面 · 5 道题 + 一个 Tech Lead 陷阱",
  deck: "面试官明显在测试 SSR 和 hydration —— 不要只准备 useState / useEffect。",
  hue: 215,
  body: [
    "二面 60 分钟，前 35 分钟项目 + 技术深挖，后 25 分钟行为面试。给出的 5 道技术题里有 3 道直指 React 18 + SSR，明显是在考察 JD 里「Next.js / 服务端渲染」那一行。",
    "第一道是热身：让我从零讲一遍 React 18 的 concurrent rendering。我以为可以套话题，结果他追问「Suspense 边界为什么需要 fallback？」—— 这是 ≥ T2-2 才会问的细节。",
    "第二、三道连着问 SSR 和 hydration 的区别、什么情况下你会选 SSG。我项目里恰好用了 ISR，就顺手讲了。这里我察觉到面试官的眼睛亮了一下。",
  ],
  questions: [
    { n: "Q1", type: "技术 · React", text: "React 18 concurrent rendering 的核心机制？追问：Suspense 的 fallback 边界什么时候触发？", diff: "中", you: "答对约 80%，Suspense 那道没准备" },
    { n: "Q2", type: "技术 · SSR",  text: "SSR / SSG / ISR 各自适用场景？hydration 慢的项目你怎么排查？", diff: "高", you: "答得不错，举了项目里的实例" },
    { n: "Q3", type: "技术 · 性能", text: "如果让你把一个 FCP 3 秒的页面优化到 1 秒内，前 3 个动作是什么？", diff: "高", you: "1、2 答得清楚，第 3 个动作含糊了" },
    { n: "Q4", type: "行为 · Lead", text: "讲一个你做技术决策但团队不认同的案例。最后怎么解决？", diff: "中", you: "停顿 17 秒 · STAR 不完整 · ⚠️" },
    { n: "Q5", type: "反问环节", text: "你对我们组目前的技术债判断是什么？", diff: "—",  you: "蒙混过去了 · 没研究过这个组" },
  ],
  takeaways: [
    "字节资深技术官在二面阶段已经在用「Tech Lead 语言」筛选 —— 提前准备 1-2 个真实带过人 / 推动决策的小故事。",
    "SSR / hydration 是今年校招前端的 must-know，不只是 nice-to-have。",
    "反问环节不要再问福利和团队氛围 —— 提前研究目标组的技术栈和最近的 blog post，反问得有质量。",
  ],
};

// ─── Interview Review · 列表 ────────────────────────────────────────
const COACH_INTERVIEWS = [
  {
    id: "iv-9",  co: "美团",      role: "前端工程师", round: "二面 · 技术+主管", when: "昨天 16:00", dur: "62 min", state: "已复盘 87%", quality: "B+", flag: "warm",
    insights: 3, blind: 2, transcript: true,
  },
  {
    id: "iv-8",  co: "字节跳动",  role: "前端 · 实习",  round: "一面 · 技术",     when: "5/19",      dur: "55 min", state: "已复盘",      quality: "A",  flag: "good",
    insights: 4, blind: 1, transcript: true,
  },
  {
    id: "iv-7",  co: "腾讯 IEG",  role: "客户端",       round: "HR 面",          when: "5/16",       dur: "30 min", state: "已复盘",      quality: "B",  flag: "good",
    insights: 2, blind: 0, transcript: false,
  },
  {
    id: "iv-6",  co: "Shopee",    role: "Frontend",     round: "二面 · 英文",    when: "5/12",       dur: "45 min", state: "已复盘",      quality: "B+", flag: "good",
    insights: 3, blind: 2, transcript: true,
  },
  {
    id: "iv-5",  co: "拼多多",    role: "前端",        round: "一面",           when: "5/08",       dur: "40 min", state: "已复盘",      quality: "C+", flag: "bad",
    insights: 5, blind: 4, transcript: false,
  },
];

// Q types & how often each company asks them
const COACH_COMPANY_PATTERNS = [
  { co: "字节跳动", topics: [{ name: "React 18 / SSR", pct: 92 }, { name: "性能优化", pct: 78 }, { name: "Tech Lead", pct: 64 }, { name: "项目深挖", pct: 88 }] },
  { co: "美团",     topics: [{ name: "工程化", pct: 86 }, { name: "C 端性能", pct: 72 }, { name: "行为面试 STAR", pct: 80 }, { name: "系统设计", pct: 54 }] },
  { co: "腾讯",     topics: [{ name: "基础题（CSS / JS）", pct: 90 }, { name: "网络/浏览器", pct: 70 }, { name: "项目细节", pct: 80 }] },
  { co: "Shopee",   topics: [{ name: "英文表达", pct: 100 }, { name: "Next.js", pct: 60 }, { name: "国际化", pct: 50 }] },
];

// Single interview detail (the 美团 二面)
const COACH_REVIEW = {
  id: "iv-9",
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
    { name: "技术深度", score: 86, max: 100, tone: "good" },
    { name: "清晰表达", score: 78, max: 100, tone: "good" },
    { name: "结构化思考", score: 64, max: 100, tone: "warn" },
    { name: "行为面试 STAR", score: 42, max: 100, tone: "bad" },
    { name: "反问环节",     score: 58, max: 100, tone: "warn" },
    { name: "气场 / 自信",   score: 72, max: 100, tone: "good" },
  ],
  questions: [
    {
      n: 1, time: "00:08 — 06:14", type: "技术 · React", topic: "React 18 渲染机制", diff: "中",
      q: "讲一讲你对 React 18 concurrent rendering 的理解。",
      you: "我答了三个层面：渲染调度、Suspense、过渡 transition。最后用项目举了例。",
      ai: { tone: "good", text: "结构清楚，举例贴切。可加一句：「这给我们带来的最大变化是…」帮面试官知道你不只懂概念。" },
      better: "结构 +一句业务价值闭环。从「机制 → 例子 → 我们因此节省了什么」三步答。",
      gap: null,
    },
    {
      n: 2, time: "06:14 — 12:00", type: "技术 · SSR", topic: "SSR / Hydration", diff: "高",
      q: "项目里 hydration 慢，你怎么排查？",
      you: "讲了 selective hydration 和 Suspense streaming，但中间停顿了一次。",
      ai: { tone: "good", text: "回答路径正确。建议提前准备 1 个具体数字（如：从 800ms 优化到 320ms），否则听起来像背书。" },
      better: "把「项目里曾遇到的 800ms hydration 卡顿，通过引入 React 18 streaming + 拆 Suspense 边界后降至 320ms」作为 anchor 例。",
      gap: null,
    },
    {
      n: 3, time: "12:00 — 18:30", type: "技术 · 性能", topic: "FCP 优化前 3 步", diff: "高",
      q: "如果让你把一个 FCP 3 秒的页面优化到 1 秒内，你前 3 个动作是什么？",
      you: "1) 关键资源 preload；2) 压缩 JS / 拆 bundle；3) ... 这里卡了一下，说了「也许 CDN」。",
      ai: { tone: "warn", text: "第 3 步不应该是「也许」。面试官在测试你的优先级判断 —— 不熟的领域要承认+给出可验证的下一步。" },
      better: "更好答法：「第 3 步我会先量 —— 用 Lighthouse 拿 Critical Path，再决定砍 JS 还是上 SSR。这样优化 ROI 最高。」",
      gap: { topic: "性能优化方法论", url: "题库 · #143 · 性能优化的 4 步决策法" },
    },
    {
      n: 4, time: "18:30 — 30:42", type: "行为 · Lead", topic: "技术决策 + 推动他人", diff: "中",
      q: "讲一个你做了技术决策但团队最初不认同的案例，最后怎么解决？",
      you: "停顿 17 秒。结构松散，没有 S-T-A-R，最后没说清楚 R（结果）。",
      ai: { tone: "bad", text: "这是这次面试的最大失分点。17 秒的沉默告诉对方「我没准备过这个问题」。" },
      better: "提前准备 2-3 个可复用的 Lead 故事，每个都按 STAR 结构跑过一遍。我已经基于你之前贴的实习经历，帮你起草了 1 个候选答案。",
      gap: { topic: "行为面试 · STAR 法则", url: "学习 · 行为面试 ch.2" },
    },
    {
      n: 5, time: "30:42 — 38:00", type: "技术 · 协作", topic: "跨团队推动", diff: "中",
      q: "你和后端 / 产品产生分歧时，怎么解决？举一个真实例子。",
      you: "讲了实习时和后端的一次 API 设计分歧，结构相对完整。",
      ai: { tone: "good", text: "OK 的答案。如果加一句「这次让我学到下次怎么做」会更打动 senior。" },
      better: null,
      gap: null,
    },
    {
      n: 6, time: "55:00 — 60:30", type: "反问", topic: "反问质量", diff: "—",
      q: "你有什么想问我的吗？",
      you: "问了「团队氛围」和「日常工作节奏」。",
      ai: { tone: "warn", text: "这两个问题太常见了，听起来像没研究过这个组。" },
      better: "针对面试官的技术背景反问 —— 比如：「我看到你们组最近在做 Edge SSR 的实验，目前最大的挑战是 cold start 还是缓存一致性？」",
      gap: { topic: "反问环节 · 30 个高质量问题", url: "题库 · #88 · 高质量反问清单" },
    },
  ],
  prediction: {
    nextRound: "终面 · HRBP + 部门负责人",
    nextWhen: "通常二面后 3-7 天",
    likely: [
      { topic: "为什么选美团 / 为什么不选 XX", pct: 88 },
      { topic: "未来 3 年规划 / 你想成为什么样的工程师", pct: 76 },
      { topic: "薪资期望 + offer 情况", pct: 92 },
      { topic: "1-2 道 culture-fit 假设题", pct: 64 },
    ],
  },
};

// ─── Dashboard / Overview ──────────────────────────────────────────
const COACH_FUNNEL = [
  { stage: "目标岗位", count: 24, last: 22, color: "#9aa5b1" },
  { stage: "已投递",   count: 18, last: 14, color: "#79a5e6" },
  { stage: "笔试通过", count: 11, last: 8,  color: "#79c8e6" },
  { stage: "一面",     count: 6,  last: 5,  color: "#a3e679" },
  { stage: "二面/终面",count: 3,  last: 3,  color: "#e6c179" },
  { stage: "Offer",   count: 1,  last: 0,  color: "#e67985" },
];

const COACH_MARKET = {
  rolePct: { name: "前端工程师 · 校招", med: 38.4, p25: 28, p75: 48, p90: 62, deltaMonth: 4, you: 36, youP: 47 },
  hotCo: [
    { name: "字节跳动", openings: 18, trend: +5, hot: true },
    { name: "拼多多",   openings: 12, trend: +3, hot: true },
    { name: "美团",     openings: 9,  trend: 0 },
    { name: "腾讯 IEG", openings: 6,  trend: -1 },
    { name: "Shopee",   openings: 4,  trend: +1, hot: true },
  ],
};

Object.assign(window, {
  COACH_TODAY, COACH_MONTHLY_HERO, COACH_FEED, COACH_ARTICLE,
  COACH_INTERVIEWS, COACH_COMPANY_PATTERNS, COACH_REVIEW,
  COACH_FUNNEL, COACH_MARKET,
});
