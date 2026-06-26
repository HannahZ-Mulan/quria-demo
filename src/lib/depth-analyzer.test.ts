import { describe, it, expect } from "vitest";
import { classifyDepth, analyzeDepth } from "./depth-analyzer";
import type { ChatMessage } from "./types";

/**
 * 追问深度分析引擎的单元测试。
 *
 * 与 rhythm-analyzer.test.ts 结构对称，覆盖：
 * 1. classifyDepth 关键词判定（5 个漏斗层级）
 * 2. analyzeDepth 边界条件（轮数不足返回空报告）
 * 3. 深度分计算、趋势判断、建议触发
 *
 * 测试依据：docs/memos/interview-techniques.md 的漏斗式追问理论。
 */

/** 构造一条消息。 */
function msg(role: "user" | "assistant", content: string, ts?: number): ChatMessage {
  return { role, content, ts };
}

/* ============================================================
 * classifyDepth —— 漏斗层级关键词判定
 * ============================================================ */
describe("classifyDepth — 关键词判定", () => {
  it("表层关键词判为 wide", () => {
    expect(classifyDepth("您平时一般怎么用这类产品？")).toBe("wide");
    expect(classifyDepth("How do you usually feel about it?")).toBe("wide");
  });

  it("场景还原关键词判为 mid", () => {
    expect(classifyDepth("能具体说说是什么情况吗？")).toBe("mid");
    expect(classifyDepth("Can you give me an example?")).toBe("mid");
  });

  it("细节聚焦关键词判为 narrow", () => {
    expect(classifyDepth("当时最让你在意的是哪一点？")).toBe("narrow");
    expect(classifyDepth("Why did you choose that one?")).toBe("narrow");
  });

  it("动机挖掘关键词判为 deep", () => {
    expect(classifyDepth("为什么这一点对您来说特别重要？")).toBe("deep");
    expect(classifyDepth("What does it mean to you personally?")).toBe("deep");
  });

  it("破冰迂回关键词判为 detour", () => {
    expect(classifyDepth("你平时周末一般喜欢做点什么呢？")).toBe("detour");
    expect(classifyDepth("Thanks for your patience today.")).toBe("detour");
  });

  it("未命中任何关键词时默认为 wide（保守归表层）", () => {
    expect(classifyDepth("好的")).toBe("wide");
    expect(classifyDepth("xyz")).toBe("wide");
  });

  it("多层关键词同时命中时取最深（漏斗下钻原则）", () => {
    // 同时含"平时"（wide）和"为什么重要"（deep），应判 deep
    expect(classifyDepth("您平时怎么用？为什么这个对您重要？")).toBe("deep");
  });
});

/* ============================================================
 * analyzeDepth —— 边界条件
 * ============================================================ */
describe("analyzeDepth — 边界条件", () => {
  it("消息不足 3 条时返回空报告", () => {
    const r = analyzeDepth([msg("user", "你好", 0), msg("assistant", "追问", 1)]);
    expect(r.points).toEqual([]);
    expect(r.depthScore).toBe(0);
    expect(r.trend).toBe("stable");
    expect(r.suggestion).toBeNull();
  });

  it("只有 1 条 AI 追问时返回空报告（需要 ≥2 轮）", () => {
    const r = analyzeDepth([
      msg("user", "问题", 0),
      msg("assistant", "您平时怎么用？", 1),
    ]);
    expect(r.points.length).toBeLessThan(2);
  });

  it("空消息列表返回空报告", () => {
    const r = analyzeDepth([]);
    expect(r.points).toEqual([]);
    expect(r.depthScore).toBe(0);
  });
});

/* ============================================================
 * analyzeDepth —— 深度分与趋势
 * ============================================================ */
describe("analyzeDepth — 深度分计算", () => {
  it("持续表层追问 → 低深度分 + 停留在表层建议", () => {
    const convo = [
      msg("user", "回答1", 0),
      msg("assistant", "您平时整体感受怎么样？", 1), // wide
      msg("user", "回答2", 2),
      msg("assistant", "一般您怎么用？", 3), // wide
      msg("user", "回答3", 4),
      msg("assistant", "平时通常的使用场景？", 5), // wide
    ];
    const r = analyzeDepth(convo);
    expect(r.points.length).toBe(3);
    expect(r.depthScore).toBeLessThan(40); // 全是 wide，权重 15
    expect(r.suggestion).toBe("depth_suggestion"); // 触发建议
  });

  it("逐层下钻 → 高深度分 + 无建议", () => {
    const convo = [
      msg("user", "回答1", 0),
      msg("assistant", "您平时怎么用？", 1), // wide
      msg("user", "回答2", 2),
      msg("assistant", "能具体说说什么情况吗？", 3), // mid
      msg("user", "回答3", 4),
      msg("assistant", "为什么这一点对您重要？", 5), // deep
    ];
    const r = analyzeDepth(convo);
    // wide(15) + mid(35) + deep(95) = 145 / 3 ≈ 48
    expect(r.depthScore).toBeGreaterThanOrEqual(40);
    // 最近一轮是 deep，不应触发"停在表层"建议
    expect(r.suggestion).toBeNull();
  });

  it("全 deep 追问 → 接近满分", () => {
    const convo = [
      msg("user", "回答1", 0),
      msg("assistant", "为什么这对您重要？意味着什么？", 1), // deep
      msg("user", "回答2", 2),
      msg("assistant", "对你来说这背后的原因是什么？", 3), // deep
    ];
    const r = analyzeDepth(convo);
    expect(r.depthScore).toBe(95); // deep 权重 95
  });
});

describe("analyzeDepth — 趋势判断", () => {
  it("后半段比前半段深 → deepening", () => {
    const convo = [
      msg("user", "回答1", 0),
      msg("assistant", "您平时怎么用？", 1), // wide(15)
      msg("user", "回答2", 2),
      msg("assistant", "能具体说说吗？", 3), // mid(35)
      msg("user", "回答3", 4),
      msg("assistant", "当时最让你在意的是？", 5), // narrow(65)
      msg("user", "回答4", 6),
      msg("assistant", "为什么这一点对您重要？", 7), // deep(95)
    ];
    const r = analyzeDepth(convo);
    expect(r.trend).toBe("deepening");
  });

  it("后半段比前半段浅 → flat", () => {
    const convo = [
      msg("user", "回答1", 0),
      msg("assistant", "为什么这对您重要？", 1), // deep(95)
      msg("user", "回答2", 2),
      msg("assistant", "当时印象最深的是？", 3), // narrow(65)
      msg("user", "回答3", 4),
      msg("assistant", "您平时整体感受怎么样？", 5), // wide(15)
      msg("user", "回答4", 6),
      msg("assistant", "一般您怎么用？", 7), // wide(15)
    ];
    const r = analyzeDepth(convo);
    expect(r.trend).toBe("flat");
  });
});

describe("analyzeDepth — detour 层级（疲劳迂回）", () => {
  it("破冰问题判定为 detour，不触发表层建议", () => {
    // 疲劳迂回时 AI 换了破冰问题，应判 detour 而非 wide
    const convo = [
      msg("user", "嗯", 0),
      msg("assistant", "您平时周末一般喜欢做点什么呢？", 1), // detour
      msg("user", "还行", 2),
      msg("assistant", "谢谢你这么有耐心，还想听你的感受", 3), // detour
    ];
    const r = analyzeDepth(convo);
    expect(r.points.every((p) => p.level === "detour")).toBe(true);
    // detour 是策略性的，不应被当成"停在表层"的差表现
    expect(r.suggestion).toBeNull();
  });
});
