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
}

/**
 * 发给"多轮对话"接口（/api/project1/chat）的请求数据。
 * 就是把一整段对话历史发过去。
 */
export interface ChatRequest {
  /** 对话的消息列表（按时间顺序）。 */
  messages: ChatMessage[];
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
  /** 访谈时用的追问策略。 */
  strategy: string;
  /** 交付物清单：最后要产出哪些东西。 */
  deliverables: string[];
  /** 发现的需求冲突或问题（⚠️ 开头的提醒）。 */
  conflicts: string[];
  /** 原文里识别到的模糊用词（比如"尽快""大概"）。 */
  fuzzyMarks: string[];
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
