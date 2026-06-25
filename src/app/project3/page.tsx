"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n";
import { Textarea } from "@/components/ui/textarea";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { callDecomposeAI, callTrdAI } from "@/lib/ai-client";
import type { DecomposeResult } from "@/lib/types";

/**
 * project3 演示页（智能对话流 Conversational Flow 版）。
 *
 * 视觉：深空底 + 顶部步骤进度条 + 对话气泡区 + 底部快捷 chip。
 * 把原本「填表 + 两个结果 Card」的流程，重构为一段引导式对话：
 * AI 主动推进，用户用快捷 chip 回应（输入需求 / 开始拆解 / 质量检查 / 生成 TRD），
 * 每一步的结果以 AI 气泡形式呈现。
 *
 * 业务逻辑完全不变：
 * - callDecomposeAI：模糊需求 → 结构化方案（失败自动本地规则兜底）；
 * - 质量检查：检测模糊用词、需求冲突、交付物（都来自 DecomposeResult）；
 * - callTrdAI：根据拆解结果生成 TRD 文档。
 * 仅把「表单 + Card」重构成「对话 + 气泡」。
 */

/** 对话流里的三种气泡类型：用户 / AI 文本 / AI 卡片（思考中状态在组件内单独渲染） */
type Bubble =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "bot"; text: ReactNode }
  | { id: number; kind: "card"; content: ReactNode };

/** 四个流程步骤 */
type Step = "input" | "decompose" | "check" | "trd";

