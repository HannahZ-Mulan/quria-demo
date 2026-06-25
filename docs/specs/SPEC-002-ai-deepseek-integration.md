# Feature: 接入 DeepSeek AI 让 project1 / project3 真正实现智能理解与对话

## Feature Description

当前 `project1`（AI 追问长度动态优化）和 `project3`（客户需求标准化拆解）的"智能"完全由**硬编码的关键词匹配 / 正则规则**模拟（见 `src/app/project1/page.tsx:48-102` 的 `includes()` 分支，和 `src/app/project3/page.tsx:31-252` 的正则提取）。它们对超出关键词表的真实输入毫无理解能力，不符合 Quria「AI 访谈」的产品定位。

本特性把 DeepSeek 大模型真实接入两个项目：
- **project1**：把单轮关键词匹配升级为 AI 生成追问（仍严格遵守字数上限与三模式约束），并新增可选的「多轮对话」模式（AI 记住上下文逐轮追问）。
- **project3**：把正则拆解升级为 AI 结构化拆解（输出 JSON），TRD 文档也由 AI 生成。

DeepSeek API Key 通过 Next.js Route Handler 在服务端调用（不暴露给浏览器）；当未配置 Key 或调用失败时，**静默回退到现有的本地规则**，保证演示在任何环境下永远可用。

## User Story

As a 产品演示者 / 客户体验者
I want to 在 project1 / project3 里输入任意真实内容时，得到 AI 真正理解和生成的智能追问 / 需求拆解结果
So that 演示能体现 Quria「AI 访谈」产品的真实能力，而不是被死板的规则框死

## Problem Statement

现有两个页面用 `if (lowerAnswer.includes("价格")) …` 这类硬编码规则伪造"AI"。问题：
1. 只能识别关键词表内的词（价格/体验/品牌…），真实受访者的口语化、长句、未覆盖主题会被打到"通用追问"兜底分支，毫无智能可言。
2. project3 的正则（如 `/(了解|研究|探索)(.{2,20})/`）极易匹配错或匹配空，且 TRD 文档是写死的字符串模板（`src/app/project3/page.tsx:395-416`），无法根据需求动态变化。
3. 当前项目没有后端，无法安全地持有 API Key。

## Solution Statement

新增一层 **Next.js Route Handler 服务端代理**（`/api/project1/followup`、`/api/project3/decompose`、`/api/project3/trd`、`/api/project1/chat`），在服务端读取 `DEEPSEEK_API_KEY` 并调用 DeepSeek Chat Completions（`https://api.deepseek.com/chat/completions`，模型 `deepseek-chat`，开启 `response_format: {type:"json_object"}`）。客户端封装统一的 `callAI()` helper：调用对应 API 路由，失败/超时/未配置时**静默回退**到当前本地规则函数（抽取为独立 `lib/rules-*.ts`）。

架构与约束（遵循 AGENTS.md，已核对 Next.js 16 文档）：
- Route Handler 用标准 Web API：`export async function POST(request: Request)`，返回 `Response.json(...)`。
- 服务端读取 `process.env.DEEPSEEK_API_KEY`（无 `NEXT_PUBLIC_` 前缀，不会进客户端 bundle），Key 仅存于 `.env.local`（已被 `.gitignore` 的 `.env*` 覆盖）。
- DeepSeek JSON 模式要求 prompt 中必须出现 "json" 字样，并给出 schema 示例——在系统 prompt 中满足。
- 回退逻辑放在客户端 helper 内（`src/lib/ai-client.ts`），API 路由只负责调用模型；这样本地无 Key 时不报错，线上调用失败也有兜底。

## Relevant Files

Use these files to implement the feature:

**现有需修改**
- `src/app/project1/page.tsx` — 当前 `generateQuestion()` 内联了关键词规则；需抽离规则到 `lib/rules-followup.ts`，并把生成逻辑改为「先调用 AI → 失败回退」。
- `src/app/project3/page.tsx` — 当前 `decompose()` 内联正则、`generateTRD()` 只切换布尔值（TRD 写死）；需抽离规则到 `lib/rules-decompose.ts`，并把拆解和 TRD 改为 AI 调用 + 回退。
- `src/i18n/zh-CN.json` 等全部语言文件 — 新增对话/AI 相关文案 key（如 `ai_loading`、`chat_mode`、`send`、`ai_unavailable_fallback` 等）。
- `README.md` — 新增"AI 配置（DeepSeek）"说明章节与 `.env.local` 示例。

