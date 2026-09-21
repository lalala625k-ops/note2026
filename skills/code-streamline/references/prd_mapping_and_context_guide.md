# PRD 对照裁剪与 AI 上下文优化实操指南

本指南配合 `code-streamline` Skill 使用，提供详细的判定标准、重构模式与代码精简范例。

---

## 1. PRD 对照裁剪判定法则

在审查代码时，将所有功能与代码块对照 PRD 表格进行分类：

| 代码特征 | 判定分类 | 处理动作 |
| :--- | :--- | :--- |
| 与 PRD 明确列出的功能严格对应 | **核心有效** | 保留并进行语法精简 |
| 为核心功能提供底层支持的工具/模型 | **基础设施** | 模块化保留 |
| 仅在本地测试/调试时使用但未清理的代码 (console.log, 测试数据, debug接口) | **调试残留** | 坚决删除 |
| 未在 PRD 中声明但被自行“超前实现”的复杂功能或冷门参数 | **超纲代码** | 剥离或移除 |
| 已经重构过但未删干净的旧版逻辑分支或未被引用的函数/类型 | **死代码** | 彻底删除 |

### PRD 功能清单映射模版
在重构前，建议建立如下清单：
```markdown
- [x] 1.1 画布与视窗操作 -> 对应 hooks/useViewport.ts
- [x] 1.2 粘贴摄入卡片 (OCR/URL/Text) -> 对应 hooks/useClipboardPaste.ts & backend/services/
- [x] 1.3 卡片直接操作 (缩放/拖动/删除) -> 对应 hooks/useCardDrag.ts & components/CardComponent.tsx
- [x] 1.4 分组 (Group) 操作 -> 对应 hooks/useGroups.ts & components/GroupComponent.tsx
- [x] 1.5 整理与排版 (装箱/对齐/磁吸) -> 对应 utils/packing.ts, utils/alignment.ts, utils/snap.ts
- [x] 2.0 数据持久化 -> 对应 utils/storage.ts & backend/routes/cards.py
```

---

## 2. 最小化 AI 上下文的设计模式 (Context-Friendly Patterns)

### 痛点对比
- **重构前**：所有逻辑都在单个 1400 行的 `App.tsx`。
  - **AI 交互痛点**：修改一个简单的快捷键，AI 必须读入 1400 行代码（约消耗 4,000~6,000 tokens），并在生成时容易改漏状态或引入幻觉。
- **重构后**：每个 Hook 仅 50~150 行。
  - **AI 交互收益**：修改快捷键只用读取 `useShortcuts.ts`（约 80 行，< 400 tokens），AI 秒级定位，精准修改，上下文污染降低 90% 以上。

### 标准文件拆分范式

```text
src/
├── hooks/
│   ├── useViewport.ts         # 仅包含画布视窗: viewport 状态, zoom, pan, doubleClickFocus
│   ├── useSelection.ts        # 仅包含选区: selectionRect, selectedCardIds, toggleSelect
│   ├── useCardDrag.ts         # 仅包含拖拽: handleDragStart, handleDragMove, handleDragEnd, snapLines
│   ├── useCardResize.ts       # 仅包含缩放/尺寸调整: handleResizeStart, scaling
│   ├── useGroups.ts           # 仅包含分组: createGroup, ungroup, dragGroup
│   ├── useHistory.ts          # 仅包含撤销: historyStack, pushHistory, undo
│   ├── useClipboardPaste.ts   # 仅包含剪贴板监听: handlePaste, OCR/URL请求
│   └── useShortcuts.ts        # 仅包含键盘快捷键映射: Ctrl+Z, Ctrl+G, Delete, Ctrl+P 等
├── components/
│   ├── CanvasContainer.tsx    # 纯画布背景网格与外层事件绑定
│   ├── CardComponent.tsx      # 单张卡片渲染（文本/图片/链接预览）
│   ├── GroupComponent.tsx     # 分组外框渲染
│   ├── SelectionBox.tsx       # 框选虚线框
│   └── SnapGuides.tsx         # 磁吸对齐线
└── utils/
    ├── canvas.ts              # 坐标换算 (纯函数)
    ├── alignment.ts           # 对齐排版 (纯函数)
    ├── packing.ts             # 紧凑拼合 (纯函数)
    └── storage.ts             # 本地/后端双层持久化通信
```

---

## 3. 语法级字数瘦身示例

### 技巧 A：早退与卫语句替代深层嵌套
```ts
// 瘦身前 (多层嵌套，行数多)
function handleAction(card) {
  if (card) {
    if (card.type === 'image') {
      if (card.content) {
        doProcess(card.content);
      }
    }
  }
}

// 瘦身后 (平铺直接，字数少)
function handleAction(card?: Card) {
  if (card?.type !== 'image' || !card.content) return;
  doProcess(card.content);
}
```

### 技巧 B：使用 原生 API 替代冗长模拟
```ts
// 瘦身前
const cloneCards = JSON.parse(JSON.stringify(cards));

// 瘦身后
const cloneCards = structuredClone(cards);
```

### 技巧 C：对象属性解构与简写
```ts
// 瘦身前
const nextViewport = {
  x: nextX,
  y: nextY,
  zoom: nextZoom
};
setViewport(nextViewport);

// 瘦身后
setViewport({ x: nextX, y: nextY, zoom: nextZoom });
```
