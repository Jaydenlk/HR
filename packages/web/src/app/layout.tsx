import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Coach — 你的求职 AI 教练',
  description: '简历诊断、面试复盘、求职全程陪伴',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${plusJakartaSans.className} h-full`}>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
