"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/**
 * 产品文档中心页。
 *
 * 老板无需跳转 GitHub，点进首页「产品文档」卡片即可在站内直接阅读
 * 项目 1 / 项目 3 的 PRD 与 SRS 共 4 份文档。
 *
 * - 布局：顶部 4 个 Tab（项目1 PRD / 项目1 SRS / 项目3 PRD / 项目3 SRS）
 *   + 右上角保留 GitHub 仓库外链按钮；
 * - 渲染：react-markdown + remark-gfm 富文本渲染（表格 / 任务列表 / 引用块等），
 *   文档原文放在 public/docs/ 下，客户端 fetch；
 * - 视觉沿用项目「深空科技风」（.deep-space 底盘 + .md-doc 排版样式）。
 */

/** GitHub 仓库锚点（产品文档章节），首页卡片改造前后共用同一份外链。 */
const GITHUB_DOCS_URL =
  "https://github.com/HannahZ-Mulan/quria-demo#产品文档";

/** 4 份文档的元信息：Tab 值、标题、public 下的文件路径。 */
const DOCS = [
  {
    value: "p1-prd",
    path: "/docs/PRD-project1-followup.md",
  },
  {
    value: "p1-srs",
    path: "/docs/SRS-project1-followup.md",
  },
  {
    value: "p3-prd",
    path: "/docs/PRD-project3-decompose.md",
  },
  {
    value: "p3-srs",
    path: "/docs/SRS-project3-decompose.md",
  },
] as const;

/** 单个文档视图：负责 fetch + 渲染 + 加载/错误态。 */
function DocView({ path, loadingLabel, errorLabel, githubLabel }: {
  path: string;
  loadingLabel: string;
  errorLabel: string;
  githubLabel: string;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  // 懒加载：Tabs 切换到本 Tab 时，TabsContent 才挂载并触发此 effect，
  // 因此只在真正查看某文档时才 fetch，不会一次性拉取全部 4 份。
  useEffect(() => {
    let cancelled = false;
    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (error) {
    return (
      <div className="glass-panel flex flex-col items-center gap-3 p-10 text-center">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm text-gray-400">{errorLabel}</p>
        <a
          href={GITHUB_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-cyan-300 hover:text-cyan-200 transition-colors"
        >
          {githubLabel} →
        </a>
      </div>
    );
  }

  if (content === null) {
    return (
      <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-500">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animationDelay: "0s" }} />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animationDelay: "0.2s" }} />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animationDelay: "0.4s" }} />
        <span>{loadingLabel}</span>
      </div>
    );
  }

  return (
    <article className="md-doc">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}

export default function DocsPage() {
  const { t } = useI18n();

  return (
    <div className="deep-space relative min-h-screen p-6 py-12">
      {/* 语言切换 */}
      <div className="absolute top-4 end-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        {/* 返回 + 标题区 */}
        <div className="text-center space-y-3">
          <Link
            href="/"
            className="inline-block text-xs text-cyan-300/80 hover:text-cyan-300 transition-colors"
          >
            ← {t("home_title")}
          </Link>
          <span className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-pink-300/80">
            Product Documentation
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {t("docs_card_title")}
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">{t("docs_card_desc")}</p>
        </div>

        {/* GitHub 外链（保留跳转能力） */}
        <div className="flex justify-center">
          <a
            href={GITHUB_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-pink-400/40 bg-pink-400/10 px-5 py-2 text-sm font-medium text-pink-300 transition-all hover:bg-pink-400 hover:text-slate-950"
          >
            <svg
              viewBox="0 0 16 16"
              width="16"
              height="16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {t("view_on_github")} →
          </a>
        </div>

        {/* 4 个模块 Tab 切换 */}
        <Tabs defaultValue="p1-prd" className="w-full">
          <div className="flex justify-center">
            <TabsList className="flex-wrap">
              <TabsTrigger value="p1-prd">
                {t("project1_title").split("：")[1] ?? t("project1_title")} · PRD
              </TabsTrigger>
              <TabsTrigger value="p1-srs">
                {t("project1_title").split("：")[1] ?? t("project1_title")} · SRS
              </TabsTrigger>
              <TabsTrigger value="p3-prd">
                {t("project3_title").split("：")[1] ?? t("project3_title")} · PRD
              </TabsTrigger>
              <TabsTrigger value="p3-srs">
                {t("project3_title").split("：")[1] ?? t("project3_title")} · SRS
              </TabsTrigger>
            </TabsList>
          </div>

          {DOCS.map((d) => (
            <TabsContent key={d.value} value={d.value}>
              <div className="glass-panel mt-4 p-6 md:p-8 max-h-[70vh] overflow-y-auto">
                <DocView
                  path={d.path}
                  loadingLabel={t("docs_loading")}
                  errorLabel={t("docs_error")}
                  githubLabel={t("view_on_github")}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
