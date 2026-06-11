import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${jakarta.variable} h-full`}>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
