// 本文件实现"基于规则"的追问生成（不依赖 AI）。
//
// 它是从最初 project1/page.tsx 里的 generateQuestion() 原样搬出来的，
// 保证 AI 不可用时的兜底结果，和原来"不用 AI"时一模一样。
// 当 DeepSeek 没配置或调用失败时，ai-client.ts 就会静默调用这里。

import type { Mode, Device, QuestionResult } from "./types";

/**
 * 根据用户回答里的"关键词" + 选择的模式/设备，用固定规则生成一句追问。
 *
 * 工作原理：
 * 1. 扫描回答里的关键词（比如"价格""好用""品牌"），判断属于哪类话题；
 * 2. 每类话题都预先准备了三种长度的问法（精简/标准/深度）；
 * 3. 按用户选的模式挑出对应的那句；
 * 4. 如果是移动端且问题太长，再退回到最短版本。
 *
 * @param answer - 受访者输入的回答
 * @param mode - 追问详细程度（精简/标准/深度）
 * @param device - 设备类型（PC/移动端）
 * @returns 生成结果（包含追问文字、字数、策略标签）
 */
export function generateFollowupByRule(
  answer: string,
  mode: Mode,
  device: Device
): QuestionResult {
  const answerLength = answer.trim().length;

  // 动态长度上限（仅用于显示和参考，实际追问按模式预生成）
  let maxLength: number;
  if (answerLength <= 20) maxLength = 30;
  else if (answerLength <= 100) maxLength = 45;
  else maxLength = 60;

  if (device === "移动端") maxLength = Math.floor(maxLength * 0.75);

  const lowerAnswer = answer.toLowerCase();

  let shortQuestion: string; // 精简模式
  let mediumQuestion: string; // 标准模式
  let longQuestion: string; // 深度模式
  let matchedStrategy = "关键词匹配";

  // ===== 价格相关 =====
  if (
    lowerAnswer.includes("价格") ||
    lowerAnswer.includes("贵") ||
    lowerAnswer.includes("便宜") ||
    lowerAnswer.includes("钱")
  ) {
    shortQuestion = "多少钱合适？";
    mediumQuestion = "您提到价格，能说说心目中的合理价位吗？";
    longQuestion =
      "您提到价格因素，能具体说说您心目中的合理价位是多少？这个价格和您的预期差距大吗？";
    matchedStrategy = "价格敏感度";
  }
  // ===== 体验相关 =====
  else if (
    lowerAnswer.includes("方便") ||
    lowerAnswer.includes("麻烦") ||
    lowerAnswer.includes("难用") ||
    lowerAnswer.includes("好用")
  ) {
    shortQuestion = "哪里不方便？";
    mediumQuestion = "您提到使用体验，能描述最让您不便的场景吗？";
    longQuestion =
      "您提到使用体验，能描述一下最让您感到不便的具体场景吗？当时是什么情况，您希望怎样改进？";
    matchedStrategy = "使用场景";
  }
  // ===== 正面评价 =====
  else if (
    lowerAnswer.includes("喜欢") ||
    lowerAnswer.includes("满意") ||
    lowerAnswer.includes("好") ||
    lowerAnswer.includes("不错")
  ) {
    shortQuestion = "最喜欢哪个点？";
    mediumQuestion = "您对产品比较认可，能说说最打动您的功能吗？";
    longQuestion =
      "您对产品比较认可，能说说最打动您的那个功能或特点吗？如果推荐给朋友，您会怎么描述？";
    matchedStrategy = "偏好挖掘";
  }
  // ===== 负面评价 =====
  else if (
    lowerAnswer.includes("不喜欢") ||
    lowerAnswer.includes("失望") ||
    lowerAnswer.includes("问题") ||
    lowerAnswer.includes("缺点")
  ) {
    shortQuestion = "主要问题是什么？";
    mediumQuestion = "您提到一些顾虑，如果产品能改善，会改变想法吗？";
    longQuestion =
      "您提到一些顾虑，能具体说说是什么让您不满意吗？如果产品能改善这一点，您愿意再给它一次机会吗？";
    matchedStrategy = "顾虑澄清";
  }
  // ===== 品牌相关 =====
  else if (
    lowerAnswer.includes("品牌") ||
    lowerAnswer.includes("牌子") ||
    lowerAnswer.includes("知名度")
  ) {
    shortQuestion = "品牌重要吗？";
    mediumQuestion = "您提到品牌，品牌知名度对购买决策影响大吗？";
    longQuestion =
      "您提到品牌因素，品牌知名度对您的购买决策影响有多大？您会为了品牌多付费吗？";
    matchedStrategy = "品牌认知";
  }
  // ===== 推荐相关 =====
  else if (
    lowerAnswer.includes("朋友") ||
    lowerAnswer.includes("推荐") ||
    lowerAnswer.includes("口碑") ||
    lowerAnswer.includes("别人")
  ) {
    shortQuestion = "谁推荐的？";
    mediumQuestion = "您提到他人推荐，更信任哪类人的推荐？";
    longQuestion =
      "您提到他人推荐，能说说您更信任哪类人的推荐吗？他们的推荐具体影响了您哪些决策？";
    matchedStrategy = "社交影响";
  }
  // ===== 回答很短 =====
  else if (answerLength <= 10) {
    shortQuestion = "能简单说下吗？";
    mediumQuestion = "您刚才的回答比较简洁，方便展开说说想法吗？";
    longQuestion =
      "您刚才的回答比较简洁，能展开说说您的想法吗？是什么让您有这样的感受？";
    matchedStrategy = "短回答引导";
  }
  // ===== 默认通用 =====
  else {
    shortQuestion = "能具体说说吗？";
    mediumQuestion = "您刚才提到的观点，能具体展开说说吗？";
    longQuestion =
      "您刚才提到的观点，能具体展开说说吗？这个经历中，最让您印象深刻的部分是什么？";
    matchedStrategy = "通用追问";
  }

  // 根据模式选择追问
  let finalQuestion: string;
  let strategy: string;

  if (mode === "精简") {
    finalQuestion = shortQuestion;
    strategy = matchedStrategy + "（精简模式）";
  } else if (mode === "标准") {
    finalQuestion = mediumQuestion;
    strategy = matchedStrategy + "（标准模式）";
  } else {
    finalQuestion = longQuestion;
    strategy = matchedStrategy + "（深度模式）";
  }

  // 移动端额外缩减（如果追问仍超过移动端限制，回退到短版本）
  if (device === "移动端" && finalQuestion.length > maxLength) {
    finalQuestion = shortQuestion;
    strategy = matchedStrategy + "（移动端适配）";
  }

  return {
    question: finalQuestion,
    wordCount: finalQuestion.length,
    strategy,
    originalLength: finalQuestion.length,
  };
}
