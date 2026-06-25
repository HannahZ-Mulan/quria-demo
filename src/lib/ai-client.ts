// CLIENT-side helpers for calling the AI Route Handlers with SILENT fallback
// to the local rule functions. Callers stay agnostic: they get the same shape of
// data whether AI succeeded or we fell back, plus an `usedAI` flag for optional UI hints.
//
// Any thrown error, network failure, timeout, or non-2xx response triggers the
// fallback — the demo never breaks even without a DEEPSEEK_API_KEY configured.

import type {
  Mode,
  Device,
  QuestionResult,
  ChatMessage,
  DecomposeResult,
} from "./types";
import { generateFollowupByRule } from "./rules-followup";
import { decomposeByRule, generateTrdByRule } from "./rules-decompose";

// Slightly longer than the server timeout (30s) so a server-side 504 is the
// thing that aborts, rather than the client racing the server.
const CLIENT_TIMEOUT_MS = 35_000;

async function postJSON<T>(url: string, payload: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * project1 single-turn follow-up. Falls back to generateFollowupByRule on any failure.
 * Returns a full QuestionResult plus usedAI.
 */
export async function callFollowupAI(
  answer: string,
  mode: Mode,
  device: Device
): Promise<{ data: QuestionResult; usedAI: boolean }> {
  try {
    const res = await postJSON<{
      question: string;
      strategy: string;
      usedAI: boolean;
    }>("/api/project1/followup", { answer, mode, device });
    return {
      data: {
        question: res.question,
        wordCount: res.question.length,
        strategy: res.strategy,
        originalLength: res.question.length,
      },
      usedAI: res.usedAI,
    };
  } catch {
    // Silent fallback to the original keyword-based logic.
    return { data: generateFollowupByRule(answer, mode, device), usedAI: false };
  }
}

/**
 * project1 multi-turn chat. Returns the assistant reply, or a locally generated
 * follow-up derived from the last user message if AI is unavailable.
 */
export async function callChatAI(
  messages: ChatMessage[]
): Promise<{ reply: string; usedAI: boolean }> {
  try {
    const res = await postJSON<{ reply: string; usedAI: boolean }>(
      "/api/project1/chat",
      { messages }
    );
    return { reply: res.reply, usedAI: res.usedAI };
  } catch {
    // Fallback: synthesize a generic follow-up from the latest user answer so the
    // conversation still progresses without a backend.
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const fallback = generateFollowupByRule(
      lastUser?.content ?? "",
      "标准",
      "PC"
    );
    return { reply: fallback.question, usedAI: false };
  }
}

/**
 * project3 requirement decomposition. Falls back to decomposeByRule on any failure.
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
 * project3 TRD generation. Falls back to generateTrdByRule on any failure.
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
