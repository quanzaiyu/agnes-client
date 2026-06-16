# @agnes/core - Agnes AI 核心 SDK

Node.js ESM 模块封装 Agnes AI API，提供文本、图像、视频生成能力。

## 安装

```bash
# 作为项目依赖（已包含在根 package.json 中）
pnpm add @agnes/core

# 或直接导入
import { AgnesClient } from '@agnes/core';
```

## 基础用法

```javascript
import { AgnesClient, loadConfig } from '@agnes/core';

// 方式一：从配置文件加载
const config = loadConfig();
const client = new AgnesClient(config);

// 方式二：直接传入配置
const client = new AgnesClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://apihub.agnes-ai.com/v1'
});
```

## API 参考

### AgnesClient

#### 文本对话

```javascript
// 普通对话
const result = await client.chat({
  model: 'agnes-2.0-flash',
  messages: [
    { role: 'system', content: '你是一个有帮助的助手' },
    { role: 'user', content: '你好' }
  ]
});

// 流式输出
const stream = await client.chat({
  model: 'agnes-2.0-flash',
  messages: [{ role: 'user', content: '写一首诗' }],
  stream: true
});

// 带 Thinking 模式
const result = await client.chat({
  model: 'agnes-2.0-flash',
  messages: [{ role: 'user', content: '解释量子计算' }],
  thinking: true
});

// 带参数
const result = await client.chat({
  model: 'agnes-2.0-flash',
  messages: [{ role: 'user', content: '写一个函数' }],
  temperature: 0.7,
  maxTokens: 2000
});
```

#### 图片生成

```javascript
// 文生图
const result = await client.generateImage({
  model: 'agnes-image-2.1-flash',
  prompt: 'A beautiful sunset over the ocean',
  size: '1024x1024'  // 512x512, 768x768, 1024x1024, 1024x768, 768x1024, 1920x1080
});

// 返回 base64
const result = await client.generateImage({
  model: 'agnes-image-2.1-flash',
  prompt: 'A cat',
  size: '1024x1024',
  responseFormat: 'b64_json'
});

// 图生图
const result = await client.generateImage({
  model: 'agnes-image-2.1-flash',
  prompt: 'enhance the lighting',
  size: '1024x1024',
  images: ['https://example.com/photo.jpg']  // 支持 URL 或 data URI
});

// 多图合成
const result = await client.generateImage({
  model: 'agnes-image-2.1-flash',
  prompt: 'combine these images',
  size: '1024x1024',
  images: ['data:image/...', 'data:image/...']
});
```

#### 视频生成

```javascript
// 文生视频
const task = await client.createVideo({
  model: 'agnes-video-v2.0',
  prompt: 'A cat walking in the garden',
  width: 1216,
  height: 832,
  numFrames: 121,
  frameRate: 24
});

// 轮询视频状态
const result = await client.waitForVideo(task.video_id, {
  pollInterval: 5000,  // 5秒轮询
  maxWait: 600000,      // 最多等待10分钟
  onProgress: (progress, status) => {
    console.log(`进度: ${progress}%, 状态: ${status}`);
  }
});

// 图生视频
const task = await client.createVideo({
  model: 'agnes-video-v2.0',
  prompt: 'animate this landscape',
  image: 'https://example.com/photo.jpg',
  width: 1216,
  height: 832
});

// 带负向提示词
const task = await client.createVideo({
  model: 'agnes-video-v2.0',
  prompt: 'beautiful scenery',
  negativePrompt: 'blur, low quality',
  width: 1216,
  height: 832
});
```

### 配置管理

```javascript
import { loadConfig, saveConfig } from '@agnes/core';

// 加载配置（从当前目录或 ~/.agnes/config.json）
const config = loadConfig();

// 保存配置
saveConfig(config, 'local');  // 保存到当前目录
saveConfig(config, 'global'); // 保存到 ~/.agnes/config.json
```

### 工具函数

```javascript
import { AgnesClient } from '@agnes/core';

// 下载图片到文件
await AgnesClient.downloadFile('https://example.com/image.png', './output.png');

// 保存 base64 图片
await AgnesClient.saveBase64Image(base64Data, './output.png');

// 解析图片（URL/路径 -> data URI）
const dataUri = await AgnesClient.resolveImage('https://example.com/image.png');
```

## 配置加载顺序

1. 当前目录 `agnes.config.json`
2. 用户目录 `~/.agnes/config.json`

## 模型列表

| 类型 | 模型 ID | 说明 |
|------|---------|------|
| 文本 | `agnes-1.5-flash` | 轻量高速 |
| 文本 | `agnes-2.0-flash` | 标准版，支持工具调用 |
| 文本 | `agnes-2.0` | 完整版 |
| 文本 | `agnes-2.0-thinking` | 深度思考模式 |
| 图片 | `agnes-image-2.0-flash` | 快速版 |
| 图片 | `agnes-image-2.1-flash` | 高信息密度版 |
| 视频 | `agnes-video-v2.0` | 异步生成 |

## 错误处理

```javascript
import { AgnesClient } from '@agnes/core';

const client = new AgnesClient(config);

try {
  const result = await client.generateImage({
    model: 'agnes-image-2.1-flash',
    prompt: 'A cat'
  });
} catch (error) {
  console.error('API Error:', error.message);
  console.error('Status:', error.response?.status);
  console.error('Data:', error.response?.data);
}
```
