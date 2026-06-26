// 本文件实现"基于规则"的追问生成（不依赖 AI）。
//
// 它是从最初 project1/page.tsx 里的 generateQuestion() 原样搬出来的，
// 保证 AI 不可用时的兜底结果，和原来"不用 AI"时一模一样。
// 当 DeepSeek 没配置或调用失败时，ai-client.ts 就会静默调用这里。

import type { Mode, Device, QuestionResult } from "./types";
import type { Language } from "@/i18n";

/**
 * 一类关键词话题的模板定义。
 * - keywords：触发该话题的关键词，中英两套，按当前语言匹配。
 * - strategy：策略标签的中英两套文案。
 * - short/medium/long：精简/标准/深度三种长度的追问问法，中英两套。
 */
type TopicTemplate = {
  keywords: { "zh-CN": string[]; en: string[] };
  strategy: { "zh-CN": string; en: string };
  short: { "zh-CN": string; en: string };
  medium: { "zh-CN": string; en: string };
  long: { "zh-CN": string; en: string };
};

/**
 * 八类话题的模板表。中文文案与最初的固定规则完全一致（回归测试保护），
 * 英文文案为后补的等价翻译，保证英文界面下本地兜底也能返回英文追问。
 * 顺序即匹配优先级：价格 > 体验 > 正面 > 负面 > 品牌 > 推荐 > 短回答 > 通用。
 */
const TOPIC_TEMPLATES: TopicTemplate[] = [
  {
    keywords: { "zh-CN": ["价格", "贵", "便宜", "钱"], en: ["price", "expensive", "cheap", "cost"] },
    strategy: { "zh-CN": "价格敏感度", en: "Price sensitivity" },
    short: { "zh-CN": "多少钱合适？", en: "What price feels right?" },
    medium: { "zh-CN": "您提到价格，能说说心目中的合理价位吗？", en: "You mentioned price — what would you consider a reasonable range?" },
    long: { "zh-CN": "您提到价格因素，能具体说说您心目中的合理价位是多少？这个价格和您的预期差距大吗？", en: "You mentioned price as a factor. What would you consider a reasonable price, and how big is the gap between that and your expectations?" },
  },
  {
    keywords: { "zh-CN": ["方便", "麻烦", "难用", "好用"], en: ["convenient", "inconvenient", "hard to use", "easy to use", "handy"] },
    strategy: { "zh-CN": "使用场景", en: "Usage scenario" },
    short: { "zh-CN": "哪里不方便？", en: "What was inconvenient?" },
    medium: { "zh-CN": "您提到使用体验，能描述最让您不便的场景吗？", en: "You mentioned the experience — can you describe the moment that felt least convenient?" },
    long: { "zh-CN": "您提到使用体验，能描述一下最让您感到不便的具体场景吗？当时是什么情况，您希望怎样改进？", en: "You mentioned the experience. Can you describe the specific moment that felt most inconvenient — what was happening, and how would you want it improved?" },
  },
  {
    keywords: { "zh-CN": ["喜欢", "满意", "好", "不错"], en: ["like", "satisfied", "good", "nice", "great", "love"] },
    strategy: { "zh-CN": "偏好挖掘", en: "Preference mining" },
    short: { "zh-CN": "最喜欢哪个点？", en: "What did you like most?" },
    medium: { "zh-CN": "您对产品比较认可，能说说最打动您的功能吗？", en: "You seem positive about the product — which feature impressed you most?" },
    long: { "zh-CN": "您对产品比较认可，能说说最打动您的那个功能或特点吗？如果推荐给朋友，您会怎么描述？", en: "You seem positive about the product. Which feature or trait impressed you most, and how would you describe it if recommending it to a friend?" },
  },
  {
    keywords: { "zh-CN": ["不喜欢", "失望", "问题", "缺点"], en: ["dislike", "disappointed", "problem", "issue", "drawback", "downside"] },
    strategy: { "zh-CN": "顾虑澄清", en: "Concern clarification" },
    short: { "zh-CN": "主要问题是什么？", en: "What's the main concern?" },
    medium: { "zh-CN": "您提到一些顾虑，如果产品能改善，会改变想法吗？", en: "You mentioned some concerns. If the product improved on this, would it change your mind?" },
    long: { "zh-CN": "您提到一些顾虑，能具体说说是什么让您不满意吗？如果产品能改善这一点，您愿意再给它一次机会吗？", en: "You mentioned some concerns. Can you be specific about what left you unsatisfied, and if it improved, would you give it another chance?" },
  },
  {
    keywords: { "zh-CN": ["品牌", "牌子", "知名度"], en: ["brand", "reputation", "well-known"] },
    strategy: { "zh-CN": "品牌认知", en: "Brand perception" },
    short: { "zh-CN": "品牌重要吗？", en: "Does brand matter?" },
    medium: { "zh-CN": "您提到品牌，品牌知名度对购买决策影响大吗？", en: "You mentioned brand — how much does brand awareness drive your purchase decision?" },
    long: { "zh-CN": "您提到品牌因素，品牌知名度对您的购买决策影响有多大？您会为了品牌多付费吗？", en: "You mentioned brand. How much does brand awareness drive your purchase decision, and would you pay a premium for a brand?" },
  },
  {
    keywords: { "zh-CN": ["朋友", "推荐", "口碑", "别人"], en: ["friend", "recommend", "word of mouth", "others"] },
    strategy: { "zh-CN": "社交影响", en: "Social influence" },
    short: { "zh-CN": "谁推荐的？", en: "Who recommended it?" },
    medium: { "zh-CN": "您提到他人推荐，更信任哪类人的推荐？", en: "You mentioned a recommendation — whose recommendations do you trust most?" },
    long: { "zh-CN": "您提到他人推荐，能说说您更信任哪类人的推荐吗？他们的推荐具体影响了您哪些决策？", en: "You mentioned a recommendation. Whose recommendations do you trust most, and how exactly did they shape your decision?" },
  },
  {
    // 短回答引导：不靠关键词，按 answerLength 单独处理（见下方分支）
    keywords: { "zh-CN": [], en: [] },
    strategy: { "zh-CN": "短回答引导", en: "Short-answer probing" },
    short: { "zh-CN": "能简单说下吗？", en: "Could you say a bit more?" },
    medium: { "zh-CN": "您刚才的回答比较简洁，方便展开说说想法吗？", en: "Your answer was quite brief — could you expand on your thinking?" },
    long: { "zh-CN": "您刚才的回答比较简洁，能展开说说您的想法吗？是什么让您有这样的感受？", en: "Your answer was quite brief. Could you expand on what you were thinking, and what gave you that impression?" },
  },
  {
    // 通用兜底
    keywords: { "zh-CN": [], en: [] },
    strategy: { "zh-CN": "通用追问", en: "General follow-up" },
    short: { "zh-CN": "能具体说说吗？", en: "Could you be more specific?" },
    medium: { "zh-CN": "您刚才提到的观点，能具体展开说说吗？", en: "Could you expand on the point you just made?" },
    long: { "zh-CN": "您刚才提到的观点，能具体展开说说吗？这个经历中，最让您印象深刻的部分是什么？", en: "Could you expand on the point you just made? What stood out most to you in that experience?" },
  },
];

