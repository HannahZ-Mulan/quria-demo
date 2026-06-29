"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n";
import { Textarea } from "@/components/ui/textarea";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ChatPanel } from "@/components/ChatPanel";
import { callFollowupAI } from "@/lib/ai-client";
import type { Mode, Device, QuestionResult } from "@/lib/types";

/**
 * project1 演示页（深空控制台 Cockpit 版）。
 *
 * 视觉：深空科技底（.deep-space）+ 双栏仪表盘。左栏输入参数，
 * 右栏实时结果。沿用首页方案 B 的霓虹配色与玻璃质感，与首页成套。
 *
 * 业务逻辑完全不变：单轮追问 / 多轮对话两种模式，模式(精简/标准/深度)
 * 与设备(PC/移动端)切换，生成后展示问题、字数、策略、压缩率，并保留
 * 最近 5 条历史。仅外壳样式从灰白 Card 重构为深空控制台。
 */
export default function Project1Demo() {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<"single" | "chat">("single");
  // 是否已向用户展示过「多轮追问」介绍卡。展示一次后不再自动弹出（避免打扰）。
  const [chatIntroSeen, setChatIntroSeen] = useState(false);
  // 切到多轮且尚未看过介绍 → 触发介绍卡
  const showChatIntro = tab === "chat" && !chatIntroSeen;

  const [answer, setAnswer] = useState("");
  const [mode, setMode] = useState<Mode>("标准");
  const [device, setDevice] = useState<Device>("PC");
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [usedAI, setUsedAI] = useState(true);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QuestionResult[]>([]);

  /**
   * 生成追问：调用 AI 接口（失败会自动用本地规则），
   * 把结果存起来显示，并加到历史记录里（最多保留 5 条）。
   */
  const generateQuestion = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data, usedAI: ai } = await callFollowupAI(answer, mode, device, lang);
      setResult(data);
      setUsedAI(ai);
      setHistory((prev) => [data, ...prev].slice(0, 5));
    } finally {
      setLoading(false);
    }
  };

  const suggestedLimit =
    answer.length <= 20 ? 30 : answer.length <= 100 ? 45 : 60;
  const compression = result
    ? Math.round((1 - result.wordCount / result.originalLength) * 100)
    : 0;

  return (
    <div className="deep-space relative min-h-screen p-6 py-12">
      {/* 语言切换 */}
      <div className="absolute top-4 end-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-8">
        {/* 返回 + 标题区 */}
        <div className="text-center space-y-3">
          <Link
            href="/"
            className="inline-block text-xs text-cyan-300/80 hover:text-cyan-300 transition-colors"
          >
            ← {t("home_title")}
          </Link>
          <span className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-cyan-300/80">
            AI Follow-up Cockpit
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {t("project1_title")}
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">{t("project1_desc")}</p>
        </div>

        {/* 模式切换分段控件。多轮追问 Tab 带高亮引导（未看过介绍时闪烁）。 */}
        <div className="mx-auto flex max-w-xs gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
          <TabBtn on={tab === "single"} onClick={() => setTab("single")}>
            {t("single_turn_mode")}
          </TabBtn>
          <TabBtn
            on={tab === "chat"}
            onClick={() => setTab("chat")}
            highlight={!chatIntroSeen}
          >
            {t("chat_mode")}
          </TabBtn>
        </div>

        {/* ===== 单轮追问：控制台双栏 ===== */}
        {tab === "single" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左栏：输入参数 */}
              <div className="glass-panel p-6 space-y-5">
                <div className="section-label">{t("answer_input")}</div>
                <Textarea
                  placeholder={t("answer_placeholder")}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="min-h-[110px] bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/20"
                />

                {/* 输入 / 建议字数 双仪表 */}
                <div className="grid grid-cols-2 gap-3">
                  <StatTile value={String(answer.length)} label={t("final_length")} sub={t("char_unit")} tone="cyan" />
                  <StatTile value={String(suggestedLimit)} label={t("suggested_limit")} sub={t("char_unit")} tone="violet" />
                </div>

                {/* 模式分段控件 */}
                <div>
                  <div className="section-label mb-2">{t("strategy")}</div>
                  <SegmentedControl
                    options={[
                      { value: "精简", label: t("mode_compact") },
                      { value: "标准", label: t("mode_standard") },
                      { value: "深度", label: t("mode_deep") },
                    ]}
                    value={mode}
                    onChange={(v) => setMode(v as Mode)}
                  />
                </div>

                {/* 设备分段控件 */}
                <div>
                  <div className="section-label mb-2">{t("device_section_label")}</div>
                  <SegmentedControl
                    options={[
                      { value: "PC", label: t("device_pc") },
                      { value: "移动端", label: t("device_mobile") },
                    ]}
                    value={device}
                    onChange={(v) => setDevice(v as Device)}
                  />
                </div>

                {/* 流光生成按钮 */}
                <button
                  onClick={generateQuestion}
                  disabled={loading}
                  className="shimmer-btn w-full rounded-xl py-3.5 font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? t("ai_loading") : `⚡ ${t("generate_question")}`}
                </button>
              </div>

              {/* 右栏：结果仪表 */}
              <div className="glass-panel p-6 space-y-5">
                <div className="section-label">{t("question_output")}</div>

                {result ? (
                  <div key={result.question} className="space-y-4 animate-cockpit-pop">
                    {/* 结果高亮卡 */}
                    <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-4">
                      <p className="text-lg font-medium text-cyan-100 leading-relaxed">
                        {result.question}
                      </p>
                    </div>

                    {/* 三联数字仪表 */}
                    <div className="grid grid-cols-3 gap-3">
                      <StatTile value={String(result.wordCount)} label={t("final_length")} sub={t("char_unit")} tone="cyan" big />
                      <StatTile value={String(result.originalLength)} label={t("original_length")} sub={t("char_unit")} tone="violet" big />
                      <StatTile value={`${compression}%`} label={t("compression_rate")} sub="" tone="pink" big />
                    </div>

                    {/* 策略行 */}
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                      <span className="text-xs text-gray-400">{t("strategy")}</span>
                      <span className="text-sm font-medium text-gray-100">{result.strategy}</span>
                    </div>

                    {/* 标签 */}
                    <div className="flex flex-wrap gap-2">
                      <Tag>{t("mode_label").replace("{m}", mode)}</Tag>
                      <Tag>{t("device_label").replace("{d}", device)}</Tag>
                      {!usedAI && <Tag tone="muted">{t("ai_local_mode")}</Tag>}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-gray-500 py-20 text-sm">
                    {t("generate_question_hint")}
                  </div>
                )}
              </div>
            </div>

            {/* 历史记录：左移高亮列表 */}
            {history.length > 0 && (
              <div className="glass-panel p-6">
                <div className="section-label mb-3">{t("recent_records")}</div>
                <div className="space-y-2">
                  {history.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-4 rounded-lg border-l-2 border-cyan-400/50 bg-white/[0.03] px-4 py-3 transition-all duration-300 hover:translate-x-1 hover:border-violet-400/70 hover:bg-white/[0.06]"
                    >
                      <span className="text-sm text-gray-200 truncate flex-1">{item.question}</span>
                      <div className="flex gap-2 text-xs text-gray-500 shrink-0">
                        <span className="stat-number font-semibold">{item.wordCount}{t("char_unit")}</span>
                        <span>·</span>
                        <span>{item.strategy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== 多轮对话 ===== */}
        {tab === "chat" && (
          <div className="relative space-y-3">
            {/* D. 常驻高亮摘要行：始终提醒这个模式的亮点 */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-2.5 text-xs">
              <span className="font-bold text-amber-300">✨ {t("chat_highlight_title")}</span>
              <span className="text-amber-200/80">{t("chat_highlight_desc")}</span>
            </div>

            <div className="glass-panel relative p-6">
              <ChatPanel />
              {/* B. 首次切换介绍卡：覆盖在面板上，引导体验 */}
              {showChatIntro && (
                <ChatIntroCard onStart={() => setChatIntroSeen(true)} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * 以下为本页内部用的深空风小组件
 * ============================================================ */

/** 数字仪表小块 */
function StatTile({
  value,
  label,
  sub,
  tone,
  big = false,
}: {
  value: string;
  label: string;
  sub?: string;
  tone: "cyan" | "violet" | "pink";
  big?: boolean;
}) {
  const toneClass =
    tone === "cyan"
      ? "stat-number"
      : tone === "violet"
        ? "text-violet-300"
        : "text-pink-300";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center transition-colors hover:bg-white/[0.07]">
      <div className={`${big ? "text-2xl" : "text-base"} font-bold ${toneClass}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">{label}</div>
      {sub ? <div className="text-[10px] text-gray-600">{sub}</div> : null}
    </div>
  );
}

/** 分段控件（模式 / 设备切换） */
function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              on
                ? "bg-violet-500/25 text-white shadow-[0_0_0_1px_rgba(124,92,255,0.4)]"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Tab 按钮。highlight=true 时（多轮追问未点击过）显示闪烁徽章 + 脉冲边框引导。 */
function TabBtn({
  on,
  onClick,
  highlight,
  children,
}: {
  on: boolean;
  onClick: () => void;
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
        on
          ? "bg-cyan-400/15 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.4)]"
          : highlight
            ? "text-amber-200 pulse-ring"
            : "text-gray-400 hover:text-gray-200"
      }`}
    >
      {children}
      {/* 闪烁徽章：未点击过多轮时显示 */}
      {highlight && !on && (
        <span className="absolute -top-1.5 -end-1.5 flex h-4 w-4 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-slate-950">
            ✨
          </span>
        </span>
      )}
    </button>
  );
}

/** 小标签 */
function Tag({ children, tone = "cyan" }: { children: ReactNode; tone?: "cyan" | "muted" }) {
  const cls =
    tone === "muted"
      ? "bg-white/5 text-gray-500 border-white/10"
      : "bg-cyan-400/10 text-cyan-300 border-cyan-400/30";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] ${cls}`}>
      {children}
    </span>
  );
}

/**
 * 多轮追问首次介绍卡。
 * 覆盖在 ChatPanel 上方，首次切到多轮模式时展示，用 3 个亮点引导用户主动体验。
 * 点「开始体验」后关闭（标记 chatIntroSeen），露出真实对话面板。
 */
function ChatIntroCard({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  const highlights = [
    { icon: "🎯", title: t("chat_feat1_title"), desc: t("chat_feat1_desc") },
    { icon: "📊", title: t("chat_feat2_title"), desc: t("chat_feat2_desc") },
    { icon: "🔁", title: t("chat_feat3_title"), desc: t("chat_feat3_desc") },
  ];
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="animate-cockpit-pop w-full max-w-md space-y-4 rounded-2xl border border-amber-400/30 bg-gradient-to-br from-slate-900/95 to-violet-950/40 p-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="text-3xl">✨</div>
          <h3 className="text-xl font-bold text-white">{t("chat_intro_title")}</h3>
          <p className="text-sm text-gray-300">{t("chat_intro_subtitle")}</p>
        </div>
        <div className="space-y-2.5">
          {highlights.map((h, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-white/[0.06] p-3.5">
              <span className="text-2xl leading-none">{h.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-bold text-amber-200">{h.title}</div>
                <div className="mt-0.5 text-sm leading-relaxed text-gray-200">{h.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onStart}
          className="shimmer-btn w-full rounded-xl py-3.5 text-base font-bold"
        >
          {t("chat_intro_start")} →
        </button>
        <p className="text-center text-xs text-gray-400">{t("chat_intro_hint")}</p>
      </div>
    </div>
  );
}
