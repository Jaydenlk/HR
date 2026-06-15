// 校招启动清单 —— 单一真相源(single source of truth)。
// /today 的常驻清单(StarterChecklist,叠加真实 done 状态)与首次导览末尾的清单卡
// (OnboardingTour 的前瞻预览,不显示勾选)必须 import 同一份常量渲染:
// 条目文案/顺序/数量来自这里,编译期保证两处不再分叉。
// 任何文案/条目调整只改这里一处。
import type { Diagnosis } from '@/lib/types';

/** 启动清单条目定义:id(状态键 + React key) / label(展示文案) / href(点击落点)。 */
export interface StarterItem {
  id: string;
  label: string;
  href: string;
}

// 四步走通核心一圈:了解方向(注册已收集,预勾)→ 传简历 → 第一份诚实诊断(aha)→ 问 Coach。
// 顺序即用户路径;OnboardingTour 前瞻预览与 /today 真实清单共用此序。
export const STARTER_ITEMS: readonly StarterItem[] = [
  { id: 'direction', label: '已了解你的求职方向', href: '/me' },
  { id: 'resume', label: '传一份简历', href: '/resumes' },
  { id: 'diagnosis', label: '跑出第一份诚实诊断', href: '/diagnoses/campus' },
  { id: 'conversation', label: '问 Coach 一句', href: '/chat' },
] as const;

/**
 * 是否存在「至少一份真正跑完成功」的诊断。
 *
 * 防「假勾选」:GET /diagnoses 列表返回完整 Diagnosis 实体(无 DTO 投影),
 * 其 score 字段在后端 entity 上是 nullable —— 诊断只有在整条 AI 管线跑完后
 * 才会写入 total_score。超时/失败/孤立(无 score)的记录 score 为 null,
 * 不得据此勾选「跑出第一份诚实诊断」。
 *
 * 因此完成判定 = 列表中存在一条 score 为有限数值的记录,而非仅「有记录」。
 * 纯函数,便于单测与复用。
 */
export function hasCompletedDiagnosis(list: readonly Diagnosis[]): boolean {
  return list.some((d) => typeof d.score === 'number' && Number.isFinite(d.score));
}
