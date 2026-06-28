# 假设驱动追问 — Detailed Implementation Plan

> **作者**: Hannah
> **日期**: 2026-06-27
> **类型**: Implementation Plan
> **关联**: `optimization-suggestions.md` 方向 A · `interview-techniques.md`
> **预估**: 1-1.5 天（原型）/ 纯前端 + prompt 改造

---

## 一、要解决的核心问题

**现状**：Project 1 的 AI 访谈员是"收集型"的——问什么完全靠受访者回答里的关键词临时决定。它不知道这场访谈要解决什么商业决策、核心假设是什么。

**后果**：两个 demo 是"两个独立产品"。Project 3 拆出来的研究目标（研究目标、人群、深度、核心议题），从来没流进 Project 1 的 AI。这是端到端系统里断裂的那座桥。

**目标**：让 AI 访谈员从"会说话的问卷"变成"有研究意图的访谈员"——
1. 用户在对话开始前声明 1-2 个核心假设
2. AI 在追问时**主动测试**这些假设：触及假设时深挖，偏离时有策略地拉回
3. UI 上可视化"这轮追问是否在测假设"，让双仪表多一层含义

---

## 二、用户故事 & 验收标准

### 故事 1：作为研究员，我想声明核心假设
> "我在做一场关于奶粉购买决策的访谈，我的假设是'年轻妈妈主要听医生推荐'。我希望 AI 在访谈中主动去验证这个假设。"

**验收标准**：
- [ ] 多轮对话开始前，有一个"研究假设"输入区（最多 2 条，每条一句话）
- [ ] 可选填——不填也能正常对话（向后兼容）
- [ ] 支持从 Project 3 继承（URL query 或 context 传入，demo 阶段可手动填）

### 故事 2：作为研究员，我想看到 AI 是否在测假设
> "访谈进行中，我想看到每一轮追问是在测假设，还是在泛泛收集。"

**验收标准**：
- [ ] 深度面板的柱状图上，测假设的轮次有特殊标记（如紫色描边 + "🎯" 徽章）
- [ ] 鼠标悬停显示"该轮正在测试假设：XXX"
- [ ] 新增一个"假设测试进度"小指标：已测 / 未测 / 部分支持 / 部分反对

### 故事 3：作为研究员，我想看到假设的验证结果
> "访谈结束时，我想看到假设是被支持、反对、还是数据不足。"

**验收标准**：
- [ ] 对话结束（或轮次 ≥ N）时，生成"假设验证摘要"
- [ ] 每条假设标注：✅ 支持 / ❌ 反对 / ⚠️ 证据不足
- [ ] 引用受访者原话作为证据

---

## 三、技术设计

### 3.1 数据模型（`src/lib/types.ts`）

新增类型，紧接在 `DepthReport` 之后：

```typescript
/**
 * 用户在对话前声明的研究假设。
 * 这是 Research Plan 的最小化版本——只取"要检验的核心猜想"。
 */
export interface ResearchHypothesis {
  /** 假设的唯一 id。 */
  id: string;
  /** 假设内容（一句话）。如"年轻妈妈选奶粉主要听医生推荐"。 */
  statement: string;
}

/**
 * 某一轮 AI 追问与假设的关系。
 */
export interface HypothesisProbe {
  /** 第几轮（与 DepthPoint.turn 对齐）。 */
  turn: number;
  /** 该轮是否在测试某条假设，null = 未测。 */
  testingHypothesisId: string | null;
}

/**
 * 一条假设的验证状态。
 */
export type HypothesisVerdict = "untested" | "partial-support" | "supported" | "contradicted" | "insufficient";

/**
 * 整段对话的假设测试报告。
 */
export interface HypothesisReport {
  /** 假设列表（来自用户输入）。 */
  hypotheses: ResearchHypothesis[];
  /** 每轮的假设测试记录。 */
  probes: HypothesisProbe[];
  /** 每条假设的验证状态。 */
  verdicts: Record<string, HypothesisVerdict>;
}
```

---

### 3.2 假设测试分析引擎（`src/lib/hypothesis-analyzer.ts`，新建）

