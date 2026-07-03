import type { Application } from './types';

export type ApplicationStage = Application['stage'];

export interface StageMeta {
  id: ApplicationStage;
  label: string;
  /** 阶段强调色:看板圆点/统计卡片色块/时间线共用同一套取值。 */
  color: string;
}

// 投递阶段中文标签(M18 审计校准):此前 kanban-board/application-card/application-form/
// application-timeline/tracker-stats 五处硬编码 + onboarding-surfaces 第六处复制,
// 现收拢成唯一真相源,六处消费点全部改为 import 本常量。
export const STAGE_META: StageMeta[] = [
  { id: 'wishlist', label: '想投', color: 'var(--color-ink-4)' },
  { id: 'applied', label: '已投递', color: 'var(--color-brand)' },
  { id: 'interview', label: '面试中', color: 'var(--color-warn)' },
  { id: 'final', label: '终面', color: 'var(--au-violet)' },
  { id: 'offer', label: 'Offer', color: 'var(--color-success)' },
  { id: 'rejected', label: '已拒', color: 'var(--color-danger)' },
];

export function stageLabel(stage: string | null | undefined): string {
  if (!stage) return '创建';
  return STAGE_META.find((s) => s.id === stage)?.label ?? stage;
}