**新增**
### New Files
- `src/app/api/project1/followup/route.ts` — project1 单轮追问的 Route Handler（POST，调用 DeepSeek，返回 JSON）。
- `src/app/api/project1/chat/route.ts` — project1 多轮对话的 Route Handler（POST，接收 messages 数组，返回 AI 回复）。
- `src/app/api/project3/decompose/route.ts` — project3 需求拆解的 Route Handler。
- `src/app/api/project3/trd/route.ts` — project3 TRD 生成的 Route Handler。
- `src/lib/ai-client.ts` — 客户端统一 helper：`callFollowupAI()` / `callChatAI()` / `callDecomposeAI()` / `callTrdAI()`，封装 `fetch` + 超时 + 静默回退。
- `src/lib/rules-followup.ts` — 从 project1 page 抽离的现有关键词规则函数 `generateFollowupByRule(answer, mode, device)`，作为回退实现。
- `src/lib/rules-decompose.ts` — 从 project3 page 抽离的现有正则拆解函数 `decomposeByRule(rawRequirement)` + `generateTrdByRule(result)`，作为回退实现。
- `src/lib/deepseek.ts` — 服务端共享的 DeepSeek 调用封装（`callDeepSeek(messages, jsonSchema)`，读取 env，处理 fetch/解析/错误）。
- `src/lib/types.ts` — 共享类型：`QuestionResult`、`DecomposeResult`、API 请求/响应契约类型。
- `.env.example` — 提交到仓库的示例环境变量（不含真实 Key），供开发者参考。
- `src/components/ChatPanel.tsx` — project1 多轮对话 UI 组件（消息列表 + 输入框 + 流式/加载态）。

## Implementation Plan

### Phase 1: Foundation（基础设施）
1. 建立共享类型与本地规则回退模块：把两个 page 里现成的规则代码**原样搬出**到 `lib/rules-followup.ts` 和 `lib/rules-decompose.ts`（纯函数，不改行为，保证回退时输出和今天一模一样）。
2. 建立服务端 DeepSeek 封装 `lib/deepseek.ts`：统一处理 endpoint、`response_format`、错误归一化、超时（AbortController，默认 30s）。
3. 建立客户端 helper `lib/ai-client.ts`：统一 `fetch` 调用 + 失败回退 + 加载态返回。
4. 建立四个 Route Handler 骨架（先返回桩数据/打通路径），确认 Next.js 16 下可正常 POST。
5. 建立 `.env.example` 并补 README 说明。

### Phase 2: Core Implementation（核心接入）
6. 实现 project1 单轮 `/api/project1/followup`：系统 prompt 约束字数上限（30/45/60）、设备、模式；`response_format: json_object`；schema = `{question, strategy}`。在 page 中接入，失败回退到 `generateFollowupByRule`。
7. 实现 project1 多轮 `/api/project1/chat`：接收 `messages[]`，AI 角色为"专业用户研究访谈员"，逐轮追问（可引用前文）。新增 `ChatPanel` 组件与一个 Tab 切换「单轮 / 多轮」。
8. 实现 project3 `/api/project3/decompose`：AI 按 `DecomposeResult` schema 输出结构化 JSON，并保留冲突检测/模糊标记语义。接入 page，回退到 `decomposeByRule`。
9. 实现 project3 `/api/project3/trd`：AI 基于 `DecomposeResult` 生成 TRD Markdown 文本，替换写死模板。接入 page，回退到 `generateTrdByRule`。

### Phase 3: Integration（集成与打磨）
10. i18n：所有新增文案补齐 9 种语言（zh-CN/zh-TW/en/ja/it/fr/he/pt/es）。
11. UX：加载态（Loading 文案/禁用按钮）、回退时可选的小提示（按用户选择：静默回退，不弹错误）。
12. 安全/健壮性：服务端校验请求体大小、限制 messages 轮数（如最近 10 轮）、捕获 DeepSeek 非 200、JSON 解析失败、网络错误——统一让客户端收到可识别错误以触发回退。
13. 构建验证：`npm run build` + `npm run lint` 通过，并手动验证「无 Key 回退」「有 Key 调用」两条路径。

## Step by Step Tasks

