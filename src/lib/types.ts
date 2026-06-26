// 这个文件里放的是整个项目"共用"的类型定义（type 和 interface）。
// 简单说：它规定了 project1（追问优化）和 project3（需求拆解）两个功能之间
// 传递数据时，数据应该长什么样。前后端都引用这个文件，保证数据格式一致。

// ===== project1：追问问题长度优化功能 =====

/**
 * 追问的"详细程度"模式，分三档：
 * - "精简"：追问最短，直击要点
 * - "标准"：追问长度适中
 * - "深度"：追问充分展开，挖得更深
 */
export type Mode = "精简" | "标准" | "深度";

/**
 * 用户用来回答问题的设备类型：
 * - "PC"：电脑端
 * - "移动端"：手机端（移动端会自动把问题改短）
 */
export type Device = "PC" | "移动端";

/**
 * 生成一条追问后返回的结果。
 * 这就是页面上"问题输出"那一块展示的数据。
 */
export interface QuestionResult {
  /** 最终生成的追问文字。 */
  question: string;
  /** 追问的字数（字符数），用来在页面上显示。 */
  wordCount: number;
  /** 处理策略的文字标签，比如"价格敏感度（标准模式）"。 */
  strategy: string;
  /** 原始长度参考值，用来计算页面上的"压缩率"小标签。 */
  originalLength: number;
}

/**
 * 发给"单轮追问"接口（/api/project1/followup）的请求数据。
 * 包含用户的回答、选的模式、选的设备。
 */
export interface FollowupRequest {
  /** 受访者输入的回答内容。 */
  answer: string;
  /** 选择的追问详细程度模式。 */
  mode: Mode;
  /** 选择的设备类型。 */
  device: Device;
  /** 界面语言（可选），决定 AI 与本地兜底的追问语言。 */
  lang?: import("@/i18n").Language;
}

/**
 * "单轮追问"接口返回的数据。
 */
export interface FollowupResponse {
  /** 生成的追问文字。 */
  question: string;
  /** 本次生成使用的策略标签。 */
  strategy: string;
  /** 是否真的用了 AI（false 表示用的是本地规则兜底）。 */
  usedAI: boolean;
}

// ===== project1：多轮对话功能 =====

/**
 * 对话里的一条消息。
 * 角色只有两种："user" 是用户说的话，"assistant" 是 AI/机器人说的话。
 */
export interface ChatMessage {
  /** 说话的人：用户还是 AI。 */
  role: "user" | "assistant";
  /** 这条消息的文字内容。 */
  content: string;
  /**
   * 这条消息发出的时间戳（ms，Date.now()）。
   * 仅用于前端节奏分析（计算回答间隔），API 不需要这个字段。
   * 老消息没有时间戳时按 undefined 处理。
   */
  ts?: number;
}

// ===== project1：访谈节奏分析（多轮对话专用） =====

/**
 * 某一轮对话的节奏数据点。
 * "一轮" = 用户回答一次。
 */
export interface RhythmPoint {
  /** 第几轮（从 1 开始）。 */
  turn: number;
  /** 该轮用户回答的字数。 */
  charCount: number;
  /** 该轮用户从 AI 说完到回复的间隔（毫秒）。无法计算时为 0。 */
  delayMs: number;
  /** 该轮状态：good 正常 / warn 注意 / risk 风险。 */
  level: "good" | "warn" | "risk";
}

/**
 * 整段对话的节奏报告。由节奏分析引擎根据消息历史算出。
 */
export interface RhythmReport {
  /** 每轮的节奏数据点。 */
  points: RhythmPoint[];
  /** 整体疲劳度 0-100，越高越疲劳。 */
  fatigueScore: number;
  /** 参与度趋势：rising 上升 / stable 平稳 / declining 下降。 */
  trend: "rising" | "stable" | "declining";
  /** 建议文案的 i18n key（疲劳度高时返回 "rhythm_suggestion"，否则 null）。 */
  suggestion: string | null;
}

// ===== project1：追问深度分析（漏斗层级可视化） =====

/**
 * AI 追问的漏斗深度层级。
 *
 * 来自深度访谈方法论（见 docs/memos/interview-techniques.md）的漏斗式追问理论：
 * 好的访谈应该从宽到窄逐层下钻，而不是一直在表层打转。
 * - wide:   表层探索（宏观问题，如"平时怎么用"）
 * - mid:    场景还原（如"具体什么情况"）
 * - narrow: 细节聚焦（如"当时最让你在意的是"）
 * - deep:   动机/价值观挖掘（如"为什么这对您重要"）
 * - detour: 主动放生（疲劳迂回时换的轻松破冰问题）
 */
export type DepthLevel = "wide" | "mid" | "narrow" | "deep" | "detour";

/**
 * 某一轮 AI 追问的深度数据点。
 */
export interface DepthPoint {
  /** 第几轮 AI 追问（从 1 开始）。 */
  turn: number;
  /** 该轮追问判定的漏斗层级。 */
  level: DepthLevel;
  /** 该轮追问的字数。 */
  charCount: number;
}

/**
 * 整段对话的追问深度报告。由深度分析引擎根据 AI 消息历史算出。
 */
export interface DepthReport {
  /** 每轮 AI 追问的深度数据点。 */
  points: DepthPoint[];
  /** 整体下钻深度 0-100，越高表示 AI 越往深层挖（越好）。 */
  depthScore: number;
  /** 深度趋势：deepening 加深 / stable 平稳 / flat 停滞。 */
  trend: "deepening" | "stable" | "flat";
  /** 建议文案的 i18n key（一直在表层打转时返回 "depth_suggestion"，否则 null）。 */
  suggestion: string | null;
}

