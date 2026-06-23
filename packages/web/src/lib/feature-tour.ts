// 功能导览事件总线:派发后由 onboarding-tour 监听并启动对应的 mini-tour。
// 与 layout 既有的 coach:credit-refresh / coach:restart-tour 事件总线同款模式。
// 单一定义事件名 + payload 形状,避免在 modal/banner/tour 三处各写一遍字符串字面量出错。

export const LAUNCH_FEATURE_TOUR_EVENT = 'coach:launch-feature-tour';

export interface LaunchFeatureTourDetail {
  tourId: string;
}

// 派发功能导览启动事件(由公告 CTA 点击触发)。SSR 安全:无 window 时静默跳过。
export function launchFeatureTour(tourId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<LaunchFeatureTourDetail>(LAUNCH_FEATURE_TOUR_EVENT, {
      detail: { tourId },
    }),
  );
}

// ── 重看完整首登引导 ─────────────────────────────────────────────────────────
// 公告「新手引导按钮」走无迁移哨兵:把 cta_tour_id 设为此哨兵值,前端 CTA 点击时识别后
// 派发 coach:restart-tour(由 onboarding-tour 监听,从头重播完整导览),而非功能 mini-tour。
// 哨兵复用既有 cta_tour_id 自由字符串字段,不需新增数据库列。
export const RESTART_TOUR_SENTINEL = 'restart-tour';
export const RESTART_TOUR_EVENT = 'coach:restart-tour';

// 派发完整引导重看事件。SSR 安全:无 window 时静默跳过。
export function restartTour(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(RESTART_TOUR_EVENT));
}