export default function Project3Demo() {
  const { t } = useI18n();

  const [rawRequirement, setRawRequirement] = useState("");
  const [result, setResult] = useState<DecomposeResult | null>(null);
  const [usedAI, setUsedAI] = useState(true);
  const [loading, setLoading] = useState<null | "decompose" | "trd">(null);

  // 对话气泡列表
  const [bubbles, setBubbles] = useState<Bubble[]>([
    { id: 0, kind: "bot", text: "👋 你好！我是需求拆解助手。把客户一段模糊的需求发给我，我会帮你拆解成结构化方案、做质量检查，还能一键生成技术需求文档（TRD）。" },
  ]);
  // 当前到达的步骤（决定顶部进度条 + 可用的快捷 chip）
  const [step, setStep] = useState<Step>("input");
  const bubbleIdRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 气泡变化时自动滚到底
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [bubbles, loading]);

  // 按气泡类型分别 push，让 TS 能精确匹配每个变体的字段（text / content）。
  const pushUser = (text: string) => {
    setBubbles((prev) => [...prev, { id: bubbleIdRef.current++, kind: "user", text }]);
  };
  const pushBot = (text: ReactNode) => {
    setBubbles((prev) => [...prev, { id: bubbleIdRef.current++, kind: "bot", text }]);
  };
  const pushCard = (content: ReactNode) => {
    setBubbles((prev) => [...prev, { id: bubbleIdRef.current++, kind: "card", content }]);
  };

  /** 用户确认输入需求 → 调拆解接口 → AI 用气泡呈现拆解结果 */
  const handleDecompose = async () => {
    if (loading) return;
    const text = rawRequirement.trim();
    if (!text) return;

    pushUser(text);
    setLoading("decompose");
    setStep("decompose");

    try {
      const { result: decomposed, usedAI: ai } = await callDecomposeAI(text);
      setResult(decomposed);
      setUsedAI(ai);

      // AI 用一段文字概述，再用卡片呈现完整结构化结果
      pushBot(
        <>
          ✅ 拆解完成！研究目标：<b className="text-cyan-300">{decomposed.researchGoal}</b>；
          建议样本 <b className="text-violet-300">{decomposed.sampleSize}</b>；
          预计周期 <b className="text-pink-300">{decomposed.duration}</b>。完整方案见下方卡片：
        </>,
      );
      pushCard(<ResultCard r={decomposed} />);
      setStep("check");
    } finally {
      setLoading(null);
    }
  };

  /** 用户点「质量检查」→ AI 用气泡呈现模糊词 / 冲突 / 交付物 */
  const handleCheck = () => {
    if (!result) return;
    setStep("trd");
    const ok = result.fuzzyMarks.length === 0 && result.conflicts.length === 0;
    pushBot(
      ok ? (
        <>✅ 质量检查通过：需求清晰，无明显冲突。</>
      ) : (
        <>
          🔍 质量检查完成。发现{" "}
          <b className="text-yellow-300">{result.fuzzyMarks.length} 处模糊用词</b>、{" "}
          <b className="text-red-300">{result.conflicts.length} 处潜在冲突</b>，详见下方：
        </>
      ),
    );
    pushCard(<QualityCard r={result} />);
  };

  /** 用户点「生成 TRD」→ 调 TRD 接口 → AI 呈现文档 */
  const handleTrd = async () => {
    if (!result || loading) return;
    setLoading("trd");
    pushUser("📄 生成技术需求文档（TRD）");

    try {
      const { trd, usedAI: ai } = await callTrdAI(result);
      setUsedAI(ai);
      pushBot("📝 TRD 已生成，预览如下（可导出 Markdown / PDF，或同步到 Jira）：");
      pushCard(<TrdCard text={trd} />);
    } finally {
      setLoading(null);
    }
  };

  /** 重置：回到初始 */
  const handleReset = () => {
    setRawRequirement("");
    setResult(null);
    setStep("input");
    pushBot("🔄 已重置。把新的需求发给我吧。");
  };

  return (
    <div className="deep-space relative min-h-screen p-6 py-12">
      {/* 语言切换 */}
      <div className="absolute top-4 end-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto space-y-6">
        {/* 返回 + 标题区 */}
        <div className="text-center space-y-3">
          <Link
            href="/"
            className="inline-block text-xs text-cyan-300/80 hover:text-cyan-300 transition-colors"
          >
            ← {t("home_title")}
          </Link>
          <span className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-cyan-300/80">
            Smart Decompose Assistant
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t("project3_title")}</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">{t("project3_desc")}</p>
        </div>

        {/* ===== 顶部步骤进度条 ===== */}
        <Stepper step={step} labels={[t("flow_step1"), t("flow_step2"), t("flow_step3"), t("flow_step4")]} />

        {/* ===== 对话气泡区 ===== */}
        <div
          ref={scrollRef}
          className="min-h-[340px] max-h-[460px] overflow-y-auto space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4"
        >
          {bubbles.map((b) => (
            <BubbleView key={b.id} bubble={b} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/15 bg-white/[0.06] px-4 py-3 backdrop-blur animate-bubble-in">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animationDelay: "0s" }} />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animationDelay: "0.2s" }} />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          )}
        </div>

        {/* ===== 输入框（仅 input 步骤） ===== */}
        {step === "input" && (
          <div className="glass-panel space-y-3 p-4">
            <Textarea
              placeholder={t("requirement_placeholder")}
              value={rawRequirement}
              onChange={(e) => setRawRequirement(e.target.value)}
              className="min-h-[90px] bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/20"
            />
            <div className="flex items-center justify-between">
              {!usedAI && (
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-500">
                  {t("ai_local_mode")}
                </span>
              )}
              <button
                onClick={handleDecompose}
                disabled={loading === "decompose" || !rawRequirement.trim()}
                className="shimmer-btn ms-auto rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === "decompose" ? t("ai_loading") : `🧠 ${t("smart_decompose")}`}
              </button>
            </div>
          </div>
        )}

        {/* ===== 快捷操作 chip（根据步骤动态显示） ===== */}
        {step !== "input" && (
          <div className="flex flex-wrap items-center gap-2">
            {step === "check" && (
              <QuickChip onClick={handleCheck}>🔍 {t("quality_check")}</QuickChip>
            )}
            {result && (
              <QuickChip onClick={handleTrd} disabled={loading === "trd"}>
                {loading === "trd" ? t("ai_loading") : `📄 ${t("generate_trd")}`}
              </QuickChip>
            )}
            <QuickChip onClick={handleReset} tone="muted">🔄 {t("flow_step1")}</QuickChip>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * 对话流内部组件
 * ============================================================ */

/** 渲染单条气泡 */
function BubbleView({ bubble }: { bubble: Bubble }) {
  if (bubble.kind === "card") {
    return <div className="animate-bubble-in">{bubble.content}</div>;
  }

  if (bubble.kind === "user") {
    return (
      <div className="flex justify-end animate-bubble-in">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-violet-500 to-cyan-500 px-4 py-2.5 text-sm text-white whitespace-pre-wrap shadow-lg shadow-violet-500/20">
          {bubble.text}
        </div>
      </div>
    );
  }

  // bot 文本
  return (
    <div className="flex justify-start animate-bubble-in">
      <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-gray-100 whitespace-pre-wrap backdrop-blur">
        {bubble.text}
      </div>
    </div>
  );
}

/** 步骤进度条 */
function Stepper({ step, labels }: { step: Step; labels: string[] }) {
  const order: Step[] = ["input", "decompose", "check", "trd"];
  const currentIdx = order.indexOf(step);
  return (
    <div className="flex items-center gap-1">
      {labels.map((label, i) => {
        const done = i < currentIdx;
        const on = i === currentIdx;
        return (
          <div key={i} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-400 ${
                  done
                    ? "bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400/40"
                    : on
                      ? "bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-[0_0_0_4px_rgba(124,92,255,0.2)]"
                      : "bg-white/[0.04] text-gray-500 ring-1 ring-white/10"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] ${on ? "text-gray-200" : "text-gray-500"}`}>{label}</span>
            </div>
            {i < labels.length - 1 && (
              <div className="mx-2 mb-5 h-0.5 flex-1 rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${i < currentIdx ? "w-full bg-gradient-to-r from-violet-500 to-cyan-500" : "w-0"}`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** 快捷操作 chip */
function QuickChip({
  children,
  onClick,
  disabled,
  tone = "cyan",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "cyan" | "muted";
}) {
  const cls =
    tone === "muted"
      ? "border-white/10 bg-white/5 text-gray-400 hover:text-gray-200"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${cls}`}
    >
      {children}
    </button>
  );
}

/* ---- 结果卡片（深空玻璃风，呈现 DecomposeResult） ---- */
function ResultCard({ r }: { r: DecomposeResult }) {
  const { t } = useI18n();
  const rows: { k: string; v: string; tone?: "cyan" | "violet" | "pink" }[] = [
    { k: t("field_research_goal"), v: r.researchGoal, tone: "cyan" },
    { k: t("field_target_audience"), v: r.targetAudience, tone: "violet" },
    { k: t("field_research_scene"), v: r.researchScene },
    { k: t("field_research_type"), v: r.researchType },
    { k: t("field_depth"), v: r.depth },
    { k: t("field_sample_size"), v: r.sampleSize, tone: "pink" },
    { k: t("field_duration"), v: r.duration, tone: "pink" },
    { k: t("field_strategy"), v: r.strategy },
  ];
  const toneText: Record<string, string> = {
    cyan: "text-cyan-300",
    violet: "text-violet-300",
    pink: "text-pink-300",
  };
  return (
    <div className="glass-panel mx-auto max-w-[88%] space-y-2 p-4">
      <div className="section-label mb-1">{t("decompose_result")}</div>
      {rows.map((row, i) => (
        <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
          <span className="text-gray-400">{row.k}</span>
          <span className={`text-right font-medium ${row.tone ? toneText[row.tone] : "text-gray-100"}`}>{row.v}</span>
        </div>
      ))}
    </div>
  );
}

/* ---- 质量检查卡片 ---- */
function QualityCard({ r }: { r: DecomposeResult }) {
  const { t } = useI18n();
  const ok = r.fuzzyMarks.length === 0 && r.conflicts.length === 0;
  return (
    <div className="glass-panel mx-auto max-w-[88%] space-y-3 p-4">
      <div className="section-label">{t("quality_check")}</div>
      {ok ? (
        <div className="rounded-lg bg-green-400/10 px-3 py-3 text-center text-sm text-green-300">
          ✅ {t("no_conflict")}
        </div>
      ) : (
        <>
          {r.fuzzyMarks.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-medium text-yellow-300">{t("fuzzy_marks")}：</div>
              <div className="flex flex-wrap gap-1.5">
                {r.fuzzyMarks.map((m, i) => (
                  <span key={i} className="rounded-full bg-yellow-400/15 px-2.5 py-1 text-[11px] text-yellow-300">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
          {r.conflicts.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-red-300">{t("conflict_detection")}：</div>
              {r.conflicts.map((c, i) => (
                <div key={i} className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                  {c}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <div>
        <div className="mb-1.5 text-xs font-medium text-gray-300">{t("deliverables")}：</div>
        <div className="flex flex-wrap gap-1.5">
          {r.deliverables.map((d, i) => (
            <span key={i} className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] text-gray-200">
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- TRD 预览卡片 ---- */
function TrdCard({ text }: { text: string }) {
  const { t } = useI18n();
  return (
    <div className="glass-panel mx-auto max-w-[88%] space-y-3 p-4">
      <div className="section-label">{t("trd_preview")}</div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950/70 p-4 font-mono text-xs text-gray-200">
        {text}
      </pre>
      <div className="flex flex-wrap gap-2">
        <button className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs text-gray-200 transition-colors hover:bg-white/[0.12]">
          {t("export_md")}
        </button>
        <button className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs text-gray-200 transition-colors hover:bg-white/[0.12]">
          {t("export_pdf")}
        </button>
        <button className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs text-gray-200 transition-colors hover:bg-white/[0.12]">
          {t("sync_jira")}
        </button>
      </div>
    </div>
  );
}