/** 模式后缀文案（拼在策略标签后面，如「价格敏感度（标准模式）」） */
const MODE_SUFFIX: Record<Mode, { "zh-CN": string; en: string }> = {
  精简: { "zh-CN": "精简模式", en: "compact mode" },
  标准: { "zh-CN": "标准模式", en: "standard mode" },
  深度: { "zh-CN": "深度模式", en: "deep mode" },
};
/** 移动端适配后缀 */
const MOBILE_SUFFIX = { "zh-CN": "移动端适配", en: "mobile-adapted" };

/**
 * 破冰问题库：受访者疲劳/抵触时，用来重建信任的轻松话题。
 *
 * 设计依据：真人访谈员在受访者抵触时不会继续追问原话题，
 * 而是放下当前问题，换一个低门槛、好答的轻松问题转移注意力，
 * 等受访者放松、重建信任后再找机会迂回。
 *
 * 按访谈阶段分三组，避免连续两次问同一个破冰问题。
 */
const RAPPORT_QUESTIONS: Record<"early" | "mid" | "late", { "zh-CN": string[]; en: string[] }> = {
  // 访谈早期：回到受访者本身、轻松日常
  early: {
    "zh-CN": [
      "你平时周末一般喜欢做点什么呢？",
      "除了这个，最近有没有碰到什么让你觉得有趣的事？",
      "你平时是怎么安排自己的一天的呀？",
    ],
    en: [
      "What do you usually like to do on weekends?",
      "Has anything fun happened to you lately, apart from this?",
      "How do you usually organize your day?",
    ],
  },
  // 访谈中期：转回场景、降低抽象度
  mid: {
    "zh-CN": [
      "聊点别的，你上次用这类产品是什么时候？",
      "换个角度，你觉得什么样的体验会让你觉得舒服？",
      "不急，你想到什么都可以随便聊聊。",
    ],
    en: [
      "Let's switch gears — when did you last use something like this?",
      "From another angle, what makes an experience feel comfortable to you?",
      "No rush, feel free to chat about whatever comes to mind.",
    ],
  },
  // 访谈后期：感谢 + 鼓励重新参与
  late: {
    "zh-CN": [
      "谢谢你这么有耐心，我想确认下，还有哪些是你觉得特别重要的？",
      "辛苦啦，前面聊了很多，有没有什么是我想问但没问到的？",
      "你前面提到的几点都很有帮助，最后想听听你真实的感受就好。",
    ],
    en: [
      "Thanks for your patience — is there anything you feel is especially important?",
      "Thanks for sticking with me. Is there anything I should've asked but didn't?",
      "The points you raised were really helpful. I'd love to just hear your honest feeling.",
    ],
  },
};

