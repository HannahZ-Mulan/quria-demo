import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { I18nProvider } from "@/i18n/index";  // 或者 @/i18n/index.tsx

// 加载 Inter 字体（本地 woff2 文件，不再依赖 Google CDN）。
// 用静态字重替代 variable：视觉一致，且本地构建/离线环境下也能正常打包。
// 涵盖 UI 实际用到的 5 个字重（400/500/600/700/800），统一声明 display: swap。
const inter = localFont({
  src: [
    { path: "./fonts/inter-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-latin-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/inter-latin-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/inter-latin-800.woff2", weight: "800", style: "normal" },
  ],
  display: "swap",
});

// 网页的元信息：浏览器标签页上显示的标题和描述
export const metadata: Metadata = {
  title: "Quria Product Optimization",
  description: "AI Interview System Optimization Demo",
};

// 视口设置：Next.js 16 App Router 不会自动注入 viewport meta，
// 必须显式导出，否则移动端会出现缩放/布局异常，构建时也会告警。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
