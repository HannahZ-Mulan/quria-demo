# Chore: 添加测试套件（Test Suite）

## Chore Description
项目当前**没有任何自动化测试**：`package.json` 的 `scripts` 只有 `dev`/`build`/`start`/`lint`，没有任何测试运行器（已确认 `node_modules/.bin` 中没有 vitest/jest/playwright/cypress），仓库内无 `*.test.*` 或 `*.spec.*` 文件，也无 `vitest.config.*` 等测试配置。先前的 SPEC-001 也明确备注「项目目前无测试运行器」。

本 Chore 的目标是为项目补齐一个**可长期运行、零回归守护**的测试套件，分两层：

### 第 1 层：单元 / 组件测试（Vitest）
覆盖那些**纯逻辑、易回归**的核心代码：

1. **`cn()` 工具函数**（`src/lib/utils.ts`）—— 全项目样式合并的基石，shadcn/ui 与所有组件都依赖它。
2. **i18n 模块**（`src/i18n/index.tsx`）—— 语言元数据 `LANGUAGES` 的完整性（9 种语言、code 唯一、`he` 为 RTL）与 `I18nProvider`/`useI18n` 的行为（`t()` 翻译、回退到 key、RTL/LTR 的 `dir` 切换、`useI18n` 在 Provider 外抛错）。
3. **i18n 翻译文件一致性**（9 个 `src/i18n/*.json`）—— 确保所有语言文件拥有相同的 key 集合，避免切换语言后出现「某些文案只剩 key」的回归。
4. **`TiltCard` 组件**（`src/components/TiltCard.tsx`）—— 验证默认 props、3D transform 在非激活/激活态的计算、对触屏指针忽略跟随（回归守护其已注明的边界行为）。

### 第 2 层：端到端（E2E）冒烟测试（playwright-cli 脚本）
用户系统已**全局安装 `@playwright/cli`（命令 `playwright-cli`）**。经核实其 `--help`：
- 它是 **"run playwright mcp commands from terminal"**，是 **session-based** 的命令行驱动（不是测试框架）：每次调用是短命的，但针对一个**命名的持久浏览器会话**操作。
- 关键命令：`open [url]`（开浏览器并建会话，可用 `-s=<name>` 命名、`--browser chrome/firefox/webkit/msedge`、`--headed`）、`goto <url>`、`click <target>`、`fill <target> <text>`、`select <target> <val>`、`snapshot [target]`（取页面快照得到元素 ref）、`eval <func>`、`close`、`list`、`close-all`。
- 全局选项：`--json`（输出 JSON）、`--raw`（只输出结果值，便于 shell 断言）。
- 用 `-s=<name>` 在多次调用间复用同一会话，从而把一连串动作串成一个「测试脚本」。

**重要：`playwright-cli` 不是 `@playwright/test`**——它没有 `playwright test` 命令、没有 `*.spec.ts` 运行器、没有断言库、没有测试报告。因此 E2E 层以 **shell/Node 驱动脚本** 的形式实现：脚本启动 `next dev`（或对已构建产物 `next start`），用 `playwright-cli` 打开 3 个路由（`/`、`/project1`、`/project3`），对关键可见文本与交互（语言切换、追问生成、需求拆解）做断言，任何断言失败即脚本以非零码退出。

E2E 层覆盖（针对运行中的应用，而非静态 DOM）：
- **首页 `/`**：标题/副标题可见；两张项目卡片（`project1_title`、`project3_title` 的文本）渲染；「查看演示」链接指向 `/project1`、`/project3`。
- **`/project1`**：标题、回答输入框、三种模式 Tab、PC/移动端按钮、生成追问按钮可见；输入一段「价格」相关回答并点生成后，结果区出现追问文本（验证内联业务逻辑在真实浏览器里跑通）。
- **`/project3`**：标题、需求输入框、智能拆解按钮可见；输入一段含人群/样本量/时间的需求并点拆解后，结果区出现研究目标/人群等字段。
- **语言切换（跨页共享组件）**：在任一页点开语言下拉，选 English，页面标题文本随之变为英文（验证 `LanguageSwitcher` + i18n context 端到端联动 + RTL 语言 `he` 切 `dir`）。

