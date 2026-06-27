<div align="center">

# Quria 产品优化方案演示
# Quria Product Optimization Demo

**为 [悦数洞察 (Aquria.AI)](https://quria.aquria.cn) AI 访谈系统设计的两个核心优化项目**
**Two core optimization projects for the [Aquria.AI](https://quria.aquria.cn) AI interview system**

[在线演示 / Live Demo](https://quria-demo.vercel.app) · [文档 / Docs](https://quria-demo.vercel.app/docs)

</div>

---

# 📖 中文文档

围绕"AI 怎么像资深研究员一样访谈"这一核心命题，本项目覆盖追问控制、访谈健康度可视化、需求标准化拆解三个方向，含可交互原型与完整产品文档。

## 项目背景

悦数洞察是一家提供 AI 驱动用户研究解决方案的公司，其 Quria 平台通过 AI 访谈帮助企业进行深度用户洞察。本项目针对实际体验中发现的痛点，提出优化方案并构建可交互原型。

## 优化项目

### 项目 1：AI 追问长度动态优化 + 访谈健康度监控

**问题**：现有 AI 访谈中追问问题过长、机械，受访者容易疲劳、中途退出；且访谈质量只能靠研究员经验判断，无法度量。

**方案**：从"长度控制"到"质量可视化"的完整闭环。

#### 单轮追问控制台
- 根据受访者回答长度自动调整追问字数上限
- 支持三种访谈模式（精简 / 标准 / 深度）
- 适配 PC 端和移动端（移动端额外缩减 25%）
- 内置关键词智能匹配（价格、体验、品牌、推荐等维度）
- 动态长度规则：≤20 字 → 30 字上限，20-100 字 → 45 字，>100 字 → 60 字

#### 多轮对话 + 访谈健康度双仪表（核心亮点）
基于深度访谈方法论，把"访谈好不好"变成可度量的双维度指标：

- **📊 节奏面板（受访者视角）**：实时分析受访者参与度——回答字数波形图 + 疲劳度仪表盘（0-100），三档预警（良好 / 注意 / 警惕）。疲劳度由回答字数递减、响应间隔变长、最近一轮过短三个信号加权计算。
- **🎯 深度面板（AI 视角）**：实时分析 AI 追问的"漏斗层级"——按 wide（表层）/ mid（场景）/ narrow（细节）/ deep（动机）/ detour（迂回）五层分类，可视化 AI 是否在逐层下钻。
- **🔄 疲劳自适应闭环**：检测到重度疲劳（≥60）时，AI 完全放下当前话题、换轻松破冰问题重建信任（对齐真人访谈员的"迂回放生"craft）；轻度疲劳则收短追问。

> 💡 **差异化**：国际竞品（Outset、Remesh、Perspective AI）的 AI 访谈只管"问"，本项目把"问得有没有水平"和"受访者状态"都变成了可度量的可视化指标。

**[查看演示 →](https://quria-demo.vercel.app/project1)**

---

### 项目 3：客户需求标准化拆解

**问题**：客户提出的研究需求往往模糊、不完整，导致技术团队反复沟通、项目延期。

**方案**：将传统"填表 + 出结果"重构为 **AI 助手引导式对话流**，四步完成需求到方案的转化：

1. **录入需求**：客户输入原始（可能模糊）需求
2. **智能拆解**：AI 自动提取研究目标、目标人群、研究场景、研究类型（定性 / 定量 / 混合）、访谈深度分级（L1 筛查 / L2 探索 / L3 深度）、建议样本量、预计周期
3. **质量检查**：模糊表述标记、冲突检测、需求清晰度评分（含扣分明细）、风险矩阵、项目时间线 Gantt 图
4. **生成 TRD**：一键生成技术需求文档，支持导出 Markdown / PDF

**[查看演示 →](https://quria-demo.vercel.app/project3)**

---

## 产品文档中心

内置可在线浏览的文档中心（`/docs`），Markdown 渲染，深空科技风排版：

- 📄 [PRD - 项目 1](./PRD_AI_追问长度动态优化方案.md)
- 📄 [SRS - 项目 1](./SRS_AI_追问长度动态优化系统.md)
- 📄 [PRD - 项目 3](./PRD_客户研究需求标准化拆解模板.md)
- 📄 [SRS - 项目 3](./SRS_客户研究需求标准化拆解系统.md)

## 多语言支持

支持 **9 种语言**切换（含 RTL 支持）：简体中文、繁體中文、English、日本語、Italiano、Français、Português、Español、עברית（希伯来语 RTL）。

## 技术栈

- **框架**：Next.js 16 (App Router) + React 19 + TypeScript
- **样式**：Tailwind CSS 4 + shadcn/ui + 自定义深空科技风主题
- **AI 集成**：DeepSeek Chat Completions API（服务端代理）
- **国际化**：自定义 React Context + JSON 翻译文件
- **文档渲染**：react-markdown + remark-gfm
- **测试**：Vitest 单元测试（107+ 用例）
- **部署**：Vercel

## 本地开发

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器 → http://localhost:3000
npx vitest run     # 运行单元测试
```

## AI 配置（DeepSeek）

默认调用 **DeepSeek** 大模型。**未配置 Key 时自动静默回退到内置本地规则**，演示在任何环境下都能运行。

1. 在 [DeepSeek 开放平台](https://platform.deepseek.com/) 申请 API Key
2. 复制 `.env.example` 为 `.env.local`，填入：
   ```env
   DEEPSEEK_API_KEY=sk-你的key
   ```
3. 重启 `npm run dev`

`DEEPSEEK_API_KEY` 不带 `NEXT_PUBLIC_` 前缀，仅在服务端 Route Handler 读取，永不进客户端 bundle。请求经 Next.js 服务端路由代理转发，客户端不直连第三方。

---
---

# 📖 English Documentation

Centered on the core question — *"how can AI interview like a senior researcher"* — this project covers follow-up control, interview health visualization, and requirement standardization, with interactive prototypes and full product documentation.

## Background

Aquria (悦数洞察) provides AI-driven user research solutions. Its Quria platform helps enterprises gain deep user insights through AI-conducted interviews. This project addresses pain points discovered through hands-on product experience with optimization proposals and interactive prototypes.

## Optimization Projects

### Project 1: Dynamic Follow-up Length Control + Interview Health Monitoring

**Problem**: AI interview follow-ups are too long and mechanical, causing respondent fatigue and drop-off. Interview quality relies solely on researcher experience, with no way to measure it.

**Solution**: A complete closed loop from "length control" to "quality visualization."

#### Single-Turn Follow-up Cockpit
- Automatically adjusts follow-up length based on respondent answer length
- Three interview modes (Compact / Standard / Deep)
- PC and mobile adaptation (mobile gets an extra 25% reduction)
- Built-in keyword matching (price, experience, brand, recommendation, etc.)
- Dynamic length rules: ≤20 chars → 30-char limit, 20-100 → 45, >100 → 60

#### Multi-Turn Chat + Interview Health Dual-Gauge (Key Highlight)
Based on in-depth interview methodology, turns "is the interview good" into measurable dual-dimension metrics:

- **📊 Rhythm Panel (Respondent view)**: Real-time respondent engagement analysis — answer-length waveform + fatigue gauge (0-100) with three alert tiers (Good / Watch / Alert). Fatigue is computed from three weighted signals: declining answer length, increasing response intervals, and an overly short last answer.
- **🎯 Depth Panel (AI view)**: Real-time analysis of AI follow-up "funnel level" — classified into five tiers: wide (surface) / mid (scenario) / narrow (detail) / deep (motive) / detour (rapport), visualizing whether the AI is progressively drilling down.
- **🔄 Fatigue Adaptive Loop**: On detecting severe fatigue (≥60), the AI fully drops the current topic and switches to a light icebreaker to rebuild rapport (mirroring a human researcher's "deflection" craft); mild fatigue shortens the follow-up instead.

> 💡 **Differentiation**: International competitors (Outset, Remesh, Perspective AI) only focus on "asking." This project turns both "how well the AI asks" and "respondent state" into measurable, visualized metrics.

**[View Demo →](https://quria-demo.vercel.app/project1)**

---

### Project 3: Client Requirement Standardized Decomposition

**Problem**: Client research requirements are often vague and incomplete, leading to repeated back-and-forth with technical teams and project delays.

**Solution**: Replaces the traditional "form + result" with an **AI-assistant guided conversational flow**, converting requirements into plans in four steps:

1. **Input**: Client enters a raw (possibly vague) requirement
2. **Smart Decomposition**: AI auto-extracts research goal, target audience, research scene, research type (qualitative / quantitative / mixed), interview depth grading (L1 screening / L2 exploration / L3 in-depth), recommended sample size, estimated duration
3. **Quality Check**: Fuzzy-expression flagging, conflict detection, requirement clarity score (with deduction breakdown), risk matrix, project timeline Gantt chart
4. **Generate TRD**: One-click technical requirements document generation, with Markdown / PDF export

**[View Demo →](https://quria-demo.vercel.app/project3)**

---

## Documentation Center

A built-in browsable documentation center (`/docs`) with Markdown rendering in a deep-space-tech aesthetic:

- 📄 [PRD - Project 1](./PRD_AI_追问长度动态优化方案.md)
- 📄 [SRS - Project 1](./SRS_AI_追问长度动态优化系统.md)
- 📄 [PRD - Project 3](./PRD_客户研究需求标准化拆解模板.md)
- 📄 [SRS - Project 3](./SRS_客户研究需求标准化拆解系统.md)

## Internationalization

Supports **9 languages** (including RTL): 简体中文, 繁體中文, English, 日本語, Italiano, Français, Português, Español, עברית (Hebrew, RTL).

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui + custom deep-space-tech theme
- **AI Integration**: DeepSeek Chat Completions API (server-side proxy)
- **i18n**: Custom React Context + JSON translation files
- **Docs Rendering**: react-markdown + remark-gfm
- **Testing**: Vitest unit tests (107+ cases)
- **Deployment**: Vercel

## Local Development

```bash
npm install        # Install dependencies
npm run dev        # Start dev server → http://localhost:3000
npx vitest run     # Run unit tests
```

## AI Configuration (DeepSeek)

Calls the **DeepSeek** model by default. **Automatically falls back to built-in local rules when no key is configured**, so the demo runs in any environment.

1. Apply for an API Key at the [DeepSeek platform](https://platform.deepseek.com/)
2. Copy `.env.example` to `.env.local` and fill in:
   ```env
   DEEPSEEK_API_KEY=sk-your-key
   ```
3. Restart `npm run dev`

`DEEPSEEK_API_KEY` has no `NEXT_PUBLIC_` prefix and is read only in server-side Route Handlers — it never enters the client bundle. Requests are proxied through Next.js server routes; the client never directly connects to the third party.