### Phase 1
- [ ] **抽取共享类型** `src/lib/types.ts`
  - 定义 `Mode = "精简" | "标准" | "深度"`、`Device`、`QuestionResult`、`DecomposeResult`（字段对齐 project3 现有 interface）、API 请求/响应契约类型（`FollowupRequest/Response`、`ChatRequest/Response`、`DecomposeRequest/Response`、`TrdRequest/Response`）。
- [ ] **抽离 project1 本地规则** → `src/lib/rules-followup.ts`
  - 把 `project1/page.tsx:29-134` 的 `generateQuestion` 逻辑重构为纯函数 `generateFollowupByRule(answer: string, mode: Mode, device: Device): QuestionResult`，**保持完全等价的输出**。
- [ ] **抽离 project3 本地规则** → `src/lib/rules-decompose.ts`
  - `decomposeByRule(rawRequirement): DecomposeResult`（搬运 `project3/page.tsx:31-252`）。
  - `generateTrdByRule(result: DecomposeResult): string`（把 `project3/page.tsx:389-416` 的写死模板转成返回 Markdown 字符串的纯函数）。
- [ ] **服务端 DeepSeek 封装** `src/lib/deepseek.ts`
  - `callDeepSeek({ messages, schemaName?, schemaExample? }): Promise<string>`
  - 读 `process.env.DEEPSEEK_API_KEY`；未设置 → 抛 `DeepSeekConfigError`（客户端据此回退）。
  - POST `https://api.deepseek.com/chat/completions`，body：`{model:"deepseek-chat", messages, response_format:{type:"json_object"}, max_tokens}`。
  - AbortController 超时 30s；非 2xx 抛错；解析 `data.choices[0].message.content`。
- [ ] **客户端 helper** `src/lib/ai-client.ts`
  - 每个 `call*AI(...)` 内部 `try { fetch(...) } catch { return rule(...) }`；返回值类型与本地规则一致，调用方无感知。
  - 带一个 `usedAI: boolean` 字段供 UI 判断（回退静默，不报错）。
- [ ] **四个 Route Handler 骨架**（Phase 1 先打通 POST，Phase 2 再接 DeepSeek）。
- [ ] **`.env.example`** + README「AI 配置」章节（说明 DeepSeek Key、未配置则回退、安全说明）。

### Phase 2
- [ ] **project1 单轮追问 API** `/api/project1/followup`
  - 校验 `{answer, mode, device}`；构造系统 prompt（强调字数上限随回答长度/设备/模式变化，给出 schema 与含 "json" 的示例）；调 DeepSeek；返回 `{question, strategy, usedAI:true}`。
- [ ] **project1 多轮对话 API** `/api/project1/chat`
  - 接收 `{messages: {role,content}[]}`；system 设定「专业用户研究访谈员，每次只问一个开放式追问，结合上文」；返回 `{reply: string}`。
- [ ] **project1 page 改造**
  - 引入 Tabs：「单轮追问」（保留现有 UI，生成走 AI+回退）/「多轮对话」（`ChatPanel`）。
  - `generateQuestion` 改为 `setLoading` → `callFollowupAI(...)` → `setResult`。
- [ ] **project3 拆解 API** `/api/project3/decompose`
  - prompt 要求严格按 `DecomposeResult` JSON 输出（含 fuzzyMarks/conflicts/deliverables 数组），给 schema 示例；调 DeepSeek；返回 `DecomposeResult`。
- [ ] **project3 TRD API** `/api/project3/trd`
  - 入参 `{result: DecomposeResult}`；prompt 据结果生成 TRD Markdown；返回 `{trd: string}`。
- [ ] **project3 page 改造**
  - `decompose` → `callDecomposeAI`；`generateTRD` → `callTrdAI`（展示返回的 Markdown，而非写死模板）。

### Phase 3
- [ ] **i18n 文案**：为 9 个语言文件补 `ai_loading`、`ai_thinking`、`chat_mode`、`single_turn_mode`、`send_message`、`chat_placeholder`、`ai_role_interviewer` 等 key。
- [ ] **加载态与回退体验**：按钮 loading、对话区"AI 正在思考…"；回退静默（不弹错误），保持演示友好。
- [ ] **健壮性**：服务端请求体大小/字段校验；messages 限最近 10 轮；统一错误处理让客户端能稳定触发回退。
- [ ] **验证构建与端到端**：见 Validation Commands。

## Testing Strategy

