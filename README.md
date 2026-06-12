# Agnes AI Client

基于 [Agnes AI](https://agnes-ai.com) API 的客户端工具，支持 **TUI（终端交互）** 和 **WebUI（网页界面）** 两种使用方式。

---

## 功能特性

- **文本生成**：多轮对话、图片理解、工具调用、Thinking 模式、流式输出
- **图像生成**：文生图、图生图、多图合成，支持多种尺寸和风格预设
- **视频生成**：文生视频、图生视频、多图视频、关键帧动画（异步轮询）
- **统一配置文件**：`agnes.config.json`，保存 API Key 和 Base URL
- **TUI**：全交互式终端菜单，支持全局安装为 `agnes` 命令
- **WebUI**：浏览器界面，操作直观，支持文件上传和实时流式输出

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

复制配置文件示例并填写你的 API Key：

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

> 也可以在 TUI 或 WebUI 启动后通过界面配置。

### 3. 启动 TUI

```bash
# 直接运行
npm run dev:tui
```

### 4. 启动 WebUI

```bash
npm run dev:web
```

然后在浏览器打开 http://localhost:3000

---

## 使用方式

Agnes TUI 支持两种模式：**交互式 TUI** 和 **CLI 命令行**。

---

### 全局安装

```bash
npm link
```

安装后可在任意目录使用 `agnes` 命令：

```bash
# 交互式 TUI（菜单驱动）
agnes

# CLI 直接调用
agnes text chat --prompt "Hello"
agnes image generate --prompt "A cat" --size 1280x720 --output ./01.jpg
agnes video create --prompt "Sunset" --frames 121
agnes config view
```

---

### CLI 命令参考

```
agnes [<category> [<action>]] [options]
```

#### 文本生成 — `agnes text chat`

| 选项              | 说明                          | 默认值            |
| ----------------- | ----------------------------- | ----------------- |
| `--prompt <text>` | **必填**，提问内容            | —                 |
| `--system <text>` | System Prompt（可选）         | —                 |
| `--model <id>`    | 模型 ID                       | `agnes-2.0-flash` |
| `--image <url>`   | 图片 URL（开启 Vision 模式）  | —                 |
| `--thinking`      | 开启深度推理（Thinking 模式） | off               |
| `--tools`         | 启用工具调用演示              | off               |
| `--summary`       | 从 stdin 读取文本进行摘要     | off               |
| `--no-stream`     | 禁用流式输出，等待完整结果    | off（默认流式）   |
| `--output <path>` | 保存输出到文件                | —                 |

```bash
# 基础对话
agnes text chat --prompt "介绍一下量子计算"

# 带 System Prompt
agnes text chat --system "你是一个 Python 专家" --prompt "怎么用 asyncio"

# 图片理解
agnes text chat --image https://example.com/photo.jpg --prompt "描述这张图"

# 文档摘要（从 stdin 读取）
cat document.txt | agnes text chat --summary --output summary.md

# 非流式 + 保存
agnes text chat --prompt "写一首诗" --no-stream --output poem.md
```

#### 图像生成 — `agnes image generate`

| 选项                  | 说明                                                                                                 | 默认值                  |
| --------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------- |
| `--prompt <text>`     | **必填**，提示词                                                                                     | —                       |
| `--model <id>`        | 模型 ID                                                                                              | `agnes-image-2.1-flash` |
| `--size <WxH>`        | 输出尺寸                                                                                             | `1024x1024`             |
| `--style <name>`      | 风格预设（photorealistic / anime / cinematic / oil-painting / watercolor / 3d-render / flat-design） | 不附加风格              |
| `--image <path\|url>` | 参考图（可重复指定用于多图合成）                                                                     | —                       |
| `--output <path>`     | 保存路径                                                                                             | `./output.jpg`          |

```bash
# 基础文生图
agnes image generate --prompt "a cat in a garden" --size 1920x1080

# 指定风格
agnes image generate --prompt "未来城市" --style anime --size 1280x720

# 图生图（指定参考图）
agnes image generate --prompt "enhance lighting" --image ./input.png --output enhanced.jpg

# 多图合成
agnes image generate --prompt "combine these styles" --image ./a.jpg --image ./b.jpg
```

#### 视频生成 — `agnes video create`

| 选项                       | 说明                               | 默认值             |
| -------------------------- | ---------------------------------- | ------------------ |
| `--prompt <text>`          | **必填**，视频描述                 | —                  |
| `--model <id>`             | 模型 ID                            | `agnes-video-v2.0` |
| `--size <WxH>`             | 视频尺寸                           | `1216x832`         |
| `--frames <n>`             | 帧数（81/121/241/441）             | `121`              |
| `--fps <n>`                | 帧率                               | `24`               |
| `--image <path\|url>`      | 参考图（图生视频）                 | —                  |
| `--mode <name>`            | 模式（`keyframes` 关键帧动画）     | 默认               |
| `--negative-prompt <text>` | 负向提示词（排除不希望出现的内容） | —                  |
| `--output <path>`          | 保存路径                           | `./output.mp4`     |

```bash
# 基础文生视频
agnes video create --prompt "sunset over the ocean" --size 1216x832 --frames 121 --fps 24

# 自定义参数
agnes video create --prompt "城市夜景航拍" --size 1088x640 --frames 241 --fps 30

# 图生视频
agnes video create --prompt "animate this landscape" --image ./photo.jpg

# 关键帧动画
agnes video create --prompt "smooth morphing" --image ./a.jpg --image ./b.jpg --mode keyframes
```

#### 配置管理 — `agnes config`

| 操作                             | 说明          |
| -------------------------------- | ------------- |
| `agnes config view`              | 查看当前配置  |
| `agnes config set-apikey <key>`  | 设置 API Key  |
| `agnes config set-baseurl <url>` | 设置 Base URL |

---

### TUI 交互模式

直接运行 `agnes`（无参数）进入交互式菜单：

```
选择生成方式：
  💬 文本 / 对话
  🎨 图像生成
  🎬 视频生成
  ⚙️  配置管理
  🚪 退出
```

通过方向键和回车键选择操作，各子功能与 CLI 模式对应：

- **文本**：对话 / 图片理解 / 工具调用 / Thinking / 摘要
- **图像**：文生图 / 图生图 / 多图合成，选择尺寸、风格、保存路径
- **视频**：文生视频 / 图生视频 / 多图视频 / 关键帧动画，选择尺寸、帧数、FPS
- **配置**：查看 / 修改 API Key / 修改 Base URL

---

## WebUI 使用说明

启动后在浏览器打开 `http://localhost:3000`：

| 面板     | 功能                                         |
| -------- | -------------------------------------------- |
| 文本对话 | 流式多轮对话，支持图片理解、Thinking 模式    |
| 图像生成 | 文生图/图生图，支持本地文件上传，预览并下载  |
| 视频生成 | 提交视频任务，实时进度条，生成完成后在线播放 |

点击左下角 **⚙️ API 配置** 设置 API Key。

---

## 文档工具

### 重新爬取文档

```bash
npm run scrape-docs
```

首次使用需要安装 Playwright 的 Chromium（如果尚未安装）：

```bash
npx playwright install chromium
```

### 格式修复

```bash
npm run fix-docs
```

---

## 项目结构

```
agnes-client/
├── agnes.config.json          # 配置文件（需自行创建，不提交到 git）
├── agnes.config.example.json  # 配置文件示例
├── package.json               # 根 package.json（workspaces）
├── docs/                      # 爬取的 Agnes AI 文档
│   ├── 01_模型/
│   ├── 02_产品/
│   └── 03_公司/
├── tools/                     # 文档工具脚本
│   ├── scrape.js              # 文档爬取脚本
│   └── fix-markdown.js        # Markdown 格式修复脚本
└── packages/
    ├── core/                  # 核心 SDK（API 客户端）
    │   └── src/
    │       ├── client.js      # AgnesClient 类
    │       ├── config.js      # 配置加载/保存
    │       └── index.js
    ├── tui/                   # 终端交互界面
    │   └── src/
    │       └── cli.js         # TUI 主程序
    └── webui/                 # 网页界面
        ├── src/
        │   └── server.js      # Express 后端
        └── public/
            └── index.html     # 前端页面
```

---

## 模型参考

| 类型 | 模型名称                | 特点                     |
| ---- | ----------------------- | ------------------------ |
| 文本 | `agnes-1.5-flash`       | 轻量高速，低成本高并发   |
| 文本 | `agnes-2.0-flash`       | 智能体/工具调用/图片理解 |
| 图像 | `agnes-image-2.0-flash` | 文生图/图生图/多图合成   |
| 图像 | `agnes-image-2.1-flash` | 高信息密度优化版         |
| 视频 | `agnes-video-v2.0`      | 文/图生视频，异步生成    |

API 文档：https://agnes-ai.com/doc

---

## 常见问题

**Q: API Key 从哪里获取？**
前往 https://agnes-ai.com 注册账号，在控制台创建 API Key。

**Q: 视频生成要多久？**
视频生成为异步任务，约需 1-5 分钟，时长取决于 num_frames 和服务负载。

**Q: 图片理解支持哪些格式？**
支持 JPG、PNG、WebP 格式的公网可访问图片 URL。

**Q: 如何修改端口？**
WebUI 默认端口 3000，可通过环境变量修改：`PORT=8080 npm run dev:web`