**纯前端规则引擎**，与 `rhythm-analyzer.ts` / `depth-analyzer.ts` 对称。不依赖 API 改造。

**核心算法**：判定"这轮 AI 追问是否在测假设"

```typescript
import type {
  ChatMessage, ResearchHypothesis, HypothesisProbe, HypothesisVerdict, HypothesisReport
} from "./types";

/**
 * 从假设陈述里抽取关键词（去停用词、取实词）。
 * 如"年轻妈妈选奶粉主要听医生推荐" → ["年轻妈妈","奶粉","医生","推荐"]
 */
function extractKeywords(statement: string): string[] {
  // 停用词
  const stopWords = new Set(["的","主要","因为","所以","如果","虽然","但是","和","或","了","是","在","有"]);
  // 简单分词：按标点和空格切，过滤短词和停用词
  return statement
    .replace(/[，。、；：！？""''（）()]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));
}

/**
 * 判定一段 AI 追问是否在测试某条假设。
 *
 * 逻辑：如果追问文本里出现了假设的关键词，或其语义近邻，认为在测试。
 * demo 阶段用关键词命中；真实落地可换成 embedding 相似度。
 */
function isProbingHypothesis(question: string, hypothesis: ResearchHypothesis): boolean {
  const keywords = extractKeywords(hypothesis.statement);
  const lower = question.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * 主入口：根据对话历史 + 假设列表，生成假设测试报告。
 */
export function analyzeHypotheses(
  messages: ChatMessage[],
  hypotheses: ResearchHypothesis[]
): HypothesisReport {
  // 没有假设时返回空报告
  if (hypotheses.length === 0) {
    return { hypotheses: [], probes: [], verdicts: {} };
  }

  // 1) 逐轮 AI 追问，判定是否在测某条假设
  const probes: HypothesisProbe[] = [];
  let turn = 0;
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    turn++;
    let testing: string | null = null;
    for (const h of hypotheses) {
      if (isProbingHypothesis(msg.content, h)) {
        testing = h.id;
        break; // 一轮只记一条
      }
    }
    probes.push({ turn, testingHypothesisId: testing });
  }

  // 2) 汇总每条假设的验证状态（demo 阶段简化版）
  //    - 一次都没测到 → untested
  //    - 测过 + 用户回答里有正/负信号 → supported/contradicted
  //    - 测过但信号弱 → insufficient
  const verdicts: Record<string, HypothesisVerdict> = {};
  for (const h of hypotheses) {
    const testedTurns = probes
      .filter((p) => p.testingHypothesisId === h.id)
      .map((p) => p.turn);
    if (testedTurns.length === 0) {
      verdicts[h.id] = "untested";
      continue;
    }
    // 简化判定：从用户在那些轮次之后的回答里找支持/反对信号
    verdicts[h.id] = judgeVerdict(messages, h, testedTurns);
  }

  return { hypotheses, probes, verdicts };
}

/**
 * 判定假设的验证结果（demo 简化版）。
 * 真实场景需要 LLM 做语义判断，这里用正/负关键词近似。
 */
function judgeVerdict(
  messages: ChatMessage[],
  hypothesis: ResearchHypothesis,
  testedTurns: number[]
): HypothesisVerdict {
  // 汇总被测轮次之后的用户回答
  const userReplies = messages
    .filter((m) => m.role === "user")
    .map((m, i) => ({ ...m, idx: i }))
    .filter((m) => testedTurns.some((t) => m.idx >= t - 1));
  const text = userReplies.map((m) => m.content).join(" ");

  // 正向信号（支持假设）
  const positiveSignals = ["对","是的","确实","没错","主要","确实主要","就是"];
  // 反向信号（反对假设）
  const negativeSignals = ["不是","没有","不太","其实","反而","不一定","看情况"];
  // 中性/模糊
  const fuzzySignals = ["还好","一般","可能","也许","说不好"];

  const hasPos = positiveSignals.some((s) => text.includes(s));
  const hasNeg = negativeSignals.some((s) => text.includes(s));
  const hasFuzzy = fuzzySignals.some((s) => text.includes(s));

  if (hasNeg && !hasPos) return "contradicted";
  if (hasPos && !hasNeg) return "supported";
  if (hasFuzzy || (hasPos && hasNeg)) return "partial-support";
  return "insufficient";
}
```

