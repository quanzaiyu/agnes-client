# @agnes/loader

把工作流编辑器（`@agnes/workflow`）导出的 `.flow.json` 当作可调用 API 使用。

提供三种使用形态：

- **Node 函数**：`import { runWorkflow } from '@agnes/loader'`
- **CLI**：`npx agnes-flow run <file> --input k=v`
- **HTTP 服务**：`POST /run` 或 `POST /workflows/<name>/run`

---

## 1. 安装

`@agnes/loader` 是本仓库的 workspace 包，根目录 `npm install` 即装好。

```bash
cd <repo-root>
npm install
```

外部使用者发布后可 `npm install @agnes/loader`。

---

## 2. 工作流 JSON 格式

`@agnes/workflow` 编辑器顶部 **⚡ API 导出** → 保存的 `.flow.json` 即此格式。结构示例：

```json
{
  "version": 2,
  "name": "txt2img-demo",
  "description": "文生图 demo",
  "nodes": [ /* 同 React Flow 的节点 */ ],
  "edges": [ /* 同 React Flow 的边 */ ],
  "apiInputs": [
    { "name": "prompt", "target": { "nodeId": "n1", "kind": "port", "key": "text" }, "required": true },
    { "name": "size",   "target": { "nodeId": "n2", "kind": "port", "key": "size" } }
  ],
  "apiOutputs": [
    { "name": "image", "source": { "nodeId": "n3", "kind": "port", "key": "image" } }
  ]
}
```

`apiInputs` / `apiOutputs` 是用户在编辑器里**手动标记**的字段。`target.kind` 决定如何绑定：

- `port` —— 节点端口（如 `promptInput.text`、`imageGeneration.image`）
- `param` —— 节点参数（如某个 param key）
- `varPair` —— `variableInput` 节点的某对 name/value

---

## 3. 配置：API Key 与 Base URL

按优先级读取：

1. 命令行 / HTTP 请求的 `--api-key` / `--base-url` 参数
2. 环境变量 `AGNES_API_KEY` / `AGNES_BASE_URL`
3. `agnes.config.json`（`@agnes/core` 的 `loadConfig`，按 `CWD` → `~/.agnes/config.json` 顺序找）
4. 默认 `https://apihub.agnes-ai.com/v1`

`agnes.config.json` 模板：

```json
{
  "apiKey": "sk-xxx...",
  "baseUrl": "https://apihub.agnes-ai.com/v1"
}
```

---

## 4. CLI 用法

入口：`npx agnes-flow`（在 `packages/loader` 下用 `npx tsx src/cli.ts` 也可）。

### 4.1 `run` —— 直接运行

```bash
# 单个 input
npx agnes-flow run ./my.flow.json --input prompt="A cat in space"

# 多个 input
npx agnes-flow run ./my.flow.json \
  --input prompt="A cat in space" \
  --input subject=cat

# 从 stdin 读 JSON
cat inputs.json | npx agnes-flow run ./my.flow.json --stdin

# 覆盖 API 配置
npx agnes-flow run ./my.flow.json \
  --input prompt="A cat" \
  --api-key sk-xxx --base-url https://apihub.agnes-ai.com/v1

# 看执行日志
npx agnes-flow run ./my.flow.json --input prompt="A cat" --verbose
```

`--input k=v` 里的 `v` 会尝试 JSON 解析后再 fallback 字符串，所以下面三种等价：

```bash
--input count=42
--input count=42
--input count="42"
```

stdout 是结构化 JSON：

```json
{
  "outputs": { "image": { "url": "https://..." } },
  "logs": ["[info] 拓扑分层完成: 2 层, 3 个节点", ...],
  "errors": {}
}
```

非零退出码 = 至少一个节点失败。

### 4.2 `serve` —— HTTP 服务

```bash
# 默认单 workflow
npx agnes-flow serve --port 4500 --workflow ./my.flow.json

# 监听目录，自动暴露 /workflows/<name>/run
npx agnes-flow serve --port 4500 --watch ./workflows
```