/**
 * 发给"多轮对话"接口（/api/project1/chat）的请求数据。
 * 就是把一整段对话历史发过去。
 */
export interface ChatRequest {
  /** 对话的消息列表（按时间顺序）。 */
  messages: ChatMessage[];
  /** 界面语言（可选），决定 AI 回复语言。 */
  lang?: import("@/i18n").Language;
  /**
   * 当前访谈疲劳度评分（0-100，可选）。
   * 由前端节奏分析引擎算出，回传给 AI 接口和本地兜底。
   * 高疲劳度时 AI 会自动缩短追问、换轻松话题——这是节奏分析的"闭环"。
   */
  fatigueScore?: number;
}

/**
 * "多轮对话"接口返回的数据。
 */
export interface ChatResponse {
  /** AI 回复的内容。 */
  reply: string;
  /** 是否真的用了 AI（false 表示用的是本地规则兜底）。 */
  usedAI: boolean;
}

// ===== project3：需求拆解功能 =====

/**
 * 把客户一段"模糊的需求"拆解后，得到的一份结构化研究结果。
 * 这就是把一团乱麻一样的需求，整理成有规律的字段。
 */
export interface DecomposeResult {
  /** 研究目标：这次调研想搞清楚什么事情。 */
  researchGoal: string;
  /** 目标人群：要研究谁（年龄/性别/职业/地区等）。 */
  targetAudience: string;
  /** 研究场景：属于哪类研究（产品体验/品牌/用户画像等）。 */
  researchScene: string;
  /** 研究类型：定性、定量、还是混合。 */
  researchType: string;
  /** 访谈深度：L1 快速筛查 / L2 探索访谈 / L3 深度访谈。 */
  depth: string;
  /** 建议的样本量（找多少人参与）。 */
  sampleSize: string;
  /** 预计要花多长时间。 */
  duration: string;
  /** 每场访谈的建议时长（如「20-30分钟/人」），与 duration（项目总周期）区分。 */
  interviewDuration: string;
  /** 访谈时用的追问策略。 */
  strategy: string;
  /** 交付物清单：最后要产出哪些东西。 */
  deliverables: string[];
  /** 发现的需求冲突或问题（⚠️ 开头的提醒）。 */
  conflicts: string[];
  /** 原文里识别到的模糊用词（比如"尽快""大概"）。 */
  fuzzyMarks: string[];
  /**
   * 需求清晰度评分（0-100，越高越清晰）。
   * 由 calcClarityScore 在 fuzzyMarks/conflicts/缺失量词的基础上扣分得出，
   * 让用户第一眼量化地看到「这份需求有多模糊」。
   * 兼容性：缺省时按 0 处理（旧数据/旧缓存）。
   */
  clarityScore?: number;
  /** 清晰度评分的逐项扣分说明，用于在卡片上解释分数来源（如「命中模糊词「尽快」 -8」）。 */
  clarityNotes?: string[];
}

// ===== project3：TRD 交付增强（Gantt 时间线 + 风险矩阵） =====

/**
 * Gantt 时间线里的一个阶段。
 * 由 buildGanttPhases 把项目总周期按研究流程拆成 4 段（招募/执行/分析/交付）。
 */
export interface GanttPhase {
  /** 阶段 i18n key（phase_recruit / phase_execute / phase_analyze / phase_deliver）。 */
  key: string;
  /** 该阶段预估天数。 */
  days: number;
  /** 配色名，对应前端色板（青/紫/粉/琥珀）。 */
  color: "cyan" | "violet" | "pink" | "amber";
}

/**
 * 风险矩阵里的一项风险。
 * 由 deriveRisks 从 conflicts + fuzzyMarks 衍生，映射到「影响 × 概率」的格子里。
 */
export interface RiskItem {
  /** 风险描述文字。 */
  text: string;
  /** 影响等级：high 高 / medium 中 / low 低。 */
  impact: "high" | "medium" | "low";
  /** 发生概率：high 高 / medium 中 / low 低。 */
  probability: "high" | "medium" | "low";
}

/**
 * 发给"需求拆解"接口（/api/project3/decompose）的请求数据。
 */
export interface DecomposeRequest {
  /** 客户原始的、可能很模糊的需求文字。 */
  rawRequirement: string;
}

/**
 * "需求拆解"接口返回的数据。
 */
export interface DecomposeResponse {
  /** 拆解出来的结构化结果。 */
  result: DecomposeResult;
  /** 是否真的用了 AI（false 表示用的是本地规则兜底）。 */
  usedAI: boolean;
}

// ===== project3：技术需求文档（TRD）生成功能 =====

/**
 * 发给"生成 TRD"接口（/api/project3/trd）的请求数据。
 * 把拆解结果传过去，让它生成一份技术需求文档。
 */
export interface TrdRequest {
  /** 之前拆解得到的结构化结果。 */
  result: DecomposeResult;
}

/**
 * "生成 TRD"接口返回的数据。
 */
export interface TrdResponse {
  /** 生成的技术需求文档（一段 Markdown 文字）。 */
  trd: string;
  /** 是否真的用了 AI（false 表示用的是本地规则兜底）。 */
  usedAI: boolean;
}
