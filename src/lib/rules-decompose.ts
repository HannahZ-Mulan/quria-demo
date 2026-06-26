// 本文件实现"基于规则"的需求拆解和 TRD（技术需求文档）生成，不依赖 AI。
//
// 它是从最初 project3/page.tsx 里的 decompose() 和内联 TRD 模板原样搬出来的，
// 保证 AI 不可用时的兜底输出和原来"不用 AI"时完全一致。
// 当 DeepSeek 没配置或调用失败时，ai-client.ts 会静默调用这里。

import type { DecomposeResult, GanttPhase, RiskItem } from "./types";

/**
 * 计算需求的「清晰度评分」（0-100，越高越清晰）。
 *
 * 纯规则、纯函数，不依赖 AI。基础分 100，逐项扣分：
 *   - 每命中一个模糊词 -8（如「尽快」「大概」「越多越好」）
 *   - 目标人群「未明确」-10
 *   - 研究目标「未明确」-10
 *   - 样本量未给出具体数字 -10
 *   - 周期未给出具体数字 -10
 *   - 每条需求冲突 -15
 * 最终 clamp 到 [0, 100]。
 *
 * @param result - decomposeByRule 拆解出的结构化结果
 * @param rawText - 客户原始需求文字（用于检测是否含具体数字）
 * @returns { score, notes } 分数与逐项扣分说明
 */
export function calcClarityScore(
  result: Pick<DecomposeResult, "fuzzyMarks" | "conflicts" | "targetAudience" | "researchGoal" | "sampleSize" | "duration">,
  rawText: string,
): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 100;

  // 模糊词命中
  for (const w of result.fuzzyMarks) {
    score -= 8;
    notes.push(`模糊表述「${w}」 -8`);
  }

  // 目标人群 / 研究目标缺失
  if (result.targetAudience === "未明确") {
    score -= 10;
    notes.push("目标人群未明确 -10");
  }
  if (result.researchGoal === "未明确") {
    score -= 10;
    notes.push("研究目标未明确 -10");
  }

  // 量词缺失：样本量 / 周期未给出具体数字
  const hasNumber = /\d/.test(rawText);
  if (result.sampleSize.startsWith("未指定") || result.sampleSize.startsWith("模糊")) {
    score -= 10;
    notes.push("样本量未量化 -10");
  }
  if (result.duration.startsWith("未指定") || result.duration.startsWith("模糊") || result.duration.startsWith("建议")) {
    // duration 常以「建议 X 周」给出（未量化），hasNumber 仅作为兜底判定
    if (!hasNumber) {
      score -= 10;
      notes.push("交付周期未量化 -10");
    }
  }

  // 冲突项
  for (const c of result.conflicts) {
    score -= 15;
    notes.push(`需求冲突 -15：${c.replace(/^⚠️\s*/, "")}`);
  }

  const finalScore = Math.max(0, Math.min(100, score));
  return { score: finalScore, notes };
}

/**
 * 把客户一段模糊的需求文字，用固定规则拆解成结构化的研究结果。
 *
 * 工作原理：用正则表达式去原文里"找"关键信息，比如：
 * - 研究目标（找"了解/研究/探索…"这类词）
 * - 目标人群（找年龄段、性别、职业、地区）
 * - 研究场景（产品/品牌/用户画像/竞品/满意度/购买）
 * - 研究类型（定性/定量/混合）、访谈深度、样本量、周期
 * - 最后还会检测冲突（大样本+短周期）和模糊用词（"尽快""大概"）
 *
 * @param rawRequirement - 客户原始的需求文字
 * @returns 拆解后的结构化结果
 */
