# @agnes/workflow — 拖拽式 AI 工作流编辑器

## Context

`agnes-client` 是一个基于 [Agnes AI](https://agnes-ai.com) API 的 monorepo 客户端工具（npm workspaces），目前有 `@agnes/core`（Node SDK）、`@agnes/tui`（CLI/TUI）、`@agnes/webui`（Express + 单 HTML）三个包。CLI/TUI 都是线性流程（一次只能做一种操作），WebUI 是表单式（缺乏可视化、复用与编排能力）。

用户希望新增一个包，**实现类似 ComfyUI 的拖拽式工作流编辑器**：用户可以自由编排节点、连线、预览、运行、保存工作流，复用 prompt 模板与图片资源，并通过 `docs/01_模型` 下文档化的 5 个 API（文本 2 个 + 图像 2 个 + 视频 1 个）实现完整的 AIGC 流程。

**目标**：补齐 agnes-client 的可视化编排能力，与现有 TUI/WebUI 形成"快速尝鲜 → 模板复用 → 复杂编排"的产品阶梯。

## 决策摘要

| 维度         | 决策                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------- |
| 包名         | `@agnes/workflow`                                                                           |
| 技术栈       | React 19 + TypeScript + Vite + UnoCSS（`presetWind3` + `presetIcons` + `presetTypography`） |
| 节点图       | `@xyflow/react` v12（React Flow 12）                                                        |
| 状态         | `zustand`（工作流 + UI 双 store）                                                           |
| 后端         | dev: Vite proxy；prod: 在 `@agnes/webui` 的 Express 中增加 `/api/*` 反代                    |
| Core 复用    | **改造 `@agnes/core` 为双格式导出（ESM + CJS）**                                            |
| 图片存储     | 上传到 webui 后端 `/uploads` 目录，返回 URL，ImageGeneration 调用时由后端代理转 base64      |
| 工作流持久化 | localStorage + 导出/导入 JSON                                                               |
| 节点类型     | 用户列出的 8 种 + 4 种高阶节点（见下）                                                      |

---

## 1. 包结构与工程

### 1.1 目录布局

```
agnes-client/
├── packages/
│   ├── core/                 # 改造为双格式导出（详见 §7）
│   ├── tui/                  # 不动
│   ├── webui/                # 扩展：新增 /api/* 反代、/uploads 静态目录、/api/workflows 存储
│   └── workflow/             # 新增包
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── uno.config.ts
│       ├── index.html
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── styles/global.css
│       │   ├── components/           # 通用 UI（NodeShell、Handle、PropertyPanel、Toolbar）
│       │   ├── nodes/                # 每种节点一个文件
│       │   │   ├── promptInput.tsx
│       │   │   ├── variableInput.tsx
│       │   │   ├── textInput.tsx
│       │   │   ├── textCombine.tsx
│       │   │   ├── textGeneration.tsx
│       │   │   ├── imageGeneration.tsx
│       │   │   ├── videoGeneration.tsx
│       │   │   ├── imageInput.tsx
│       │   │   ├── sizeSelector.tsx
│       │   │   ├── numberInput.tsx
│       │   │   ├── modelSelector.tsx
│       │   │   ├── videoFrameExtract.tsx
│       │   │   ├── previewOutput.tsx
│       │   │   ├── saveOutput.tsx
│       │   │   └── index.ts          # nodeTypes 聚合
│       │   ├── engine/               # 工作流执行
│       │   │   ├── executeWorkflow.ts
│       │   │   ├── topoSort.ts
│       │   │   ├── interpolate.ts    # ${varName} 替换
│       │   │   ├── resolvers/
│       │   │   │   ├── text.ts
│       │   │   │   ├── image.ts
│       │   │   │   └── video.ts
│       │   │   └── types.ts
│       │   ├── store/
│       │   │   ├── workflowStore.ts  # zustand: nodes/edges/选中态
│       │   │   ├── runStore.ts       # zustand: 执行状态/日志/进度
│       │   │   └── settingsStore.ts  # zustand: API Key/BaseURL
│       │   ├── api/
│       │   │   ├── client.ts         # 包装 fetch 调用 /api/* 走同源
│       │   │   └── upload.ts
│       │   ├── lib/
│       │   │   ├── sizes.ts          # 预设尺寸表
│       │   │   ├── models.ts         # 模型清单 + 默认参数
│       │   │   └── id.ts             # nanoid 包装
│       │   └── workflows/            # 内置示例
│       │       ├── textToImage.ts
│       │       ├── imageToVideo.ts
│       │       └── chain.ts
│       └── README.md
```

### 1.2 根 package.json 新增 scripts

```jsonc
{
  "scripts": {
    "dev:flow": "npm run dev --workspace=@agnes/workflow",
    "build:flow": "npm run build --workspace=@agnes/workflow",
    "build": "npm run build --workspaces"  // 已有
  }
}
```

`@agnes/workflow/package.json` 通过 `"proxy": "http://localhost:3000"` 复用 webui 端口（避免在 Vite dev 时启用其 server.proxy，并把所有 API 路径走 `fetch('/api/...')`，由 webui 同源反代到 apihub）。

---

## 2. 工作流数据结构

### 2.1 JSON Schema

```ts
// node
{
  id: string;            // nanoid
  type: NodeType;        // 'promptInput' | 'textGeneration' | ...
  position: { x: number; y: number };
  data: {
    params: Record<string, unknown>;   // 节点参数（用户编辑）
    status?: 'idle' | 'running' | 'success' | 'error';
    error?: string;
    outputs?: Record<string, unknown>; // 执行结果缓存（不持久化）
  };
}

// edge
{
  id: string;
  source: string;        // 源节点 id
  sourceHandle: string;  // 源端口 id（如 'text', 'image', 'video'）
  target: string;
  targetHandle: string;  // 目标端口 id
}
```

### 2.2 端口类型系统

```ts
type PortType = 'text' | 'image' | 'video' | 'number' | 'any' | 'size';

type Port = {
  id: string;            // 在节点内唯一
  type: PortType;
  label?: string;
  required?: boolean;    // true → 该端口未连且无默认值时报错
};
```

连线时校验 `source.type === target.type`（`any` 通配）。

### 2.3 执行图与拓扑排序

`engine/topoSort.ts`：Kahn 算法。每个节点完成后把输出写入 `data.outputs[portId]`；后继节点执行时从 `data.outputs[portId]` 读取。

```ts
async function executeWorkflow(graph: Graph): Promise<RunResult> {
  const order = topoSort(graph.nodes, graph.edges);  // throws on cycle
  const ctx: RunContext = { graph, signal: abortController.signal, log: runStore.append };

  for (const layer of order) {                       // layer 内可并行
    await Promise.allSettled(layer.map(n => runNode(n, ctx)));
    if (ctx.signal.aborted) break;
  }
}
```

### 2.4 变量替换（`interpolate.ts`）

- PromptInput 节点的 `text` 输出在到达 TextGeneration 前，会先经过 `interpolate(text, { [varName]: value, ... })` 替换 `${varName}`。
- `VariableInput` 节点默认连到 PromptInput 节点的同名 `var` 端口，运行时聚合为 `{varName: value, ...}`。
- 也支持节点自身参数里的 `${varName}`（每次执行前在 resolver 中调一次 `interpolate`）。

---

## 3. 节点详细设计

每节点独立文件，结构：

```tsx
// nodes/textGeneration.tsx
export const meta: NodeMeta = {
  type: 'textGeneration',
  label: '文本生成',
  category: 'generation',
  inputs: [
    { id: 'prompt', type: 'text', label: '提示词', required: true },
    { id: 'model',  type: 'text', label: '模型' },
    { id: 'image',  type: 'image', label: '参考图（多模态）' },
  ],
  outputs: [
    { id: 'text',   type: 'text',  label: '输出文本' },
  ],
  params: {
    model:        { kind: 'model', default: 'agnes-2.0-flash', options: TEXT_MODELS },
    system:       { kind: 'string', default: '' },
    temperature:  { kind: 'number', default: 0.7, min: 0, max: 2, step: 0.1 },
    maxTokens:    { kind: 'number', default: 1024 },
    thinking:     { kind: 'boolean', default: false },
  },
};

export function Component(props: NodeProps) { return <NodeShell {...props} meta={meta} />; }
```

`NodeShell` 统一处理：标题/状态徽章/输入 Handle/输出 Handle/参数折叠面板。

### 3.1 节点清单（12 种）

| #   | 节点                           | 输入                                                              | 输出     | 主要参数                                                | 备注                                                                                                       |
| --- | ------------------------------ | ----------------------------------------------------------------- | -------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | **PromptInput** 提示词输入     | —                                                                 | `text`   | `text`(多行), `enableVarInterpolation`(bool)            | 工作流起点之一；输出经 `interpolate()` 注入 `${var}`                                                       |
| 2   | **VariableInput** 变量输入     | —                                                                 | `text`   | `name`(var 名), `value`                                 | 多个 VariableInput 通过名字匹配到 PromptInput 中的 `${name}`                                               |
| 3   | **TextInput** 文本输入         | —                                                                 | `text`   | `value`(多行)                                           | 与 PromptInput 区别：无变量插值；可作任意文本源                                                            |
| 4   | **TextCombine** 文本拼接       | `a: text`, `b: text`, `separator`                                 | `text`   | `separator`                                             | 解决多 prompt 片段串联                                                                                     |
| 5   | **TextGeneration** 文本生成    | `prompt: text*`, `model: text`, `image: image?`                   | `text`   | model, system, temperature, maxTokens, thinking, stream | 流式输出到 RunStore，节点上显示累积文本                                                                    |
| 6   | **ImageGeneration** 图像生成   | `prompt: text*`, `size: size?`, `image: image?[]`, `model: text?` | `image`  | model, size, responseFormat(url/b64)                    | 接到 image[] 即走 I2I；支持参考图多输入（多图合成）                                                        |
| 7   | **VideoGeneration** 视频生成   | `prompt: text*`, `image: image?`, `model: text?`                  | `video`  | model, size, numFrames, fps, mode, negativePrompt, seed | 异步任务，节点显示进度条；完成后输出 `{url, videoId, size, seconds}`                                       |
| 8   | **ImageInput** 图像输入        | —                                                                 | `image`  | `upload` 按钮, `url`(只读, 上传后回填)                  | 上传到后端 `/uploads`，返回 URL 写入 data；后端在调图像 API 时再转 base64                                  |
| 9   | **SizeSelector** 尺寸选择      | —                                                                 | `size`   | `preset`(下拉), `width`, `height`                       | preset 含 1024x1024 / 1024x768 / 768x1024 / 1280x720 / 1920x1080 / 1216x832 / 1152x768 / 1088x640 / 自定义 |
| 10  | **NumberInput** 数字输入       | —                                                                 | `number` | `value`, `min`, `max`, `step`                           | 复用：seed、steps、cfg 等                                                                                  |
| 11  | **ModelSelector** 模型选择     | —                                                                 | `text`   | `model`(下拉, 按 text/image/video 分组)                 | 共用节点，连到任意 generation 节点的 `model` 端口                                                          |
| 12  | **VideoFrameExtract** 视频取帧 | `video: video*`                                                   | `image`  | `frame`(默认 0, 即首帧), `format`(jpeg/png)             | 解码 URL → canvas → blob；典型用例：视频 → 首帧 → ImageGen                                                 |

### 3.2 输出节点（2 种）

| #   | 节点                       | 输入                                            | 输出 | 主要参数                                          | 备注                                        |
| --- | -------------------------- | ----------------------------------------------- | ---- | ------------------------------------------------- | ------------------------------------------- |
| 13  | **PreviewOutput** 预览输出 | `text: text?`, `image: image?`, `video: video?` | —    | `title`                                           | 右侧/底部面板内联渲染：文本/图片/视频播放器 |
| 14  | **SaveOutput** 保存输出    | `text\|image\|video`                            | —    | `path`(默认 `output/<type>/<id>.<ext>`), `format` | 调 webui 后端 `POST /api/save` 写入磁盘     |

### 3.3 端口类型规则

- `prompt: text*` 表示"必填 text 端口"；可与 `textCombine` 节点或其他文本源相连
- `image: image?` 表示"可选 image 端口"（I2I 时连上）
- ImageGeneration 的 `image` 端口允许多入（I2I + 多图合成），运行时把多个 `image` 收集成数组
- 所有端口允许来自同节点的多个上游（fan-in），用 Map<portId, value[]>

---

## 4. 节点实现模式

### 4.1 NodeShell 通用外壳

- 标题栏：节点名 + 状态徽章（idle / running 旋转 / success 绿勾 / error 红叉）
- 状态边框：运行中黄边、错误红边、成功绿边
- 输入 Handle：左侧，按 `meta.inputs` 顺序渲染
- 输出 Handle：右侧，按 `meta.outputs` 顺序渲染
- 参数区：折叠面板，参数编辑器在选中节点时也在右侧属性面板同步展示
- 节点执行时显示进度（视频节点进度条）

### 4.2 参数编辑器

基于 `params: { [key]: { kind, default, ... } }` 自动渲染：

| `kind`                          | 渲染控件                             |
| ------------------------------- | ------------------------------------ |
| `string` / `text` / `multiline` | Input / Textarea                     |
| `number`                        | NumberInput，可绑定 NumberInput 节点 |
| `boolean`                       | Toggle                               |
| `select` / `model`              | Select                               |
| `size`                          | SizeSelector 组件                    |
| `enum`                          | Radio/Segmented                      |
| `array`                         | 动态增删 list                        |

参数值与端口值合并优先级：**连入端口值 > 参数值 > 默认值**。

### 4.3 执行器（`engine/resolvers/*.ts`）

每个节点对应一个 resolver：

```ts
// engine/resolvers/image.ts
export const imageGeneration: Resolver = async (node, ctx) => {
  const prompt   = ctx.resolveText(node, 'prompt');
  const size     = ctx.resolveSize(node, 'size', '1024x1024');
  const images   = ctx.resolveImages(node, 'image');   // string[] | undefined
  const model    = ctx.resolveString(node, 'model', 'agnes-image-2.1-flash');

  const res = await ctx.api.generateImage({ model, prompt, size, images });
  const url = res.data?.[0]?.url ?? b64ToDataUri(res.data?.[0]?.b64_json);
  return { image: { url, source: 'generation' } };
};
```

视频 resolver 走异步轮询：

```ts
// engine/resolvers/video.ts
export const videoGeneration: Resolver = async (node, ctx) => {
  const task = await ctx.api.createVideo({ ... });
  ctx.onProgress(node.id, 0);
  const result = await ctx.api.waitForVideo(task.video_id, {
    onProgress: (p) => ctx.onProgress(node.id, p),
    signal: ctx.signal,
  });
  return { video: { url: result.remixed_from_video_id, meta: result } };
};
```

---

## 5. UI 布局

```
┌──────────────────────────────────────────────────────────────┐
│  Toolbar:  [运行 ▶] [停止 ■] [保存] [另存为] [加载] [示例▾]  │
│            [API Key 设置] [导出 JSON] [导入 JSON]            │
├────────────┬────────────────────────────────────┬────────────┤
│ 节点面板   │           画布（React Flow）        │ 属性面板   │
│ ─ 文本     │   - Background / MiniMap / Controls │ 选中节点的 │
│  • Prompt  │   - 拖入节点 → 画布                  │ 参数编辑器 │
│  • Variable│   - 连线 → DAG                       │            │
│  • Combine │   - 选中节点显示选中态               │ 运行日志： │
│ ─ 生成     │                                     │  • 每个节点│
│  • TextGen │                                     │    状态    │
│  • ImgGen  │                                     │  • 错误信息│
│  • VidGen  │                                     │  • 视频进度│
│ ─ 输入     │                                     │            │
│  • ImgInput│                                     │            │
│  • Size    │                                     │            │
│  • Number  │                                     │            │
│  • Model   │                                     │            │
│ ─ 输出     │                                     │            │
│  • Preview │                                     │            │
│  • Save    │                                     │            │
└────────────┴────────────────────────────────────┴────────────┘
```

- UnoCSS：`presetWind3`（Tailwind v3 兼容语法）+ `presetIcons`（Iconify 大量图标）+ `presetTypography`（参数说明排版）
- 暗色主题（与 webui/TUI 风格统一），用 CSS 变量切换

---

## 6. 工作流执行引擎

### 6.1 流程

1. 点击「运行」→ `runStore.execute(graph)`
2. 拓扑排序，分层（同一层可并行）
3. 每节点执行前重置其 `data.status = 'running'`
4. resolver 返回 `{ [outputId]: value }`，写入 `node.data.outputs`
5. 后继节点 resolve 时从上游 `data.outputs[portId]` 取值
6. 错误冒泡：节点状态变 error，停止同层；上层标 error；UI 提示

### 6.2 异步/取消

- 单次执行用 `AbortController`
- 视频轮询支持取消
- 文本流式输出：resolver 返回 `AsyncIterable<string>`，runStore 累积，节点 badge 显示 streaming 状态

### 6.3 缓存

- `data.outputs` 持久化到 localStorage（设容量上限 5MB 防止膨胀）
- 重新运行前可选「清空缓存」

---

## 7. 与 @agnes/core 的集成（双格式导出）

`@agnes/core` 目前是 `module.exports = { AgnesClient, loadConfig, saveConfig }`（CJS）。浏览器/Vite 需要 ESM。

**改造方案**：在 `packages/core/package.json` 增加 ESM 入口：

```jsonc
{
  "main": "src/index.js",          // CJS，给 TUI 继续用
  "module": "src/index.js",        // Vite/webpack 优先选
  "exports": {
    ".": {
      "import": "./src/index.js",
      "require": "./src/index.js"
    }
  },
  "type": "commonjs"
}
```

`src/client.js` 内部用 `require('axios')`（axios v1.x 同时支持 CJS/ESM 消费者，Vite 会做 interop）。改造后前端可通过：

```ts
import { AgnesClient } from '@agnes/core';
const client = new AgnesClient({ apiKey, baseUrl: '/api/v1' });
```

其中 `baseUrl` 改成同源 `/api/v1`，由 Vite dev proxy 或 webui Express 反代到 `https://apihub.agnes-ai.com/v1`。

**反代实现**（dev: vite.config.ts）：
```ts
server: {
  proxy: {
    '/api': { target: 'https://apihub.agnes-ai.com/v1', changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') },
  },
}
```

**反代实现**（prod: packages/webui/src/server.js）：增加 `/api/*` 路由，用 `http-proxy-middleware` 转发到 apihub；增加 `/uploads` 静态目录；增加 `POST /api/upload` 接收 multer 文件。

---

## 8. 图片上传与保存

### 8.1 上传

```ts
// api/upload.ts
export async function uploadImage(file: File): Promise<{ url: string; filename: string }> {
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch('/api/upload', { method: 'POST', body: fd });
  return r.json();  // { url: '/uploads/xxx.png', filename: 'xxx.png' }
}
```

后端：multer 存到 `packages/webui/uploads/`，返回 `/uploads/<filename>`。前端 ImageInput 节点把 `data.params.url` 写入并把 `image` 端口输出 `{url, source: 'upload'}`。

### 8.2 调 API 时转 base64

`client.js` 已支持 `resolveImage` 把 URL 转 data URI（前端用 `fetch + FileReader` 等价实现），但 Vite proxy 后 `https://apihub.agnes-ai.com/...` 与本机 URL 不同源。

**解决**：在 webui 后端增加 `POST /api/resolve-image`，接收 `{urls: string[]}`，返回 `{dataUris: string[]}`；前端把已上传的本地 URL 也一起 resolve 成 data URI 后再发到生成接口。这样后端是 CORS 信任源，可顺利从公网下载 + 转 base64。

### 8.3 保存

SaveOutput 节点调 `POST /api/save`，body = `{ kind, source: { url|dataUri }, path }`，后端用 `downloadFile`/`saveBase64Image` 写入磁盘。

---

## 9. 工作流持久化

- `localStorage['agnes.workflow.current']` 自动保存（debounce 500ms）
- 命名工作流：`localStorage['agnes.workflow.named.<id>']`
- 导出：`<a download>` + `Blob` + `URL.createObjectURL`
- 导入：`<input type="file" accept=".json">` + 校验 schema
- 内置 3 个示例：文生图、图生视频、TextGen → ImageGen 链

---

## 10. 关键依赖清单（`@agnes/workflow/package.json`）

```jsonc
{
  "name": "@agnes/workflow",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@agnes/core": "*",
    "@xyflow/react": "^12.4.0",
    "nanoid": "^5.0.7",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@iconify-json/carbon": "^1.2.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@unocss/preset-icons": "^0.65.0",
    "@unocss/preset-typography": "^0.65.0",
    "@unocss/preset-wind3": "^0.65.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.6.0",
    "unocss": "^0.65.0",
    "vite": "^6.0.0"
  }
}
```

---

## 11. 实施步骤

| 阶段                 | 任务                                                                                                      | 验证                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **0. Core 改造**     | 给 `packages/core/package.json` 加 `module`/`exports`；前端可 `import { AgnesClient } from '@agnes/core'` | 跑 `npm run dev:flow` 不报模块解析错                      |
| **1. 脚手架**        | 新建 `packages/workflow`，Vite + React 19 + TS + UnoCSS + React Flow；HMR 起得来                          | 浏览器打开画布                                            |
| **2. 节点外壳**      | 实现 `NodeShell`、Handle 组件、`nodeTypes` 注册机制；实现 1 个示例节点 PromptInput                        | 拖入 PromptInput 到画布并能连线                           |
| **3. 基础生成节点**  | TextGeneration、ImageGeneration、VideoGeneration（含 resolver + 异步轮询）                                | 拖入运行能拿到文本/图片/视频                              |
| **4. 输入/变量节点** | VariableInput、TextInput、SizeSelector、NumberInput、ModelSelector、TextCombine                           | 拼出 "PromptInput + VariableInput → TextGen" 工作流并运行 |
| **5. 图片输入/输出** | ImageInput（上传）+ PreviewOutput + SaveOutput；后端 `/api/upload`、`/api/save`、`/api/resolve-image`     | 上传图片 → ImageGen（I2I）→ Preview → Save 全链路         |
| **6. 执行引擎**      | 拓扑排序、并行执行、错误冒泡、AbortController、流式输出累积                                               | 多节点串/并行混合工作流                                   |
| **7. 持久化**        | localStorage 自动保存 + 命名工作流 + 导出/导入 JSON + 3 个内置示例                                        | 刷新页面工作流不丢                                        |
| **8. 打磨**          | 暗色主题、错误边框、节点状态徽章、底部日志面板、API Key 设置抽屉                                          | 视觉与可用性 review                                       |

---

## 12. 关键文件示例

### `vite.config.ts`
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite';

export default defineConfig({
  plugins: [react(), UnoCSS()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'https://apihub.agnes-ai.com/v1', changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') },
    },
  },
});
```

### `uno.config.ts`
```ts
import { defineConfig, presetWind3, presetIcons, presetTypography } from 'unocss';

