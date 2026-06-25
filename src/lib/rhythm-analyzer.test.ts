import { describe, it, expect } from "vitest";
import { analyzeRhythm } from "./rhythm-analyzer";
import type { ChatMessage } from "./types";

/**
 * 节奏分析引擎的单元测试。
 *
 * 覆盖三类行为：
 * 1. 边界条件（轮数不足时返回空报告）
 * 2. 疲劳度评分（3 个信号的加权逻辑）
 * 3. 单轮打分 level（good/warn/risk）与趋势判断
 *
 * 注意：分析器从 ChatMessage.ts（时间戳）推算每轮间隔，
 * 因此构造测试数据时需要显式设置 ts。
 */

/** 构造一条带时间戳的消息。 */
function msg(role: "user" | "assistant", content: string, ts?: number): ChatMessage {
  return { role, content, ts };
}

describe("analyzeRhythm — 边界条件", () => {
  it("消息不足 4 条时返回空报告", () => {
    const r = analyzeRhythm([msg("user", "你好", 0)]);
    expect(r.points).toEqual([]);
    expect(r.fatigueScore).toBe(0);
    expect(r.trend).toBe("stable");
    expect(r.suggestion).toBeNull();
  });

  it("只有一轮用户回答（2 条消息）时返回空报告", () => {
    const r = analyzeRhythm([
      msg("user", "我觉得还不错", 0),
      msg("assistant", "追问", 100),
    ]);
    expect(r.points.length).toBeLessThan(2);
    expect(r.fatigueScore).toBe(0);
  });
});

describe("analyzeRhythm — 正常对话（低疲劳度）", () => {
  it("字数稳定、间隔稳定的健康对话应得低分", () => {
    const messages: ChatMessage[] = [
      msg("user", "我觉得这个产品的体验整体来说非常不错，功能也很丰富", 0),
      msg("assistant", "能具体说说哪个功能打动您吗？", 1_000),
      msg("user", "我最喜欢的是它的搜索功能，响应速度很快也很准确", 3_000),
      msg("assistant", "搜索之外还有让您满意的地方吗？", 4_000),
      msg("user", "界面的设计也很清爽，操作起来很顺手没有学习成本", 6_000),
      msg("assistant", "谢谢您的分享", 7_000),
    ];
    const r = analyzeRhythm(messages);
    expect(r.points.length).toBe(3);
    expect(r.fatigueScore).toBeLessThanOrEqual(30);
    expect(r.suggestion).toBeNull();
  });
});

describe("analyzeRhythm — 疲劳度信号", () => {
  it("信号 C：最后一轮回答极短（<15字）应累加疲劳分", () => {
    // 前几轮字数充足、最后一轮突然很短
    const messages: ChatMessage[] = [
      msg("user", "我觉得这个产品的体验整体来说非常不错，功能也很丰富", 0),
      msg("assistant", "追问1", 1_000),
      msg("user", "我最喜欢的是它的搜索功能，响应速度很快也很准确", 3_000),
      msg("assistant", "追问2", 4_000),
      msg("user", "还行吧", 6_000), // 3 字 → 触发信号 C
    ];
    const r = analyzeRhythm(messages);
    // 最后一轮 < 15 字 → +30；同时字数递减也可能再加分，故 >= 30
    expect(r.fatigueScore).toBeGreaterThanOrEqual(30);
  });

  it("信号 A：字数明显递减（>40%）应累加疲劳分", () => {
    // 前两轮 50+ 字，后两轮骤降到 5 字（递减远超 40%）
    const long1 = "我".repeat(60);
    const long2 = "我".repeat(55);
    const short1 = "嗯";
    const short2 = "哦";
    const messages: ChatMessage[] = [
      msg("user", long1, 0),
      msg("assistant", "追问1", 1_000),
      msg("user", long2, 2_000),
      msg("assistant", "追问2", 3_000),
      msg("user", short1, 4_000),
      msg("assistant", "追问3", 5_000),
      msg("user", short2, 6_000),
    ];
    const r = analyzeRhythm(messages);
    // 字数递减 > 40% → +40；最后一轮 < 15 → +30；总分应 >= 70
    expect(r.fatigueScore).toBeGreaterThanOrEqual(70);
  });

  it("信号 B：响应间隔明显递增（>50%）应累加疲劳分", () => {
    // 字数保持充足以隔离信号 B；间隔从 1s 涨到 10s+（远超 50%）
    const answer = "我觉得这个产品的体验整体来说非常不错".repeat(3); // 充足字数
    const messages: ChatMessage[] = [
      msg("user", answer, 0),
      msg("assistant", "追问1", 1_000),
      msg("user", answer, 2_000), // 间隔 1s
      msg("assistant", "追问2", 3_000),
      msg("user", answer, 15_000), // 间隔 12s
      msg("assistant", "追问3", 16_000),
      msg("user", answer, 30_000), // 间隔 14s
    ];
    const r = analyzeRhythm(messages);
    // 间隔递增 > 50% → +30
    expect(r.fatigueScore).toBeGreaterThanOrEqual(30);
  });

  it("疲劳度封顶在 100", () => {
    // 极端：所有信号同时拉满
    const messages: ChatMessage[] = [
      msg("user", "我".repeat(80), 0),
      msg("assistant", "追问1", 1_000),
      msg("user", "我".repeat(80), 2_000),
      msg("assistant", "追问2", 3_000),
      msg("user", "我".repeat(80), 5_000),
      msg("assistant", "追问3", 6_000),
      msg("user", "哦", 60_000), // 极短 + 极长间隔
    ];
    const r = analyzeRhythm(messages);
    expect(r.fatigueScore).toBeLessThanOrEqual(100);
  });

  it("疲劳度 > 60 时返回建议 key", () => {
    const messages: ChatMessage[] = [
      msg("user", "我".repeat(80), 0),
      msg("assistant", "追问1", 1_000),
      msg("user", "我".repeat(80), 2_000),
      msg("assistant", "追问2", 3_000),
      msg("user", "我".repeat(80), 5_000),
      msg("assistant", "追问3", 6_000),
      msg("user", "哦", 60_000),
    ];
    const r = analyzeRhythm(messages);
    expect(r.fatigueScore).toBeGreaterThan(60);
    expect(r.suggestion).toBe("rhythm_suggestion");
  });
});