export function decomposeByRule(rawRequirement: string): DecomposeResult {
  const text = rawRequirement;
  const lowerText = text.toLowerCase();

  // ===== 1. 提取关键信息 =====

  // 研究目标
  const goalMatches = text.match(/(了解|研究|探索|测试|评估|分析|洞察|验证)(.{2,20})/);
  const researchGoal = goalMatches ? goalMatches[0] : "未明确";

  // 目标人群
  const ageMatches = text.match(/(\d{1,2}[-至到]\d{1,2}岁|\d{1,2}后|年轻|中年|老年)/);
  const genderMatches = text.match(/(男|女|男性|女性|男女|宝妈|爸爸|妈妈)/);
  const jobMatches = text.match(
    /(白领|学生|上班族|自由职业|高管|程序员|设计师|教师|医生|妈妈|家长|车主|玩家)/
  );
  const regionMatches = text.match(
    /(一线城市|二线城市|三四线|北京|上海|广州|深圳|成都|杭州|全国|华东|华南)/
  );

  const targetAudience =
    [ageMatches?.[0], genderMatches?.[0], jobMatches?.[0], regionMatches?.[0]]
      .filter(Boolean)
      .join("、") || "未明确";

  // 研究场景
  let researchScene = "通用调研";
  if (lowerText.includes("产品") || lowerText.includes("功能") || lowerText.includes("体验")) {
    researchScene = "产品测试/体验研究";
  } else if (lowerText.includes("品牌") || lowerText.includes("知名度") || lowerText.includes("形象")) {
    researchScene = "品牌研究";
  } else if (lowerText.includes("用户") || lowerText.includes("人群") || lowerText.includes("画像")) {
    researchScene = "用户画像/人群洞察";
  } else if (lowerText.includes("竞品") || lowerText.includes("竞争") || lowerText.includes("对手")) {
    researchScene = "竞品分析";
  } else if (lowerText.includes("满意度") || lowerText.includes("nps") || lowerText.includes("推荐")) {
    researchScene = "满意度/NPS研究";
  } else if (lowerText.includes("购买") || lowerText.includes("决策") || lowerText.includes("消费")) {
    researchScene = "购买决策研究";
  }

  // 样本量提取
  const sampleMatch = text.match(/(\d+)\s*(个|人|份|组|样本)/);
  const sampleSizeRaw = sampleMatch
    ? sampleMatch[1]
    : lowerText.includes("越多越好") || lowerText.includes("大量") || lowerText.includes("很多")
      ? "模糊：大量"
      : lowerText.includes("少量") || lowerText.includes("几个")
        ? "模糊：少量"
        : "未指定";

  // 时间提取
  const timeMatch = text.match(/(\d+)\s*(天|周|月|工作日)/);
  const timeRaw = timeMatch
    ? timeMatch[0]
    : lowerText.includes("尽快") || lowerText.includes("马上") || lowerText.includes("急")
      ? "模糊：尽快"
      : "未指定";

  // ===== 2. 智能判定研究类型 =====

  let researchType: string;
  const hasQuantitative =
    lowerText.includes("多少") ||
    lowerText.includes("比例") ||
    lowerText.includes("占比") ||
    lowerText.includes("满意度") ||
    lowerText.includes("nps") ||
    lowerText.includes("数据") ||
    lowerText.includes("统计") ||
    lowerText.includes("量化");
  const hasQualitative =
    lowerText.includes("为什么") ||
    lowerText.includes("动机") ||
    lowerText.includes("原因") ||
    lowerText.includes("感受") ||
    lowerText.includes("想法") ||
    lowerText.includes("态度") ||
    lowerText.includes("深入") ||
    lowerText.includes("挖掘");

  if (hasQuantitative && hasQualitative) {
    researchType = "混合研究（定性+定量）";
  } else if (hasQuantitative) {
    researchType = "定量研究";
  } else if (hasQualitative) {
    researchType = "定性研究";
  } else {
    researchType = "建议定性研究（先探索）";
  }

  // ===== 3. 智能判定访谈深度 =====

  let depth: string;
  let recommendedDuration: string;

  if (
    lowerText.includes("深入") ||
    lowerText.includes("挖掘") ||
    lowerText.includes("动机") ||
    lowerText.includes("心理") ||
    lowerText.includes("底层")
  ) {
    depth = "L3 深度访谈";
    recommendedDuration = "45-60分钟/人";
  } else if (
    lowerText.includes("了解") ||
    lowerText.includes("探索") ||
    lowerText.includes("发现") ||
    lowerText.includes("需求")
  ) {
    depth = "L2 探索访谈";
    recommendedDuration = "20-30分钟/人";
  } else {
    depth = "L1 快速筛查";
    recommendedDuration = "10-15分钟/人";
  }

  // ===== 4. 智能推荐样本量 =====

  let sampleSize: string;
  const numSample = parseInt(sampleSizeRaw);

  if (!isNaN(numSample)) {
    if (numSample <= 10) {
      sampleSize = `${numSample}人（适合深度个案）`;
    } else if (numSample <= 30) {
      sampleSize = `${numSample}人（适合定性研究）`;
    } else if (numSample <= 100) {
      sampleSize = `${numSample}人（适合定量小样本）`;
    } else {
      sampleSize = `${numSample}人（适合定量大样本）`;
    }
  } else {
    if (researchType.includes("定性")) {
      sampleSize = "建议 15-20 人（信息饱和原则）";
    } else if (researchType.includes("定量")) {
      sampleSize = "建议 100-300 人（统计显著性）";
    } else {
      sampleSize = "建议先定性 15-20 人，再定量 100+ 人";
    }
  }

  // ===== 5. 预计周期 =====

  let duration: string;
  const numTime = parseInt(timeRaw);

  if (!isNaN(numTime)) {
    if (numTime <= 3) {
      duration = `${numTime}天（极紧，建议缩减范围）`;
    } else if (numTime <= 7) {
      duration = `${numTime}天（较紧，建议只做单城市）`;
    } else if (numTime <= 14) {
      duration = `${numTime}天（合理，可执行）`;
    } else {
      duration = `${numTime}天（充裕，可做深度）`;
    }
  } else {
    if (researchType.includes("混合")) {
      duration = "建议 4-6 周（含定性和定量两阶段）";
    } else if (depth === "L3 深度访谈") {
      duration = "建议 3-4 周（含招募、执行、分析）";
    } else if (depth === "L2 探索访谈") {
      duration = "建议 2-3 周";
    } else {
      duration = "建议 1-2 周";
    }
  }

  // ===== 6. 追问策略 =====

  let strategy: string;
  if (researchScene.includes("产品")) {
    strategy = "场景还原 + 痛点挖掘 + 功能偏好探测";
  } else if (researchScene.includes("品牌")) {
    strategy = "品牌联想 + 情感映射 + 竞争对比";
  } else if (researchScene.includes("用户画像")) {
    strategy = "生活方式 + 消费行为 + 价值观探索";
  } else if (researchScene.includes("购买决策")) {
    strategy = "决策旅程 + 影响因素权重 + 障碍点识别";
  } else if (researchScene.includes("竞品")) {
    strategy = "对比使用 + 切换动机 + 忠诚度评估";
  } else {
    strategy = "开放式探索 + 关键事件 + 行为验证";
  }

  // ===== 7. 交付物 =====

  const deliverables = ["访谈纪要/原始语料", "核心洞察提炼"];

  if (researchType.includes("定量")) {
    deliverables.push("数据统计报告");
    deliverables.push("交叉分析图表");
  }
  if (researchScene.includes("用户画像")) {
    deliverables.push("用户画像卡片");
    deliverables.push("典型用户旅程图");
  }
  if (researchScene.includes("产品")) {
    deliverables.push("功能优先级矩阵");
    deliverables.push("优化建议清单");
  }

  // ===== 8. 冲突检测 =====

  const conflicts: string[] = [];

  if (!isNaN(numSample) && !isNaN(numTime)) {
    if (numSample > 50 && depth === "L3 深度访谈" && numTime < 14) {
      conflicts.push("⚠️ 大样本量 + 深度访谈 + 短周期：建议缩减样本或延长时间");
    }
    if (numSample > 200 && numTime < 7) {
      conflicts.push("⚠️ 大样本量 + 极短周期：定量调研需要充足时间保证数据质量");
    }
  }

  if (targetAudience === "未明确") {
    conflicts.push("⚠️ 目标人群未明确：建议补充年龄、性别、职业等维度");
  }

  if (researchGoal === "未明确") {
    conflicts.push("⚠️ 研究目标不清晰：建议明确要回答什么业务问题");
  }

  // ===== 9. 模糊标记 =====

  const fuzzyWords = ["更深入", "越多越好", "尽快", "高端", "大概", "差不多", "尽量", "可能", "也许"];
  const foundFuzzy = fuzzyWords.filter((w) => lowerText.includes(w));

  // recommendedDuration 是「每场访谈的建议时长」，已计算好，纳入结果输出展示。
  const interviewDuration = recommendedDuration;

  // ===== 10. 组装结果 =====

  const base: DecomposeResult = {
    researchGoal,
    targetAudience,
    researchScene,
    researchType,
    depth,
    sampleSize,
    duration,
    interviewDuration,
    strategy,
    deliverables,
    conflicts,
    fuzzyMarks: foundFuzzy,
  };

  // 清晰度评分：基于上面识别出的模糊词/冲突/缺失项算分
  const { score: clarityScore, notes: clarityNotes } = calcClarityScore(base, text);
  base.clarityScore = clarityScore;
  base.clarityNotes = clarityNotes;

  return base;
}

