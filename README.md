# Agnes AI Client

基于 [Agnes AI](https://agnes-ai.com) API 的多端客户端工具集，支持 **TUI（终端交互）**、**WebUI（网页界面）**、**Workflow（可视化工作流）** 和 **Loader（命令行工作流运行器）** 四种使用方式。

---

## 📦 Packages 概览

| Package | 说明 | 技术栈 | 入口命令 |
|---------|------|--------|----------|
| `@agnes/core` | 核心 SDK，API 客户端封装 | Node.js ESM | - |
| `@agnes/tui` | 终端交互界面（TUI） | Node.js + Inquirer | `npm run dev:tui` |
| `@agnes/webui` | 网页界面（WebUI） | SvelteKit + Express + SQLite | `npm run dev:webui` |
| `@agnes/workflow` | 可视化工作流编辑器 | React + ReactFlow | `npm run dev:flow` |
| `@agnes/loader` | 命令行工作流运行器 | Node.js + Commander | `agnes-flow run <file>` |

---

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置 API Key

```bash
cp agnes.config.example.json agnes.config.json
```

编辑 `agnes.config.json`：

```json
{
  "apiKey": "你的_Agnes_API_Key",
  "baseUrl": "https://apihub.agnes-ai.com/v1"
}
```

### 3. 启动各模块

```bash
# 启动 WebUI（推荐）
npm run dev:webui

# 启动 TUI
npm run dev:tui

# 启动 Workflow 编辑器
npm run dev:flow
```

---

## 🎯 各模块使用

### WebUI - 网页界面

**技术栈**: SvelteKit + Express + UnoCSS + SQLite

**访问地址**: http://localhost:5173

**功能**:
- 用户注册/登录系统
- 积分系统（注册送 100，每日签到 +10）
- 文本生成（流式输出、Markdown 渲染）
- 图片生成（多尺寸支持、预览下载）
- 视频生成（进度轮询、在线播放）
- 个人设置（修改昵称、上传头像）

```bash
npm run dev:webui    # 开发模式（后端 + 前端）
npm run build        # 构建生产版本
npm start            # 运行生产版本
```

### TUI - 终端界面

**技术栈**: Node.js + Inquirer + Chalk

**功能**:
- 全交互式菜单
- 文本对话（支持图片理解、Thinking 模式）
- 图片生成（多种风格预设）
- 视频生成（文生视频、图生视频）
- 配置管理

```bash
npm run dev:tui
```

### Workflow - 可视化工作流

**技术栈**: React + @xyflow/react + Zustand + UnoCSS

**功能**:
- 拖拽式节点编辑
- 预置工作流模板
- 自定义节点扩展
- 与 Loader 无缝集成

```bash
npm run dev:flow
```

### Loader - 命令行运行器

**技术栈**: Node.js + Commander + Express

**功能**:
- 从 JSON/Flow 文件加载并执行工作流
- HTTP API 服务模式
- CLI 直接调用

```bash
# 执行工作流文件
pnpm exec agnes-flow run workflow.json

# 或全局安装后
agnes-flow run workflow.json

# 启动 HTTP 服务
pnpm exec agnes-flow serve --port 3000
```

### Core - 核心 SDK

**技术栈**: Node.js ESM

作为底层依赖被其他模块使用，提供：

```javascript
import { AgnesClient, loadConfig, saveConfig } from '@agnes/core';

// 创建客户端
const client = new AgnesClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://apihub.agnes-ai.com/v1'
});

// 文本对话
const result = await client.chat({
  model: 'agnes-2.0-flash',
  messages: [{ role: 'user', content: 'Hello!' }]
});

// 图片生成
const image = await client.generateImage({
  model: 'agnes-image-2.1-flash',
  prompt: 'A beautiful sunset',
  size: '1024x1024'
});

// 视频生成
const video = await client.createVideo({
  model: 'agnes-video-v2.0',
  prompt: 'A cat walking',
  width: 1216,
  height: 832
});
```

---

## 📁 项目结构

```
agnes-client/
├── package.json              # 统一依赖管理
├── pnpm-workspace.yaml       # 工作空间配置
├── agnes.config.json         # API 配置（需手动创建）
├── data/                     # SQLite 数据库 + 用户上传
│   ├── agnes.db             # 用户数据、积分、生成记录
│   └── avatars/             # 用户头像
└── packages/
    ├── core/                # 核心 SDK
    │   └── src/
    │       ├── client.js   # AgnesClient 类
    │       ├── config.js   # 配置管理
    │       └── index.js     # 导出
    ├── tui/                 # 终端界面
    │   └── src/
    │       └── cli.js      # TUI 主程序
    ├── webui/               # 网页界面
    │   └── src/
    │       ├── server/     # Express 后端
    │       │   ├── index.js
    │       │   ├── db/      # SQLite 数据库
    │       │   ├── routes/  # API 路由
    │       │   └── middleware/
    │       └── frontend/   # SvelteKit 前端
    │           └── src/
    │               ├── routes/    # 页面路由
    │               └── lib/       # 组件和工具
    ├── workflow/             # 可视化工作流
    │   ├── server.cjs      # 工作流服务
    │   └── src/
    └── loader/               # 命令行运行器
        ├── bin/
        └── src/
```

---

## 🔧 可用模型

| 类型 | 模型 ID | 说明 |
|------|---------|------|
| 文本 | `agnes-1.5-flash` | 轻量高速，低成本 |
| 文本 | `agnes-2.0-flash` | 智能体/工具调用/图片理解 |
| 图片 | `agnes-image-2.0-flash` | 文生图/图生图/多图合成 |
| 图片 | `agnes-image-2.1-flash` | 高信息密度优化版 |
| 视频 | `agnes-video-v2.0` | 文/图生视频，异步生成 |

API 文档: https://agnes-ai.com/doc

---

## ❓ 常见问题

**Q: API Key 从哪里获取？**
前往 https://agnes-ai.com 注册账号，在控制台创建 API Key。

**Q: 积分如何计算？**
- 注册赠送: 100 积分
- 每日签到: +10 积分
- 文本/图片生成: -1 积分
- 视频生成: -10 积分

**Q: 视频生成要多久？**
视频生成为异步任务，约需 1-5 分钟。

**Q: 如何修改端口？**
```bash
PORT=8080 npm run dev:webui
```
