// 这个文件是"客户端"（浏览器里运行的页面）调用 AI 接口的帮手。
//
// 它的核心设计是：不管 AI 调用成功还是失败，调用方拿到的数据"形状"都一样，
// 只是多带了一个 usedAI 标记（true=真的用了 AI，false=本地规则兜底）。
// 这样即使没配置 DeepSeek 的 API 密钥，Demo 也不会报错。
//
// 任何错误（网络失败、超时、非 2xx 状态码）都会触发"静默兜底"，
// 自动改用本地规则（rules-*.ts）来生成结果，页面用户完全感觉不到出错。

import type {
  Mode,
  Device,
  QuestionResult,
  ChatMessage,
  DecomposeResult,
} from "./types";
import type { Language } from "@/i18n";
import { generateFollowupByRule } from "./rules-followup";
import { decomposeByRule, generateTrdByRule } from "./rules-decompose";

// 客户端超时时间：比服务端的 30 秒超时长一点（35 秒）。
// 这样能让服务端自己返回 504 错误，而不是客户端先因为超时取消请求。
const CLIENT_TIMEOUT_MS = 35_000;

/**
 * 计算「压缩率」的参考口径：取 PC + 深度模式下、与回答长度对应的最大字数上限。
 * 与 rules-followup 里「深度模式」的语义对齐——压缩率表达「比深度版压缩了多少」。
 * （深度模式字数 = 基础上限 × 1.3，见 followup/route.ts 的 maxLengthFor。）
 *
 * @param answerLength - 回答字数
 * @returns 深度模式（PC）下的字数上限
 */
function deepReferenceLength(answerLength: number): number {
  const base = answerLength <= 20 ? 30 : answerLength <= 100 ? 45 : 60;
  return Math.floor(base * 1.3);
}

/**
 * 向指定的接口发送一个 POST 请求，请求体是 JSON。
 * 内置超时控制：超过 CLIENT_TIMEOUT_MS 还没响应就自动取消请求。
 *
 * 这是一个泛型函数：`<T>` 表示返回的 JSON 数据会被当成 T 类型。
 *
 * @param url - 要请求的接口地址，比如 "/api/project1/followup"
 * @param payload - 要发送的数据，会被转成 JSON 字符串
 * @returns 服务器返回的 JSON 数据
 * @throws 只要请求失败、超时、或返回非 2xx 状态码，就抛出错误
 */
async function postJSON<T>(url: string, payload: unknown): Promise<T> {
  // AbortController 用来"取消"一个正在进行的请求
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal, // 把取消信号绑到这个请求上
    });
    if (!res.ok) {
      // res.ok 为 false 表示返回了 4xx/5xx 错误状态码
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    // 不管成功失败，都要清除定时器，避免内存泄漏
    clearTimeout(timeout);
  }
}

/**
 * project1 的"单轮追问"：根据用户的回答生成一句追问。
 *
 * 会先尝试调用 AI 接口；如果失败，就静默改用本地规则（generateFollowupByRule）。
 *
 * @param answer - 受访者输入的回答
 * @param mode - 追问的详细程度（精简/标准/深度）
 * @param device - 设备类型（PC/移动端）
 * @param lang - 界面语言（默认 zh-CN），决定追问与兜底语言
 * @returns `{ data: 追问结果, usedAI: 是否用了 AI }`
 */
export async function callFollowupAI(
  answer: string,
  mode: Mode,
  device: Device,
  lang: Language = "zh-CN"
): Promise<{ data: QuestionResult; usedAI: boolean }> {
  try {
    const res = await postJSON<{
      question: string;
      strategy: string;
      usedAI: boolean;
    }>("/api/project1/followup", { answer, mode, device, lang });
    return {
      data: {
        question: res.question,
        wordCount: res.question.length,
        strategy: res.strategy,
        originalLength: deepReferenceLength(answer.trim().length),
      },
      usedAI: res.usedAI,
    };
  } catch {
    // 静默兜底：AI 不可用，改用本地基于关键词的规则生成
    return { data: generateFollowupByRule(answer, mode, device, lang), usedAI: false };
  }
}

/**
 * project1 的"多轮对话"：把对话历史发给 AI，拿到 AI 的下一句回复。
 *
 * 如果 AI 不可用，就用最后一条用户消息临时合成一句追问，让对话能继续。
 *
 * @param messages - 完整的对话历史（用户和 AI 来回的消息）
 * @param lang - 界面语言（默认 zh-CN），决定兜底追问语言
 * @returns `{ reply: AI 回复内容, usedAI: 是否用了 AI }`
 */
export async function callChatAI(
  messages: ChatMessage[],
  lang: Language = "zh-CN"
): Promise<{ reply: string; usedAI: boolean }> {
  try {
    const res = await postJSON<{ reply: string; usedAI: boolean }>(
      "/api/project1/chat",
      { messages, lang }
    );
    return { reply: res.reply, usedAI: res.usedAI };
  } catch {
    // 兜底：从最后一条用户消息里临时生成一句追问，保证对话不中断
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const fallback = generateFollowupByRule(
      lastUser?.content ?? "",
      "标准",
      "PC",
      lang
    );
    return { reply: fallback.question, usedAI: false };
  }
}

/**
 * project3 的"需求拆解"：把一段模糊的需求拆成结构化方案。
 *
 * 失败时静默改用本地规则（decomposeByRule）。
 *
 * @param rawRequirement - 客户原始的需求文字
 * @returns `{ result: 拆解结果, usedAI: 是否用了 AI }`
 */
export async function callDecomposeAI(
  rawRequirement: string
): Promise<{ result: DecomposeResult; usedAI: boolean }> {
  try {
    const res = await postJSON<{
      result: DecomposeResult;
      usedAI: boolean;
    }>("/api/project3/decompose", { rawRequirement });
    return { result: res.result, usedAI: res.usedAI };
  } catch {
    return { result: decomposeByRule(rawRequirement), usedAI: false };
  }
}

/**
 * project3 的"生成 TRD"：根据拆解结果生成一份技术需求文档。
 *
 * 失败时静默改用本地规则（generateTrdByRule）。
 *
 * @param result - 之前拆解得到的结构化结果
 * @returns `{ trd: 技术需求文档文本, usedAI: 是否用了 AI }`
 */
export async function callTrdAI(
  result: DecomposeResult
): Promise<{ trd: string; usedAI: boolean }> {
  try {
    const res = await postJSON<{ trd: string; usedAI: boolean }>(
      "/api/project3/trd",
      { result }
    );
    return { trd: res.trd, usedAI: res.usedAI };
  } catch {
    return { trd: generateTrdByRule(result), usedAI: false };
  }
}
