// Shared domain + API contract types for the DeepSeek AI integration.
// Importing from here keeps project1 / project3 pages and their API routes in sync.

// ===== project1: follow-up question length optimization =====

export type Mode = "精简" | "标准" | "深度";
export type Device = "PC" | "移动端";

export interface QuestionResult {
  question: string;
  /** Final word/character count of the generated follow-up. */
  wordCount: number;
  /** Human-readable processing strategy label. */
  strategy: string;
  /** Original (pre-compression) length reference, kept for the UI "压缩率" badge. */
  originalLength: number;
}

export interface FollowupRequest {
  answer: string;
  mode: Mode;
  device: Device;
}

export interface FollowupResponse {
  question: string;
  strategy: string;
  usedAI: boolean;
}

// ===== project1: multi-turn chat =====

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  usedAI: boolean;
}

// ===== project3: requirement decomposition =====

export interface DecomposeResult {
  researchGoal: string;
  targetAudience: string;
  researchScene: string;
  researchType: string;
  depth: string;
  sampleSize: string;
  duration: string;
  strategy: string;
  deliverables: string[];
  conflicts: string[];
  fuzzyMarks: string[];
}

export interface DecomposeRequest {
  rawRequirement: string;
}

export interface DecomposeResponse {
  result: DecomposeResult;
  usedAI: boolean;
}

// ===== project3: TRD generation =====

export interface TrdRequest {
  result: DecomposeResult;
}

export interface TrdResponse {
  trd: string;
  usedAI: boolean;
}
