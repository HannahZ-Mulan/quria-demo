# 功能：语言切换下拉框

## 功能描述
将当前每个页面上排成一排的内联语言按钮，替换为单个紧凑的**下拉框**，固定锚定在屏幕**右上角**。下拉框触发器显示一个地球/语言图标加上当前激活语言的标签，点击后展开菜单列出全部 9 种支持的语言，并高亮当前选中的语言。本功能还将原本在各页面中重复且不一致的语言元数据，整合为一个共享、可复用的 `LanguageSwitcher` 组件，以及一份从 i18n 模块导出的统一语言列表。

支持的语言：简体中文 (zh-CN)、繁體中文 (zh-TW)、English (en)、日本語 (ja)、Italiano (it)、Français (fr)、עברית (he)、Português (pt)、Español (es)。

## 用户故事
作为演示网站的访客
我希望通过位于固定、可预期位置（右上角）的紧凑下拉框来切换界面语言
以便该语言控件占用最少的空间、在每个页面都易于找到，并且在切换语言时不会挤压页面内容。

## 问题陈述
目前语言切换器以一排 5 个完整按钮的形式横向排列，存在三个问题：
1. **空间与布局** —— 首页上该按钮排居中置于顶部，占用大量横向空间；在移动端会尴尬地折行。
2. **不一致** —— 切换器在三个页面（`page.tsx`、`project1/page.tsx`、`project3/page.tsx`）中分别实现，样式各异（完整标签 vs. 单字符标签），导致各页面行为出现偏差。
3. **可发现性/可预期性** —— 控件不在同一固定位置，用户在页面间跳转时需要四处寻找。

## 解决方案
构建一个可复用的 `LanguageSwitcher` React 组件，渲染为按钮式下拉框（触发器 = 图标 + 当前语言名称；菜单 = 全部语言列表，当前语言被标记）。通过一个共享的、绝对/固定定位的顶部容器，将其锚定在所有页面的右上角。将语言列表集中为从 `src/i18n/index.tsx` 导出的单一常量，作为唯一事实来源。用 `<LanguageSwitcher />` 替换三处内联按钮排。

该下拉框实现为**自包含的自定义组件**（无需抓取外部组件），基于项目已有的基础组件构建（`Button`、Tailwind 类、`lucide-react` 的 `Languages` 图标，以及用于开关/点击外部关闭的标准 React `useState`/`useEffect`）。这样可以避免依赖 shadcn 注册表/网络——在本环境中该网络并不可靠。

## 相关文件
使用以下文件来实现该功能：

- `src/i18n/index.tsx` —— i18n 的 React Context，定义了 `Language` 类型、`useI18n` hook 和 `setLang`。我们将在此导出一份统一的 `LANGUAGES` 常量（code + label），并直接复用 `Language`/`setLang`。
- `src/app/page.tsx` —— 首页。当前在顶部居中渲染 5 个完整标签按钮（约第 8–14 行定义 `languages`，约第 22–34 行渲染它们）。替换为锚定在右上角的 `<LanguageSwitcher />`。
- `src/app/project1/page.tsx` —— 项目 1 演示。当前在右上角渲染 5 个单字符按钮（约第 137–149 行）。替换为 `<LanguageSwitcher />`。
- `src/app/project3/page.tsx` —— 项目 3 演示。当前在右上角渲染 5 个单字符按钮（约第 260–272 行）。替换为 `<LanguageSwitcher />`。
- `src/components/ui/button.tsx` —— 已有的 shadcn `Button` 基础组件，用作下拉框触发器。
- `src/lib/utils.ts` —— 提供 `cn()`，用于新组件中的条件类合并。

### 新增文件
- `src/components/LanguageSwitcher.tsx` —— 可复用的下拉框组件（客户端组件）。导出 `LanguageSwitcher`。渲染触发器按钮（图标 + 当前标签）和一个绝对定位的语言菜单；处理展开/关闭、点击外部关闭等逻辑。

## 实现计划
### 阶段 1：基础
将语言元数据集中化，使所有 UI 共享同一事实来源。在 `src/i18n/index.tsx` 中新增并导出 `LANGUAGES` 常量（`{ code: Language; label: string }[]` 数组），默认语言（zh-CN）排在首位。

