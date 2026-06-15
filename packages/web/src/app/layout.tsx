import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { MobileGate } from '@/components/ui/mobile-gate';
import './globals.css';

// 全站正文/标题主字体:Plus Jakarta Sans(变量字体,自托管,无外网请求)。
// variable 注入 CSS 变量 --font-jakarta,由 globals.css 的 --font-sans 引用并接中文回退栈。
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'Coach - 你的求职 AI 教练',
  description: '简历诊断、面试复盘、投递追踪和求职情报工作台',
};

// 防闪烁主题脚本:在 React 水合前同步执行,首帧前从 localStorage['coach_theme'] 取主题
// (没有则用 matchMedia 跟随系统),写到 documentElement 的 data-theme;dark 时同步加 .dark
// class(与 globals.css 的 @custom-variant dark 对齐,令 shadcn 组件走暗色)。
// CSS 的 html[data-theme=light|dark] 据此在首帧即生效——不会先亮后暗或 hydration mismatch。
// 默认跟随系统;localStorage 不可用时兜底暗色(Night Atelier 主色调)。
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('coach_theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var e=document.documentElement;e.dataset.theme=t;e.classList.toggle('dark',t==='dark');}catch(e){var el=document.documentElement;el.dataset.theme='dark';el.classList.add('dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${jakarta.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* 防闪烁主题脚本:同步内联,水合前设 html data-theme + .dark class */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="h-full antialiased">
        {/* 移动端访问拦截:视口 <768px 时全屏覆盖拦截,详见组件内注释 */}
        <MobileGate />
        {children}
      </body>
    </html>
  );
}
