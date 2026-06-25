"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { TiltCard } from "@/components/TiltCard";
import { useI18n } from "@/i18n";

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
                  {t("project1_title").split("：")[1] ?? t("project1_title")}
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
                  {t("project3_title").split("：")[1] ?? t("project3_title")}
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
                <h3 className="text-lg font-semibold text-white">产品文档</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  完整的产品需求文档和软件需求规格说明书，包含用户故事、验收标准、技术架构。
                </p>
              </div>
              <a
                href="https://github.com/HannahZ-Mulan/quria-demo#产品文档"
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-6"
              >
                <Button
                  variant="outline"
                  className="w-full bg-pink-400/15 text-pink-300 border-pink-400/40 hover:bg-pink-400 hover:text-slate-950 transition-all"
                >
                  查看文档 →
                </Button>
              </a>
            </div>
          </TiltCard>
        </div>

        {/* 底部说明 */}
        <div className="text-center text-sm text-gray-500">
          基于对 Quria 产品的实际体验设计 · 2026
        </div>
      </div>
    </div>
  );
}
