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

# 或进入 packages/tui 目录运行
cd packages/tui && node src/cli.js
```

### 4. 启动 WebUI

```bash
npm run dev:web
# 然后在浏览器打开 http://localhost:3000
```

---

## TUI 使用说明

启动后，通过方向键和回车键进行交互操作：

```
选择生成方式：
  💬 文本 / 对话
  🎨 图像生成
  🎬 视频生成
  ⚙️  配置管理
  🚪 退出
```

### 文本模式

| 模式 | 说明 |
|------|------|
| 对话 / 文本生成 | 普通多轮对话 |
| 图片理解 | 输入图片 URL + 问题 |
| 工具调用示例 | 内置 get_time 函数调用演示 |
| Thinking 模式 | 开启深度推理 |
| 文档摘要 | 粘贴文本进行摘要（输入 `END` 结束） |

### 图像模式

- 选择文生图 / 图生图 / 多图合成
- 选择输出尺寸（1024x768、1024x1024 等）
- 选择风格预设（写实、电影感、动漫等）
- 输入提示词
- 指定保存路径（支持相对路径，如 `./output.jpg`）

### 视频模式

- 选择文生视频 / 图生视频 / 多图视频 / 关键帧动画
- 选择视频时长（3s / 5s / 10s / 18s）
- 输入视频描述
- 指定保存路径（如 `./output.mp4`）
- 自动等待异步任务完成并下载

---

## WebUI 使用说明

启动后在浏览器打开 `http://localhost:3000`：

| 面板 | 功能 |
|------|------|
| 文本对话 | 流式多轮对话，支持图片理解、Thinking 模式 |
| 图像生成 | 文生图/图生图，支持本地文件上传，预览并下载 |
| 视频生成 | 提交视频任务，实时进度条，生成完成后在线播放 |

点击左下角 **⚙️ API 配置** 设置 API Key。

---

## 全局安装 TUI（可选）

```bash
cd packages/tui
npm link
```

安装后可全局使用 `agnes` 命令：

```bash
agnes
```

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

| 类型 | 模型名称 | 特点 |
|------|----------|------|
| 文本 | `agnes-1.5-flash` | 轻量高速，低成本高并发 |
| 文本 | `agnes-2.0-flash` | 智能体/工具调用/图片理解 |
| 图像 | `agnes-image-2.0-flash` | 文生图/图生图/多图合成 |
| 图像 | `agnes-image-2.1-flash` | 高信息密度优化版 |
| 视频 | `agnes-video-v2.0` | 文/图生视频，异步生成 |

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
