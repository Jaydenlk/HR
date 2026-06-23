'use client';

// onboarding-nav-context.tsx — 引导期「真侧栏高亮覆盖」通道。
//
// 核心⑤同源:引导不再手搓侧栏副本,而是直接用真实 (main)/layout.tsx 的侧栏本体。
// 引导覆盖层只盖主内容区(left:248px),真侧栏照常露出。本 context 让引导按当前章节
// 把「视觉激活项」临时落到对应导航项上 —— 不真导航、不触发路由,只让真侧栏的滑动指示器
// 滑到该项。
//
// 零回归保证:guideActiveHref 默认 null,layout 的 isActive / 指示器测量在 null 时
// 完全走原 pathname 逻辑(行为与改动前逐字一致);仅当引导显式设置 href 时才覆盖。

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface OnboardingNavValue {
  /** 引导期视觉激活的导航 href;null = 不覆盖,真侧栏走 pathname 原逻辑。 */
  guideActiveHref: string | null;
  /** 引导设置/清除覆盖项(OnboardingTour 调)。 */
  setGuideActiveHref: (href: string | null) => void;
}

const OnboardingNavContext = createContext<OnboardingNavValue>({
  guideActiveHref: null,
  setGuideActiveHref: () => {},
});

export function OnboardingNavProvider({ children }: { children: ReactNode }) {
  const [guideActiveHref, setGuideActiveHref] = useState<string | null>(null);
  const value = useMemo(() => ({ guideActiveHref, setGuideActiveHref }), [guideActiveHref]);
  return <OnboardingNavContext.Provider value={value}>{children}</OnboardingNavContext.Provider>;
}

export function useOnboardingNav(): OnboardingNavValue {
  return useContext(OnboardingNavContext);
}