**测试运行器选择理由**：
- **Vitest** 用于第 1 层：与项目 Vite/ESM/TS 工具链天然契合，零 Babel 配置；配 `@testing-library/react` + `jsdom`；`globals: true` 后无需 `import { describe, it, expect }`。
- **playwright-cli** 用于第 2 层：用户明确要求用已安装的 `playwright-cli` 写脚本（而非引入 `@playwright/test` 框架）。它在真实浏览器里驱动应用，能抓住 Vitest 抓不到的「页面真的能渲染、i18n 真的切换、按钮真的触发逻辑」类回归。

**不做的事（明确排除项）**：
- 不安装 `@playwright/test` 框架（用户选择只用 `playwright-cli` 写脚本）。两个 CLI 工具概念不同但可共存，本 Chore 不引入前者。
- 不为 `project1/page.tsx`、`project3/page.tsx`、`page.tsx` 写 Vitest 组件测试：它们是展示型 demo，业务逻辑内联在组件内且依赖大量 i18n/状态，组件渲染测试脆弱。这些逻辑改由 E2E 脚本在真实浏览器里覆盖。如未来要单元测，应先把逻辑抽成纯函数再测；本 Chore 不做该重构。

## Relevant Files
使用以下文件来完成本 Chore：

**第 1 层（Vitest）：**
- `package.json` —— 新增 Vitest 相关 devDependencies 与 `test`/`test:run`/`test:coverage` 脚本。
- `tsconfig.json` —— 参考 `@/*` 路径别名与编译选项，使 Vitest 配置与之对齐。
- `eslint.config.mjs` —— 确保测试文件不引入 lint 报错（按需为测试文件放行 globals）。
- `src/lib/utils.ts` —— 被测对象：`cn()`。
- `src/i18n/index.tsx` —— 被测对象：`LANGUAGES`、`I18nProvider`、`useI18n`、`t()`、`dir`。
- `src/i18n/*.json`（9 个）—— 被测对象：key 集合一致性，基准为 `zh-CN.json`。
- `src/components/TiltCard.tsx` —— 被测对象：props 与 transform 计算。

**第 2 层（playwright-cli E2E）：**
- `package.json` —— 新增 `test:e2e` 脚本（启动应用 → 跑 E2E 驱动脚本 → 关闭应用）。
- `src/app/page.tsx`、`src/app/project1/page.tsx`、`src/app/project3/page.tsx` —— E2E 覆盖的三条路由的页面实现（脚本会校验其渲染出的可见文本与交互）。
- `src/components/LanguageSwitcher.tsx` —— E2E 覆盖语言切换交互的共享组件。
- `playwright-cli`（系统已全局安装）—— 驱动真实浏览器执行 E2E 动作。

### New Files
**第 1 层（Vitest）：**
- `vitest.config.ts` —— `environment: 'jsdom'`、`globals: true`、`setupFiles: ['./vitest.setup.ts']`、`coverage` 配置；`resolve.alias` 映射 `@` → `./src`（与 tsconfig `paths` 对齐）。
- `vitest.setup.ts` —— 导入 `@testing-library/jest-dom/vitest` 注册 DOM 匹配器。
- `src/lib/utils.test.ts` —— `cn()` 单元测试。
- `src/i18n/i18n.test.tsx` —— i18n context 组件/单元测试。
- `src/i18n/translations.test.ts` —— 9 个翻译文件 key 一致性测试。
- `src/components/TiltCard.test.tsx` —— `TiltCard` 组件测试。

**第 2 层（playwright-cli E2E）：**
- `e2e/run-e2e.mjs` —— E2E 驱动脚本（Node ESM）。职责：确保 dev server 已起（或在脚本内 spawn `next dev` 并 wait-on 端口）→ 用 `playwright-cli -s=quria open http://localhost:3000` 建会话 → 串接 `goto`/`snapshot`/`click`/`fill`/`eval`/`--raw` 动作并对关键文本做断言 → 无论成败 `playwright-cli close` + `close-all` 清理会话 → 汇总通过/失败、失败以非零码退出。
- `e2e/assertions.js`（可选，若主脚本过长则抽出）—— 简单的 `assertVisible(text)`、`assertEq(actual, expected)` 等 helper，封装对 `--raw` 输出的解析与比较。

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 第 1 层：Vitest 单元 / 组件测试

