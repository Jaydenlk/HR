// onboarding-data.tsx — 首登引导的虚构演示数据 + 合规标注。
//
// 合规铁律(对齐 onboarding-v31-copy.md):
//  - 全部演示内容为全新 AI 虚构 persona「陈思宁 / 北辰文化」,不沿用任何旧 persona、
//    更不使用任何旧测试或脱敏数据。
//  - 每处演示统一标注「AI 生成 / 仅供演示 / 非真实参考案例」(AITag 组件)。
//  - 改写 after 严禁包含 before 中不存在的数字/事实:「3 场」来自诊断已核实条目,可用;
//    「200%」已被压分删除,不用;不得凭空补充。
//
// 文案逐字取自定稿 onboarding-v31-copy.md 附 D「虚构演示数据完整清单」,不得改动。

import type {
  ProfessionStandardDimension,
  ConventionCheck,
  RewriteSuggestion,
  ChatMessage,
  MockQuestion,
  MockAnswer,
  InterviewQuestion,
  InterviewScore,
} from '@/lib/types';

/** 虚构 persona(陈思宁 / 北辰文化 / 内容运营 / 新闻传播 2026 届)。 */
export const DEMO_PERSONA = {
  name: '陈思宁',
  meta: '新闻传播 / 2026 届',
  version: 'v3',
  target: '北辰文化 / 内容运营',
  job: '内容运营 · 校招',
  initial: '宁',
} as const;

/** 辅助功能宫格 3×2(copy 屏 10),文案逐字用。 */
export const DEMO_AUX: readonly { id: string; icon: string; title: string; desc: string }[] = [
  { id: 'opp', icon: 'opportunities', title: '找对岗位', desc: '按匹配度筛,不用大海捞针' },
  { id: 'cover', icon: 'coverLetter', title: '写求职信', desc: '按岗位生成,顺手写内推话术' },
  { id: 'tracker', icon: 'tracker', title: '投递追踪', desc: '投了哪家到哪步了,不用 Excel 记' },
  { id: 'monthly', icon: 'monthly', title: '看月刊面经', desc: '每月行情 + 真实面经,面试前翻翻有底' },
  { id: 'salary', icon: 'salary', title: '查薪资', desc: '这个岗大概给多少,谈薪有数' },
  { id: 'route', icon: 'route', title: '学习路线', desc: '目标岗要补什么,排一条清单' },
] as const;

// ────────────────────────────────────────────────────────────────────────────
// 以下为「复用真组件」演示数据:形状逐一对齐线上真实组件的 props 契约
// (@/lib/types),让引导直接渲染产品里真正在用的组件,形式 100% 是真的。
// 仍是同一虚构 persona(陈思宁 / 北辰文化),仍带 AITag 合规标注;精选片段由
// surface 层用聚光/裁剪只露要讲的部分,不倾倒整份结果。
// ────────────────────────────────────────────────────────────────────────────

/** 校招诊断总分(喂真实 ScoreBadge):压分后的 64。 */
export const DEMO_DIAG_TOTAL = 64;

/** 校招诊断维度(喂真实 ProfessionDimensionCard):精选 2 条,1 强 1 缺。 */
export const DEMO_DIM: readonly ProfessionStandardDimension[] = [
  {
    key: 'content_ops',
    name: '内容运营能力',
    score: 16,
    max: 20,
    why: '有「北辰校园大使 / 3 场百人宣讲」的真实场次与规模,内容落地能力可验证。',
    evidenceFound: ['北辰校园大使', '3 场百人宣讲'],
    gap: '',
  },
  {
    key: 'data_driven',
    name: '数据驱动',
    score: 6,
    max: 20,
    why: '「活跃度提升 200%」无基数、无从多少到多少,无法核实,按校招标准压分。',
    evidenceFound: [],
    gap: '补一个可核实的真实数字:基期、口径、统计周期任取其一写清。',
  },
] as const;

/** 本土核查(喂真实 ConventionCheckRow):精选 1 条 warn。 */
export const DEMO_CONVENTION: readonly ConventionCheck[] = [
  {
    key: 'verb_accuracy',
    status: 'warn',
    note: '「负责社团新媒体日常运营」—— 简历写「负责」,原文是「参与」,口径需你确认。',
  },
] as const;