> **实现注记**：`judgeVerdict` 是 demo 简化版。真实落地应该把假设 + 用户回答一起喂给 LLM 做语义判断。但 demo 阶段用关键词近似已经能展示"验证结果"这个概念。

---

### 3.3 UI 改造（`src/components/ChatPanel.tsx`）

#### A. 假设输入区（对话开始前显示）

在 ChatPanel 顶部、聊天区上方，加一个可折叠的"研究假设"输入区：

```tsx
// 新增 state
const [hypotheses, setHypotheses] = useState<ResearchHypothesis[]>([]);
const [draftHypothesis, setDraftHypothesis] = useState("");
const [showHypothesisInput, setShowHypothesisInput] = useState(true);

// 假设报告
const hypothesisReport: HypothesisReport = useMemo(
  () => analyzeHypotheses(messages, hypotheses),
  [messages, hypotheses]
);

// 添加假设
const addHypothesis = () => {
  const trimmed = draftHypothesis.trim();
  if (!trimmed || hypotheses.length >= 2) return;
  setHypotheses([...hypotheses, { id: `h${Date.now()}`, statement: trimmed }]);
  setDraftHypothesis("");
};
```

UI 布局（对话开始前显示，开始后折叠成一行摘要）：

```tsx
{messages.length === 0 && (
  <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.03] p-4 space-y-3">
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-cyan-300">🎯 研究假设（可选）</span>
      <span className="text-[10px] text-gray-500">让 AI 主动测试你的猜想</span>
    </div>
    {hypotheses.map((h) => (
      <div key={h.id} className="flex items-center gap-2 text-sm text-gray-200">
        <span>• {h.statement}</span>
        <button onClick={() => setHypotheses(hypotheses.filter(x => x.id !== h.id))}
          className="text-gray-500 hover:text-rose-400">✕</button>
      </div>
    ))}
    {hypotheses.length < 2 && (
      <div className="flex gap-2">
        <input
          value={draftHypothesis}
          onChange={(e) => setDraftHypothesis(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHypothesis(); } }}
          placeholder="如：年轻妈妈选奶粉主要听医生推荐"
          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:border-cyan-400/40"
        />
        <button onClick={addHypothesis} className="text-xs text-cyan-300">+ 添加</button>
      </div>
    )}
  </div>
)}
```

#### B. 深度面板集成假设标记

在 `DepthPanel` 里，给测假设的柱子加特殊标记。需要把 `hypothesisReport` 传进去：

```tsx
// ChatPanel 渲染处
<DepthPanel depth={depth} hypothesisReport={hypothesisReport} />
```

在 DepthPanel 的柱状图渲染里，判断当前轮是否测了假设：

```tsx
{points.map((p) => {
  const probe = hypothesisReport.probes.find(pr => pr.turn === p.turn);
  const isTesting = probe?.testingHypothesisId != null;
  return (
    <div key={p.turn} className="depth-bar-wrap group relative ...">
      {/* 柱子 */}
      <div className={`depth-bar depth-bar-${p.level}`} style={{ height: `${height}%` }} />
      {/* 假设测试徽章 */}
      {isTesting && (
        <span className="absolute -top-1 right-0 text-[10px]">🎯</span>
      )}
      {/* 悬停提示里加假设信息 */}
      <div className="rhythm-tooltip ...">
        #{p.turn} · {t(DEPTH_LEVEL_LABEL[p.level])}
        {isTesting && (
          <span className="block mt-1 text-cyan-300">
            🎯 {t("depth_testing_hypothesis")}：
            {hypothesisReport.hypotheses.find(h => h.id === probe!.testingHypothesisId)?.statement}
          </span>
        )}
      </div>
    </div>
  );
})}
```

#### C. 假设验证摘要（对话中实时显示）

在深度面板下方，假设存在时显示一个紧凑的"假设测试进度"：

