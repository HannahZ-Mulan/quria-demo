// SERVER-ONLY: DeepSeek API client.
// This module reads the API key from process.env.DEEPSEEK_API_KEY (no NEXT_PUBLIC_
// prefix) and MUST only be imported from Route Handlers under src/app/api/**.
// Importing it into a Client Component would bundle it (and a failed fetch), but
// would never leak the key since the env var is stripped from the client bundle.

// A message in a DeepSeek conversation. Broader than the client-side ChatMessage
// (user/assistant) because server prompts prepend a system message.
export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";
const DEFAULT_TIMEOUT_MS = 30_000;

/** Thrown when DEEPSEEK_API_KEY is not configured. Callers fall back to local rules. */
export class DeepSeekConfigError extends Error {
  constructor() {
    super("DEEPSEEK_API_KEY is not configured");
    this.name = "DeepSeekConfigError";
  }
}

/** Thrown when the DeepSeek API returns a non-2xx status or invalid/empty payload. */
export class DeepSeekApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "DeepSeekApiError";
  }
}

export interface CallDeepSeekOptions {
  /** Conversation messages (system prompt first). */
  messages: DeepSeekMessage[];
  /**
   * When provided, enables JSON output mode (`response_format: {type:"json_object"}`).
   * The returned string is guaranteed to be parseable JSON. DeepSeek requires the
   * prompt to mention "json" and include a schema/example — the caller is responsible
   * for that when passing `jsonSchema`.
   */
  jsonSchema?: string;
  /** Max generation tokens. Defaults to 1024. */
  maxTokens?: number;
  /** Request timeout in ms. Defaults to 30s. */
  timeoutMs?: number;
  /** Sampling temperature. Defaults to 0.7. */
  temperature?: number;
}

/**
 * Calls the DeepSeek Chat Completions endpoint and returns the assistant message content.
 * Throws DeepSeekConfigError if unconfigured, DeepSeekApiError on failure.
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

  const body: Record<string, unknown> = {
    model: DEEPSEEK_MODEL,
    messages,
    max_tokens: maxTokens,
    temperature,
  };
  if (jsonSchema) {
    // DeepSeek is OpenAI-compatible: JSON output is enabled by this flag. The
    // API mandates the prompt contains the word "json" (enforced by callers).
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
      throw new DeepSeekApiError("DeepSeek request timed out", 504);
    }
    throw new DeepSeekApiError(
      `Network error calling DeepSeek: ${err instanceof Error ? err.message : String(err)}`,
      502
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new DeepSeekApiError(
      `DeepSeek API error ${res.status}: ${detail.slice(0, 500)}`,
      res.status
    );
  }

  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) {
    // Known DeepSeek JSON-mode quirk: occasionally returns empty content.
    throw new DeepSeekApiError("DeepSeek returned empty content", 502);
  }

  return content;
}

/**
 * Calls DeepSeek in JSON mode and parses the result. Throws DeepSeekApiError if the
 * returned string is not valid JSON (callers fall back to local rules).
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
 * Safely extracts an HTTP-ish status from a caught error (DeepSeekApiError carries
 * one). Returns 500 for anything else so callers can return a sensible status code.
 */
export function extractStatus(err: unknown): number {
  return err && typeof err === "object" && "status" in err && typeof err.status === "number"
    ? err.status
    : 500;
}
