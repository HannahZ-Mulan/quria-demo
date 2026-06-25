// project1 single-turn follow-up: AI generates a research follow-up question that
// respects the length ceiling derived from answer length / mode / device.
// Returns a non-2xx on any failure so ai-client.ts falls back to local rules.

import { NextResponse } from "next/server";
import { callDeepSeekJSON, DeepSeekConfigError, extractStatus } from "@/lib/deepseek";
import type { FollowupRequest } from "@/lib/types";

const MAX_ANSWER_LEN = 2000;

/** Mirrors project1/page.tsx length-ceiling rules so the AI prompt stays accurate. */
function maxLengthFor(answerLength: number, mode: string, device: string): number {
  let max: number;
  if (answerLength <= 20) max = 30;
  else if (answerLength <= 100) max = 45;
  else max = 60;
  if (device === "移动端") max = Math.floor(max * 0.75);
  if (mode === "精简") max = Math.floor(max * 0.7);
  if (mode === "深度") max = Math.floor(max * 1.3);
  return max;
}

export async function POST(request: Request) {
  let body: FollowupRequest;
  try {
    body = (await request.json()) as FollowupRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { answer, mode, device } = body;
  if (
    typeof answer !== "string" ||
    typeof mode !== "string" ||
    typeof device !== "string" ||
    answer.trim().length === 0
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }
  if (answer.length > MAX_ANSWER_LEN) {
    return NextResponse.json({ error: "Answer too long" }, { status: 413 });
  }

  const answerLength = answer.trim().length;
  const maxLength = maxLengthFor(answerLength, mode, device);

  const systemPrompt = [
    "你是一位资深的用户研究访谈员，正在根据受访者的回答生成下一句追问。",
    "目标是挖出更深层的动机、场景或具体细节，追问必须自然、专业、口语化。",
    `约束：本次追问字数必须 ≤ ${maxLength} 字（按字符数计，含标点）。`,
    `当前模式：${mode}（精简=最短直击要点，标准=适中，深度=充分展开）。`,
    `目标设备：${device}${device === "移动端" ? "（移动端，问题要更简短）" : ""}。`,
    "如果受访者回答里有明确的关注点，优先围绕它追问；没有就做开放式引导。",
    "只输出 JSON，不要任何额外文字。json schema 示例：",
    '{"question":"追问内容","strategy":"本次追问策略标签（如\"价格敏感度（标准模式）\"）"}',
    "strategy 字段用「标签（模式）」格式，模式取「精简模式/标准模式/深度模式」。",
  ].join("\n");

  const userPrompt = `受访者回答：\n${answer}`;

  try {
    const parsed = await callDeepSeekJSON<{ question?: string; strategy?: string }>({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      jsonSchema: "question+strategy object",
      maxTokens: 512,
      temperature: 0.7,
    });

    const question = (parsed.question ?? "").trim();
    if (!question) {
      return NextResponse.json({ error: "Empty question" }, { status: 502 });
    }

    return NextResponse.json({
      question,
      strategy: (parsed.strategy ?? "AI 智能生成").trim(),
      usedAI: true,
    });
  } catch (err) {
    if (err instanceof DeepSeekConfigError) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }
    const status = extractStatus(err);
    return NextResponse.json({ error: "AI request failed" }, { status });
  }
}