### 阶段 2：核心实现
创建 `src/components/LanguageSwitcher.tsx` —— 一个自包含的下拉框：
- 客户端组件（`"use client"`）。
- 通过 `useI18n()` 读取 `lang`/`setLang`；遍历已导出的 `LANGUAGES` 列表。
- 触发器：一个 `Button variant="outline" size="sm"`，显示 `Languages` 图标（来自 `lucide-react`）+ 当前语言标签 + 一个箭头。
- 菜单：绝对定位在触发器下方，右对齐；每一项显示语言标签，当前激活项显示对勾图标。
- 行为：点击触发器切换；点击外部关闭（通过 `useEffect` 注册 document mousedown 监听，用 ref 守卫），按 Escape 关闭，选中某项后关闭。
- 无障碍：触发器带 `aria-haspopup="menu"` 和 `aria-expanded`；菜单带 `role="menu"`，菜单项带 `role="menuitemradio"` + `aria-checked`。

### 阶段 3：集成
在三个页面中用 `<LanguageSwitcher />` 替换内联切换器标记。将其包裹在一个锚定右上角的小容器中（`absolute top-4 right-4 z-50`，相对于 `relative` 的页面根），使其在每页处于一致位置，并随页面内容滚动；移除现已无用的本地 `languages` 数组 / 内联按钮排。验证没有遗留对旧内联列表的引用。

## 分步任务
重要：按顺序从上到下执行每一个步骤。

### 步骤 1 —— 集中语言元数据
- 打开 `src/i18n/index.tsx`。
- 新增并导出 `LANGUAGES` 常量：`export const LANGUAGES: { code: Language; label: string }[] = [ { code: "zh-CN", label: "简体中文" }, { code: "zh-TW", label: "繁體中文" }, { code: "en", label: "English" }, { code: "ja", label: "日本語" }, { code: "it", label: "Italiano" }, { code: "fr", label: "Français" }, { code: "he", label: "עברית" }, { code: "pt", label: "Português" }, { code: "es", label: "Español" } ];`
- 保持现有的 `Language` 类型、`useI18n` hook 和 Provider 不变。

### 步骤 2 —— 创建可复用下拉框组件
- 创建 `src/components/LanguageSwitcher.tsx`，作为客户端组件。
- 从 `@/i18n` 导入 `useI18n`、`LANGUAGES`，从 `@/components/ui/button` 导入 `Button`，从 `@/lib/utils` 导入 `cn`，从 `lucide-react` 导入 `Languages`、`Check`、`ChevronDown` 图标。
- 用 `useState` 实现展开/关闭状态；添加 `useEffect` 注册 document `mousedown` 监听（以组件根的 ref 守卫），实现点击外部关闭；注册 `keydown` 监听实现 Escape 关闭。
- 渲染一个相对定位的容器；触发器 `Button` 切换菜单；菜单绝对定位（`absolute right-0 mt-2`），右对齐，带 `role="menu"`。
- 每个语言项为一个按钮：显示 `label`；当 `code === lang` 时显示 `Check` 图标；点击时调用 `setLang(code)` 并关闭菜单。
- 触发器内容：`<Languages />` 图标、当前标签、`<ChevronDown />` 图标。
- 给触发器添加 `aria-haspopup="menu"`、`aria-expanded={open}`。

### 步骤 3 —— 在首页集成
- 打开 `src/app/page.tsx`。
- 移除本地的 `languages` 数组（约第 8–14 行）和居中的按钮排（约第 22–34 行）。
- 从 `@/components/LanguageSwitcher` 导入 `LanguageSwitcher`。
- 新增锚定右上角的容器：`<div className="absolute top-4 right-4 z-50"><LanguageSwitcher /></div>`（放在页面根的第一个子元素位置）。
- 仅当其他地方仍在使用 `useI18n` 时才保留其导入（确实仍在使用 —— `t` 仍被使用）。

### 步骤 4 —— 在项目 1 页面集成
- 打开 `src/app/project1/page.tsx`。
- 移除内联的单字符按钮排（约第 137–149 行，即映射 5 个 code 的 `flex justify-end gap-2` 块）。
- 在返回树顶部导入并渲染 `<LanguageSwitcher />`，外层包裹 `absolute top-4 right-4 z-50` 容器。
- 仅当 `Language` 导入在文件其他地方不再被引用时才移除（移除前先检查其他使用处）。