### Unit Tests
- `lib/rules-followup.ts`：对各类输入（价格/体验/正面/负面/品牌/推荐/短回答/默认）断言输出与改造前完全一致（黄金样本回归）。
- `lib/rules-decompose.ts`：对典型需求断言拆解字段、模糊标记、冲突检测、TRD 字符串结构。
- `lib/ai-client.ts`：mock `fetch` 失败/超时 → 确认回退到本地规则并 `usedAI=false`；成功 → `usedAI=true`。

### Integration Tests
- 四个 Route Handler：mock `fetch` 到 DeepSeek，断言请求 body 含 `response_format:{type:"json_object"}` 与 "json" 字样；断言返回 JSON 结构。
- 未设置 `DEEPSEEK_API_KEY` → Route 返回明确错误码，客户端回退。

### Edge Cases
- 回答为空 / 极短 / 超长；需求含纯英文、含数字、无任何关键词。
- DeepSeek 返回空 content（已知 JSON 模式偶发）→ 回退。
- DeepSeek 返回非法 JSON → 回退。
- 多轮对话超过 10 轮 → 服务端裁剪。
- 移动端 + 深度模式 的字数上限叠加。

## Acceptance Criteria
1. 在 `.env.local` 配置有效 `DEEPSEEK_API_KEY` 后：project1 输入任意真实回答都能得到 AI 生成的、符合字数上限的追问；project3 输入任意真实需求能得到 AI 结构化拆解与 AI 生成的 TRD。
2. 未配置 Key 或 API 失败时：两个页面行为与今天**完全一致**（回退到本地规则），无报错弹窗，演示正常。
3. project1 新增「多轮对话」模式：AI 能结合上文逐轮追问。
4. API Key 在任何情况下都不出现在客户端 bundle / 网络响应里（仅服务端 `process.env`）。
5. `npm run build`、`npm run lint` 均通过，零 TypeScript 错误。
6. 现有 9 语言切换在新增文案后均正常显示，RTL（he）不破版。

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run lint` — 零 ESLint 错误（Next.js 16 已移除 `next lint`，项目用 `eslint` 直跑，见 package.json scripts）。
- `npm run build` — Turbopack 构建通过，零 TS 错误，四个 Route Handler 被正确识别为动态路由。
- `npm run dev` 后手动验证：
  - **无 Key 回退**：不设 `.env.local`，访问 `/project1`、`/project3`，确认输出与改造前一致（用同一组输入对比）。
  - **有 Key 调用**：设置 `DEEPSEEK_API_KEY` 后，输入超出关键词表的真实内容（如"我最近在减肥，想找一个能记录卡路里的工具"），确认得到 AI 个性化追问/拆解。
  - **多轮对话**：在 project1「多轮对话」Tab 连续对话，确认 AI 引用上文。
- 单元测试（若按 `docs/specs/CHORE-01-add-test-suite.md` 已建测试框架）：
  - `npm test -- src/lib/rules-followup` — 规则回退黄金样本回归。
  - `npm test -- src/lib/rules-decompose` — 拆解回退回归。
  - `npm test -- src/lib/ai-client` — 回退触发逻辑。

## Notes
- **安全**：`DEEPSEEK_API_KEY` 只放服务端 `process.env`（无 `NEXT_PUBLIC_` 前缀）。`.env*` 已在 `.gitignore`，不会误提交。提交的是 `.env.example`（占位值）。
- **Next.js 16 注意点**（已核对官方文档）：Route Handler 用 Web API（`POST(request: Request)` + `Response.json`）；`params` 为 Promise（本特性无动态路由段，不涉及）；`serverRuntimeConfig`/`publicRuntimeConfig` 已移除，直接用 `process.env`。
- **DeepSeek JSON 模式约束**：`response_format:{type:"json_object"}` 要求 prompt 中出现 "json" 字样并给 schema 示例，否则 API 报错；已在系统 prompt 设计中满足。偶发空 content 已用回退兜底。
- **成本控制**：多轮对话裁剪最近 10 轮；单轮/拆解/TRD 设置合理 `max_tokens`。
- **无新依赖**：全程用 `fetch`（Node 20+ 内置）+ 现有 shadcn/ui，无需 `uv add` / `npm install` 任何包（AI SDK 非必需，直接 fetch DeepSeek 兼容 OpenAI 的接口更轻量）。
- **未来扩展**：可把 DeepSeek 抽象成 provider 接口，便于切换 OpenAI/Claude/本地模型；多轮对话可加流式（SSE）输出。