### 步骤 1 —— 安装 Vitest 依赖
- 在 `package.json` 的 `devDependencies` 中新增：`vitest`、`@vitejs/plugin-react`、`jsdom`、`@testing-library/react`、`@testing-library/jest-dom`。
- 运行 `npm install`。

### 步骤 2 —— 新增 Vitest npm 脚本
- `scripts` 新增：`"test": "vitest"`、`"test:run": "vitest run"`、`"test:coverage": "vitest run --coverage"`。

### 步骤 3 —— 创建 Vitest 配置
- 创建 `vitest.config.ts`：`defineConfig({ test: { environment: 'jsdom', globals: true, setupFiles: ['./vitest.setup.ts'] }, plugins: [react()], resolve: { alias: { '@': path.resolve(__dirname, './src') } } })`。

### 步骤 4 —— 创建测试全局 setup
- 创建 `vitest.setup.ts`：`import '@testing-library/jest-dom/vitest';`。

### 步骤 5 —— 让 ESLint 放行测试文件（按需）
- 检查 `eslint.config.mjs`：若 `globals: true` 导致测试文件报「未定义 describe/it/expect」，则为 `**/*.test.{ts,tsx}` 与 `vitest.setup.ts` 放行 globals 或忽略，确保 `npm run lint` 对测试文件零报错。

### 步骤 6 —— 编写 `cn()` 单元测试
- 创建 `src/lib/utils.test.ts`，覆盖：合并字符串、过滤假值、`twMerge` 冲突去重（`px-2 px-4`→`px-4`）、空入参返回空串。

### 步骤 7 —— 编写 i18n context 测试
- 创建 `src/i18n/i18n.test.tsx`，覆盖：`LANGUAGES` 9 条且 code 唯一、`he` 为 `rtl` 其余 `ltr`、label 非空；`I18nProvider` 包裹消费组件时 `t()` 命中翻译、缺失 key 回退为 key 本身、`setLang` 后 `lang`/`t()`/`dir` 更新；Provider 外调 `useI18n` 抛 `"useI18n must be used within I18nProvider"`。

### 步骤 8 —— 编写翻译文件一致性测试
- 创建 `src/i18n/translations.test.ts`：以 `zh-CN.json` 为基准，断言另 8 个语言文件的 key 集合与之完全相同（无缺/多余 key），失败信息列出差异语言与 key。

### 步骤 9 —— 编写 `TiltCard` 组件测试
- 创建 `src/components/TiltCard.test.tsx`，覆盖：默认渲染 children、根节点带 `group/tilt` class、初始 transform 为 `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)`；自定义 `maxTilt`/`lift`/`glowColor` 不破坏渲染；透传 `data-testid`；`pointerType:'touch'` 的 pointerMove 不改变 transform（守护触屏静态化）；mouse pointermove 后 transform 非零、pointerleave 后回弹。

### 第 2 层：playwright-cli E2E 冒烟测试

### 步骤 10 —— 确认浏览器可用（用系统 Chrome，无需下载）
- 系统 `@playwright/cli` 已装。经实测：`playwright-cli install-browser chromium` 自带安装器在 Windows 上会卡死（留空临时目录 + 锁文件，无输出）；镜像源（npmmirror）同样偏慢。**改用系统已装的 Chrome**：`C:\Program Files\Google\Chrome\Application\chrome.exe` 存在，`playwright-cli -s=xxx open <url> --browser chrome` 可直接复用，跳过 183MB Chromium 下载。
- 已验证全链路：`open --browser chrome` 建会话 → `eval "() => ..." --raw` 取值（返回 `"SystemChromeWorks"`）→ `close` 清理，均成功。
- 验证：`playwright-cli list` 能列出会话、`open --browser chrome` 能起浏览器即可。无需 `install-browser`。

### 步骤 11 —— 新增 E2E npm 脚本
- `package.json` 新增 `"test:e2e": "node e2e/run-e2e.mjs"`。脚本内部负责 spawn/wait dev server（或文档约定先手动 `npm run dev`，脚本 wait-on `http://localhost:3000`）。

