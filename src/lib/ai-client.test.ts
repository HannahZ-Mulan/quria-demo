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

// helper to keep the price-keyword assertion readable
async function callFollowupByFallbackCheck() {
  return callFollowupAI("这个价格有点贵", "标准", "PC");
}
