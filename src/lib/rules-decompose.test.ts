import { describe, it, expect } from "vitest";
import {
  decomposeByRule,
  generateTrdByRule,
  calcClarityScore,
  parseDurationDays,
  buildGanttPhases,
  deriveRisks,
} from "./rules-decompose";
import type { DecomposeResult } from "./types";

/**
 * Regression tests: the rule fallback must mirror the original inline decompose()
 * and TRD template in project3/page.tsx so the offline path is indistinguishable.
 */
describe("decomposeByRule", () => {
  it("extracts research goal via the verb regex", () => {
    const r = decomposeByRule("我们想了解年轻妈妈群体的购买决策");
    expect(r.researchGoal).toContain("了解");
  });

  it("marks goal as 未明确 when no research verb is present", () => {
    const r = decomposeByRule("下个月做一批数据统计");
    expect(r.researchGoal).toBe("未明确");
  });

  it("classifies the research scene based on keywords", () => {
    expect(decomposeByRule("想测试这个产品的功能体验").researchScene).toBe("产品测试/体验研究");
    expect(decomposeByRule("调研品牌形象和知名度").researchScene).toBe("品牌研究");
    expect(decomposeByRule("分析竞品的竞争策略").researchScene).toBe("竞品分析");
  });

  it("detects quantitative vs qualitative research type", () => {
    expect(decomposeByRule("统计满意度数据的比例").researchType).toBe("定量研究");
    expect(decomposeByRule("深入挖掘购买动机的原因").researchType).toContain("定性");
    // both → 混合
    expect(decomposeByRule("了解满意度数据并挖掘动机").researchType).toContain("混合");
  });

  it("assigns L3 depth for deep-dive keywords", () => {
    expect(decomposeByRule("深入挖掘心理动机").depth).toBe("L3 深度访谈");
    expect(decomposeByRule("快速筛查一下情况").depth).toBe("L1 快速筛查");
  });

  it("exposes recommendedDuration as interviewDuration, scaled by depth", () => {
    expect(decomposeByRule("深入挖掘心理动机").interviewDuration).toBe("45-60分钟/人");
    expect(decomposeByRule("了解用户需求").interviewDuration).toBe("20-30分钟/人");
    expect(decomposeByRule("快速筛查一下").interviewDuration).toBe("10-15分钟/人");
  });

  it("extracts explicit numeric sample size", () => {
    const r = decomposeByRule("访谈 15 人了解需求");
    expect(r.sampleSize).toContain("15人");
  });

  it("extracts explicit time and flags tight schedules", () => {
    const r = decomposeByRule("7 天内完成 30 个样本的调研");
    expect(r.duration).toContain("7天");
    expect(r.duration).toContain("较紧");
  });

  it("flags fuzzy expressions", () => {
    const r = decomposeByRule("尽快做越多越好的高端用户调研");
    expect(r.fuzzyMarks).toContain("尽快");
    expect(r.fuzzyMarks).toContain("越多越好");
    expect(r.fuzzyMarks).toContain("高端");
  });

  it("detects conflicts (large sample + deep interview + short period)", () => {
    const r = decomposeByRule("深度挖掘动机，60 人样本，10 天完成");
    expect(r.conflicts.some((c) => c.includes("大样本量 + 深度访谈"))).toBe(true);
  });

  it("warns when target audience and goal are missing", () => {
    const r = decomposeByRule("随便做个调研");
    expect(r.conflicts.some((c) => c.includes("目标人群未明确"))).toBe(true);
    expect(r.conflicts.some((c) => c.includes("研究目标不清晰"))).toBe(true);
  });

  it("always returns non-null array fields", () => {
    const r = decomposeByRule("了解需求");
    expect(Array.isArray(r.deliverables)).toBe(true);
    expect(Array.isArray(r.conflicts)).toBe(true);
    expect(Array.isArray(r.fuzzyMarks)).toBe(true);
  });

  it("fills clarityScore (0-100) and clarityNotes on every result", () => {
    const r = decomposeByRule("了解需求");
    expect(r.clarityScore).toBeGreaterThanOrEqual(0);
    expect(r.clarityScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(r.clarityNotes)).toBe(true);
  });
});

