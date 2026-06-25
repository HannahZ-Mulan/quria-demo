// project3 需求拆解接口：让 AI 把客户模糊的需求，变成一份结构化的
// DecomposeResult（JSON），并附带冲突检测和模糊用词标记。
// 任何失败都返回非 2xx，客户端会自动改用 decomposeByRule 本地规则兜底。

import { NextResponse } from "next/server";
import { callDeepSeekJSON, DeepSeekConfigError, extractStatus } from "@/lib/deepseek";
import type { DecomposeRequest, DecomposeResult } from "@/lib/types";

// 原始需求文字的最大长度
const MAX_REQ_LEN = 4000;

// 给 AI 看的"输出格式示例"，告诉它每个字段该怎么填
const SCHEMA_EXAMPLE = `{
  "researchGoal": "一句话描述研究目标（未明确则填\"未明确\"）",
  "targetAudience": "目标人群画像（年龄/性别/职业/地域，未明确则填\"未明确\"）",
  "researchScene": "研究场景（如\"产品测试/体验研究\"\"品牌研究\"\"用户画像/人群洞察\"\"竞品分析\"\"满意度/NPS研究\"\"购买决策研究\"\"通用调研\"之一）",
  "researchType": "定性研究 / 定量研究 / 混合研究（定性+定量） / 建议定性研究（先探索）",
  "depth": "L1 快速筛查 / L2 探索访谈 / L3 深度访谈",
  "sampleSize": "样本量与建议（如\"15人（适合深度个案）\"或\"建议 100-300 人（统计显著性）\"）",
  "duration": "预计周期与评估（如\"14天（合理，可执行）\"或\"建议 2-3 周\"）",
  "interviewDuration": "每场访谈的建议时长（如\"20-30分钟/人\"，L1=10-15分钟、L2=20-30分钟、L3=45-60分钟）",
  "strategy": "追问策略，多个用 + 连接",
  "deliverables": ["交付物1", "交付物2"],
  "conflicts": ["发现的需求冲突或缺失（无则空数组）"],
  "fuzzyMarks": ["原文中识别到的模糊表述词（无则空数组）"]
}`;

const SYSTEM_PROMPT = [
  "你是一位资深用户研究专家。把客户模糊的研究需求标准化拆解成结构化研究方案。",
  "你要主动识别：目标人群是否缺失、样本量与深度访谈是否冲突、周期是否合理、是否有\"越快越好\"\"尽量\"这类模糊表述。",
  "字段全部用简体中文。sampleSize/duration 要带括号说明。conflicts 数组里每条以 ⚠️ 开头。",
  "只输出 JSON，不要任何额外文字。json schema 如下：",
  SCHEMA_EXAMPLE,
].join("\n");

/**
 * 处理需求拆解的 POST 请求。
 * 校验入参 → 拼 AI 提示词（带输出格式示例）→ 调用 DeepSeek（JSON 模式）
 * → 把结果做防御性整理（缺字段就补默认值）→ 返回。
 * 入参不对返回 400；需求太长返回 413；AI 没配置返回 503；调用失败返回对应错误码。
 *
 * @param request - 前端请求，body 含 rawRequirement 原始需求
 * @returns JSON 响应：成功 { result, usedAI }，失败 { error }
 */
export async function POST(request: Request) {
  let body: DecomposeRequest;
  try {
    body = (await request.json()) as DecomposeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { rawRequirement } = body;
  if (typeof rawRequirement !== "string" || rawRequirement.trim().length === 0) {
    return NextResponse.json({ error: "Missing rawRequirement" }, { status: 400 });
  }
  if (rawRequirement.length > MAX_REQ_LEN) {
    return NextResponse.json({ error: "Requirement too long" }, { status: 413 });
  }

  try {
    const result = await callDeepSeekJSON<Partial<DecomposeResult>>({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `客户原始需求：\n${rawRequirement}` },
      ],
      jsonSchema: "DecomposeResult object",
      maxTokens: 1500,
      temperature: 0.5,
    });

    // Normalize arrays defensively in case the model omits/mistypes a field.
    const normalizedDepth = result.depth ?? "L2 探索访谈";
    const defaultInterviewDuration = normalizedDepth.includes("L3")
      ? "45-60分钟/人"
      : normalizedDepth.includes("L2")
        ? "20-30分钟/人"
        : "10-15分钟/人";
    const normalized: DecomposeResult = {
      researchGoal: result.researchGoal ?? "未明确",
      targetAudience: result.targetAudience ?? "未明确",
      researchScene: result.researchScene ?? "通用调研",
      researchType: result.researchType ?? "建议定性研究（先探索）",
      depth: normalizedDepth,
      sampleSize: result.sampleSize ?? "未指定",
      duration: result.duration ?? "未指定",
      interviewDuration: result.interviewDuration ?? defaultInterviewDuration,
      strategy: result.strategy ?? "开放式探索",
      deliverables: Array.isArray(result.deliverables)
        ? result.deliverables.filter((d) => typeof d === "string")
        : ["访谈纪要/原始语料", "核心洞察提炼"],
      conflicts: Array.isArray(result.conflicts)
        ? result.conflicts.filter((c) => typeof c === "string")
        : [],
      fuzzyMarks: Array.isArray(result.fuzzyMarks)
        ? result.fuzzyMarks.filter((f) => typeof f === "string")
        : [],
    };

    return NextResponse.json({ result: normalized, usedAI: true });
  } catch (err) {
    if (err instanceof DeepSeekConfigError) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }
    const status = extractStatus(err);
    return NextResponse.json({ error: "AI request failed" }, { status });
  }
}
