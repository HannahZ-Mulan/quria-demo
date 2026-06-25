// project1 单轮追问接口：让 AI 生成一句符合字数限制的追问。
// 字数限制根据"回答长度 / 模式 / 设备"动态计算。
// 任何失败都会返回非 2xx，客户端会自动改用本地规则兜底。

import { NextResponse } from "next/server";
import { callDeepSeekJSON, DeepSeekConfigError, extractStatus } from "@/lib/deepseek";
import type { FollowupRequest } from "@/lib/types";
import type { Language } from "@/i18n";

// 回答文字的最大长度（防止有人输入超长内容）
const MAX_ANSWER_LEN = 2000;

/**
 * 根据回答长度、模式、设备，算出本次追问允许的最大字数。
 * 这套规则和 project1/page.tsx 页面上显示的"建议限制"保持一致，
 * 这样 AI 提示词里告诉它的限制才是准确的。
 *
 * @param answerLength - 回答的字数（去掉首尾空格后）
 * @param mode - 追问详细程度（精简/标准/深度）
 * @param device - 设备类型（PC/移动端）
 * @returns 允许的最大字数
 */
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

/**
 * 处理单轮追问的 POST 请求。
 * 校验入参 → 计算字数限制 → 拼 AI 提示词 → 调用 DeepSeek（JSON 模式）→ 返回追问。
 * 入参不对返回 400；回答太长返回 413；AI 没配置返回 503；调用失败返回对应错误码。
 *
 * @param request - 前端请求，body 含 answer/mode/device
 * @returns JSON 响应：成功 { question, strategy, usedAI }，失败 { error }
 */
export async function POST(request: Request) {
  let body: FollowupRequest;
  try {
    body = (await request.json()) as FollowupRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { answer, mode, device, lang } = body;
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
  // AI 用语言：未指定时默认简体中文，保持向后兼容
  const replyLang: Language = lang ?? "zh-CN";
  const langInstruction =
    replyLang === "en"
      ? "Respond entirely in English."
      : "全部用简体中文回复。";

  const systemPrompt = [
    "你是一位资深的用户研究访谈员，正在根据受访者的回答生成下一句追问。",
    "目标是挖出更深层的动机、场景或具体细节，追问必须自然、专业、口语化。",
    langInstruction,
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
