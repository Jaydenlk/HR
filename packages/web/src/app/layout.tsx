import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="zh-CN" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