describe("analyzeRhythm — 单轮 level 与趋势", () => {
  it("长回答 + 短间隔 → good", () => {
    // 需 ≥2 轮用户回答，分析器才会产出 points；每轮字数 ≥30 才判 good
    const messages: ChatMessage[] = [
      msg("user", "这是一个非常详细的回答内容，字数完全充足并且超过三十个字", 0),
      msg("assistant", "追问1", 1_000),
      msg("user", "这是另一个非常详细的回答内容，字数也完全充足并且超过三十个字", 2_000), // 间隔 1s
      msg("assistant", "追问2", 3_000),
      msg("user", "再来一个字数充足的详细回答内容，需要明显超过三十个字才可以判定为良好", 4_000), // 间隔 1s，≥30字
    ];
    const r = analyzeRhythm(messages);
    expect(r.points[r.points.length - 1].level).toBe("good");
  });

  it("极长间隔（>20s）→ risk", () => {
    const messages: ChatMessage[] = [
      msg("user", "这是一个非常详细的回答内容，字数完全充足", 0),
      msg("assistant", "追问1", 1_000),
      msg("user", "这是另一个非常详细的回答内容，字数也完全充足", 30_000), // 间隔 29s → risk
      msg("assistant", "追问2", 31_000),
      msg("user", "再来一个字数充足的详细回答内容", 32_000), // 间隔 1s，但前一轮验证 risk
    ];
    const r = analyzeRhythm(messages);
    // 第 2 轮（index 1）间隔 29s 应判为 risk
    expect(r.points[1].level).toBe("risk");
  });

  it("字数持续上升 → trend = rising", () => {
    const messages: ChatMessage[] = [
      msg("user", "短", 0),
      msg("assistant", "追问1", 1_000),
      msg("user", "中等长度的回答内容", 2_000),
      msg("assistant", "追问2", 3_000),
      msg("user", "这是一个非常详细且充分展开的回答内容，字数明显增长很多", 4_000),
    ];
    const r = analyzeRhythm(messages);
    expect(r.trend).toBe("rising");
  });

  it("字数持续下降 → trend = declining", () => {
    const messages: ChatMessage[] = [
      msg("user", "这是一个非常详细且充分展开的回答内容，字数明显很多很多", 0),
      msg("assistant", "追问1", 1_000),
      msg("user", "中等长度的回答", 2_000),
      msg("assistant", "追问2", 3_000),
      msg("user", "短", 4_000),
    ];
    const r = analyzeRhythm(messages);
    expect(r.trend).toBe("declining");
  });
});
