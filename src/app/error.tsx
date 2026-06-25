"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@/i18n";

/**
 * 全局错误边界（Next.js App Router 约定文件 error.tsx）。
 *
 * 任何子路由树抛出未捕获的运行时错误时，React 会卸载出错的那段 UI，
 * 改用这里的兜底界面渲染——避免整页白屏。
 *
 * Next.js 16 的约定：接收 `error`（错误对象）和 `unstable_retry`
 *（重试函数，重新拉取并渲染出错的 segment）。
 *
 * @param error - 抛出的错误对象（带可选 digest 摘要）
 * @param unstable_retry - 重试渲染该 segment 的函数
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const { t } = useI18n();

  // 错误变化时打到控制台，便于排查（生产可换成上报服务）
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="deep-space relative flex min-h-screen items-center justify-center p-6">
      <div className="glass-panel relative z-10 w-full max-w-md space-y-5 p-8 text-center">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-2xl font-bold text-white">{t("error_title")}</h1>
        <p className="text-sm leading-relaxed text-gray-400">{t("error_desc")}</p>

        {/* 错误摘要（如有），方便调试 */}
        {error.digest && (
          <p className="font-mono text-[11px] text-gray-600">{error.digest}</p>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={unstable_retry}
            className="shimmer-btn w-full rounded-xl py-3 font-bold"
          >
            {t("error_retry")}
          </button>
          <Link
            href="/"
            className="block rounded-xl border border-white/15 bg-white/[0.06] py-3 text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.12]"
          >
            {t("error_back_home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
