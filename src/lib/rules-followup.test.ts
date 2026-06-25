import { describe, it, expect } from "vitest";
import { generateFollowupByRule } from "./rules-followup";

/**
 * Regression tests: the rule fallback must produce byte-for-byte identical output
 * to the original inline generateQuestion() in project1/page.tsx. These act as the
 * "golden samples" so the offline fallback keeps behaving exactly like before.
 */
describe("generateFollowupByRule", () => {
  it("matches price-sensitive branch and respects mode selection", () => {
    // 价格 / 贵 / 便宜 / 钱  → 价格敏感度
    const r = generateFollowupByRule("这个产品有点贵", "精简", "PC");
    expect(r.question).toBe("多少钱合适？");
    expect(r.wordCount).toBe(r.question.length);
    expect(r.strategy).toBe("价格敏感度（精简模式）");
  });

  it("selects the standard-mode question", () => {
    const r = generateFollowupByRule("价格太贵了", "标准", "PC");
    expect(r.question).toBe("您提到价格，能说说心目中的合理价位吗？");
    expect(r.strategy).toBe("价格敏感度（标准模式）");
  });

  it("selects the deep-mode question", () => {
    const r = generateFollowupByRule("价格因素很重要", "深度", "PC");
    expect(r.question).toContain("这个价格和您的预期差距大吗");
    expect(r.strategy).toBe("价格敏感度（深度模式）");
  });

  it("hits the experience branch", () => {
    const r = generateFollowupByRule("这个功能很好用", "标准", "PC");
    expect(r.strategy).toBe("使用场景（标准模式）");
  });

  it("hits the positive branch via '不错'", () => {
    const r = generateFollowupByRule("整体感觉不错", "精简", "PC");
    expect(r.question).toBe("最喜欢哪个点？");
    expect(r.strategy).toBe("偏好挖掘（精简模式）");
  });

  it("hits the negative branch", () => {
    // Use 失望 to avoid the substring trap: "不喜欢" contains "好", which the
    // positive branch matches first — that is the rule's real (buggy) behavior.
    const r = generateFollowupByRule("我对这个产品很失望", "标准", "PC");
    expect(r.strategy).toBe("顾虑澄清（标准模式）");
  });

  it("hits the brand branch", () => {
    const r = generateFollowupByRule("我比较看重大品牌", "标准", "PC");
    expect(r.strategy).toBe("品牌认知（标准模式）");
  });

  it("hits the recommendation branch", () => {
    const r = generateFollowupByRule("朋友推荐我来的", "标准", "PC");
    expect(r.strategy).toBe("社交影响（标准模式）");
  });

  it("hits the short-answer branch for very short input", () => {
    const r = generateFollowupByRule("还行", "深度", "PC");
    expect(r.strategy).toBe("短回答引导（深度模式）");
  });

  it("falls to the generic branch for unmatched long input", () => {
    // Avoid words containing 好/不错/价格/etc. so no keyword branch fires.
    const r = generateFollowupByRule("今天上午我参加了会议并且做了汇报演讲", "标准", "PC");
    expect(r.strategy).toBe("通用追问（标准模式）");
  });

  it("applies mobile adaptation when the chosen question exceeds the mobile cap", () => {
    // '深度' mode on mobile would normally exceed the reduced ceiling → falls back
    // to the short question with a 移动端适配 strategy.
    const r = generateFollowupByRule("价格因素很重要想多聊聊", "深度", "移动端");
    expect(r.strategy).toBe("价格敏感度（移动端适配）");
    expect(r.question).toBe("多少钱合适？");
  });

  it("originalLength = 该分支深度模式的长度（压缩率参考口径），与精简模式实际长度不同", () => {
    // 精简模式：实际很短，但 originalLength 取深度版长度 → 压缩率 > 0%
    const r = generateFollowupByRule("好用", "精简", "PC");
    expect(r.wordCount).toBe(r.question.length);
    // originalLength 应等于同一回答、同一分支在「深度模式」下生成的实际追问长度
    const deepRef = generateFollowupByRule("好用", "深度", "PC");
    expect(r.originalLength).toBe(deepRef.wordCount);
    expect(r.originalLength).toBeGreaterThan(r.wordCount);
  });

  it("深度模式下 originalLength === wordCount（诚实表达深度 = 不压缩，压缩率 0%）", () => {
    const r = generateFollowupByRule("好用", "深度", "PC");
    expect(r.originalLength).toBe(r.wordCount);
  });

  it("英文语言下返回英文追问与英文策略标签", () => {
    const r = generateFollowupByRule("the price is too high", "标准", "PC", "en");
    expect(r.question).toBe("You mentioned price — what would you consider a reasonable range?");
    expect(r.strategy).toBe("Price sensitivity (standard mode)");
  });

  it("英文界面下命中关键词分支", () => {
    // 'great' 属于正面分支关键词，且不触发其他分支
    const r = generateFollowupByRule("this product is great", "精简", "PC", "en");
    expect(r.strategy).toBe("Preference mining (compact mode)");
    expect(r.question).toBe("What did you like most?");
  });
});