/**
 * 根据拆解结果，用固定模板拼出一份技术需求文档（TRD）的文本。
 *
 * 它原样复刻了 project3/page.tsx 里 389-416 行的内联模板，
 * 以字符串形式返回，让页面能用同样的"代码块"样式渲染出来。
 *
 * @param result - 之前拆解得到的结构化结果
 * @returns 一段 Markdown 格式的 TRD 文本
 */
export function generateTrdByRule(result: DecomposeResult): string {
  const depthMode = result.depth.includes("L3")
    ? "深度"
    : result.depth.includes("L2")
      ? "标准"
      : "精简";
  const industry = result.researchScene.includes("母婴")
    ? "母婴消费"
    : result.researchScene.includes("汽车")
      ? "汽车消费"
      : "通用";
  // Original template hard-codes 情感探测 to "开启" regardless of strategy.
  const emotionDetection = "开启";

  return [
    "# 项目基本信息",
    `研究目标: ${result.researchGoal}`,
    `目标人群: ${result.targetAudience}`,
    `研究场景: ${result.researchScene}`,
    "",
    "# AI 模型配置",
    `追问深度模式: ${depthMode}`,
    `行业知识库: ${industry}`,
    `情感探测: ${emotionDetection}`,
    "多轮记忆: 5轮",
    "",
    "# Prompt 模板",
    `系统Prompt: 你是一位专业的用户研究访谈员，正在进行${result.researchScene}...`,
    `追问策略: ${result.strategy}`,
    "",
    "# 数据标签体系",
    "情感标签、主题标签、行为标签、需求标签",
    "",
    "# 报告框架",
    result.deliverables.join(" + "),
  ].join("\n");
}

