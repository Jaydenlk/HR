// 主页发现区 —— 功能卡数据单一真相源。文案只改这里。
// 精选 6 张卡(做减法),优先把没被看见的 ASR / TTS 能力排前。
// 任何顺序 / 文案 / 路由调整只改这里一处。
import type { LucideIcon } from 'lucide-react';
import { Mic, Play, GraduationCap, Target, Send, BookOpen } from 'lucide-react';

/** 发现区单张卡的数据结构。 */
export interface DiscoverItem {
  /** 唯一标识,作为 React key。 */
  id: string;
  /** lucide-react 图标组件。 */
  icon: LucideIcon;
  /** 卡片标题:4-8 字,讲能做到的事。 */
  title: string;
  /** 一句话价值说明:≤30 字,不用术语。 */
  desc: string;
  /** 点击直达路由(支持 query 参数表达「带意图直达」)。 */
  href: string;
  /** 可选角标:Beta 表示实验性功能,New 表示新上线能力。 */
  badge?: 'Beta' | 'New';
}

// 顺序即优先级:ASR / TTS 排前两位,确保新用户第一眼看到最易被忽视的能力。
export const DISCOVER_ITEMS: readonly DiscoverItem[] = [
  {
    id: 'asr',
    icon: Mic,
    title: '录音变复盘',
    desc: '把面试录音传上来,自动转文字 + 逐题点评',
    href: '/debrief?upload=1',
    badge: 'Beta',
  },
  {
    id: 'voice',
    icon: Play,
    title: '开口练面试',
    desc: '面试官念题给你听,你开口答,像真面试',
    href: '/mock?mode=voice',
    badge: 'New',
  },
  {
    id: 'campus',
    icon: GraduationCap,
    title: '简历做诊断',
    desc: '按真实校招标准逐条诊断,不够格当场说',
    href: '/diagnoses/campus',
  },
  {
    id: 'opp',
    icon: Target,
    title: '找对岗位',
    desc: '按匹配度筛出机会,不用大海捞针',
    href: '/opportunities',
  },
  {
    id: 'cover',
    icon: Send,
    title: '写求职信',
    desc: '一键生成贴合岗位的求职信和内推话术',
    href: '/cover-letter',
  },
  {
    id: 'paper',
    icon: BookOpen,
    title: '看月刊面经',
    desc: '每月行情 + 真实面经,攒谈资看趋势',
    href: '/newspaper',
  },
] as const;
