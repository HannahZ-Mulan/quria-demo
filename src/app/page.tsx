"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n, Language } from "@/i18n";

const languages: { code: Language; label: string }[] = [
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "en", label: "English" },
  { code: "yue", label: "粵語" },
  { code: "ja", label: "日本語" },
];

export default function Home() {
  const { t, lang, setLang } = useI18n();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        {/* 语言切换 */}
        <div className="flex justify-center gap-2">
          {languages.map((l) => (
            <Button
              key={l.code}
              variant={lang === l.code ? "default" : "outline"}
              size="sm"
              onClick={() => setLang(l.code)}
            >
              {l.label}
            </Button>
          ))}
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">{t("home_title")}</h1>
          <p className="text-gray-600">{t("home_subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl text-blue-900">{t("project1_title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold text-lg">AI {t("project1_title").split("：")[1]}</h3>
              <p className="text-sm text-gray-600">{t("project1_desc")}</p>
              <Link href="/project1">
                <Button className="w-full">{t("view_demo")}</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl text-green-900">{t("project3_title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold text-lg">{t("project3_title").split("：")[1]}</h3>
              <p className="text-sm text-gray-600">{t("project3_desc")}</p>
              <Link href="/project3">
                <Button className="w-full">{t("view_demo")}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-gray-400">
          基于对 Quria 产品的实际体验设计 · 2026
        </div>
      </div>
    </div>
  );
}