/**
 * 受访者疲劳/抵触时的「迂回」策略：放下当前话题，换一个轻松问题重建信任。
 *
 * 与「精简模式」的区别：精简是把原话题压短（受访者仍被追着问），
 * 迂回是完全切换话题（受访者被「放生」）——这才是真人访谈员的 craft。
 *
 * @param turnCount - 已完成的轮次（用来挑早/中/晚期的破冰问题）
 * @param lang - 界面语言
 * @returns 破冰问题结果（策略标签标记为「破冰迂回」）
 */
export function generateRapportByRule(
  turnCount: number,
  lang: Language = "zh-CN"
): QuestionResult {
  const L: "zh-CN" | "en" = lang === "en" ? "en" : "zh-CN";
  // 按轮次选阶段：前 4 轮早期，5-9 轮中期，10+ 轮晚期
  const phase: "early" | "mid" | "late" =
    turnCount >= 10 ? "late" : turnCount >= 5 ? "mid" : "early";
  // 用轮次做伪随机，避免连续两次问同一句
  const pool = RAPPORT_QUESTIONS[phase][L];
  const question = pool[turnCount % pool.length];
  return {
    question,
    wordCount: question.length,
    strategy:
      L === "en"
        ? "Rapport-building (fatigue)"
        : "破冰迂回（疲劳应对）",
    originalLength: question.length,
  };
}

/**
 * 根据用户回答里的"关键词" + 选择的模式/设备，用固定规则生成一句追问。
 *
 * 工作原理：
 * 1. 按当前语言扫描回答里的关键词，判断属于哪类话题；
 * 2. 每类话题都预先准备了三种长度的问法（精简/标准/深度）；
 * 3. 按用户选的模式挑出对应的那句；
 * 4. 如果是移动端且问题太长，再退回到最短版本。
 *
 * @param answer - 受访者输入的回答
 * @param mode - 追问详细程度（精简/标准/深度）
 * @param device - 设备类型（PC/移动端）
 * @param lang - 界面语言（默认 zh-CN），决定模板与关键词语言
 * @returns 生成结果（包含追问文字、字数、策略标签）
 */
export function generateFollowupByRule(
  answer: string,
  mode: Mode,
  device: Device,
  lang: Language = "zh-CN"
): QuestionResult {
  const answerLength = answer.trim().length;

  // 动态长度上限（仅用于显示和参考，实际追问按模式预生成）
  let maxLength: number;
  if (answerLength <= 20) maxLength = 30;
  else if (answerLength <= 100) maxLength = 45;
  else maxLength = 60;

  if (device === "移动端") maxLength = Math.floor(maxLength * 0.75);

  const lowerAnswer = answer.toLowerCase();

  // 把 9 种语言收敛成「有模板的两种」：英文用 en，其余语言一律用中文模板兜底。
  const L: "zh-CN" | "en" = lang === "en" ? "en" : "zh-CN";
  let template = TOPIC_TEMPLATES[TOPIC_TEMPLATES.length - 1]; // 默认通用兜底

  for (let i = 0; i < TOPIC_TEMPLATES.length - 2; i++) {
    // 前 6 个是关键词话题
    if (TOPIC_TEMPLATES[i].keywords[L].some((kw) => lowerAnswer.includes(kw.toLowerCase()))) {
      template = TOPIC_TEMPLATES[i];
      break;
    }
  }
  // 短回答引导：没命中关键词且回答很短
  if (template === TOPIC_TEMPLATES[TOPIC_TEMPLATES.length - 1] && answerLength <= 10) {
    template = TOPIC_TEMPLATES[TOPIC_TEMPLATES.length - 2]; // 短回答引导
  }

  const shortQuestion = template.short[L];
  const mediumQuestion = template.medium[L];
  const longQuestion = template.long[L];
  const matchedStrategy = template.strategy[L];

  // 根据模式选择追问
  // 中文策略标签格式「策略（模式）」用全角括号且无空格；
  // 英文「Strategy (mode)」用半角括号且带空格。
  const label = (suffix: string) =>
    L === "en" ? `${matchedStrategy} (${suffix})` : `${matchedStrategy}（${suffix}）`;
  let finalQuestion: string;
  let strategy: string;

  if (mode === "精简") {
    finalQuestion = shortQuestion;
    strategy = label(MODE_SUFFIX.精简[L]);
  } else if (mode === "标准") {
    finalQuestion = mediumQuestion;
    strategy = label(MODE_SUFFIX.标准[L]);
  } else {
    finalQuestion = longQuestion;
    strategy = label(MODE_SUFFIX.深度[L]);
  }

  // 移动端额外缩减（如果追问仍超过移动端限制，回退到短版本）
  if (device === "移动端" && finalQuestion.length > maxLength) {
    finalQuestion = shortQuestion;
    strategy = label(MOBILE_SUFFIX[L]);
  }

  // 压缩率参考口径：取本关键词分支下「深度模式」那句完整追问的长度。
  // 这样压缩率表达的是「比深度版压缩了多少」——精简模式明显压缩、标准模式中等、
  // 深度模式显示 0%（诚实表达「深度 = 不压缩」）。
  return {
    question: finalQuestion,
    wordCount: finalQuestion.length,
    strategy,
    originalLength: longQuestion.length,
  };
}