/** AI 改写示范(喂真实 SuggestionCard):before/after 只重组已有事实,不补新数字。 */
export const DEMO_SUGGESTION: RewriteSuggestion = {
  section: '校园经历',
  type: 'rewrite',
  priority: 'high',
  original: '负责社团新媒体日常运营',
  suggested: '参与社团新媒体运营,配合团队完成 3 场校园大使宣讲的线上宣发',
  reason: '只用了你写过的内容:把「负责」校正为原文的「参与」,并接上已核实的「3 场宣讲」,不新增任何数字。',
} as const;

/** 问 Coach 对话(喂真实 MessageBubble):一问一答,精选 2 条。 */
export const DEMO_CHAT_MESSAGES: readonly ChatMessage[] = [
  {
    id: 'demo-msg-1',
    conversation_id: 'demo',
    role: 'user',
    content: '下周有北辰文化内容运营面试',
    rich_card: null,
    tool_used: null,
    created_at: '2026-06-22T09:00:00.000Z',
  },
  {
    id: 'demo-msg-2',
    conversation_id: 'demo',
    role: 'assistant',
    content:
      '你简历里有一条标黄的,可以先改掉。面试前还能练一轮模拟,入口在侧栏「模拟面试」。',
    rich_card: { handoff_id: 'demo-handoff', target: 'mock', payload: { company: '北辰文化', role: '内容运营' }, status: 'proposed' },
    tool_used: null,
    created_at: '2026-06-22T09:00:04.000Z',
  },
] as const;

/** 模拟面试(喂真实 MockStage):1 道题,文字挡,未作答。 */
export const DEMO_MOCK_QUESTIONS: readonly MockQuestion[] = [
  {
    n: 1,
    type: '行为面',
    topic: '项目经历',
    difficulty: 'medium',
    question: '说一个你主导过的运营项目,你具体做了什么?',
    hint: '用 STAR 讲清楚:背景、你的任务、你做的动作、可核实的结果。',
  },
] as const;

export const DEMO_MOCK_ANSWERS: readonly MockAnswer[] = [] as const;

/** 面试复盘逐题(喂真实 QuestionCard):精选 2 题,1 亮点 1 可改。 */
export const DEMO_DEBRIEF_QUESTIONS: readonly InterviewQuestion[] = [
  {
    question: '介绍一下你做过的内容运营项目',
    tone: 'good',
    coach_assessment: 'Q2 项目经历答得清楚,有数据有细节,场次和规模都说到位了。',
    better_answer: '',
    knowledge_gaps: [],
  },
  {
    question: '你说「带 3 人」,具体怎么分工的?',
    tone: 'warn',
    coach_assessment: 'Q4 说「带 3 人」时分工没展开,被追问停了 8 秒,显得准备不足。',
    better_answer: '先一句话说清各自负责什么,再举一个你具体协调的瞬间,把「带」落到动作上。',
    knowledge_gaps: [],
  },
] as const;

/** 面试复盘能力分布(喂真实 ScoreRadar):精选 3 维。 */
export const DEMO_DEBRIEF_SCORES: readonly InterviewScore[] = [
  { name: '项目深度', score: 78 },
  { name: '表达条理', score: 64 },
  { name: '临场应变', score: 52 },
] as const;

/** 投递追踪看板(自绘演示卡,非 AI 功能):同一虚构 persona(陈思宁 / 北辰文化)的几条投递,
 *  铺在真实 6 阶段(想投/已投递/面试中/终面/Offer/已拒)上,呼应「面完一场要把进度记下来」。
 *  纯演示数据,不调任何接口、不渲染真实拖拽看板。 */
export const DEMO_TRACKER: readonly { id: string; company: string; role: string; stage: 'wishlist' | 'applied' | 'interview' | 'final' | 'offer' | 'rejected' }[] = [
  { id: 't1', company: '北辰文化', role: '内容运营', stage: 'interview' },
  { id: 't2', company: '海岸传媒', role: '新媒体运营', stage: 'applied' },
  { id: 't3', company: '青柚科技', role: '用户运营', stage: 'wishlist' },
  { id: 't4', company: '远山出版', role: '编辑', stage: 'final' },
] as const;
