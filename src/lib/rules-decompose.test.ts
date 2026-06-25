import { describe, it, expect } from "vitest";
import { decomposeByRule, generateTrdByRule } from "./rules-decompose";
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
