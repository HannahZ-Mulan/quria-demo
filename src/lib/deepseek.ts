// 这个文件是"服务端专用"的 DeepSeek AI 客户端。
//
// 重要：它只能被 src/app/api/** 下的接口（Route Handler）引用，不能在
// 浏览器端组件里用。因为它会读取服务器上的环境变量 DEEPSEEK_API_KEY
// （没有 NEXT_PUBLIC_ 前缀），这个密钥不会被打包到浏览器代码里，所以不会泄露。

/**
 * DeepSeek 对话里的一条消息。
 * 比客户端的 ChatMessage（只有 user/assistant）更宽，因为服务端会先放一句 system 消息。
 */
export interface DeepSeekMessage {
  /** 说话的角色：system=系统设定, user=用户, assistant=AI 回复 */
  role: "system" | "user" | "assistant";
  /** 消息内容 */
  content: string;
}

// DeepSeek 对话接口的网址
const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";
// 使用的模型名称
const DEEPSEEK_MODEL = "deepseek-chat";
// 默认请求超时时间：30 秒
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * 没有配置 API 密钥时抛出的错误。
 * 调用方收到这个错误后，会改用本地规则兜底。
 */
export class DeepSeekConfigError extends Error {
  constructor() {
    super("DEEPSEEK_API_KEY is not configured");
    this.name = "DeepSeekConfigError";
  }
}

/**
 * DeepSeek 接口返回错误（非 2xx 状态码、或返回内容为空）时抛出的错误。
 * 会带上 HTTP 状态码，方便接口返回合适的错误码。
 */
export class DeepSeekApiError extends Error {
  /**
   * @param message - 错误说明文字
   * @param status - HTTP 状态码（比如 502、504）
   */
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "DeepSeekApiError";
  }
}

/**
 * 调用 DeepSeek 时的配置选项。
 */
export interface CallDeepSeekOptions {
  /** 对话消息列表（system 系统设定要放在第一个）。 */
  messages: DeepSeekMessage[];
  /**
   * 当填了这个值，会开启 JSON 输出模式。
   * 返回的内容保证是可以解析的 JSON。DeepSeek 要求提示词里必须出现 "json" 字样
   * 并给出示例格式，这个由调用方在写提示词时负责。
   */
  jsonSchema?: string;
  /** 最多生成多少个 token（字），默认 1024。 */
  maxTokens?: number;
  /** 请求超时时间（毫秒），默认 30 秒。 */
  timeoutMs?: number;
  /** 采样温度：越高越随机有创意，越低越稳定保守，默认 0.7。 */
  temperature?: number;
}

/**
 * 调用 DeepSeek 对话接口，返回 AI 生成的回复文字。
 *
 * - 没配置密钥 → 抛出 DeepSeekConfigError
 * - 请求失败/超时/返回错误 → 抛出 DeepSeekApiError
 *
 * @param options - 调用配置（消息、超时、温度等）
 * @returns AI 回复的文字内容
 */
export async function callDeepSeek({
  messages,
  jsonSchema,
  maxTokens = 1024,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  temperature = 0.7,
}: CallDeepSeekOptions): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new DeepSeekConfigError();
  }

  // 组装请求体
  const body: Record<string, unknown> = {
    model: DEEPSEEK_MODEL,
    messages,
    max_tokens: maxTokens,
    temperature,
  };
  if (jsonSchema) {
    // DeepSeek 兼容 OpenAI 格式：加上这个标记就开启 JSON 输出。
    // API 强制要求提示词里有 "json" 字样（由调用方保证）。
    body.response_format = { type: "json_object" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(DEEPSEEK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      // 请求超时被取消了
      throw new DeepSeekApiError("DeepSeek request timed out", 504);
    }
    // 其他网络错误（比如断网）
    throw new DeepSeekApiError(
      `Network error calling DeepSeek: ${err instanceof Error ? err.message : String(err)}`,
      502
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    // 接口返回了 4xx/5xx 错误
    const detail = await res.text().catch(() => "");
    throw new DeepSeekApiError(
      `DeepSeek API error ${res.status}: ${detail.slice(0, 500)}`,
      res.status
    );
  }

  const data = await res.json();
  // 从返回结构里取出 AI 回复的文字
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) {
    // DeepSeek 的 JSON 模式有个已知小毛病：偶尔会返回空内容
    throw new DeepSeekApiError("DeepSeek returned empty content", 502);
  }

  return content;
}

/**
 * 用 JSON 模式调用 DeepSeek，并直接把结果解析成对象。
 *
 * 如果返回的文字不是合法的 JSON，就抛出 DeepSeekApiError（调用方会改用本地规则）。
 *
 * @param options - 调用配置（必须带上 jsonSchema）
 * @returns 解析后的 JS 对象
 */
export async function callDeepSeekJSON<T>(
  options: Omit<CallDeepSeekOptions, "jsonSchema"> & { jsonSchema: string }
): Promise<T> {
  const content = await callDeepSeek({ ...options, jsonSchema: options.jsonSchema });
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new DeepSeekApiError("DeepSeek returned invalid JSON", 502);
  }
}

/**
 * 从捕获的错误里提取 HTTP 状态码。
 *
 * DeepSeekApiError 自带 status 字段，会直接返回；其他错误统一返回 500，
 * 这样接口能返回一个合理的错误码给前端。
 *
 * @param err - catch 到的错误对象
 * @returns HTTP 状态码数字
 */
export function extractStatus(err: unknown): number {
  return err && typeof err === "object" && "status" in err && typeof err.status === "number"
    ? err.status
    : 500;
}
