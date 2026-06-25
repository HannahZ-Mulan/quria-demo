// 访谈节奏分析引擎（纯前端，无 AI 依赖）。
//
// 设计目标：在多轮对话里，把"受访者是不是开始疲劳/敷衍"这件只能靠
// 研究员经验判断的事，变成可视化的指标。这是 Quria 与国际竞品的
// 差异化点——Outset / Remesh / Perspective AI 都没有"看得到访谈节奏"的能力。
//
// 输入：ChatMessage[]（带 ts 时间戳）
// 输出：RhythmReport（每轮柱状图数据 + 整体疲劳度 + 趋势 + 建议）
//
// 所有阈值都是经验值，真实落地后可用访谈日志数据重新校准。

import type { ChatMessage, RhythmPoint, RhythmReport } from "./types";

/** 最近 N 轮参与趋势计算。 */
const TREND_WINDOW = 3;
/** 最近一轮字数低于此值，视为绝对疲劳信号。 */
const SHORT_ANSWER_THRESHOLD = 15;
/** 字数下降幅度超过此比例（相对最初几轮），视为参与度衰退。 */
const DECLINE_RATIO = 0.4;
/** 间隔增长幅度超过此比例，视为反应变慢。 */
const DELAY_GROW_RATIO = 0.5;

/**
 * 计算数组平均值（空数组返回 0）。
 */
function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

/**
 * 给某一轮打分（good / warn / risk）。
 * - 字数 < 15 或 delay 异常长 → risk
 * - 字数 < 30 或 delay 较长 → warn
 * - 否则 good
 */
function classifyLevel(charCount: number, delayMs: number): RhythmPoint["level"] {
  if (charCount < SHORT_ANSWER_THRESHOLD || delayMs > 20000) return "risk";
  if (charCount < 30 || delayMs > 12000) return "warn";
  return "good";
}

/**
 * 主入口：根据对话历史生成节奏报告。
 * 至少需要 2 轮用户回答（即 4 条消息）才返回有效数据；否则返回空报告。
 */
export function analyzeRhythm(messages: ChatMessage[]): RhythmReport {
  const empty: RhythmReport = {
    points: [],
    fatigueScore: 0,
    trend: "stable",
    suggestion: null,
  };

  if (messages.length < 4) return empty;

  // 1) 从消息流里抽出每轮（用户回答）的字数和间隔。
  //    delay = 这条 user 消息的 ts − 上一条 assistant 消息的 ts。
  const points: RhythmPoint[] = [];
  let turn = 0;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    turn++;
    const prev = messages[i - 1];
    const delayMs = prev && prev.role === "assistant" && msg.ts && prev.ts
      ? Math.max(0, msg.ts - prev.ts)
      : 0;
    points.push({
      turn,
      charCount: msg.content.length,
      delayMs,
      level: classifyLevel(msg.content.length, delayMs),
    });
  }

  if (points.length < 2) return empty;

  // 2) 计算疲劳度（0-100，越高越疲劳）。三个信号加权累加。
  let score = 0;

  // 信号 A：字数递减。最近几轮平均字数 vs 最初几轮。
  const earlyCount = Math.min(TREND_WINDOW, Math.floor(points.length / 2));
  const early = points.slice(0, earlyCount);
  const recent = points.slice(-earlyCount);
  const earlyAvg = avg(early.map((p) => p.charCount));
  const recentAvg = avg(recent.map((p) => p.charCount));
  if (earlyAvg > 0) {
    const dropRatio = (earlyAvg - recentAvg) / earlyAvg;
    if (dropRatio > DECLINE_RATIO) score += 40;
    else if (dropRatio > DECLINE_RATIO / 2) score += 20;
  }

  // 信号 B：间隔递增。最近几轮 delay 均值 vs 最初几轮（只在有 delay 数据时生效）。
  const earlyDelays = early.map((p) => p.delayMs).filter((d) => d > 0);
  const recentDelays = recent.map((p) => p.delayMs).filter((d) => d > 0);
  if (earlyDelays.length > 0 && recentDelays.length > 0) {
    const earlyDelay = avg(earlyDelays);
    const recentDelay = avg(recentDelays);
    if (earlyDelay > 0) {
      const growRatio = (recentDelay - earlyDelay) / earlyDelay;
      if (growRatio > DELAY_GROW_RATIO) score += 30;
      else if (growRatio > DELAY_GROW_RATIO / 2) score += 15;
    }
  }

  // 信号 C：绝对疲劳。最近一轮字数太短。
  const lastChar = points[points.length - 1].charCount;
  if (lastChar < SHORT_ANSWER_THRESHOLD) score += 30;

  const fatigueScore = Math.min(100, Math.round(score));

  // 3) 判断趋势（基于字数变化方向）。
  let trend: RhythmReport["trend"] = "stable";
  if (recentAvg > earlyAvg * 1.15) trend = "rising";
  else if (recentAvg < earlyAvg * 0.85) trend = "declining";

  // 4) 高疲劳度时给出建议（返回 i18n key，由组件翻译）。
  const suggestion = fatigueScore > 60 ? "rhythm_suggestion" : null;

  return { points, fatigueScore, trend, suggestion };
}
