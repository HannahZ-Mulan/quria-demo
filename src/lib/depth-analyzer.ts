// 追问深度分析引擎（纯前端，无 AI 依赖）。
//
// 设计目标：把"AI 的追问有没有水平"这件事变成可度量的指标。
// 依据深度访谈的漏斗式追问理论（见 docs/memos/interview-techniques.md），
// 好的访谈应该从宽到窄逐层下钻到动机/价值观，而不是一直在表层打转。
//
// 与节奏分析引擎（rhythm-analyzer.ts）对称：
// - 节奏看"受访者"（累不累、在不在状态）
// - 深度看"AI"（在挖什么层、有没有章法）
// 两者合起来是完整的"访谈健康度双仪表"。
//
// 实现方式：纯客户端词法规则，扫描每条 AI 追问的文本，判定漏斗层级。
// 不依赖 API 改造，不破坏 usedAI 契约。

import type { ChatMessage, DepthLevel, DepthPoint, DepthReport } from "./types";

/**
 * 漏斗层级关键词词表。
 *
 * 按从浅到深排列。判定时取命中的最深层级。
 * 每层都有 zh / en 两套关键词，匹配时小写化。
 *
 * 这些词来自访谈方法论的典型话术：
 * - wide:   "平时/一般/整体感受" → 表层探索
 * - mid:    "具体/举个例子/什么情况" → 场景还原（CIT 入口）
 * - narrow: "当时/最/哪一个/为什么选" → 细节聚焦
 * - deep:   "为什么重要/意味着/对你来说/价值观" → 动机挖掘（Laddering）
 * - detour: "周末/随便聊聊/感谢" → 疲劳迂回的破冰问题
 */
const DEPTH_KEYWORDS: { level: DepthLevel; zh: string[]; en: string[] }[] = [
  {
    level: "detour",
    zh: ["周末", "随便聊聊", "不急", "谢谢你", "辛苦", "平时怎么安排"],
    en: ["weekend", "chat about", "no rush", "thanks for", "patience"],
  },
  {
    level: "wide",
    zh: ["平时", "一般", "通常", "整体", "怎么用", "怎么用", "觉得怎么样", "感受"],
    en: ["usually", "overall", "in general", "how do you use", "how do you feel", "typically"],
  },
  {
    level: "mid",
    zh: ["具体", "举个例子", "什么情况", "什么场景", "说说", "比如", "能描述"],
    en: ["specifically", "example", "what situation", "describe", "such as", "instance"],
  },
  {
    level: "narrow",
    zh: ["当时", "最", "哪一个", "哪一次", "为什么选", "为什么觉得", "具体是哪", "印象最深"],
    en: ["at that time", "the most", "which one", "why did you", "remember most", "that moment"],
  },
  {
    level: "deep",
    zh: ["为什么重要", "对您来说", "对你来说", "对您重要", "对你重要", "意味着", "价值观", "深层", "根本原因", "内在"],
    en: ["why is that important", "what does it mean", "to you personally", "value", "underlying", "fundamentally"],
  },
];

/** 各层级映射到深度分的权重（0-100 区间）。越深权重越高。 */
const LEVEL_WEIGHT: Record<DepthLevel, number> = {
  wide: 15,
  mid: 35,
  narrow: 65,
  deep: 95,
  detour: 10, // 迂回是策略性的，深度低但不是"差"
};

/**
 * 判定一段 AI 追问文本的漏斗层级。
 *
 * 逻辑分两步：
 * 1) 先在「深度链」wide→mid→narrow→deep 里找命中的最深层级（漏斗下钻原则）。
 * 2) detour（疲劳迂回的破冰问题）单独处理：只有当深度链没挖到 narrow/deep 时，
 *    detour 才生效——它代表"AI 故意回到表层重建信任"，与"懒洋洋停在表层"含义不同。
 *    这样既能让纯破冰问题正确归类为 detour，又不会把含 deep 关键词的句子误判。
 *
 * @param text - AI 的追问文本
 * @returns 漏斗层级
 */
export function classifyDepth(text: string): DepthLevel {
  const lower = text.toLowerCase();

  // 1) 深度链：按从浅到深，取命中的最深。
  const depthChain: DepthLevel[] = ["wide", "mid", "narrow", "deep"];
  let deepest: DepthLevel | null = null;
  for (const level of depthChain) {
    const tier = DEPTH_KEYWORDS.find((t) => t.level === level)!;
    const words = [...tier.zh, ...tier.en];
    if (words.some((w) => lower.includes(w.toLowerCase()))) {
      deepest = level;
    }
  }

  // 2) detour 单独判定：仅当没挖到 narrow/deep 时才认 detour。
  const detourTier = DEPTH_KEYWORDS.find((t) => t.level === "detour")!;
  const detourWords = [...detourTier.zh, ...detourTier.en];
  const isDetour = detourWords.some((w) => lower.includes(w.toLowerCase()));
  const probedDeep = deepest === "narrow" || deepest === "deep";

  if (deepest === null && isDetour) return "detour";
  if (deepest === "wide" && isDetour && !probedDeep) return "detour";
  // mid + detour 同时命中：偏向 detour（场景词也可能是破冰里的客套），但这里保守归 mid
  return deepest ?? "wide";
}

/**
 * 主入口：根据对话历史生成追问深度报告。
 *
 * 遍历所有 AI 消息，逐条判定漏斗层级，再汇总成深度分和趋势。
 * 至少需要 2 条 AI 消息才返回有效数据；否则返回空报告。
 */
export function analyzeDepth(messages: ChatMessage[]): DepthReport {
  const empty: DepthReport = {
    points: [],
    depthScore: 0,
    trend: "stable",
    suggestion: null,
  };

  if (messages.length < 3) return empty;

  // 1) 遍历 assistant 消息，构建每轮的深度点
  const points: DepthPoint[] = [];
  let turn = 0;
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    turn++;
    points.push({
      turn,
      level: classifyDepth(msg.content),
      charCount: msg.content.length,
    });
  }

  if (points.length < 2) return empty;

  // 2) 计算深度分：各轮权重的平均值，归一化到 0-100
  const totalWeight = points.reduce((sum, p) => sum + LEVEL_WEIGHT[p.level], 0);
  const depthScore = Math.round(totalWeight / points.length);

  // 3) 判断趋势：比较前半段和后半段的平均深度
  const half = Math.max(1, Math.floor(points.length / 2));
  const earlyAvg =
    points.slice(0, half).reduce((s, p) => s + LEVEL_WEIGHT[p.level], 0) / half;
  const recentSlice = points.slice(-half);
  const recentAvg =
    recentSlice.reduce((s, p) => s + LEVEL_WEIGHT[p.level], 0) / recentSlice.length;
  let trend: DepthReport["trend"] = "stable";
  if (recentAvg > earlyAvg * 1.15) trend = "deepening";
  else if (recentAvg < earlyAvg * 0.85) trend = "flat";

  // 4) 一直在表层打转时给建议。
  //    判定：深度分偏低（<40）且最近 3 轮没有 narrow/deep。
  //    但排除「策略性迂回」——如果最近几轮是 detour（疲劳破冰），
  //    那是 AI 主动放生重建信任，不是"没水平停在表层"，不应提示。
  const recent = points.slice(-3);
  const hasDeep = recent.some(
    (p) => p.level === "narrow" || p.level === "deep"
  );
  const mostlyDetour = recent.filter((p) => p.level === "detour").length >= recent.length - 1;
  const suggestion = depthScore < 40 && !hasDeep && !mostlyDetour ? "depth_suggestion" : null;

  return { points, depthScore, trend, suggestion };
}