export default defineConfig({
  presets: [presetWind3(), presetIcons({ scale: 1.2 }), presetTypography()],
  theme: { colors: { primary: { 500: '#7c3aed' } } },
});
```

### `src/store/workflowStore.ts`（节选）
```ts
type WorkflowState = {
  nodes: Node[];
  edges: Edge[];
  selectedId: string | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: NodeType, position: XYPosition) => void;
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [], edges: [],
  onNodesChange: applyNodeChanges(changes, get().nodes),
  // ...
}));
```

### `src/engine/executeWorkflow.ts`（节选）
```ts
export async function executeWorkflow(graph: Graph, ctx: RunContext) {
  const order = topoSort(graph.nodes, graph.edges);
  for (const layer of order) {
    await Promise.allSettled(layer.map(async (node) => {
      ctx.setStatus(node.id, 'running');
      try {
        const outputs = await RESOLVERS[node.type](node, ctx);
        ctx.setOutputs(node.id, outputs);
        ctx.setStatus(node.id, 'success');
      } catch (e) {
        ctx.setStatus(node.id, 'error', String(e));
        throw e;
      }
    }));
  }
}
```

### `src/nodes/promptInput.tsx`
```tsx
export const meta: NodeMeta = {
  type: 'promptInput',
  label: '提示词',
  category: 'input',
  inputs: [],
  outputs: [{ id: 'text', type: 'text', label: '提示词' }],
  params: { text: { kind: 'multiline', default: '' } },
};

