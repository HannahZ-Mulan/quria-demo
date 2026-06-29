"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n";
import { Textarea } from "@/components/ui/textarea";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { callDecomposeAI, callTrdAI } from "@/lib/ai-client";
import { buildGanttPhases, deriveRisks } from "@/lib/rules-decompose";
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
    { id: 0, kind: "bot", text: t("p3_welcome") },
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
          ✅ {t("p3_decompose_done")
            .replace("{goal}", decomposed.researchGoal)
            .replace("{sample}", decomposed.sampleSize)
            .replace("{duration}", decomposed.duration)}
        </>,
      );
      pushCard(<ResultCard r={decomposed} />);
      pushCard(<ClarityScoreCard r={decomposed} />);
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
        <>✅ {t("p3_check_ok")}</>
      ) : (
        <>
          🔍 {t("p3_check_found")
            .replace("{fuzzy}", String(result.fuzzyMarks.length))
            .replace("{conflict}", String(result.conflicts.length))}
        </>
      ),
    );
    pushCard(<QualityCard r={result} />);
  };

  /** 用户点「生成 TRD」→ 调 TRD 接口 → AI 呈现文档 */
  const handleTrd = async () => {
    if (!result || loading) return;
    setLoading("trd");
    pushUser(`📄 ${t("p3_trd_request")}`);

    try {
      const { trd, usedAI: ai } = await callTrdAI(result);
      setUsedAI(ai);
      pushBot(`📝 ${t("p3_trd_intro")}`);
      pushCard(<TrdCard text={trd} r={result} />);
    } finally {
      setLoading(null);
    }
  };

  /** 重置：回到初始 */
  const handleReset = () => {
    setRawRequirement("");
    setResult(null);
    setStep("input");
    pushBot(`🔄 ${t("p3_reset_done")}`);
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
            <div className="flex flex-col items-center gap-1 sm:gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-400 sm:h-8 sm:w-8 sm:text-sm ${
                  done
                    ? "bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400/40"
                    : on
                      ? "bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-[0_0_0_4px_rgba(124,92,255,0.2)]"
                      : "bg-white/[0.04] text-gray-500 ring-1 ring-white/10"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[9px] text-center leading-tight sm:text-[10px] ${on ? "text-gray-200" : "text-gray-500"}`}>{label}</span>
            </div>
            {i < labels.length - 1 && (
              <div className="mx-1 mb-5 h-0.5 flex-1 rounded-full bg-white/10 sm:mx-2">
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
    { k: t("field_interview_duration"), v: r.interviewDuration },
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

/* ---- 需求清晰度评分卡（0-100 仪表 + 分段进度条 + 扣分明细） ---- */
function ClarityScoreCard({ r }: { r: DecomposeResult }) {
  const { t } = useI18n();
  // 兼容旧数据：缺省分数按 0 处理
  const score = r.clarityScore ?? 0;
  const notes = r.clarityNotes ?? [];

  // 分段着色 + 等级文案：清晰 / 待澄清 / 模糊
  const level = score >= 71 ? "clear" : score >= 41 ? "fair" : "vague";
  const tone: Record<string, { bar: string; num: string; label: string; chip: string }> = {
    clear: {
      bar: "bg-gradient-to-r from-emerald-400 to-cyan-400",
      num: "from-emerald-300 to-cyan-300",
      label: t("clarity_clear"),
      chip: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
    },
    fair: {
      bar: "bg-gradient-to-r from-amber-400 to-orange-400",
      num: "from-amber-300 to-orange-300",
      label: t("clarity_fair"),
      chip: "border-amber-400/40 bg-amber-400/10 text-amber-200",
    },
    vague: {
      bar: "bg-gradient-to-r from-rose-500 to-pink-500",
      num: "from-rose-300 to-pink-300",
      label: t("clarity_vague"),
      chip: "border-rose-400/40 bg-rose-400/10 text-rose-200",
    },
  };
  const cur = tone[level];

  return (
    <div className="glass-panel mx-auto max-w-[88%] space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div className="section-label">{t("clarity_title")}</div>
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${cur.chip}`}>
          {cur.label}
        </span>
      </div>

      {/* 大号分数 + 进度条 */}
      <div className="flex items-end gap-3">
        <span
          className={`stat-number bg-gradient-to-br ${cur.num} bg-clip-text text-4xl font-bold leading-none text-transparent`}
        >
          {score}
        </span>
        <span className="mb-0.5 text-xs text-gray-500">/ 100</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${cur.bar} transition-all`} style={{ width: `${score}%` }} />
      </div>

      {/* 扣分明细：解释分数来源（无扣分项时隐藏） */}
      {notes.length > 0 && (
        <div className="space-y-1 pt-1">
          <div className="text-xs font-medium text-gray-400">{t("clarity_breakdown")}</div>
          <ul className="space-y-1">
            {notes.map((n, i) => (
              <li key={i} className="rounded-md bg-white/[0.03] px-2.5 py-1 text-[11px] text-gray-300">
                • {n}
              </li>
            ))}
          </ul>
        </div>
      )}
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
function TrdCard({ text, r }: { text: string; r: DecomposeResult }) {
  const { t } = useI18n();
  // 复制按钮的反馈状态：复制成功后短暂显示「已复制」
  const [copied, setCopied] = useState(false);

  /** 下载 TRD 为 Markdown 文件（Blob + 临时下载链接） */
  const handleExportMd = () => {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "TRD.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /** 调用浏览器打印（用户可在此对话框里「另存为 PDF」） */
  const handleExportPdf = () => {
    window.print();
  };

  /** 复制 TRD 全文到剪贴板，并短暂显示成功反馈 */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板不可用时静默失败（部分浏览器需 HTTPS 或用户授权）
    }
  };

  return (
    <div className="glass-panel mx-auto max-w-[88%] space-y-3 p-4">
      <div className="section-label">{t("trd_preview")}</div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950/70 p-4 font-mono text-xs text-gray-200">
        {text}
      </pre>
      {/* 交付增强：项目时间线 + 风险矩阵 */}
      <GanttTimeline duration={r.duration} />
      <RiskMatrix r={r} />
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleExportMd}
          className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs text-gray-200 transition-colors hover:bg-white/[0.12]"
        >
          {t("export_md")}
        </button>
        <button
          onClick={handleExportPdf}
          className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs text-gray-200 transition-colors hover:bg-white/[0.12]"
        >
          {t("export_pdf")}
        </button>
        <button
          onClick={handleCopy}
          className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs text-gray-200 transition-colors hover:bg-white/[0.12]"
        >
          {copied ? `✅ ${t("copy_done")}` : t("sync_jira")}
        </button>
      </div>
    </div>
  );
}

/* ---- 项目时间线（Gantt 风格横向条） ---- */
function GanttTimeline({ duration }: { duration: string }) {
  const { t } = useI18n();
  const phases = buildGanttPhases(duration);
  const totalDays = phases.reduce((s, p) => s + p.days, 0);

  // 4 个阶段对应色板
  const colorBar: Record<string, string> = {
    cyan: "bg-cyan-400",
    violet: "bg-violet-400",
    pink: "bg-pink-400",
    amber: "bg-amber-400",
  };
  const colorText: Record<string, string> = {
    cyan: "text-cyan-300",
    violet: "text-violet-300",
    pink: "text-pink-300",
    amber: "text-amber-300",
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="section-label !mb-0">{t("gantt_title")}</span>
        <span className="text-[11px] text-gray-500">{t("phase_days").replace("{n}", String(totalDays))}</span>
      </div>
      {/* 横向时间条：各阶段按天数占比排列 */}
      <div className="flex h-6 w-full overflow-hidden rounded-md bg-white/5">
        {phases.map((p, i) => (
          <div
            key={i}
            className={`${colorBar[p.color]} flex items-center justify-center transition-all hover:brightness-125`}
            style={{ width: `${(p.days / totalDays) * 100}%` }}
            title={`${t(p.key)}：${p.days} ${t("phase_days").replace("{n}", "")}`}
          />
        ))}
      </div>
      {/* 图例：阶段名 + 天数 */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {phases.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px]">
            <span className={`inline-block h-2 w-2 rounded-sm ${colorBar[p.color]}`} />
            <span className="text-gray-300">{t(p.key)}</span>
            <span className={colorText[p.color]}>{p.days}d</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- 风险矩阵（影响 × 概率） ---- */
function RiskMatrix({ r }: { r: DecomposeResult }) {
  const { t } = useI18n();
  const risks = deriveRisks(r);

  // 3×3 矩阵格子：行=影响(high→low 自上而下)，列=概率(low→high 自左而右)
  // 格子颜色按「影响×概率」的严重度：高危红 / 中危橙 / 低危绿
  const cellTone = (impact: string, prob: string): string => {
    const severe = (impact === "high" ? 2 : impact === "medium" ? 1 : 0) + (prob === "high" ? 2 : prob === "medium" ? 1 : 0);
    if (severe >= 3) return "bg-rose-500/25 border-rose-400/50";
    if (severe >= 2) return "bg-amber-400/20 border-amber-400/40";
    return "bg-emerald-400/15 border-emerald-400/30";
  };

  const impactRows: { key: string; level: "high" | "medium" | "low" }[] = [
    { key: "risk_high", level: "high" },
    { key: "risk_medium", level: "medium" },
    { key: "risk_low", level: "low" },
  ];
  const probCols: { level: "low" | "medium" | "high" }[] = [
    { level: "low" },
    { level: "medium" },
    { level: "high" },
  ];

  // 把风险按 impact×probability 分桶
  const bucket = (impact: string, prob: string) =>
    risks.filter((rk) => rk.impact === impact && rk.probability === prob);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 section-label !mb-2">{t("risk_matrix_title")}</div>
      {risks.length === 0 ? (
        <div className="rounded-lg bg-emerald-400/10 px-3 py-3 text-center text-xs text-emerald-300">
          ✅ {t("risk_empty")}
        </div>
      ) : (
        <div className="flex gap-2">
          {/* 左侧：影响轴标签（移动端隐藏，避免占用宝贵的横向空间） */}
          <div className="hidden flex-col justify-between py-1 text-[10px] text-gray-500 sm:flex">
            <span className="rotate-180 [writing-mode:vertical-rl]">{t("risk_high")} ← → {t("risk_low")}</span>
          </div>
          {/* 矩阵主体 */}
          <div className="flex-1">
            <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
              {impactRows.map((row) =>
                probCols.map((col) => {
                  const items = bucket(row.level, col.level);
                  return (
                    <div
                      key={`${row.level}-${col.level}`}
                      className={`relative flex min-h-[3rem] items-center justify-center rounded-md border p-1 text-center ${cellTone(row.level, col.level)}`}
                      title={items.map((it) => it.text).join("\n")}
                    >
                      {items.length > 0 && (
                        <span className="text-[11px] font-semibold leading-tight text-white/90 line-clamp-2">
                          {items.length}
                        </span>
                      )}
                    </div>
                  );
                }),
              )}
            </div>
            {/* 底部：概率轴标签 */}
            <div className="mt-1.5 text-center text-[10px] text-gray-500">
              {t("risk_low")} ← → {t("risk_high")}
            </div>
          </div>
        </div>
      )}
      {/* 风险清单（点格子看详情的替代：直接列出） */}
      {risks.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-white/10 pt-2">
          {risks.map((rk, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-300">
              <span className={`mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                rk.impact === "high" ? "bg-rose-400" : rk.impact === "medium" ? "bg-amber-400" : "bg-emerald-400"
              }`} />
              <span>{rk.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
