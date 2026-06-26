// project1 多轮对话接口：让 AI 扮演专业访谈员，每次只问一个开放式追问，
// 并结合上下文自然深入。如果返回非 2xx 错误，客户端会自动改用本地规则兜底。

import { NextResponse } from "next/server";
import { callDeepSeek, DeepSeekConfigError, extractStatus } from "@/lib/deepseek";
import type { ChatMessage, ChatRequest } from "@/lib/types";
import type { Language } from "@/i18n";

// 最多保留最近 10 轮对话（不含 system 消息），用来控制成本和延迟
const MAX_TURNS = 10;
// 对话总字数上限，超过就从最旧的消息开始丢弃
const MAX_TOTAL_CHARS = 8000;

/**
 * 裁剪对话历史，避免发给 AI 的内容过长（控制成本和延迟）。
 * 先只保留最近 MAX_TURNS 轮，如果总字数还是超过上限，就继续从最旧的丢起。
 *
 * @param messages - 原始的全部对话消息
 * @returns 裁剪后的对话消息
 */
function clampMessages(messages: ChatMessage[]): ChatMessage[] {
  // 只保留最近的 MAX_TURNS 轮
  const trimmed = messages.slice(-MAX_TURNS);
  // 如果总字数超限，就从最旧的消息开始丢弃，直到达标
  let total = trimmed.reduce((s, m) => s + m.content.length, 0);
  while (total > MAX_TOTAL_CHARS && trimmed.length > 1) {
    const removed = trimmed.shift()!;
    total -= removed.content.length;
  }
  return trimmed;
}

// 给 AI 的"系统提示词"：告诉它扮演什么角色、要遵守哪些规则
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

/**
 * 根据疲劳度动态生成"追问风格"指令。
 *
 * 这是访谈节奏分析的闭环核心：前端的节奏面板检测到受访者疲劳后，
 * 把 fatigueScore 回传到本接口，AI 据此调整追问策略。
 *
 * 关键设计——对齐真人访谈员的 craft，分两档应对：
 * - 轻度疲劳(30-59)：受访者只是注意力下降，把当前追问收短、降低难度即可。
 * - 重度疲劳(≥60)：受访者已抵触，绝不能继续追问原话题（哪怕压短了还是在追着问）。
 *   要像真人访谈员那样"放下"当前问题，换一个低门槛的轻松话题转移注意力，
 *   等受访者放松、重建信任后，再找机会自然地迂回。
 *
 * 三档阈值与前端仪表盘的颜色分级（good<30 / warn 30-59 / risk≥60）一致。
 *
 * @param fatigueScore - 疲劳度 0-100，未提供时视为 0（正常）
 * @returns 追加到 system prompt 的风格指令（可为空字符串）
 */
function fatigueInstruction(fatigueScore: number = 0): string {
  if (fatigueScore >= 60) {
    return [
      "\n【受访者状态：严重疲劳/抵触】务必像真人访谈员一样「迂回」，不要继续追问当前话题：",
      "- 完全放下刚才的话题，换一个轻松、低门槛、好答的问题转移注意力（例如日常生活、最近的小事、个人偏好）。",
      "- 不要为了字数短而继续逼问原问题——受访者会觉得被追着问、更抗拒。",
      "- 语气更口语、更轻松，可以加一句过渡（「聊点别的」「不急，随便聊聊」）。",
      "- 等受访者重新愿意开口、回答变长后，再找机会自然地把话题引回来。",
    ].join("\n");
  }
  if (fatigueScore >= 30) {
    return [
      "\n【受访者状态：参与度一般】",
      "- 把追问控制在 40 字以内，避免一次抛出太重的问题。",
    ].join("\n");
  }
  return "";
}

/**
 * 处理多轮对话的 POST 请求。
 * 接收对话历史 → 裁剪 → 调用 DeepSeek → 返回 AI 的下一句回复。
 * 请求格式不对返回 400；AI 没配置返回 503；AI 调用失败返回对应错误码。
 *
 * @param request - 前端发来的请求，body 里带 messages 对话历史
 * @returns JSON 响应：成功时 { reply, usedAI }，失败时 { error }
 */
export async function POST(request: Request) {
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages, lang, fatigueScore } = body;
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
  // AI 用语言：未指定时默认简体中文
  const replyLang: Language = lang ?? "zh-CN";
  const langInstruction =
    replyLang === "en"
      ? "Respond entirely in English."
      : "全部用简体中文回复。";
  // 疲劳度触发自适应追问风格（节奏分析的闭环）
  const systemPrompt = `${SYSTEM_PROMPT}${fatigueInstruction(fatigueScore)}\n${langInstruction}`;

  try {
    const reply = await callDeepSeek({
      messages: [
        { role: "system", content: systemPrompt },
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
