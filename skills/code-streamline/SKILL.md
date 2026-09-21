---
name: code-streamline
description: >-
  Audits and streamlines the codebase against PRD requirements, eliminates unused or out-of-scope code,
  and refactors monolithic files into modular, single-responsibility units (<200 lines) to minimize
  LLM context token pressure and make code modification locations instantly identifiable.
---

# Code Streamline & Context Optimization Skill

专用于**对照需求文档（PRD）裁剪冗余代码**，以及**重构代码结构以最小化 AI 上下文（Context Window）压力**的操作规范。

---

## 核心设计理念

1. **PRD 绝对真理准则**：代码只为 PRD 中明确的功能服务。凡是 PRD 没有要求、且不是核心基础设施的衍生功能或测试残留代码，一律坚决筛除。
2. **AI 上下文友好（LLM-Friendly Architecture）**：
   - **文件粒度控制在 150 ~ 200 行以内**，严禁出现超过 500 行的“上帝组件/上帝文件”。
   - **目录与命名自解释**：AI 仅凭目录树和文件名就能 100% 确定目标修改位置，无需跨文件大量阅读上下文。
   - **高内聚低耦合**：业务状态抽离为独立 Hook/Service，UI 组件仅负责渲染，工具函数保持纯函数。

---

## 执行工作流 (Four-Phase Workflow)

### 阶段一：对照 PRD 功能审计与清点 (PRD Audit & Pruning)

1. **定位并阅读 PRD**：
   - 检查项目根目录的 PRD 文件（如 `product_requirements_document.md`、`PRD.md` 或设计说明）。
   - 梳理出 **功能清单矩阵 (Feature List)**，明确系统核心能力、交互动作与接口规范。

2. **代码功能比对 (Diff against PRD)**：
   - 逐个遍历源文件，标记代码块的功能归属：
     - `[保留]`：与 PRD 功能清单严格对应的核心业务逻辑与必要支持库。
     - `[冗余/超纲]`：PRD 中未定义的过度设计、未上线的实验性分支、废弃的 Mock 数据。
     - `[死代码/僵尸代码]`：未被引用的函数、废弃的接口、多余的类型定义与导出的无用变量。

3. **执行修剪 (Safe Pruning)**：
   - 移除所有与 PRD 无关的冗余代码分支。
   - 移除已废弃的测试文件、未使用的第三方依赖和冗余导入。

---

### 阶段二：架构分拆与上下文最小化 (Context Minimization)

为了让后续 AI 可以在每次修改时**只读取几十行上下文**即可完成任务，必须执行模块化拆分：

#### 1. 前端拆解规范（消灭巨型组件）
- **UI 组件层 (`components/`)**：
  - 仅保留 JSX 渲染与必要的 DOM 事件绑定。
  - 单个组件代码行数严格控制在 **100~200 行以内**。
- **业务状态与交互逻辑层 (`hooks/`)**：
  - **视窗交互**：抽取为 `useViewport.ts`（平移、缩放、双击居中、坐标系换算）。
  - **框选与选择**：抽取为 `useSelection.ts`（框选矩形、单选/多选状态）。
  - **元素拖动与吸附**：抽取为 `useCardDrag.ts`（拖动、磁吸辅助线计算）。
  - **历史与撤销**：抽取为 `useHistory.ts`（撤销重做栈与快照管理）。
  - **剪贴板与快捷键**：抽取为 `useClipboardPaste.ts` 与 `useShortcuts.ts`。
- **纯函数工具层 (`utils/`)**：
  - 纯计算逻辑（如对齐算法、自动装箱排列、几何碰撞检测）必须为纯函数，不依赖 React 状态。

> **AI 上下文收益**：当用户提出“修改缩放灵敏度”时，AI 只需要读入 `useViewport.ts`（约 50 行），而不需要读入包含 1400 行的庞大 `App.tsx`！

#### 2. 后端拆解规范（消除巨型单文件路由）
- **入口层 (`main.py`)**：
  - 仅保留 FastAPI 初始化、中间件配置 (CORS)、路由注册，控制在 **30~50 行**。
- **路由层 (`routes/` 或 `routers/`)**：
  - 按业务域拆分路由（如 `routes/cards.py` 负责卡片 CRUD，`routes/tools.py` 负责识别与提取）。
- **业务服务层 (`services/`)**：
  - 独立耗时或复杂能力（如 `services/ocr_service.py` 负责 OCR，`services/scraper_service.py` 负责网页解析）。

---

### 阶段三：代码字数与表达瘦身 (Syntax Slimming)

在保留代码功能的前提下，利用现代语言特性减少无效字数：

1. **消除冗长防御性代码**：
   - 广泛使用可选链（`?.`）与空值合并（`??`）替代深层嵌套的 `if (a && a.b && a.b.c)`。
   - 使用 **早退原则 (Early Return / Guard Clauses)**，降低代码缩进嵌套层级。
2. **现代化对象与数据操作**：
   - 废弃 `JSON.parse(JSON.stringify(x))`，改用原生 `structuredClone(x)`。
   - 善用对象解构赋值与属性简写语法。
3. **消除重复逻辑 (DRY - Don't Repeat Yourself)**：
   - 合并重复的网络请求封装、统一异常捕获与日志输出。
   - 后端 Python 提取公共解析函数，避免在多个爬虫函数中重复声明 headers 和重试循环。

---

### 阶段四：验证与防退化检查 (Verification)

精简重构后必须确保**零功能退化**：

1. **静态语法与类型检查**：
   - 前端：执行 `npm run build` 或 `npx tsc --noEmit`，确保无 TypeScript 类型错误与缺失依赖。
   - 后端：运行 Python 语法检测或启动服务，确保导入路径正常无循环引用。
2. **对照 PRD 回归验证**：
   - 逐条对照 PRD 第一章节的功能清单（视窗操作、粘贴卡片、快捷键、分组等），确保核心交互全部正常响应。
