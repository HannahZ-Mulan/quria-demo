# Quria 产品优化方案演示

为 [悦数洞察 (Aquria.AI)](https://quria.aquria.cn) AI 访谈系统设计的两个核心优化项目演示。

## 项目背景

悦数洞察是一家提供 AI 驱动用户研究解决方案的公司，其 Quria 平台通过 AI 访谈帮助企业进行深度用户洞察。本项目针对实际体验中发现的痛点，提出优化方案并构建可交互原型。

## 优化项目

### 项目 1：AI 追问长度动态优化

**问题**：现有 AI 访谈中追问问题过长，影响受访者体验，尤其对移动端用户和注意力有限的群体不友好。

**方案**：建立动态追问长度控制机制
- 根据受访者回答长度自动调整追问字数上限
- 支持三种访谈模式（精简/标准/深度）
- 适配 PC 端和移动端不同场景
- 内置关键词智能匹配，生成针对性追问

**技术实现**：
- 动态长度计算规则（回答 ≤20 字 → 30 字上限，20-100 字 → 45 字，&gt;100 字 → 60 字）
- 移动端额外缩减 25%
- 模式调整（精简 -30%，深度 +30%）
- 关键词匹配（价格、体验、品牌、推荐等维度）

[查看演示 →](https://quria-demo.vercel.app/project1)

---

### 项目 3：客户需求标准化拆解

**问题**：客户提出的研究需求往往模糊、不完整，导致技术团队反复沟通、项目延期。

**方案**：建立「需求输入 → 结构化拆解 → 技术方案输出」的标准化流程
- 自动提取关键信息（研究目标、人群、场景、预算、时间）
- 模糊表述自动标记
- 冲突检测（如样本量大 + 深度访谈 + 时间短）
- 一键生成技术需求文档（TRD）

**技术实现**：
- 研究类型判定（定性/定量/混合）
- 访谈深度分级（L1 筛查/L2 探索/L3 深度）
- 样本量智能推荐
- 技术配置自动生成（模型配置、Prompt 模板、数据标签、报告框架）

[查看演示 →](https://quria-demo.vercel.app/project3)

## 多语言支持

支持 5 种语言切换：
- 简体中文 (zh-CN)
- 繁體中文 (zh-TW)
- English (en)
- 粵語 (yue)
- 日本語 (ja)

## 产品文档

完整产品文档：

- 📄 [PRD - 项目 1：AI 追问长度动态优化](https://github.com/HannahZ-Mulan/quria-demo/blob/main/PRD_AI_追问长度动态优化方案.md)
- 📄 [SRS - 项目 1：AI 追问长度动态优化系统](https://github.com/HannahZ-Mulan/quria-demo/blob/main/SRS_AI_追问长度动态优化系统.md)
- 📄 [PRD - 项目 3：客户需求标准化拆解](https://github.com/HannahZ-Mulan/quria-demo/blob/main/PRD_客户研究需求标准化拆解模板.md)
- 📄 [SRS - 项目 3：客户需求标准化拆解系统](https://github.com/HannahZ-Mulan/quria-demo/blob/main/SRS_客户研究需求标准化拆解系统.md)

## 技术栈

- **框架**：Next.js 16 + React + TypeScript
- **样式**：Tailwind CSS + shadcn/ui
- **部署**：Vercel
- **国际化**：自定义 React Context + JSON 翻译文件

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 打开 http://localhost:3000