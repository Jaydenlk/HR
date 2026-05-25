// Mock data for the resume diagnostic prototype.
// Realistic enough to feel like a real product, fictional enough to be safe.

const MOCK_JD = `资深前端工程师 · 字节跳动 · 上海

岗位职责
1. 负责核心产品 Web 端架构设计与开发，主导大型项目从 0 到 1 落地；
2. 推动前端工程化、性能优化、可观测性体系建设；
3. 与设计师、产品经理深度协作，对最终交付的用户体验负责；
4. 指导初中级工程师，参与团队技术决策与代码评审。

岗位要求
- 5 年以上前端开发经验，扎实的 JavaScript / TypeScript 功底；
- 精通 React 生态，熟悉 Next.js / 服务端渲染 / 边缘计算；
- 具备复杂应用架构能力，理解状态管理、模块化、Monorepo;
- 有大型 C 端产品性能优化、SEO、可访问性的实战经验;
- 有跨团队协作和 Tech Lead 经验者优先；
- 英文工作环境无障碍者优先。`;

const MOCK_RESUME = `张明 · 前端工程师
zhangming@email.com  ·  +86 138 0000 1234  ·  上海

工作经历

蚂蚁集团  · 高级前端工程师                       2022.03 - 至今
- 负责支付宝某业务线的前端开发工作
- 使用 React 重构了一个旧项目，提升了页面加载速度
- 参与团队的代码评审和新人培训
- 与产品和设计沟通需求

某互联网公司  · 前端工程师                       2019.07 - 2022.02
- 开发了多个 H5 活动页面
- 维护公司的组件库
- 学习并使用了 Vue、React 等框架

教育
华东师范大学  ·  计算机科学  ·  本科           2015 - 2019

技能
JavaScript, HTML, CSS, React, Vue, Git, Node.js`;

const MOCK_ANALYSIS = {
  score: 72,
  band: "良好",
  bandNote: "有亮点，但关键维度需补强",
  company: "字节跳动",
  role: "资深前端工程师",
  analyzedAt: "刚刚 · 用时 11s",

  dimensions: [
    { name: "经验匹配", pct: 86, tone: "good", note: "5 年 +，方向对口" },
    { name: "技能覆盖", pct: 78, tone: "good", note: "缺 Next.js、SSR 实战" },
    { name: "关键词命中", pct: 58, tone: "warn", note: "12 个核心词只命中 7 个" },
    { name: "成果量化", pct: 41, tone: "bad", note: "3 处描述无数据支撑" },
    { name: "Tech Lead 信号", pct: 35, tone: "bad", note: "未体现技术决策与 mentoring" },
  ],

  matchedKeywords: ["React", "TypeScript", "前端工程化", "组件库", "代码评审", "性能优化", "H5"],
  missingKeywords: ["Next.js", "服务端渲染 / SSR", "Monorepo", "可观测性", "Tech Lead", "可访问性 a11y"],

  suggestions: [
    {
      id: 1,
      severity: "high",
      title: "成果缺数据：第一条 bullet 几乎是空话",
      why: "JD 强调「主导从 0 到 1」、「性能优化实战」。招聘者会在 6 秒内扫读 bullets，没数字 = 没记忆点。",
      before: "使用 React 重构了一个旧项目，提升了页面加载速度",
      after: "主导旧版 jQuery 项目向 React 18 + SSR 迁移，FCP 从 3.2s 降至 0.9s（−72%），日活 PV 同步提升 18%。",
    },
    {
      id: 2,
      severity: "high",
      title: "Tech Lead 信号缺失",
      why: "JD 明确要求「跨团队协作和 Tech Lead 经验」，简历里只写「参与代码评审」远远不够，需要展示决策与影响力。",
      before: "参与团队的代码评审和新人培训",
      after: "牵头制定团队 React 编码规范与组件库治理方案；mentor 3 名工程师，2 人在 12 个月内晋升中级；主持每周技术分享。",
    },
    {
      id: 3,
      severity: "medium",
      title: "补一行关键词覆盖：Next.js / SSR / Monorepo",
      why: "ATS 关键词筛选会先于人眼。你做过类似的事（H5 + 组件库），但没用 JD 的词汇说出来。",
      before: "维护公司的组件库",
      after: "基于 Turborepo 搭建组件库 Monorepo，沉淀 40+ 业务组件；输出至 5 条业务线，节省重复开发约 600 工时/季度。",
    },
    {
      id: 4,
      severity: "medium",
      title: "顶部缺一段「专业摘要」",
      why: "资深岗 HR 期望在简历前 1/4 看到候选人定位与最大亮点；你目前直接进入工作经历。",
      before: "（无）",
      after: "6 年前端 / 3 年 Tech Lead 经验，专注大型 C 端 Web 应用的架构与性能。主导 2 个千万级 DAU 产品的 React 重构，FCP 平均优化 60%+。",
    },
    {
      id: 5,
      severity: "low",
      title: "技能列表过于扁平",
      why: "把所有技能列在一行无法传达深度。JD 区分了「精通」与「熟悉」，简历也应分层。",
      before: "JavaScript, HTML, CSS, React, Vue, Git, Node.js",
      after: "精通：TypeScript · React 18 · Next.js · Webpack/Vite\n熟悉：Node.js · Vue 3 · GraphQL · 单元测试（Vitest）\n了解：边缘计算 · WebAssembly",
    },
  ],

  chatHistory: [
    { role: "ai", text: "诊断已完成。综合 72 分 —— 经验对口是你的优势，但「成果量化」和「Tech Lead 信号」拖了后腿。要不要我先帮你改写最关键的那 3 条 bullet？" },
  ],

  suggestedQ: [
    "帮我重写整段「蚂蚁」经历",
    "字节面试官常问什么？",
    "我应该挑战这个岗位吗？",
    "给我一个 30 秒的自我介绍",
  ],

  history: [
    { date: "今天 14:22", co: "字节跳动", role: "资深前端工程师", score: 72 },
    { date: "昨天 21:08", co: "美团", role: "前端架构师", score: 64 },
    { date: "5/19 10:30", co: "Shopee", role: "Senior Frontend", score: 81 },
    { date: "5/16 16:45", co: "腾讯 IEG", role: "前端专家", score: 58 },
  ],
};

Object.assign(window, { MOCK_JD, MOCK_RESUME, MOCK_ANALYSIS });
