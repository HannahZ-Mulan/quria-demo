// project3 生成 TRD 接口：让 AI 根据拆解结果，生成一份技术需求文档（Markdown 文本）。
// 任何失败都返回非 2xx，客户端会自动改用 generateTrdByRule 本地规则兜底。

import { NextResponse } from "next/server";
import { callDeepSeek, DeepSeekConfigError, extractStatus } from "@/lib/deepseek";
import type { TrdRequest } from "@/lib/types";

// 给 AI 的系统提示词：规定它要生成哪些章节、输出纯 Markdown
const SYSTEM_PROMPT = [
  "你是一位用户研究项目的技术方案撰写专家。根据给定的结构化研究拆解结果，生成一份技术需求文档（TRD）。",
  "输出纯 Markdown 文本（用 # 作为标题，不要 ``` 代码围栏）。包含以下章节，每节填具体内容：",
  "- # 项目基本信息（研究目标、目标人群、研究场景）",
  "- # AI 模型配置（追问深度模式、行业知识库、情感探测、多轮记忆轮数）",
  "- # Prompt 模板（系统 Prompt 和追问策略）",
  "- # 数据标签体系",
  "- # 报告框架（交付物）",
  "内容要具体、可执行，不要泛泛而谈。只输出文档本身，不要前后说明。",
].join("\n");

/**
 * 处理生成 TRD 的 POST 请求。
 * 校验入参 → 把拆解结果拼成 AI 提示词 → 调用 DeepSeek → 返回文档文本。
 * 入参不对返回 400；AI 没配置返回 503；调用失败或返回空返回对应错误码。
 *
 * @param request - 前端请求，body 含 result 拆解结果
 * @returns JSON 响应：成功 { trd, usedAI }，失败 { error }
 */
export async function POST(request: Request) {
  let body: TrdRequest;
  try {
    body = (await request.json()) as TrdRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { result } = body;
  if (!result || typeof result !== "object" || !result.researchScene) {
    return NextResponse.json({ error: "Missing result" }, { status: 400 });
  }

  const userPrompt = [
    "请基于以下结构化研究拆解结果生成 TRD：",
    "",
    `- 研究目标: ${result.researchGoal}`,
    `- 目标人群: ${result.targetAudience}`,
    `- 研究场景: ${result.researchScene}`,
    `- 研究类型: ${result.researchType}`,
    `- 访谈深度: ${result.depth}`,
    `- 样本量: ${result.sampleSize}`,
    `- 预计周期: ${result.duration}`,
    `- 追问策略: ${result.strategy}`,
    `- 交付物: ${result.deliverables.join("、")}`,
  ].join("\n");

  try {
    const trd = await callDeepSeek({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 1500,
      temperature: 0.6,
    });

    const clean = trd.trim();
    if (!clean) {
      return NextResponse.json({ error: "Empty TRD" }, { status: 502 });
    }
    return NextResponse.json({ trd: clean, usedAI: true });
  } catch (err) {
    if (err instanceof DeepSeekConfigError) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }
    const status = extractStatus(err);
    return NextResponse.json({ error: "AI request failed" }, { status });
  }
}