describe("calcClarityScore", () => {
  /** 一个近乎「满分」的需求：具体人群、明确目标、量化样本与周期、无模糊词、无冲突。 */
  const clear: DecomposeResult = {
    researchGoal: "了解购买决策",
    targetAudience: "25-35岁妈妈",
    researchScene: "购买决策研究",
    researchType: "定性研究",
    depth: "L2 探索访谈",
    sampleSize: "20人（适合定性研究）",
    duration: "14天（合理，可执行）",
    interviewDuration: "20-30分钟/人",
    strategy: "决策旅程",
    deliverables: ["纪要"],
    conflicts: [],
    fuzzyMarks: [],
  };

  it("scores 100 for a fully quantified, conflict-free requirement", () => {
    const { score, notes } = calcClarityScore(clear, "20 人 14 天");
    expect(score).toBe(100);
    expect(notes).toHaveLength(0);
  });

  it("deducts 8 per fuzzy word", () => {
    const r = { ...clear, fuzzyMarks: ["尽快", "大概"] };
    expect(calcClarityScore(r, "尽快 大概").score).toBe(100 - 8 * 2);
  });

  it("deducts 10 each for missing audience and goal", () => {
    const r = { ...clear, targetAudience: "未明确", researchGoal: "未明确" };
    expect(calcClarityScore(r, "anything").score).toBe(100 - 10 - 10);
  });

  it("deducts 10 each for unquantified sample size and duration", () => {
    const r = { ...clear, sampleSize: "未指定", duration: "建议 2-3 周" };
    // 原文无数字 → 周期也判为未量化
    expect(calcClarityScore(r, "没有数字的文字").score).toBe(100 - 10 - 10);
  });

  it("deducts 15 per conflict", () => {
    const r = {
      ...clear,
      conflicts: ["⚠️ 大样本量 + 深度访谈 + 短周期", "⚠️ 目标人群未明确"],
    };
    expect(calcClarityScore(r, "20 人 14 天").score).toBe(100 - 15 * 2);
  });

  it("clamps the lower bound at 0 (never negative)", () => {
    const r: DecomposeResult = {
      ...clear,
      fuzzyMarks: ["尽快", "大概", "越多越好", "高端", "尽量", "可能", "也许", "差不多"],
      conflicts: ["⚠️ a", "⚠️ b", "⚠️ c", "⚠️ d", "⚠️ e", "⚠️ f", "⚠️ g"],
      targetAudience: "未明确",
      researchGoal: "未明确",
      sampleSize: "未指定",
      duration: "未指定",
    };
    expect(calcClarityScore(r, "无数字原文").score).toBe(0);
  });

  it("keeps notes in sync with the deductions (one note per penalty)", () => {
    const r = { ...clear, fuzzyMarks: ["尽快"], conflicts: ["⚠️ x"] };
    const { notes } = calcClarityScore(r, "20 人 14 天");
    expect(notes.filter((n) => n.includes("尽快"))).toHaveLength(1);
    expect(notes.filter((n) => n.includes("需求冲突"))).toHaveLength(1);
  });
});

describe("parseDurationDays", () => {
  it("parses days as-is", () => {
    expect(parseDurationDays("14天（合理，可执行）")).toBe(14);
    expect(parseDurationDays("7 天内完成")).toBe(7);
  });

  it("converts weeks to days (×7)", () => {
    expect(parseDurationDays("3 周")).toBe(21);
    // 「4-6 周」取离单位最近的数字 6 → 42（按偏大值规划更稳）
    expect(parseDurationDays("建议 4-6 周")).toBe(42);
  });

  it("converts months to days (×30)", () => {
    expect(parseDurationDays("2个月")).toBe(60);
  });

  it("falls back to a default when no unit is found", () => {
    expect(parseDurationDays("尽快交付")).toBe(21);
    expect(parseDurationDays("未指定")).toBe(21);
  });
});