/* ============================================================
 * TRD 交付增强：Gantt 时间线 + 风险矩阵（纯函数，不依赖 AI）
 * 数据都从 DecomposeResult 衍生，保证「AI 成功 / 本地兜底」口径一致。
 * ============================================================ */

/**
 * 从 duration 字段（如「14天」「3 周」「建议 4-6 周」）解析出总天数。
 *
 * 规则：
 *   - 取第一个出现的数字 + 单位（天/周/月/工作日）；
 *   - 周 → ×7，月 → ×30，工作日 → ×1；
 *   - 解析不到时给一个经验默认值 21 天（约 3 周，定性研究典型周期）。
 */
export function parseDurationDays(duration: string): number {
  // 先定位单位（工作日 / 天 / 日 / 周 / 月），再取该单位前面最近的数字。
  // 这样能处理「3 周」「4-6 周」「2 个月」「14天（合理）」等多种写法。
  const unitMatch = duration.match(/(\d+)\s*个?\s*(工作日|天|日|周|月)/);
  if (!unitMatch) return 21; // 默认 3 周
  const n = parseInt(unitMatch[1], 10);
  const unit = unitMatch[2];
  if (unit === "周") return n * 7;
  if (unit === "月") return n * 30;
  // 工作日 / 天 / 日
  return n;
}

/**
 * 把项目总周期按研究流程拆成 4 个阶段，返回 Gantt 阶段数据。
 *
 * 占比经验值（可调）：招募 20% / 执行 40% / 分析 25% / 交付 15%，
 * 每段至少 1 天，向下取整后可能略有误差，UI 上以天数展示。
 */
export function buildGanttPhases(duration: string): GanttPhase[] {
  const total = parseDurationDays(duration);
  const alloc: { key: string; ratio: number; color: GanttPhase["color"] }[] = [
    { key: "phase_recruit", ratio: 0.2, color: "cyan" },
    { key: "phase_execute", ratio: 0.4, color: "violet" },
    { key: "phase_analyze", ratio: 0.25, color: "pink" },
    { key: "phase_deliver", ratio: 0.15, color: "amber" },
  ];
  return alloc.map((a) => ({
    key: a.key,
    color: a.color,
    days: Math.max(1, Math.round(total * a.ratio)),
  }));
}

/**
 * 从 conflicts + fuzzyMarks 衍生风险项，映射到「影响 × 概率」。
 *
 * 映射规则：
 *   - conflicts（需求冲突/缺失）→ 影响高；冲突本身已检出 → 概率高；
 *   - fuzzyMarks（模糊词）→ 影响中；命中越多概率越高（≥3 个为高）；
 *   - 目标人群/研究目标缺失这类 conflict 影响降为中（属于待补充而非硬冲突）。
 */
export function deriveRisks(result: Pick<DecomposeResult, "conflicts" | "fuzzyMarks">): RiskItem[] {
  const risks: RiskItem[] = [];

  for (const c of result.conflicts) {
    const text = c.replace(/^⚠️\s*/, "");
    // 含「未明确」「不清晰」的是信息缺失，影响中等；其余（如样本/周期冲突）影响高
    const isMissing = /未明确|不清晰|缺失/.test(text);
    risks.push({
      text,
      impact: isMissing ? "medium" : "high",
      // 已被系统检出 = 确实存在，概率高
      probability: "high",
    });
  }

  const fuzzyCount = result.fuzzyMarks.length;
  if (fuzzyCount > 0) {
    risks.push({
      text: result.fuzzyMarks.map((f) => `「${f}」`).join("、") + " 等模糊表述可能导致理解偏差",
      impact: "medium",
      probability: fuzzyCount >= 3 ? "high" : "medium",
    });
  }

  return risks;
}
