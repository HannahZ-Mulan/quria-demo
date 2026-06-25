import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n/index";  // 或者 @/i18n/index.tsx

// 加载 Inter 字体（只加载拉丁字符子集，加快速度）
const inter = Inter({ subsets: ["latin"] });

// 网页的元信息：浏览器标签页上显示的标题和描述
export const metadata: Metadata = {
  title: "Quria Product Optimization",
  description: "AI Interview System Optimization Demo",
};

/**
 * 整个应用的"根布局"。
 * Next.js 里每个页面都会被套在这个布局里。
 * 这里设置了 <html> 和 <body>，套上字体，并用 I18nProvider 包住所有页面，
 * 让每个页面都能用到多语言功能。
 *
 * @param children - 当前要渲染的页面内容
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" dir="ltr" suppressHydrationWarning>
      <body className={inter.className}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