describe("buildGanttPhases", () => {
  it("splits the total duration into 4 phases with the right keys", () => {
    const phases = buildGanttPhases("20天");
    expect(phases).toHaveLength(4);
    expect(phases.map((p) => p.key)).toEqual([
      "phase_recruit",
      "phase_execute",
      "phase_analyze",
      "phase_deliver",
    ]);
  });

  it("gives every phase at least 1 day", () => {
    const phases = buildGanttPhases("2天");
    expect(phases.every((p) => p.days >= 1)).toBe(true);
  });

  it("allocates execution the largest share (~40%)", () => {
    const phases = buildGanttPhases("100天");
    const exec = phases.find((p) => p.key === "phase_execute")!.days;
    expect(exec).toBeGreaterThanOrEqual(38);
    expect(exec).toBeLessThanOrEqual(42);
  });
});

describe("deriveRisks", () => {
  it("returns no risks for a clean result", () => {
    expect(deriveRisks({ conflicts: [], fuzzyMarks: [] })).toHaveLength(0);
  });

  it("maps conflicts to high-impact / high-probability risks", () => {
    const risks = deriveRisks({
      conflicts: ["⚠️ 大样本量 + 深度访谈 + 短周期"],
      fuzzyMarks: [],
    });
    expect(risks).toHaveLength(1);
    expect(risks[0].impact).toBe("high");
    expect(risks[0].probability).toBe("high");
  });

  it("treats missing-info conflicts (未明确/不清晰) as medium impact", () => {
    const risks = deriveRisks({
      conflicts: ["⚠️ 目标人群未明确", "⚠️ 研究目标不清晰"],
      fuzzyMarks: [],
    });
    expect(risks.every((r) => r.impact === "medium")).toBe(true);
  });

  it("escalates fuzzy-word probability when there are 3+", () => {
    const many = deriveRisks({ conflicts: [], fuzzyMarks: ["尽快", "大概", "越多越好"] });
    expect(many[0].impact).toBe("medium");
    expect(many[0].probability).toBe("high");

    const few = deriveRisks({ conflicts: [], fuzzyMarks: ["尽快"] });
    expect(few[0].probability).toBe("medium");
  });
});

describe("generateTrdByRule", () => {
  const base: DecomposeResult = {
    researchGoal: "了解购买决策",
    targetAudience: "年轻妈妈",
    researchScene: "产品测试/体验研究",
    researchType: "定性研究",
    depth: "L3 深度访谈",
    sampleSize: "20人（适合定性研究）",
    duration: "14天（合理，可执行）",
    interviewDuration: "45-60分钟/人",
    strategy: "场景还原 + 痛点挖掘",
    deliverables: ["访谈纪要", "核心洞察"],
    conflicts: [],
    fuzzyMarks: [],
  };

  it("emits the original section headers in order", () => {
    const trd = generateTrdByRule(base);
    expect(trd).toContain("# 项目基本信息");
    expect(trd).toContain("# AI 模型配置");
    expect(trd).toContain("# Prompt 模板");
    expect(trd).toContain("# 数据标签体系");
    expect(trd).toContain("# 报告框架");
    // basic info filled
    expect(trd).toContain("研究目标: 了解购买决策");
    expect(trd).toContain("目标人群: 年轻妈妈");
  });

  it("maps L3 depth to 深度 mode", () => {
    expect(generateTrdByRule(base)).toContain("追问深度模式: 深度");
    const l2 = { ...base, depth: "L2 探索访谈" };
    expect(generateTrdByRule(l2)).toContain("追问深度模式: 标准");
  });

  it("joins deliverables with + in the report section", () => {
    const trd = generateTrdByRule(base);
    expect(trd).toContain("访谈纪要 + 核心洞察");
  });
});