export const Component: FC<NodeProps> = (props) => {
  const value = (props.data.params.text as string) ?? '';
  return (
    <NodeShell {...props} meta={meta}>
      <NodePreview>{value || <span className="text-gray-400">点击右侧编辑提示词…</span>}</NodePreview>
    </NodeShell>
  );
};
```

### 后端新增（`packages/webui/src/server.js`）
```js
// 顶部新增
const { createProxyMiddleware } = require('http-proxy-middleware');
const upload = multer({ dest: path.join(__dirname, '../uploads') });

// 路由
app.use('/api', createProxyMiddleware({
  target: 'https://apihub.agnes-ai.com/v1',
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('Authorization', `Bearer ${process.env.AGNES_API_KEY || ''}`);
  },
}));
app.post('/api/upload', upload.single('file'), (req, res) => res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.post('/api/save', async (req, res) => {
  const { kind, source, savePath } = req.body;
  // 用 core 的 downloadFile / saveBase64Image
});
```

---

## 13. 验证方案

| 场景       | 步骤                                                                 | 期望                                  |
| ---------- | -------------------------------------------------------------------- | ------------------------------------- |
| 启动       | `npm run dev:flow`                                                   | http://localhost:5173 打开画布        |
| 文本工作流 | 拖入 PromptInput → TextGen → Preview，填提示词点运行                 | 节点 success，Preview 显示文本        |
| 图像工作流 | PromptInput → ImageGen → Preview                                     | Preview 显示生成的图                  |
| I2I        | 上传图 → ImageInput → ImageGen(prompt)                               | Preview 显示基于上传图的新图          |
| 视频工作流 | PromptInput → VideoGen → Preview                                     | 节点显示进度，结束后 Preview 播放视频 |
| 变量       | PromptInput(`A ${subject}`) + VariableInput(subject="cat") → TextGen | 文本为 "A cat"                        |
| 持久化     | 拖几个节点连线，刷新                                                 | 节点图原样恢复                        |
| 导出/导入  | 导出 JSON → 清空 → 导入                                              | 节点图完全还原                        |
| 错误处理   | 故意给 TextGen 传非文本端口                                          | 节点边框变红，错误信息显示在日志      |

---

## 14. 风险与权衡

- **AgnesClient 流式在浏览器 fetch 下的实现**：原 SDK 用 `responseType: 'stream'` + Node http 事件，浏览器要换成 `ReadableStream` + TextDecoder；需在 `client.js` 内分支实现或新建 `client.browser.js`。**建议在 `engine/resolvers/text.ts` 内部用 `fetch + reader`** 直接处理流式，避免改 core。
- **图片 base64 体积**：超大图片（>10MB）走 base64 可能撑爆请求体。**建议后端 `/api/resolve-image` 在转 base64 前压缩到 ≤ 8MB**（用 sharp）。
- **视频节点长时间占用**：浏览器可能因网络抖动导致 `waitForVideo` 提前超时；保留 `maxWait = 600000` 与用户可手动重试。
- **Vite proxy 与 CORS**：开发环境同源无 CORS；生产环境用户在非同源部署时需要 webui 后端反代（已设计）。

---

## 15. 关键文件清单（按重要性）

- [packages/core/package.json](packages/core/package.json) — 加 `module`/`exports` 入口
- [packages/webui/src/server.js](packages/webui/src/server.js) — 加 `/api/*` 反代、上传、保存
- [packages/workflow/package.json](packages/workflow/package.json) — 新增
- [packages/workflow/vite.config.ts](packages/workflow/vite.config.ts)
- [packages/workflow/uno.config.ts](packages/workflow/uno.config.ts)
- [packages/workflow/src/nodes/](packages/workflow/src/nodes/) — 14 个节点文件
- [packages/workflow/src/engine/executeWorkflow.ts](packages/workflow/src/engine/executeWorkflow.ts)
- [packages/workflow/src/store/workflowStore.ts](packages/workflow/src/store/workflowStore.ts)
- 根 [package.json](package.json) — 新增 `dev:flow` / `build:flow` scripts
