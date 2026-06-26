"use client";

import { useState, useRef, useEffect, KeyboardEvent, useMemo } from "react";
import { useI18n } from "@/i18n";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { callChatAI } from "@/lib/ai-client";
import { analyzeRhythm } from "@/lib/rhythm-analyzer";
import { analyzeDepth } from "@/lib/depth-analyzer";
import type { ChatMessage, RhythmReport, DepthReport, DepthLevel } from "@/lib/types";

/**
 * project1 的"多轮对话"面板（深空控制台风格版）。
 *
 * AI（通过 /api/project1/chat 接口）扮演专业访谈员，每次只问一个开放式追问，
 * 并且能记住之前的对话内容。如果 AI 不可用，会静默改用本地规则，用户不会看到报错。
 *
 * 功能：显示聊天气泡、自动滚到底部、按 Ctrl/Cmd+Enter 发送、显示"本地模式"标签。
 * 外观为深空风：用户气泡用紫青渐变、AI 气泡用玻璃质感、"打字中"三点跳动。
 *
 * 底部附带「访谈节奏面板」（Rhythm Panel）：把受访者的参与度趋势、疲劳度
 * 可视化——这是 Quria 相对国际竞品的差异化能力。
 */
export function ChatPanel() {
  const { t, lang } = useI18n();
  // 对话消息列表（用户和 AI 来回的内容，带 ts 时间戳用于节奏分析）
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // 输入框里当前的文字
  const [input, setInput] = useState("");
  // 是否正在等待 AI 回复（加载中）
  const [loading, setLoading] = useState(false);
  // 上一次回复是否真的用了 AI（false 时显示"本地模式"小标签）
  const [usedAI, setUsedAI] = useState(true);
  // 用来引用聊天滚动区域，方便自动滚到底部
  const scrollRef = useRef<HTMLDivElement>(null);

  // 当消息变化或加载状态变化时，把聊天区自动滚动到最底部
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // 节奏报告：消息一变就重算（纯前端，开销极小）。
  const rhythm: RhythmReport = useMemo(() => analyzeRhythm(messages), [messages]);

  // 追问深度报告：同样纯前端，扫描每轮 AI 追问判定的漏斗层级。
  // 与节奏面板配成「访谈健康度双仪表」：左看受访者状态、右看 AI 下钻深度。
  const depth: DepthReport = useMemo(() => analyzeDepth(messages), [messages]);

  /**
   * 发送当前输入框里的消息。
   * 把用户消息加进列表（打上时间戳）→ 调用 AI 接口拿到回复 → 把回复也加进列表。
   * 空消息或正在加载时不发送。
   */
  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const now = Date.now();
    // 用户这条消息相对 AI 上一条的响应间隔，由 analyzeRhythm 用 ts 差值算出。
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed, ts: now },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      // 把当前疲劳度传给 AI——高疲劳时 AI 会自动缩短追问、换轻松话题。
      // 这让「节奏面板」的检测不只是展示，而是真正改变访谈行为，形成闭环。
      const { reply, usedAI: ai } = await callChatAI(
        nextMessages,
        lang,
        rhythm.fatigueScore
      );
      const replyTs = Date.now();
      setMessages([...nextMessages, { role: "assistant", content: reply, ts: replyTs }]);
      setUsedAI(ai);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 键盘事件处理：按 Ctrl/Cmd + Enter 发送消息，普通回车换行。
   */
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd+Enter to send; plain Enter inserts newline.
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="space-y-4">
      {/* 聊天滚动区：深空底 */}
      <div
        ref={scrollRef}
        className="min-h-[320px] max-h-[440px] overflow-y-auto space-y-3 p-4 rounded-xl border border-white/10 bg-white/[0.02]"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-16 text-sm">
            {t("chat_placeholder")}
          </div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex animate-bubble-in ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "user" ? (
                // 用户气泡：紫青渐变
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-violet-500 to-cyan-500 px-4 py-2.5 text-sm text-white whitespace-pre-wrap shadow-lg shadow-violet-500/20">
                  {m.content}
                </div>
              ) : (
                // AI 气泡：玻璃质感
                <div className="max-w-[80%] rounded-2xl rounded-bl-md border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-gray-100 whitespace-pre-wrap backdrop-blur">
                  {m.content}
                </div>
              )}
            </div>
          ))
        )}

        {/* AI 打字中：三点跳动 */}
        {loading && (
          <div className="flex justify-start animate-bubble-in">
            <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/15 bg-white/[0.06] px-4 py-3 backdrop-blur">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animationDelay: "0s" }} />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animationDelay: "0.2s" }} />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
      </div>

      {/* 本地模式提示 + 发送快捷键提示 + 清除历史 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!usedAI && (
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-500">
              {t("ai_local_mode")}
            </span>
          )}
          {messages.length > 0 && (
            <button
              onClick={() => {
                setMessages([]);
                setUsedAI(true);
              }}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-500 transition-colors hover:text-gray-200 hover:bg-white/10"
              title={t("clear_history")}
            >
              🗑 {t("clear_history")}
            </button>
          )}
        </div>
        <span className="ms-auto text-xs text-gray-500">{t("chat_send_hint")}</span>
      </div>

      {/* 输入区 */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("chat_input_placeholder")}
          className="min-h-[56px] max-h-32 resize-none bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/20"
          disabled={loading}
        />
        <Button
          onClick={send}
          disabled={loading || !input.trim()}
          className="shimmer-btn self-end border-0 bg-gradient-to-br from-violet-500 to-cyan-500 text-white hover:from-violet-500 hover:to-cyan-500"
        >
          {loading ? t("ai_loading") : t("send_message")}
        </Button>
      </div>

      {/* 访谈健康度双仪表：节奏（受访者）+ 深度（AI） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RhythmPanel rhythm={rhythm} />
        <DepthPanel depth={depth} />
      </div>
    </div>
  );
}

/* ============================================================
 * 访谈节奏面板（Interview Rhythm Panel）
 * ============================================================
 * 三部分：
 * 1) 柱状波形图——每轮用户回答字数占比，颜色按 good/warn/risk 分级
 * 2) 疲劳度仪表盘——SVG 半圆弧，0-100
 * 3) 建议横幅——疲劳度高时提示缩短追问
 */

function RhythmPanel({ rhythm }: { rhythm: RhythmReport }) {
  const { t } = useI18n();
  const { points, fatigueScore, suggestion } = rhythm;

  // 趋势与状态文案
  const statusKey =
    fatigueScore >= 60 ? "rhythm_status_risk" : fatigueScore >= 30 ? "rhythm_status_warn" : "rhythm_status_good";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-gray-300">
          📊 {t("rhythm_panel_title")}
        </span>
        <span className="text-[10px] text-gray-500">
          {points.length < 2 ? t("rhythm_insufficient") : `${points.length} ${t("rhythm_turns_unit")}`}
        </span>
      </div>

      {points.length < 2 ? (
        // 数据不足时的占位
        <div className="py-6 text-center text-xs text-gray-600">
          {t("rhythm_insufficient")}
        </div>
      ) : (
        <>
          {/* 主体：左侧柱状图 + 右侧仪表盘 */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center">
            {/* 柱状波形图 */}
            <div>
              <div className="flex items-end gap-1.5 h-24">
                {points.map((p) => {
                  // 柱高 = 字数相对当前最大字数的占比，最低 8px 保证可见
                  const maxChars = Math.max(...points.map((x) => x.charCount), 1);
                  const ratio = p.charCount / maxChars;
                  const height = Math.max(8, Math.round(ratio * 88));
                  return (
                    <div
                      key={p.turn}
                      className="rhythm-bar-wrap group relative flex-1 flex flex-col items-center justify-end"
                      style={{ height: "100%" }}
                    >
                      {/* 悬停提示 */}
                      <div className="rhythm-tooltip pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-white/15 bg-slate-900/95 px-2 py-1 text-[10px] text-gray-200 opacity-0 transition-opacity group-hover:opacity-100">
                        #{p.turn} · {p.charCount}{t("char_unit")} · {formatDelay(p.delayMs)}
                      </div>
                      {/* 柱子 */}
                      <div
                        className={`rhythm-bar rhythm-bar-${p.level}`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="mt-1 text-[9px] text-gray-600">{p.turn}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 text-[10px] text-gray-600">{t("rhythm_chart_label")}</div>
            </div>

            {/* 疲劳度仪表盘 */}
            <div className="flex flex-col items-center justify-self-center">
              <FatigueGauge score={fatigueScore} />
              <div className="mt-1 text-[11px] font-semibold text-gray-300">{t(statusKey)}</div>
              <div className="text-[9px] uppercase tracking-wide text-gray-600">{t("rhythm_fatigue_score")}</div>
            </div>
          </div>

          {/* 建议横幅（仅高疲劳度时） */}
          {suggestion && (
            <div className="rhythm-suggestion rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200 animate-bubble-in">
              {t(suggestion)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** 半圆疲劳度仪表盘（SVG）。0=绿，50=黄，100=红。 */
function FatigueGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  // 半圆从 180° 到 360°（即从左到右的下半圆反过来——这里用上半圆 180°→0°）。
  // 用 stroke-dasharray 控制填充比例。
  const radius = 34;
  const circumference = Math.PI * radius; // 半圆周长
  const filled = (clamped / 100) * circumference;
  return (
    <svg width="92" height="56" viewBox="0 0 92 56" className="fatigue-gauge">
      <defs>
        <linearGradient id="fatigueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
      </defs>
      {/* 背景弧（灰） */}
      <path
        d="M 8 50 A 34 34 0 0 1 84 50"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* 进度弧（渐变） */}
      <path
        d="M 8 50 A 34 34 0 0 1 84 50"
        fill="none"
        stroke="url(#fatigueGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
      />
      {/* 中心分数 */}
      <text x="46" y="46" textAnchor="middle" className="fill-white" style={{ fontSize: 18, fontWeight: 700 }}>
        {clamped}
      </text>
    </svg>
  );
}

/** 把毫秒间隔格式化为可读文案（如 "2.3s"）。 */
function formatDelay(ms: number): string {
  if (ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/* ============================================================
 * 追问深度面板（Probe Depth Panel）
 * ============================================================
 * 与节奏面板镜像，但视角相反——节奏看"受访者"，深度看"AI"：
 * 1) 柱状图——每轮 AI 追问的漏斗层级（wide/mid/narrow/deep/detour）
 * 2) 深度仪表盘——SVG 半圆弧，0-100（越高=下钻越深=越好）
 * 3) 建议横幅——AI 一直在表层打转时提示向场景/动机深挖
 *
 * 依据：docs/memos/interview-techniques.md 的漏斗式追问理论。
 * 竞品（Outset/Remesh）只管"问"，这是把"问得有没有水平"变成可度量指标。
 */

/** 漏斗层级 → 文案 i18n key */
const DEPTH_LEVEL_LABEL: Record<DepthLevel, string> = {
  wide: "depth_level_wide",
  mid: "depth_level_mid",
  narrow: "depth_level_narrow",
  deep: "depth_level_deep",
  detour: "depth_level_detour",
};

function DepthPanel({ depth }: { depth: DepthReport }) {
  const { t } = useI18n();
  const { points, depthScore, suggestion } = depth;

  // 深度分越高越好（和疲劳度相反）。三档状态文案：
  // <40 停表层 / 40-69 场景探索 / ≥70 深入挖掘
  const statusKey =
    depthScore >= 70 ? "depth_status_deep" : depthScore >= 40 ? "depth_status_moderate" : "depth_status_shallow";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-gray-300">
          🎯 {t("depth_panel_title")}
        </span>
        <span className="text-[10px] text-gray-500">
          {points.length < 2 ? t("depth_insufficient") : `${points.length} ${t("rhythm_turns_unit")}`}
        </span>
      </div>

      {points.length < 2 ? (
        // 数据不足时的占位
        <div className="py-6 text-center text-xs text-gray-600">
          {t("depth_insufficient")}
        </div>
      ) : (
        <>
          {/* 主体：左侧层级柱状图 + 右侧仪表盘 */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center">
            {/* 漏斗层级柱状图：柱高固定（按层级），颜色区分层级 */}
            <div>
              <div className="flex items-end gap-1.5 h-24">
                {points.map((p) => {
                  // 柱高按层级映射：wide 最矮，deep 最高，detour 最矮
                  const heightMap: Record<DepthLevel, number> = {
                    wide: 28,
                    mid: 48,
                    narrow: 68,
                    deep: 92,
                    detour: 22,
                  };
                  const height = heightMap[p.level];
                  return (
                    <div
                      key={p.turn}
                      className="depth-bar-wrap group relative flex-1 flex flex-col items-center justify-end"
                      style={{ height: "100%" }}
                    >
                      {/* 悬停提示 */}
                      <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-white/15 bg-slate-900/95 px-2 py-1 text-[10px] text-gray-200 opacity-0 transition-opacity group-hover:opacity-100">
                        #{p.turn} · {t(DEPTH_LEVEL_LABEL[p.level])}
                      </div>
                      {/* 柱子 */}
                      <div
                        className={`depth-bar depth-bar-${p.level}`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="mt-1 text-[9px] text-gray-600">{p.turn}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 text-[10px] text-gray-600">{t("depth_chart_label")}</div>
            </div>

            {/* 深度仪表盘 */}
            <div className="flex flex-col items-center justify-self-center">
              <DepthGauge score={depthScore} />
              <div className="mt-1 text-[11px] font-semibold text-gray-300">{t(statusKey)}</div>
              <div className="text-[9px] uppercase tracking-wide text-gray-600">{t("depth_depth_score")}</div>
            </div>
          </div>

          {/* 建议横幅（仅停留在表层时） */}
          {suggestion && (
            <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-200 animate-bubble-in">
              {t(suggestion)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** 半圆深度仪表盘（SVG）。0=红（停表层），100=青（深入挖掘）。与疲劳度渐变方向相反。 */
function DepthGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 34;
  const circumference = Math.PI * radius; // 半圆周长
  const filled = (clamped / 100) * circumference;
  return (
    <svg width="92" height="56" viewBox="0 0 92 56" className="depth-gauge">
      <defs>
        {/* 注意：和疲劳度相反，这里是 红→黄→青（低分红、高分青） */}
        <linearGradient id="depthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      {/* 背景弧（灰） */}
      <path
        d="M 8 50 A 34 34 0 0 1 84 50"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* 进度弧（渐变） */}
      <path
        d="M 8 50 A 34 34 0 0 1 84 50"
        fill="none"
        stroke="url(#depthGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
      />
      {/* 中心分数 */}
      <text x="46" y="46" textAnchor="middle" className="fill-white" style={{ fontSize: 18, fontWeight: 700 }}>
        {clamped}
      </text>
    </svg>
  );
}
