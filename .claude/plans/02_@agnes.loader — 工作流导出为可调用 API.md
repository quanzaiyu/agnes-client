# @agnes/loader — 工作流导出为可调用 API

## Context

`@agnes/workflow` 是一个拖拽式 AI 工作流编辑器（已完成）。当前 `exportJson()` 只能保存 nodes/edges 画布状态；用户希望更进一步：

1. **在工作流上**标记某些"参数"或"端口"为**输入**，某些"输出端口"为**输出**；
2. **导出工作流为 JSON** 时，IO 标记随同 nodes/edges 一起写入；
3. 接收方**不需要运行 workflow 前端**，只要装一个轻量加载器即可：
   - 加载 JSON → 注入输入 → 在 Node 环境里执行 → 返回输出
4. 同时提供 **CLI** 和 **HTTP** 两种调用形态。

**目标**：把工作流变成可分发的"AI 管道构件"，给团队和外部用户提供"传参即用"的 API 体验，复用现有执行引擎 + `@agnes/core` SDK。

## 决策摘要

| 维度 | 决策 |
| --- | --- |
| 新包 | `@agnes/loader`（packages/loader），独立可分发 |
| IO 粒度 | 端口/参数级（推荐）：`{nodeId, kind: 'param'|'port'\|'varPair', key}` |
| JSON 顶层 | 与 nodes/edges 同层 `inputs[]` / `outputs[]`，无包装层 |
| 复用 | `executeWorkflow.ts` + `resolvers/*.ts`（仅替换 videoFrameExtract 的 `document` 依赖） |
| 客户端 | Node 函数 `runWorkflow(json, inputs, opts?)` + CLI `agnes-flow <file> --input ...` + HTTP 服务 `POST /run` |
| UI 入口 | 端口/参数旁小图标「+」+ 节点右键菜单 + 顶部「API」按钮弹出对话框 |
| API Key | 加载器读 `agnes.config.json`（复用 `@agnes/core` 的 `loadConfig`） |

---

## 1. 包结构

```
agnes-client/
└── packages/
    ├── workflow/                       # 编辑器（已有，本期追加 IO 标记 + 导出 UI）
    │   ├── src/
    │   │   ├── store/
    │   │   │   └── workflowStore.ts    # +标记/取消输入输出 +apiInputs/apiOutputs
    │   │   ├── components/
    │   │   │   ├── ApiDialog.tsx       # 新增：API 导出对话框（命名、IO 列表编辑）
    │   │   │   ├── NodeShell.tsx       # 端口旁"+输入"按钮
    │   │   │   ├── PropertyPanel.tsx   # 参数旁"+输入"按钮
    │   │   │   └── NodeContextMenu.tsx # "标为输入/输出" 菜单项
    │   │   ├── engine/
    │   │   │   ├── types.ts            # +ApiInputSpec, ApiOutputSpec, ApiDefinition
    │   │   │   └── executeWorkflow.ts  # 接受外部 inputs 注入（覆盖 params）
    │   │   └── ...
    │   └── ...
    └── loader/                          # 新增
        ├── package.json                # name: @agnes/loader
        ├── tsconfig.json
        ├── src/
        │   ├── index.ts                # 导出 runWorkflow, loadWorkflow
        │   ├── runner.ts                # 核心执行（剥离 React Flow 依赖）
        │   ├── api-client.ts            # 包装 @agnes/core AgnesClient（仅 Node）
        │   ├── io-binding.ts            # 把外部 inputs 注入 params / vars / varPairs
        │   ├── io-extract.ts            # 收集 outputs（按 outputs 标记的 port）
        │   ├── cli.ts                   # bin: agnes-flow run <file> --input k=v
        │   ├── http.ts                  # 启动一个 Express: POST /run
        │   └── schemas.ts               # zod (或手写) 校验导出的 JSON
        └── README.md
```

---

## 2. JSON 顶层结构

工作流导出 JSON（在原 `exportJson` 基础上扩展）：

