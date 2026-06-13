'use client';

import { useEffect, useState } from 'react';

// 移动端访问拦截(全站):视口宽度 < 768px 判为移动端,渲染全屏覆盖层挡住一切。
// 产品决定:移动端体验未达标就不放行,因此不提供"继续访问"逃生门。
// SSR 安全:isMobile 初始为 null(未判定),首次 render 返回 null,
// 挂载后在 useEffect 里读 window.innerWidth 才判定,避免服务端/客户端 hydration 不一致。

// 视口宽度阈值(px):小于该值判为移动端
const MOBILE_MAX_WIDTH = 768;

export function MobileGate() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < MOBILE_MAX_WIDTH);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 服务端渲染与未判定阶段(null)、桌面端(false)均不输出任何 DOM
  if (!isMobile) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647, // 全站最高层级,盖住所有页面与弹层
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        background: 'var(--color-bg)',
        padding: '32px',
        textAlign: 'center',
        animation: 'mobile-gate-fade-in 0.35s ease-out',
      }}
    >
      {/* 淡入动画(纯 CSS keyframes,仅本覆盖层使用,随组件挂载/卸载) */}
      <style>{`
        @keyframes mobile-gate-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Coach 品牌标(与 login 页一致:黑底圆角 + C 字标) */}
      <div
        style={{
          width: '56px',
          height: '56px',
          background: 'var(--color-ink)',
          borderRadius: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {/* Coach "C" glyph */}
        <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
          <path
            d="M18 7.5C16.8 5.1 14.1 3.5 11 3.5C7.1 3.5 4 6.6 4 10.5C4 14.4 7.1 17.5 11 17.5C14.1 17.5 16.8 15.9 18 13.5"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* 主文案 */}
      <div
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--color-ink)',
          letterSpacing: '-0.4px',
          lineHeight: 1.3,
        }}
      >
        移动端暂未适配
      </div>

      {/* 副文案 */}
      <p
        style={{
          fontSize: '14px',
          color: 'var(--color-ink-3)',
          lineHeight: 1.7,
          margin: 0,
        }}
      >
        建议使用电脑浏览器访问 Coach
        <br />
        移动端版本敬请期待
      </p>
    </div>
  );
}
