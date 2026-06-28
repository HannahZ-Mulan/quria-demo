"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { TiltCard } from "@/components/TiltCard";
import { useI18n } from "@/i18n";

/**
 * 网站首页。
 * 展示三个卡片入口：project1（追问优化）、project3（需求拆解）、产品文档。
 * 用了 TiltCard 实现"鼠标移动时卡片 3D 倾斜"的炫酷效果。
 * 右上角放了语言切换按钮。
 */
export default function Home() {
  const { t } = useI18n();

  return (
    <div className="aurora-stage flex items-center justify-center p-6 py-16">
      {/* 语言切换 */}
      <div className="absolute top-4 end-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 max-w-5xl w-full space-y-12">
        {/* 标题区 */}
        <div className="text-center space-y-3">
          <span className="inline-block text-xs font-semibold tracking-[0.18em] uppercase text-cyan-300/90 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-4 py-1.5">
            Quria · Product Optimization
          </span>
          <h1 className="text-5xl font-bold tracking-tight text-white">
            {t("home_title").split(" ").slice(0, -1).join(" ") || t("home_title")}{" "}
            <span className="text-gradient-aurora">
              {t("home_title").split(" ").slice(-1)}
            </span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">{t("home_subtitle")}</p>
        </div>

        {/* 卡片区：方案 B · 3D 透视跟随 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <TiltCard className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-white/10 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-sm">
            <div className="flex h-full min-h-[280px] flex-col justify-between p-7">
              <div className="space-y-4">
                <span className="text-3xl">✨</span>
                <h3 className="text-lg font-semibold text-white">
                  {t("project1_title")}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {t("project1_desc")}
                </p>
              </div>
              <Link href="/project1" className="block mt-6">
                <Button className="w-full bg-cyan-400/15 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-400 hover:text-slate-950 transition-all">
                  {t("view_demo")} →
                </Button>
              </Link>
            </div>
          </TiltCard>

          <TiltCard
            className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-white/10 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-sm"
            glowColor="rgba(167, 139, 250, 0.30)"
          >
            <div className="flex h-full min-h-[280px] flex-col justify-between p-7">
              <div className="space-y-4">
                <span className="text-3xl">🧩</span>
                <h3 className="text-lg font-semibold text-white">
                  {t("project3_title")}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {t("project3_desc")}
                </p>
              </div>
              <Link href="/project3" className="block mt-6">
                <Button className="w-full bg-violet-400/15 text-violet-300 border border-violet-400/40 hover:bg-violet-400 hover:text-slate-950 transition-all">
                  {t("view_demo")} →
                </Button>
              </Link>
            </div>
          </TiltCard>

          <TiltCard
            className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-white/10 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-sm"
            glowColor="rgba(244, 114, 182, 0.30)"
          >
            <div className="flex h-full min-h-[280px] flex-col justify-between p-7">
              <div className="space-y-4">
                <span className="text-3xl">📄</span>
                <h3 className="text-lg font-semibold text-white">{t("docs_card_title")}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {t("docs_card_desc")}
                </p>
              </div>
              <div className="mt-6 space-y-3">
                {/* 主按钮：进站内文档（视觉焦点，大而醒目） */}
                <Link href="/docs" className="block">
                  <Button className="w-full bg-pink-400/90 text-slate-950 font-semibold hover:bg-pink-300 transition-all">
                    📄 {t("view_docs")} →
                  </Button>
                </Link>
                {/* 次要链接：GitHub（弱化成右下角小文字链接，避免与主按钮混淆误点） */}
                <a
                  href="https://github.com/HannahZ-Mulan/quria-demo#产品文档"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 transition-colors hover:text-gray-300"
                >
                  <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  {t("view_on_github")}
                </a>
              </div>
            </div>
          </TiltCard>
        </div>

        {/* 底部说明 */}
        <div className="text-center text-sm text-gray-500">
          {t("home_footer")}
        </div>
      </div>
    </div>
  );
}