```ts
interface ExportedWorkflow {
  version: 2;                                // 升级版本号（v1 不含 apiInputs/Outputs）
  name?: string;                             // 由 ApiDialog 设置
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];

  /** 由用户在工作流编辑器上"标为输入"的字段 */
  apiInputs?: ApiInputSpec[];
  /** 由用户"标为输出"的端口（运行时收集该端口的 outputs[portId]） */
  apiOutputs?: ApiOutputSpec[];
}

interface ApiInputSpec {
  name: string;                              // 外部调用时使用的 key
  label?: string;
  description?: string;
  target: ApiTarget;
  default?: unknown;                         // 可选：调用方没传时使用的默认值
  required?: boolean;
}

interface ApiOutputSpec {
  name: string;                              // 返回 JSON 中的 key
  label?: string;
  source: ApiTarget;
}

type ApiTarget =
  | { nodeId: string; kind: 'param'; key: string }
  | { nodeId: string; kind: 'port';  key: string }   // 'text' / 'image' / 'var:xxx' 等
  | { nodeId: string; kind: 'varPair'; pairId: string };
```

**举例**：用户把"提示词"节点的 `params.text` 标为输入（name=prompt），把"图像生成"节点的 `outputs.image` 标为输出（name=image），则调用方传：

```json
{ "prompt": "A cat in space" }
```

返回：

```json
{ "image": { "url": "https://..." } }
```

---

## 3. 编辑器侧改动

### 3.1 状态扩展
[workflowStore.ts](packages/workflow/src/store/workflowStore.ts)：
- `apiInputs: ApiInputSpec[]`、`apiOutputs: ApiOutputSpec[]`
- 同步写入 localStorage（key `agnes.workflow.current`）与 `exportJson`
- 新增 action：`addApiInput(spec)` / `removeApiInput(name)` / `addApiOutput(spec)` / `removeApiOutput(name)`
- 兼容旧 v1 JSON：`importJson` 时若无 apiInputs/Outputs 视为空数组

### 3.2 UI
- 节点**端口旁**显示小「+」按钮（仅对 target 端口，标记为输入；source 端口标为输出）：在 [NodeShell.tsx](packages/workflow/src/components/NodeShell.tsx) 渲染
- 节点**参数旁**显示小「+」按钮：在 [PropertyPanel.tsx](packages/workflow/src/components/PropertyPanel.tsx) 渲染
- 节点**右键菜单**追加：「标为输入」、「标为输出」、「取消标记」
- 顶部工具栏 [Toolbar.tsx](packages/workflow/src/components/Toolbar.tsx) 追加「**API 导出**」按钮 → 打开 [ApiDialog.tsx](packages/workflow/src/components/ApiDialog.tsx)：
  - 命名工作流（API 名）
  - 表格列出当前所有 apiInputs / apiOutputs，可改名、删除、调顺序
  - 按钮「复制 JSON」+「保存到 .flow.json」+「启动 HTTP 服务」（新选项）

### 3.3 状态显示
- 已标记为输入/输出的端口/参数在节点上显示一个不同的徽章或下划线（视觉提示）
- 节点卡片上显示当前该节点被标记的字段数

---

## 4. 加载器包（@agnes/loader）

### 4.1 核心 API
[packages/loader/src/index.ts](packages/loader/src/index.ts)：

```ts
export interface RunOptions {
  config?: { apiKey?: string; baseUrl?: string };   // 缺省时读 loadConfig()
  signal?: AbortSignal;
  onProgress?: (nodeId: string, pct: number) => void;
  onLog?: (msg: string) => void;
}

export async function runWorkflow(
  workflow: ExportedWorkflow,
  inputs: Record<string, unknown>,
  opts: RunOptions = {},
): Promise<{ outputs: Record<string, unknown>; logs: string[] }>;

export function loadWorkflow(file: string | object): ExportedWorkflow;
```

### 4.2 执行引擎剥离
[packages/loader/src/runner.ts](packages/loader/src/runner.ts)：
- 复用 [executeWorkflow.ts](packages/workflow/src/engine/executeWorkflow.ts) 的**核心逻辑**，但去掉 `useWorkflowStore` 依赖
- 把 resolvers 单独 `import`：[packages/workflow/src/engine/resolvers/index.ts](packages/workflow/src/engine/resolvers/index.ts)
- **例外**：`videoFrameExtract` 用 `document.createElement` —— 加载器里**不导出**它（require 时检测 `typeof document === 'undefined'` 则跳过注册，调用时抛清晰错误）

### 4.3 IO 注入与提取
[packages/loader/src/io-binding.ts](packages/loader/src/io-binding.ts)：
- 遍历 `workflow.apiInputs`
- 对 `kind: 'param'`：覆盖 `nodes[i].data.params[target.key] = inputs[spec.name]`
- 对 `kind: 'port'`：把 `nodes[i].data.params['__apiIn__:' + portId] = inputs[spec.name]` （约定）
- 对 `kind: 'varPair'`：在 `VariableInput` 节点的 `varPairs` 里按 `pairId` 找到对应项，覆盖 `value`

