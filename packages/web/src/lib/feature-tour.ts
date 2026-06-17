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