启动后端点：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 心跳 |
| GET | `/workflows` | 列出 `--watch` 目录里的工作流 |
| POST | `/run` | body = `{ workflow: <path\|object>, inputs, config? }` |
| POST | `/workflows/<name>/run` | body = `{ inputs, config? }` |

调用示例：

```bash
curl -X POST http://localhost:4500/run \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "./my.flow.json",
    "inputs": { "prompt": "A cat", "size": "512x512" }
  }'
```

返回结构同 CLI（`{ outputs, logs, errors }`）。错误返回 5xx，body 是 `{ "error": "..." }`。

### 4.3 `validate` —— 仅校验 JSON

```bash
npx agnes-flow validate ./my.flow.json
```

打印节点 / 边 / IO 数量，文件无效则非零退出。

---

## 5. Node API

```ts
import { runWorkflow, loadWorkflow } from '@agnes/loader';

const wf = loadWorkflow('./my.flow.json');  // 字符串或对象
const result = await runWorkflow(
  wf,
  { prompt: 'A cat', size: '512x512' },
  {
    config: { apiKey: 'sk-xxx', baseUrl: 'https://apihub.agnes-ai.com/v1' },
    onLog: (line) => console.error(line),
    onProgress: (nodeId, pct) => console.log(nodeId, pct),
  },
);

console.log(result.outputs);
```

`loadWorkflow` 接受字符串（文件内容）或已解析的对象；非法 JSON 抛错。
`runWorkflow` 返回 `{ outputs, logs, errors }`。

---

## 6. 与编辑器的配合

`@agnes/workflow` 顶部工具栏的 **⚡ API 导出** 按钮打开 ApiDialog：

- 命名工作流
- 列出当前所有 `apiInputs` / `apiOutputs`，可删除
- 复制 JSON 到剪贴板
- 下载 `.flow.json`
- 一键复制启动 HTTP 服务的命令

节点上每个端口 / 参数旁有 `↥` / `↧` 小按钮，点一下弹窗输入参数名即可标记。已标记项会显示彩色徽章，再次点击取消标记。

> 兼容：v1 JSON（无 `apiInputs/Outputs` 字段）也能被 loader 加载，只是 `inputs` 传不进去。

---

## 7. 当前限制

- **`videoFrameExtract` 节点不支持在 loader 中运行**（依赖浏览器 `<video>` + canvas）。若工作流里有此节点，请改在编辑器里跑。
- **CORS / 反滥用**：某些情况下 apihub.agnes-ai.com 会拒绝带 `Origin` 头的浏览器 / Node fetch（返回 401）。遇到这种情况：
  1. 启动 `@agnes/webui`（`npm run dev:web`）让 webui Express 反代
  2. 在 `agnes.config.json` 里把 `baseUrl` 改成 `http://localhost:3000`，loader 走同源反代
  3. 或部署到有合法域名的环境（apihub 不再认为是滥用）
- **流式输出**：当前 loader 不暴露 SSE，文本生成在 `onLog` 里实时出现，但 `outputs.text` 是最终全文。

---

## 8. 内部结构

```
packages/loader/src/
├── index.ts            公开 API
├── schemas.ts          JSON 校验（手写守卫，无 zod 依赖）
├── io-binding.ts       把 inputs 注入到 nodes
├── io-extract.ts       从 outputs 收集结果
├── runner.ts           核心执行（topo → resolvers → collect）
├── cli.ts              commander CLI 入口
├── http.ts             Express HTTP 服务
├── api/
│   ├── client.ts       Agnes API 客户端（fetch，支持 setApiBase/setApiKey）
│   └── upload.ts       文件上传 / 保存（需 webui 后端在同源）
├── lib/                sizes / models 工具
├── engine/             topoSort + interpolate
├── resolvers/          与 @agnes/workflow 同步的 14 个 resolver
└── test.ts             smoke test
```

`resolvers` 完整复制自 `@agnes/workflow`，确保 loader 不依赖任何 React/Vite 代码，可独立打包或跑在 Node 22+。