[packages/loader/src/io-extract.ts](packages/loader/src/io-extract.ts)：
- 跑完后，遍历 `workflow.apiOutputs`
- 对 `kind: 'port'`：读 `nodes[i].data.outputs[target.key]`
- 对 `kind: 'param'`：读 `nodes[i].data.params[target.key]`（一般用不到）
- 聚合成 `{ [name]: value }`

### 4.4 CLI
[packages/loader/src/cli.ts](packages/loader/src/cli.ts)：
```bash
agnes-flow run my-workflow.flow.json --input prompt="A cat" --input subject=cat
# 或 stdin JSON
cat inputs.json | agnes-flow run my-workflow.flow.json --stdin
# 输出 JSON 到 stdout
```

### 4.5 HTTP 服务
[packages/loader/src/http.ts](packages/loader/src/http.ts)：
- Express server，端口默认 4500
- `POST /run`，body = `{ workflow: ExportedWorkflow | filePath, inputs: {...} }`
- 返回 `{ outputs, logs }`
- `GET /workflows/<id>/run`：可选，参数当 URL query（仅适合 demo）
- CORS 默认开，方便前端 demo
- 启动命令：`agnes-flow serve --port 4500 --watch ./workflows`

### 4.6 package.json
```json
{
  "name": "@agnes/loader",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": { "agnes-flow": "dist/cli.js" },
  "dependencies": {
    "@agnes/core": "*",
    "express": "^4.19.2",
    "commander": "^12.0.0"
  },
  "devDependencies": { "typescript": "^5.7.2", "tsx": "^4.19.0" }
}
```

构建：用 `tsx` 直接跑 TS 源（小型 CLI 包），不引入 vite。`"type": "module"` + `.ts` 入口 + 编译到 `dist/`。

---

## 5. 工作流编辑器的"API 导出"工作流

1. 用户拖节点、连线
2. 在希望外部传入的端口/参数上点「+ 输入」→ 弹输入框 → 输入参数名（如 `prompt`）
3. 在希望作为输出的端口上点「+ 输出」→ 弹输入框 → 输入参数名（如 `image`）
4. 顶部点「API 导出」→ 弹出 ApiDialog
5. 用户命名（如 `txt2img`）、写描述 → 点「保存到 .flow.json」或「启动 HTTP 服务」
6. JSON 文件可分发给接收方

---

## 6. 关键文件清单

**修改**：
- [packages/workflow/src/store/workflowStore.ts](packages/workflow/src/store/workflowStore.ts) — +apiInputs/Outputs +actions
- [packages/workflow/src/engine/types.ts](packages/workflow/src/engine/types.ts) — +ApiInputSpec/ApiOutputSpec/ApiTarget
- [packages/workflow/src/engine/executeWorkflow.ts](packages/workflow/src/engine/executeWorkflow.ts) — 接受 inputs 注入
- [packages/workflow/src/components/NodeShell.tsx](packages/workflow/src/components/NodeShell.tsx) — 端口旁"+"按钮
- [packages/workflow/src/components/PropertyPanel.tsx](packages/workflow/src/components/PropertyPanel.tsx) — 参数旁"+"按钮
- [packages/workflow/src/components/NodeContextMenu.tsx](packages/workflow/src/components/NodeContextMenu.tsx) — "标为输入/输出"
- [packages/workflow/src/components/Toolbar.tsx](packages/workflow/src/components/Toolbar.tsx) — "API 导出"按钮
- [packages/workflow/src/nodes/index.ts](packages/workflow/src/nodes/index.ts) — 显式导出 `RESOLVERS`（loader 复用）
- [packages/workflow/src/engine/resolvers/utility.ts](packages/workflow/src/engine/resolvers/utility.ts) — `videoFrameExtract` 内部用 `typeof document !== 'undefined'` 守卫