### 步骤 5 —— 在项目 3 页面集成
- 打开 `src/app/project3/page.tsx`。
- 移除内联的单字符按钮排（约第 260–272 行）。
- 导入并渲染 `<LanguageSwitcher />`，外层包裹 `absolute top-4 right-4 z-50` 容器。
- 同步骤 4 的 `Language` 导入清理检查。

### 步骤 6 —— 验证
- 运行下方的验证命令，确认零错误且行为正确。

## 测试策略
### 单元测试
- （可选，项目目前无测试运行器。）若添加：断言 `LANGUAGES` 有 9 个条目且 code 唯一；断言 `LanguageSwitcher` 在触发器中渲染当前语言标签，并在展开时对当前项显示对勾。

### 集成测试
- 在每个路由（`/`、`/project1`、`/project3`）手动验证：下拉框出现在右上角，可展开，列出 9 种语言，高亮当前语言，点击后页面语言切换（所有可见翻译文本更新）。

### 边界情况
- 点击触发器可切换展开/关闭（而非仅展开）。
- 点击下拉框外部会关闭它。
- 按 Escape 关闭菜单但不改变语言。
- 选择当前已激活的语言是空操作，但仍会关闭菜单。
- 快速展开/关闭不会遗留 document 监听（在 `useEffect` 返回值中清理）。
- 下拉菜单不会溢出视口右边缘（右对齐）。
- 固定定位的控件在小屏幕上不会遮挡关键内容。
- 切换语言时下拉框锚点保持稳定（布局不跳动）。

## 验收标准
- 单个下拉框控件替换了全部三个页面（`/`、`/project1`、`/project3`）上原有的按钮排。
- 控件锚定在**右上角**，且在所有页面上视觉一致。
- 触发器显示语言图标 + 当前激活语言的完整标签（例如 "简体中文"）。
- 展开菜单列出恰好 9 种语言；当前语言被视觉标记（对勾图标 + 高亮）。
- 选择某种语言会立即更新页面上所有翻译文本。
- 点击外部和 Escape 关闭菜单；无监听器泄漏。
- 无 TypeScript 或 ESLint 错误；现有页面仍可正常渲染，无回归。
- 语言元数据集中在一处（`src/i18n/index.tsx` 中的 `LANGUAGES`）；不再有重复的内联语言列表。

## 验证命令
执行每一条命令，以验证功能正确实现且零回归。

- `cd "D:/project for 悦数/quria-demo" && npx tsc --noEmit` —— 对整个项目进行类型检查（必须零错误通过）。
- `cd "D:/project for 悦数/quria-demo" && npm run lint` —— 运行 ESLint（必须零错误通过）。
- `cd "D:/project for 悦数/quria-demo" && npm run build` —— 生产构建（必须成功完成）。
- 手动：在 `npm run dev` 运行时，访问 `http://localhost:3000/`、`http://localhost:3000/project1` 和 `http://localhost:3000/project3`；在每个页面上确认下拉框位于右上角，可展开/关闭，列出 9 种语言，标记当前语言，并在点击时切换语言。

## 备注
- **为何用自定义下拉框而非 `npx shadcn add select`：** 在本环境中 shadcn 注册表抓取不可靠（例如之前 `raw.githubusercontent.com` DNS 失败）。基于已有 `Button` 基础组件构建的自包含组件可避免该依赖，同时匹配项目的外观风格。若日后注册表可用，自定义下拉框可在不改变 `LanguageSwitcher` 使用方 API 的前提下，替换为 shadcn 的 `Select`。
- 固定的 `top-4 right-4 z-50` 定位为各页面提供一致、可预期的位置。若日后加入完整的应用顶部栏，同一个 `<LanguageSwitcher />` 可直接放入其中而无需改动。
- 无需新增 npm 依赖（`lucide-react`、`radix-ui`、`class-variance-authority`、`tailwind-merge` 均已安装）。
- 无需修改翻译文件 —— 语言*标签*本身就是各语言的原生名称，无需翻译。
