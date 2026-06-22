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

import type { ReactNode } from 'react';

/** 虚构 persona(陈思宁 / 北辰文化 / 内容运营 / 新闻传播 2026 届)。 */
export const DEMO_PERSONA = {
  name: '陈思宁',
  meta: '新闻传播 / 2026 届',
  version: 'v3',
  target: '北辰文化 / 内容运营',
  job: '内容运营 · 校招',
  initial: '宁',
} as const;

/** 诊断分数:初始 82 → 压分后 64(幅度 -18)。 */
export const DEMO_SCORE = { base: 82, after: 64, cut: 18 } as const;

/** 逐条体检(3 条),顺序对齐 copy 屏 3:已核实 / 需确认 / 无依据。 */
export interface DemoCheck {
  kind: 'ok' | 'warn' | 'cut';
  label: string;
  line: ReactNode;
  note: string;
  src: string;
}

export const DEMO_CHECKS: readonly DemoCheck[] = [
  {
    kind: 'ok',
    label: '已核实',
    line: <>「北辰校园大使 / 3 场百人宣讲」</>,
    note: '有场次有规模,数字对得上。',
    src: '原文 / 校园经历',
  },
  {
    kind: 'warn',
    label: '需确认',
    line: (
      <>
        「<b>负责</b>」社团新媒体日常运营
      </>
    ),
    note: '简历写「负责」,原文是「参与」,需要你确认。',
    src: '原文 / 第 2 段',
  },
  {
    kind: 'cut',
    label: '无依据 · 压分',
    line: (
      <>
        社群用户活跃度提升 <b>200%</b>
      </>
    ),
    note: '没有基数,从多少涨到多少没写 —— 这条直接扣掉。',
    src: '找不到出处',
  },
] as const;

/** 压分浮卡(拍2 peek):原文出处 + 划掉的数字。 */
export const DEMO_PEEK = {
  src: '原文 / 校园经历',
  prefix: '…社群用户活跃度提升 ',
  cut: '200%',
  note: '护栏 · 没有基数 → 压分',
} as const;

/** AI 改写演示:before 红删除线 → after 绿浮现。after 只重组已有事实。 */
export const DEMO_REWRITE = {
  before: '负责社团新媒体日常运营',
  after: '参与社团新媒体运营,配合团队完成 3 场校园大使宣讲的线上宣发',
  guardrail: '只用了你写过的内容',
} as const;

/** 问 Coach 演示对话。 */
export const DEMO_CHAT = {
  user: '下周有北辰文化内容运营面试',
  reply: '你简历里有一条标黄的,可以先改掉。面试前还能练一轮模拟,入口在侧栏「模拟面试」。',
} as const;

/** 行动卡(3 张可点),copy 屏 7。 */
export const DEMO_ACTCARDS: readonly { id: string; icon: string; label: string }[] = [
  { id: 'diagnose', icon: 'campus', label: '诊断简历' },
  { id: 'mock', icon: 'mock', label: '模拟一轮' },
  { id: 'rewrite', icon: 'spark', label: '改一版简历' },
] as const;

/** 模拟面试演示。 */
export const DEMO_MOCK = {
  question: '说一个你主导过的运营项目,你具体做了什么?',
} as const;

/** 面试复盘演示。 */
export const DEMO_DEBRIEF = {
  file: '北辰文化_一面_录音.m4a',
  dur: '21:38',
  good: 'Q2 项目经历答得清楚,有数据有细节',
  warn: 'Q4 说「带 3 人」时分工没展开,被追问停了 8 秒',
} as const;

/** 赠品宫格 3×2(copy 屏 10),文案逐字用。 */
export const DEMO_AUX: readonly { id: string; icon: string; title: string; desc: string }[] = [
  { id: 'opp', icon: 'opportunities', title: '找对岗位', desc: '按匹配度筛,不用大海捞针' },
  { id: 'cover', icon: 'coverLetter', title: '写求职信', desc: '按岗位生成,顺手写内推话术' },
  { id: 'tracker', icon: 'tracker', title: '投递追踪', desc: '投了哪家到哪步了,不用 Excel 记' },
  { id: 'monthly', icon: 'monthly', title: '看月刊面经', desc: '每月行情 + 真实面经,面试前翻翻有底' },
  { id: 'salary', icon: 'salary', title: '查薪资', desc: '这个岗大概给多少,谈薪有数' },
  { id: 'route', icon: 'route', title: '学习路线', desc: '目标岗要补什么,排一条清单' },
] as const;