**新增**：
- [packages/workflow/src/components/ApiDialog.tsx](packages/workflow/src/components/ApiDialog.tsx) — 导出对话框
- [packages/loader/package.json](packages/loader/package.json) — 新包
- [packages/loader/tsconfig.json](packages/loader/tsconfig.json)
- [packages/loader/src/index.ts](packages/loader/src/index.ts)
- [packages/loader/src/runner.ts](packages/loader/src/runner.ts)
- [packages/loader/src/api-client.ts](packages/loader/src/api-client.ts)
- [packages/loader/src/io-binding.ts](packages/loader/src/io-binding.ts)
- [packages/loader/src/io-extract.ts](packages/loader/src/io-extract.ts)
- [packages/loader/src/cli.ts](packages/loader/src/cli.ts)
- [packages/loader/src/http.ts](packages/loader/src/http.ts)
- [packages/loader/src/schemas.ts](packages/loader/src/schemas.ts)
- [packages/loader/README.md](packages/loader/README.md)
- 根 [package.json](package.json) — +`@agnes/loader` workspace

---

## 7. 实施阶段

| 阶段 | 任务 | 验证 |
| --- | --- | --- |
| **1. 类型 + 状态** | `types.ts` 加 ApiInputSpec/OutputSpec；`workflowStore` 加 apiInputs/Outputs + 4 个 action；持久化兼容 v1 | import 旧 JSON 不报错；标记后 export 可见 |
| **2. 编辑器 UI** | 端口/参数旁"+输入"；节点右键菜单标输入/输出；PropertyPanel 标记徽章 | 截图：标记后端口有徽章 |
| **3. ApiDialog** | 弹出对话框编辑 apiInputs/Outputs，命名工作流，导出 JSON/启动 HTTP | 导出 .flow.json 能在外打开 |
| **4. 加载器核心** | 抽取 runner.ts，IO 注入/提取，@agnes/core 包装 | 单元测试：跑一个 fixture 输出正确 |
| **5. CLI** | commander 解析 --input，启动 | `agnes-flow run x.flow.json --input prompt="hi"` 返回 JSON |
| **6. HTTP** | Express + POST /run | curl 调通 |
| **7. 端到端** | 完整链路：编辑 → 标记 → 导出 → CLI 跑 → 拿结果 | Playwright 跑通一次 |

---

## 8. 验证

1. **导出**：
   ```bash
   # 工作流编辑器里构建 "A ${subject}" 提示词 + 文生图 + 预览
   # 标记 prompt.text 为输入 prompt，图像生成的 image 端口为输出 image
   # 点 "API 导出" → 命名 txt2img → 保存为 /tmp/txt2img.flow.json
   ```
2. **CLI 调用**（不需要启动 workflow 包）：
   ```bash
   cd packages/loader
   npx tsx src/cli.ts run /tmp/txt2img.flow.json --input prompt="A cat" --input subject=cat
   # stdout: {"outputs":{"image":{"url":"https://..."}}}
   ```
3. **HTTP 调用**：
   ```bash
   npx tsx src/cli.ts serve --port 4500
   curl -X POST localhost:4500/run -H "Content-Type: application/json" \
     -d '{"workflow":"/tmp/txt2img.flow.json","inputs":{"prompt":"A cat","subject":"cat"}}'
   ```
4. **Round-trip**：把导出的 JSON 再 `importJson` 回来，节点/边/IO 标记完整还原。
5. **tsc 0 错误**：`cd packages/loader && npx tsc --noEmit`。

---

## 9. 风险与权衡

- **API Key 共享**：CLI/HTTP 仍读 `agnes.config.json`（与 TUI/WebUI 同一份），不会把 Key 嵌入 JSON。
- **videoFrameExtract**：浏览器专属 API，加载器内做软失败（`Error: 'videoFrameExtract is not supported in Node'`，不影响其他节点）。
- **大文件**：图像/视频 base64 在 JSON 里会很大——CLI/HTTP 建议用 `filePath` 引用，加载器内仍通过 `dataUri` 走完整链路。
- **流式输出**：当前 loader 的 runWorkflow 是"跑完一次性返回 outputs"；text 流式不暴露给 loader（loader 视角只关心最终文本）。如未来需要，加 `stream: true` 走 SSE。
- **错误隔离**：单个节点错误时，loader 应返回 `{ outputs: partial, errors: {nodeId: msg} }`，方便调用方知道哪步失败。

---

## 10. 不在范围内

- 异步 webhook 回调
- 工作流版本管理 / 数据库存储
- 鉴权 / 速率限制（HTTP 服务默认无鉴权，部署到公网时由用户自行加）
- 工作流编辑器的协作多人编辑