```tsx
{hypothesisReport.hypotheses.length > 0 && (
  <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 space-y-1">
    <div className="text-[10px] text-gray-500 mb-1">{t("hypothesis_progress_title")}</div>
    {hypothesisReport.hypotheses.map((h) => {
      const verdict = hypothesisReport.verdicts[h.id];
      const verdictIcon = {
        untested: "⬜", "partial-support": "🟡",
        supported: "✅", contradicted: "❌", insufficient: "⚠️"
      }[verdict];
      return (
        <div key={h.id} className="flex items-center gap-2 text-xs">
          <span>{verdictIcon}</span>
          <span className="text-gray-300 truncate">{h.statement}</span>
        </div>
      );
    })}
  </div>
)}
```

---

### 3.4 AI Prompt 改造（`src/app/api/project1/chat/route.ts`）

**关键**：把假设传给 AI，让它主动测试。在 `fatigueInstruction` 之后加一个 `hypothesisInstruction`：

```typescript
/**
 * 把研究假设编码进 system prompt。
 * 让 AI 有了"研究意图"——从收集型访谈变成验证型访谈。
 */
function hypothesisInstruction(hypotheses?: string[]): string {
  if (!hypotheses || hypotheses.length === 0) return "";
  const list = hypotheses.map((h, i) => `${i + 1}. ${h}`).join("\n");
  return [
    `\n【研究假设】本次访谈要主动检验以下假设（不要直接念给受访者，而是设计追问去验证）：`,
    list,
    `\n追问策略：`,
    `- 当受访者的回答触及某条假设时，深挖细节和证据（为什么、具体例子）。`,
    `- 如果受访者长时间没触及某条假设，设计一个自然的入口问题把它引出。`,
    `- 永远不要说"我要验证假设 X"，要用自然的对话方式。`,
    `- 记录受访者对假设的态度：支持、反对、还是模糊。`,
  ].join("\n");
}
```

在请求处理里接入：

```typescript
const { messages, lang, fatigueScore, hypotheses } = body;
// ...
const systemPrompt = `${SYSTEM_PROMPT}${fatigueInstruction(fatigueScore)}${hypothesisInstruction(hypotheses)}\n${langInstruction}`;
```

---

### 3.5 客户端调用改造（`src/lib/ai-client.ts`）

`callChatAI` 加 `hypotheses` 参数：

```typescript
export async function callChatAI(
  messages: ChatMessage[],
  lang: Language = "zh-CN",
  fatigueScore: number = 0,
  hypotheses: string[] = []
): Promise<{ reply: string; usedAI: boolean }> {
  try {
    const res = await postJSON<{ reply: string; usedAI: boolean }>(
      "/api/project1/chat",
      { messages, lang, fatigueScore, hypotheses }
    );
    return { reply: res.reply, usedAI: res.usedAI };
  } catch {
    // 兜底：本地规则不知道假设，正常返回通用追问
    // （假设测试的可视化由前端 analyzer 独立完成，不依赖 AI 回传）
    // ... 原有兜底逻辑
  }
}
```

ChatPanel 的 `send()` 里传入：

```typescript
const { reply, usedAI: ai } = await callChatAI(
  nextMessages,
  lang,
  rhythm.fatigueScore,
  hypotheses.map((h) => h.statement) // 只传陈述文本
);
```

---

### 3.6 i18n（9 语言，约 6 个新 key）

```json
"hypothesis_input_title": "🎯 研究假设（可选）",
"hypothesis_input_hint": "让 AI 主动测试你的猜想",
"hypothesis_input_placeholder": "如：年轻妈妈选奶粉主要听医生推荐",
"hypothesis_add": "+ 添加",
"hypothesis_progress_title": "假设测试进度",
"depth_testing_hypothesis": "正在测试假设"
```

各语言的验证状态图标用 emoji，无需翻译（✅❌⚠️🟡⬜ 是通用的）。

---

## 四、实现步骤（按顺序）

