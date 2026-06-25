// project1 multi-turn chat: AI acts as a professional interviewer and asks one
// open-ended follow-up at a time, referencing prior context. Non-2xx => client falls back.

import { NextResponse } from "next/server";
import { callDeepSeek, DeepSeekConfigError, extractStatus } from "@/lib/deepseek";
import type { ChatMessage, ChatRequest } from "@/lib/types";

const MAX_TURNS = 10; // keep the most recent 10 user+assistant turns (excludes system)
const MAX_TOTAL_CHARS = 8000;

function clampMessages(messages: ChatMessage[]): ChatMessage[] {
  // Keep the most recent MAX_TURNS turns to control cost/latency.
  const trimmed = messages.slice(-MAX_TURNS);
  // If total chars exceed the cap, drop oldest messages until within budget.
  let total = trimmed.reduce((s, m) => s + m.content.length, 0);
  while (total > MAX_TOTAL_CHARS && trimmed.length > 1) {
    const removed = trimmed.shift()!;
    total -= removed.content.length;
  }
  return trimmed;
}

const SYSTEM_PROMPT = [
  "你是一位专业的用户研究访谈员，正在进行一次一对一定性访谈。",
  "规则：",
  "1. 每次只回复 ONE 个开放式追问，不要一次问多个问题。",
  "2. 结合受访者之前的回答上下文，自然地深挖动机、场景、具体例子。",
  "3. 语气自然、口语化、有同理心，像真人访谈员。",
  "4. 避免引导性或诱导性问题，保持中立。",
  "5. 控制在 60 字以内。",
  "6. 不要复述受访者的回答，直接追问。",
  "如果受访者只是简短回应，用开放式问题鼓励展开。",
].join("\n");

export async function POST(request: Request) {
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }

  const valid = messages.every(
    (m) =>
      m &&
      typeof m.content === "string" &&
      (m.role === "user" || m.role === "assistant")
  );
  if (!valid) {
    return NextResponse.json({ error: "Invalid message shape" }, { status: 400 });
  }

  const conversation = clampMessages(messages);

  try {
    const reply = await callDeepSeek({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...conversation.map((m) => ({ role: m.role, content: m.content })),
      ],
      maxTokens: 256,
      temperature: 0.8,
    });

    const clean = reply.trim();
    if (!clean) {
      return NextResponse.json({ error: "Empty reply" }, { status: 502 });
    }
    return NextResponse.json({ reply: clean, usedAI: true });
  } catch (err) {
    if (err instanceof DeepSeekConfigError) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }
    const status = extractStatus(err);
    return NextResponse.json({ error: "AI request failed" }, { status });
  }
}
