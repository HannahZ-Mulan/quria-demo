// project3 TRD generation: AI produces a Technical Requirements Document
// (Markdown) from a DecomposeResult. Non-2xx => client falls back to generateTrdByRule.

import { NextResponse } from "next/server";
import { callDeepSeek, DeepSeekConfigError, extractStatus } from "@/lib/deepseek";
import type { TrdRequest } from "@/lib/types";

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
