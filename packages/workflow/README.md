# @agnes/workflow - Agnes AI 可视化工作流编辑器

基于 React + @xyflow/react 的拖拽式可视化工作流编辑器，支持预置模板和自定义节点扩展。

## 技术栈

- **框架**: React 19 + TypeScript
- **画布**: @xyflow/react (ReactFlow)
- **状态管理**: Zustand
- **样式**: UnoCSS + Tailwind CSS
- **构建**: Vite

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev:flow

# 构建生产版本
pnpm build
```

## 访问地址

- 工作流编辑器: http://localhost:5173
- API 服务: http://localhost:3001

## 功能特性

### 节点编辑

- 拖拽添加节点
- 连接线连接节点
- 双击编辑节点参数
- 右键删除节点

### 预置节点

| 节点类型 | 说明 |
|----------|------|
| Text Input | 文本输入 |
| Image Input | 图片输入 |
| LLM | 大语言模型调用 |
| Image Generator | 图片生成 |
| Video Generator | 视频生成 |
| Output | 结果输出 |

### 模板系统

提供预置工作流模板：
- 文本对话工作流
- 文生图工作流
- 图生视频工作流

### 数据存储

- 本地存储工作流
- 导出/导入 JSON

## 工作流文件格式

工作流保存为 `.flow.json` 文件：

```json
{
  "version": "1.0",
  "nodes": [
    {
      "id": "text-1",
      "type": "textInput",
      "position": { "x": 100, "y": 100 },
      "data": {
        "text": "Hello, world!"
      }
    },
    {
      "id": "llm-1",
      "type": "llm",
      "position": { "x": 300, "y": 100 },
      "data": {
        "model": "agnes-2.0-flash",
        "systemPrompt": "你是一个有帮助的助手"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "text-1",
      "target": "llm-1",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ]
}
```

## 开发

### 添加自定义节点

在 `src/nodes/` 下创建节点组件：

```tsx
// src/nodes/CustomNode.tsx
import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export interface CustomNodeData {
  label: string;
  value: string;
}

function CustomNode({ data }: NodeProps<CustomNodeData>) {
  return (
    <div className="px-4 py-2 bg-surface-100 border border-border rounded-lg">
      <Handle type="target" position={Position.Left} />
      <div>{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default memo(CustomNode);
```

注册节点：

```tsx
// src/App.tsx
import CustomNode from './nodes/CustomNode';

const nodeTypes = {
  customNode: CustomNode,
};

function App() {
  return (
    <ReactFlow nodeTypes={nodeTypes} {...}>
      {/* ... */}
    </ReactFlow>
  );
}
```

### 状态管理

使用 Zustand 管理全局状态：

```typescript
// src/store/workflowStore.ts
import { create } from 'zustand';

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  addNode: (node: Node) => void;
  removeNode: (id: string) => void;
  // ...
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  nodes: [],
  edges: [],
  addNode: (node) => set((state) => ({
    nodes: [...state.nodes, node]
  })),
  // ...
}));
```

## 与 Loader 集成

工作流可以导出为 JSON 文件供 Loader 执行：

```bash
# 在编辑器中导出工作流
# 然后使用 Loader 运行

pnpm exec agnes-flow run workflow.json
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Delete | 删除选中节点 |
| Ctrl+C | 复制 |
| Ctrl+V | 粘贴 |
| Ctrl+Z | 撤销 |
| Ctrl+Shift+Z | 重做 |
| Ctrl+S | 保存工作流 |

## 文件结构

```
packages/workflow/
├── server.cjs              # 工作流 API 服务
├── index.html
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── App.tsx            # 主应用
    ├── main.tsx           # 入口
    ├── store/
    │   └── workflowStore.ts  # Zustand 状态
    ├── nodes/
    │   ├── index.ts
    │   ├── TextInput.tsx
    │   ├── ImageInput.tsx
    │   ├── LLM.tsx
    │   └── ImageGenerator.tsx
    └── types/
        └── workflow.ts
```