| Step | 内容 | 文件 | 预估 |
|------|------|------|------|
| 1 | 类型定义 | `types.ts`（+30 行）| 0.5h |
| 2 | 分析引擎 | 新建 `hypothesis-analyzer.ts`（~120 行）| 2h |
| 3 | UI: 假设输入区 | `ChatPanel.tsx`（+60 行）| 1.5h |
| 4 | UI: 深度面板集成假设标记 | `ChatPanel.tsx` DepthPanel 改造（+30 行）| 1h |
| 5 | UI: 假设验证摘要 | `ChatPanel.tsx`（+30 行）| 1h |
| 6 | Prompt 改造 | `chat/route.ts`（+25 行）| 0.5h |
| 7 | 客户端调用改造 | `ai-client.ts` + `types.ts` ChatRequest（+10 行）| 0.5h |
| 8 | i18n | 9 语言 × 6 key | 0.5h |
| 9 | 测试 | 新建 `hypothesis-analyzer.test.ts`（~100 行）| 1.5h |
| **合计** | | | **~10h ≈ 1.5 天** |

---

## 五、不做什么（边界控制）

- ❌ **不做完整的 Research Plan 编辑器**——那会膨胀成 Project 3 的复刻。假设输入只取"核心猜想"这一最小子集。
- ❌ **不让 AI 回传结构化的假设测试结果**——那需要改 chat 路由的 JSON 契约，破坏 `usedAI` shape-parity。验证结果由前端 analyzer 独立计算。
- ❌ **不做从 Project 3 自动继承**——demo 阶段手动填。自动继承涉及跨页面状态，留给后续。
- ❌ **不做 embedding 相似度**——demo 阶段用关键词命中。真实落地可升级。

---

## 六、Demo 脚本（假设驱动怎么演示）

1. 进入 project1 多轮对话
2. 在顶部"研究假设"区填入："年轻妈妈选奶粉主要听医生推荐"
3. 开始对话，正常回答 AI 的问题
4. 观察：当回答触及"医生/推荐"时，深度面板对应轮的柱子出现 🎯 徽章
5. 继续对话，给出"是的/不是"的回答
6. 观察底部"假设测试进度"：✅ 支持 / ❌ 反对 / ⚠️ 证据不足

**讲解话术**：
> "竞品的 AI 问完就完，我的 AI 知道要验证什么假设。看这里——当受访者的话触及假设时，柱子标记 🎯，访谈结束给出验证结论。这是从'收集'到'验证'的质变。"

---

## 七、技术风险 & 兜底

| 风险 | 影响 | 兜底 |
|------|------|------|
| 关键词分词不准（中文）| 假设测试判定漏报 | demo 可接受；记录为"真实落地用 embedding" |
| AI 不主动测假设（prompt 不听话）| 假设徽章不出现 | prompt 加重约束；前端 analyzer 独立判定，不依赖 AI 配合 |
| 假设验证判定（judgeVerdict）太粗糙 | ✅/❌ 不准 | demo 用关键词近似；UI 上加"证据不足"档位兜底 |
| 本地兜底模式不知道假设 | 兜底追问不会测假设 | 前端 analyzer 仍能判定（基于关键词），可视化不依赖 AI 模式 |

**核心原则**：假设测试的**可视化**（徽章 + 进度）由前端 analyzer 独立完成，不依赖 AI 是否真的听话。即使 AI 没主动测，analyzer 也能基于关键词判定"这轮有没有触及假设"。这保证了 demo 在任何模式下都能展示效果。

---

## 八、和已有功能的关系（一张图）

```
┌─────────────────────────────────────────────┐
│           假设驱动（战略层） NEW             │  ← AI 知道"为什么问"
│   输入假设 → AI 主动测试 → 验证结果          │
├─────────────────────────────────────────────┤
│  深度面板（质量层）+ 🎯 假设标记              │  ← 可视化"测了没"
│  节奏面板（监控层）                          │  ← 可视化"累不累"
├─────────────────────────────────────────────┤
│  疲劳自适应闭环（闭环层）                    │  ← "问不下去怎么办"
├─────────────────────────────────────────────┤
│  长度动态控制（工程层）                      │  ← "问多长"
└─────────────────────────────────────────────┘

Project 3 拆出的研究目标 ──(继承假设)──> Project 1 AI 访谈
        端到端系统的桥梁，就在这里
```
