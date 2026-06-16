# @agnes/tui - Agnes AI 终端交互界面

基于 Node.js + Inquirer 的交互式命令行工具，支持菜单驱动和 CLI 直接调用两种模式。

## 快速开始

```bash
# 开发模式运行
pnpm dev:tui

# 或全局安装后使用
npm link
agnes
```

## 使用模式

### 交互式 TUI

直接运行 `agnes` 进入菜单驱动界面：

```bash
agnes
```

菜单选项：
- 💬 文本 / 对话
- 🎨 图像生成
- 🎬 视频生成
- ⚙️ 配置管理
- 🚪 退出

### CLI 命令行

```bash
# 文本对话
agnes text chat --prompt "你好"

# 图片生成
agnes image generate --prompt "一只猫" --size 1024x1024

# 视频生成
agnes video create --prompt "日落" --frames 121

# 查看配置
agnes config view
```

## CLI 命令参考

### 文本生成

```bash
agnes text chat [options]

选项:
  --prompt <text>     提问内容（必填）
  --system <text>      System Prompt
  --model <id>         模型 ID (默认: agnes-2.0-flash)
  --image <url>        图片 URL（开启 Vision 模式）
  --thinking           开启深度推理
  --no-stream          禁用流式输出
  --output <path>      保存到文件
```

**示例**:
```bash
# 普通对话
agnes text chat --prompt "介绍一下量子计算"

# 带 System Prompt
agnes text chat --system "你是一个 Python 专家" --prompt "怎么用 asyncio"

# 图片理解
agnes text chat --image https://example.com/photo.jpg --prompt "描述这张图"

# 保存输出
agnes text chat --prompt "写一首诗" --no-stream --output poem.md
```

### 图片生成

```bash
agnes image generate [options]

选项:
  --prompt <text>     提示词（必填）
  --model <id>        模型 ID (默认: agnes-image-2.1-flash)
  --size <WxH>        尺寸 (默认: 1024x1024)
  --style <name>      风格预设
  --image <path>      参考图（图生图）
  --output <path>     保存路径 (默认: ./output.jpg)
```

**示例**:
```bash
# 文生图
agnes image generate --prompt "一只可爱的猫" --size 1920x1080

# 图生图
agnes image generate --prompt "增强光照" --image ./input.png --output enhanced.jpg

# 指定风格
agnes image generate --prompt "未来城市" --style anime
```

### 视频生成

```bash
agnes video create [options]

选项:
  --prompt <text>       视频描述（必填）
  --model <id>         模型 ID (默认: agnes-video-v2.0)
  --size <WxH>         视频尺寸 (默认: 1216x832)
  --frames <n>          帧数 (默认: 121)
  --fps <n>             帧率 (默认: 24)
  --image <path>       参考图（图生视频）
  --negative-prompt    负向提示词
  --output <path>       保存路径 (默认: ./output.mp4)
```

**示例**:
```bash
# 文生视频
agnes video create --prompt "海边的日落" --size 1216x832 --frames 121

# 图生视频
agnes video create --prompt "动画化这个风景" --image ./photo.jpg

# 自定义参数
agnes video create --prompt "城市夜景" --frames 241 --fps 30
```

### 配置管理

```bash
agnes config <action>

操作:
  view              查看当前配置
  set-apikey <key> 设置 API Key
  set-baseurl <url> 设置 Base URL
```

## 可用模型

### 文本模型

| 模型 ID | 说明 |
|---------|------|
| `agnes-1.5-flash` | 轻量高速，低成本 |
| `agnes-2.0-flash` | 推荐，支持工具调用 |

### 图片模型

| 模型 ID | 说明 |
|---------|------|
| `agnes-image-2.0-flash` | 快速版 |
| `agnes-image-2.1-flash` | 高信息密度版（默认）|

### 视频模型

| 模型 ID | 说明 |
|---------|------|
| `agnes-video-v2.0` | 文/图生视频 |

## 风格预设

图片生成支持以下风格：
- `photorealistic` - 写实
- `anime` - 动漫
- `cinematic` - 电影感
- `oil-painting` - 油画
- `watercolor` - 水彩
- `3d-render` - 3D 渲染
- `flat-design` - 扁平设计

## 输出选项

### 流式输出

默认启用流式输出，实时显示生成内容：

```bash
agnes text chat --prompt "写一个故事"
# 逐字显示输出...
```

禁用流式输出：
```bash
agnes text chat --prompt "写一个故事" --no-stream
```

### 保存到文件

```bash
agnes text chat --prompt "写一首诗" --output poem.md
agnes image generate --prompt "一只猫" --output cat.jpg
agnes video create --prompt "日落" --output sunset.mp4
```

## 配置优先级

1. 命令行参数 > 配置文件
2. 本地配置 `agnes.config.json` > 全局配置 `~/.agnes/config.json`
