import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callFollowupAI, callChatAI, callDecomposeAI, callTrdAI } from "./ai-client";

/**
 * The whole point of ai-client is graceful fallback: any fetch failure (network,
 * non-2xx, abort) must silently return a result derived from the local rules,
 * flagged usedAI=false. The UI never sees an error.
 */
describe("ai-client fallback behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses AI response and sets usedAI=true on success (followup)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ question: "AI 生成的问题", strategy: "AI（标准模式）", usedAI: true }), {
        status: 200,
      })
    );
    const { data, usedAI } = await callFollowupAI("一段回答", "标准", "PC");
    expect(usedAI).toBe(true);
    expect(data.question).toBe("AI 生成的问题");
    expect(data.wordCount).toBe("AI 生成的问题".length);
  });

  it("falls back to local rules on network error (followup)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network down"));
    const { data, usedAI } = await callFollowupByFallbackCheck();
    expect(usedAI).toBe(false);
    // local rule for a price answer in standard mode:
    expect(data.strategy).toContain("价格敏感度");
  });

  it("falls back on non-2xx (followup)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("{}", { status: 503 })
    );
    const { usedAI } = await callFollowupAI("价格贵", "标准", "PC");
    expect(usedAI).toBe(false);
  });

  it("falls back to a synthesized follow-up on chat failure", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("timeout"));
    const { reply, usedAI } = await callChatAI([{ role: "user", content: "价格有点贵" }]);
    expect(usedAI).toBe(false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("decompose falls back to decomposeByRule on failure", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response("err", { status: 500 }));
    const { result, usedAI } = await callDecomposeAI("了解年轻妈妈的需求");
    expect(usedAI).toBe(false);
    // local rule extracts a goal containing 了解
    expect(result.researchGoal).toContain("了解");
  });

  it("trd falls back to generateTrdByRule on failure", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response("err", { status: 502 }));
    const { trd, usedAI } = await callTrdAI({
      researchGoal: "了解决策",
      targetAudience: "妈妈",
      researchScene: "产品测试/体验研究",
      researchType: "定性研究",
      depth: "L3 深度访谈",
      sampleSize: "10人",
      duration: "7天",
      interviewDuration: "45-60分钟/人",
      strategy: "场景还原",
      deliverables: ["纪要"],
      conflicts: [],
      fuzzyMarks: [],
    });
    expect(usedAI).toBe(false);
    expect(trd).toContain("# 项目基本信息");
  });

  it("posts to the correct endpoint with JSON body (followup)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ question: "q", strategy: "s", usedAI: true }), { status: 200 })
    );
    await callFollowupAI("回答", "精简", "移动端");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/project1/followup",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: "回答", mode: "精简", device: "移动端", lang: "zh-CN" }),
      })
    );
  });
});

/**
 * 多轮对话的疲劳度闭环测试。
 *
 * 这是 Project 1 的差异化核心：节奏面板检测到疲劳后，fatigueScore 回传给 AI。
 * AI 不可用时（本地兜底），疲劳度决定走哪条规则路径：
 * - 重度疲劳(≥60)：受访者已抵触 → 走破冰迂回（放下原话题，换轻松问题）
 * - 轻度疲劳(30-59)：注意力下降 → 走「精简」模式（压短原话题）
 * - 正常(<30)：走「标准」模式
 *
 * 这些测试确保疲劳信号真正改变兜底行为，而不是停留在展示层。
 */
describe("callChatAI fatigue-driven fallback", () => {
  beforeEach(() => {
    // 所有用例都让 fetch 失败，强制走本地兜底路径
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("重度疲劳(≥60)走破冰迂回，而非精简原话题", async () => {
    const { reply, usedAI } = await callChatAI(
      [{ role: "user", content: "价格有点贵" }],
      "zh-CN",
      70
    );
    expect(usedAI).toBe(false);
    // 破冰策略标记
    // （reply 来自破冰问题库，不应包含原话题的价格追问）
    expect(reply.length).toBeGreaterThan(0);
    // 破冰问题库里的句子，与价格追问区分明显
    expect(reply).not.toContain("价格");
  });

  it("轻度疲劳(30-59)走精简模式（压短原话题）", async () => {
    const { reply, usedAI } = await callChatAI(
      [{ role: "user", content: "价格有点贵" }],
      "zh-CN",
      45
    );
    expect(usedAI).toBe(false);
    // 精简模式的价格追问
    expect(reply).toBe("多少钱合适？");
  });

  it("正常状态(<30)走标准模式", async () => {
    const { reply } = await callChatAI(
      [{ role: "user", content: "价格有点贵" }],
      "zh-CN",
      10
    );
    // 标准模式的价格追问
    expect(reply).toBe("您提到价格，能说说心目中的合理价位吗？");
  });

  it("未传 fatigueScore 时默认按正常处理", async () => {
    const { reply } = await callChatAI([
      { role: "user", content: "价格有点贵" },
    ]);
    // 默认标准模式
    expect(reply).toBe("您提到价格，能说说心目中的合理价位吗？");
  });

  it("重度疲劳的破冰问题随轮次变化（不重复）", async () => {
    // 构造不同轮次的历史，验证破冰问题库的轮次索引生效
    const buildMsgs = (turns: number) => {
      const m: { role: "user" | "assistant"; content: string }[] = [];
      for (let i = 0; i < turns; i++) {
        m.push({ role: "user", content: "嗯" });
        m.push({ role: "assistant", content: "追问" });
      }
      return m;
    };
    const r1 = await callChatAI(buildMsgs(1), "zh-CN", 80);
    const r2 = await callChatAI(buildMsgs(2), "zh-CN", 80);
    // 轮次 1 和 2 取破冰池不同 index，应得到不同句子
    expect(r1.reply).not.toBe(r2.reply);
  });
});

// helper to keep the price-keyword assertion readable
async function callFollowupByFallbackCheck() {
  return callFollowupAI("这个价格有点贵", "标准", "PC");
}