### 步骤 12 —— 编写 E2E 驱动脚本骨架
- 创建 `e2e/run-e2e.mjs`（Node ESM）。结构：
  - `import { execSync, spawn } from 'node:child_process'`。
  - helper `cli(args)`：`execSync('playwright-cli -s=quria ' + args, { encoding: 'utf8' })`，可用 `--raw` 取纯值。
  - helper `assertVisible(text)`、`assertEq(a,b,msg)`：失败时抛错并记录，最终汇总。
  - 生命周期：`try { ... } finally { execSync('playwright-cli -s=quria close'); execSync('playwright-cli close-all'); }` 确保清理。

### 步骤 13 —— E2E：首页冒烟
- 在脚本中：`cli('open http://localhost:3000 --browser chromium')` → 用 `snapshot`/`eval` 断言首页标题与 `project1_title`、`project3_title` 文本可见；用 `eval` 校验两个「查看演示」链接的 `href` 为 `/project1`、`/project3`。

### 步骤 14 —— E2E：project1 追问生成
- `cli('goto http://localhost:3000/project1')` → 断言标题、回答 Textarea、三模式 Tab、PC/移动端按钮、生成按钮可见 → `fill` 一段含「价格」的回答 → `click` 生成按钮 → 断言结果区出现追问文本（非空、字数在预期上限内）。

### 步骤 15 —— E2E：project3 需求拆解
- `cli('goto http://localhost:3000/project3')` → 断言标题、需求 Textarea、拆解按钮可见 → `fill` 一段含人群（如「25-35岁 白领」）、样本量（「200 人」）、时间（「5 天」）的需求 → `click` 拆解按钮 → 断言结果区出现研究目标/目标人群/研究类型等字段，且冲突检测对「大样本+短周期」给出告警。

### 步骤 16 —— E2E：语言切换端到端
- 在任一页：`click` 语言切换触发器（按 `snapshot` 得到的 ref）→ 菜单展开 → `click` English 项 → 用 `eval` 断言 `document.documentElement.lang === 'en'` 且标题文本已变为英文；再切到 `he` 断言 `document.documentElement.dir === 'rtl'`。

### 步骤 17 —— 运行验证命令
- 执行下方「验证命令」全部命令：Vitest 全绿、类型检查零错误、lint 零错误、生产构建成功、E2E 脚本通过，零回归。

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd "D:/project for 悦数/quria-demo" && npx vitest run` —— 单元/组件测试全部通过、零失败。
- `cd "D:/project for 悦数/quria-demo" && npm run test:e2e` —— E2E 冒烟脚本通过（需 dev server 已起或脚本自起）、零失败。
- `cd "D:/project for 悦数/quria-demo" && npx tsc --noEmit` —— 类型检查零错误（覆盖新增测试与脚本文件）。
- `cd "D:/project for 悦数/quria-demo" && npm run lint` —— ESLint 零错误。
- `cd "D:/project for 悦数/quria-demo" && npm run build` —— Next.js 生产构建成功（确认新增配置/依赖未破坏构建）。

## Notes
- **playwright-cli ≠ @playwright/test**：前者是 MCP 命令行驱动（session-based，`open/click/snapshot`），后者是测试框架（`playwright test`、`*.spec.ts`、断言库）。本 Chore 按用户要求只用前者写脚本，不引入后者。
- **为何 E2E 用脚本而非框架**：用户系统已装 `playwright-cli` 且明确选「只用 playwright-cli 写脚本」。脚本通过 `--raw`/`--json` 取值、用 `-s=quria` 复用会话、`finally` 里 `close`/`close-all` 清理，即可形成可重复、有明确退出码的冒烟测试。
- **E2E 前置依赖**：浏览器用系统 Chrome（`--browser chrome`，无需下载 Chromium）；dev server 需可访问 `http://localhost:3000`。脚本应 wait-on 端口就绪再开始，避免竞态。
- **为何不为三个 demo 页面写 Vitest 组件测试**：展示型页面、逻辑内联、重依赖 i18n/状态，组件测试脆弱；改由 E2E 在真实浏览器覆盖。如未来要单元测，应先把逻辑抽纯函数。
- **`t()` 回退行为是有意为之**（`translations[lang][key] || key`），测试锁定该行为。
- **翻译一致性测试是关键回归守护**：git 历史显示 i18n 文件频繁增删，该测试在 CI 阶段即拦截缺 key。
- **覆盖率非强制门槛**：`test:coverage` 仅供观察，不设硬阈值。
