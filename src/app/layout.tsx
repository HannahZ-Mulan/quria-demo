import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n/index";  // 或者 @/i18n/index.tsx

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Quria Product Optimization",
  description: "AI Interview System Optimization Demo",
};

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
