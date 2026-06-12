# Agnes Image 2.0 Flash

> 来源: https://agnes-ai.com/doc/agnes-image-20-flash

## Agnes-Image-2.0-Flash 接入文档

### 一、模型简介

**Agnes-Image-2.0-Flash** 是由 **Sapiens AI** 开发的一款高性能图像生成与图像编辑模型。该模型支持 **文生图**、**图生图** 和 **多图合成** 工作流，适用于快速创意生产、图像优化、营销视觉设计、电商产品图、社交内容生成以及专业视觉内容生产等场景。Agnes-Image-2.0-Flash 已登上 **Artificial Analysis Image Editing Leaderboard**，取得 **ELO 1,184**【动态调整】的成绩，并进入 **Top 20** 区间，展现出在主流图像模型中较强的图像编辑能力。

### 二、模型概述

Agnes-Image-2.0-Flash 针对快速、高质量的图像生成与图像编辑任务进行了优化。该模型支持以下能力：

| 能力 | 说明 |
|------|------|
| Text-to-Image | 根据文本 Prompt 生成图像 |
| Image-to-Image | 基于输入图像进行编辑、转换或增强 |
| Multi-Image Input | 支持输入多张参考图并合成为一张新图像 |
| Image Editing | 修改构图、风格、对象、背景、场景和视觉细节 |
| Style Control | 调整艺术风格、光照、布局和视觉方向 |
| Fast Generation | 针对快速、低成本的生产工作流进行优化 |
| OpenAI-Compatible API | 使用兼容 OpenAI Images API 的请求结构 |

### 三、适用场景

| 场景 | 示例用例 |
|------|----------|
| 创意设计 | 海报、概念艺术、社交媒体视觉图 |
| 营销内容 | 产品广告、活动创意、Banner |
| 文生图 | 通过 Prompt 生成产品图、插画、场景图、概念图 |
| 图像编辑 | 对象替换、背景更换、风格转换、局部改图 |
| 角色合成 | 将多个角色或参考图组合到同一场景中 |
| 视觉生产 | 为 App、网站、游戏和视频生成素材 |
| 电商 | 产品图优化、场景化产品图、营销主图 |
| 社交内容 | Meme、头像、缩略图、生活方式视觉图 |

### 四、API 基础信息

#### Base URL

```
https://apihub.agnes-ai.com
```

#### Endpoint

```
POST https://apihub.agnes-ai.com/v1/images/generations
```

#### Headers

```
-H "Authorization: Bearer YOUR_API_KEY"
-H "Content-Type: application/json"
```

### 五、模型名称

| 模型 | 用途 |
|------|------|
| `agnes-image-2.0-flash` | 文生图、图生图、多图合成、图像编辑 |

### 六、请求参数

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| `model` | string | 是 | 模型名称，固定为 `agnes-image-2.0-flash` |
| `prompt` | string | 是 | 描述目标图像或编辑需求的文本提示词 |
| `size` | string | 是 | 输出图像尺寸，例如 `1024x768`、`1024x1024`、`768x1024` |
| `image` | string[] | 图生图必填 | 输入图片数组，支持公网 URL 或 Data URI Base64 |
| `return_base64` | boolean | 否 | 文生图返回 Base64 时使用 |
| `extra_body.response_format` | string | 否 | 输出格式，常用 `url` 或 `b64_json` |

### 七、重要说明

#### 1. 文生图不需要传 `image`

文生图只需要传入：

```json
{
  "model": "agnes-image-2.0-flash",
  "prompt": "A clean product photo of a glass cube on a white studio background, soft shadows, high detail",
  "size": "1024x768"
}
```

#### 2. 图生图需要传 `image`

图生图或多图合成时，需要在顶层传入 `image` 数组：

```json
{
  "image": [
    "https://example.com/input.png"
  ]
}
```

多图合成时可以传入多个图片 URL：

```json
{
  "image": [
    "https://example.com/character-1.png",
    "https://example.com/character-2.png"
  ]
}
```

#### 3. 图生图不需要传 `tags`

当前接入方式中，图生图请求不需要传：

```json
{
  "tags": ["img2img"]
}
```

只需要传入 `model`、`prompt`、`size` 和 `image`。

#### 4. `response_format` 不要放在顶层

**不要这样写：**

```json
{
  "response_format": "url"
}
```

**推荐写法：**

```json
{
  "extra_body": {
    "response_format": "url"
  }
}
```

如果将 `response_format` 放在顶层，可能会返回 400 错误。

### 八、调用示例

#### 1. 文生图：URL 输出

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.0-flash",
    "prompt": "A clean product photo of a glass cube on a white studio background, soft shadows, high detail",
    "size": "1024x768",
    "extra_body": {
      "response_format": "url"
    }
  }'
```

生成图片 URL 位于：`data[0].url`

#### 2. 文生图：Base64 输出

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.0-flash",
    "prompt": "A clean product photo of a glass cube on a white studio background, soft shadows, high detail",
    "size": "1024x768",
    "return_base64": true
  }'
```

生成图片 Base64 位于：`data[0].b64_json`

#### 3. 图生图：URL 输入，URL 输出

用于编辑或转换现有图像。

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.0-flash",
    "prompt": "Transform this image into a cinematic cyberpunk style while preserving the main subject and composition",
    "size": "1024x768",
    "extra_body": {
      "image": [
        "https://example.com/input-image.png"
      ],
      "response_format": "url"
    }
  }'
```

生成图片 URL 位于：`data[0].url`

#### 4. 图生图：URL 输入，Base64 输出

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.0-flash",
    "prompt": "Make the object orange while preserving the original composition",
    "size": "1024x768",
    "extra_body": {
      "image": [
        "https://example.com/input-image.png"
      ],
      "response_format": "b64_json"
    }
  }'
```

生成图片 Base64 位于：`data[0].b64_json`

#### 5. 图生图：Data URI Base64 输入

如果输入图片不是公网 URL，也可以使用 Data URI Base64 作为输入。

Data URI 格式：`data:image/png;base64,BASE64_HERE`

请求示例：

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.0-flash",
    "prompt": "Make the object matte black while preserving the original composition",
    "size": "1024x768",
    "extra_body": {
      "image": [
        "data:image/png;base64,BASE64_HERE"
      ],
      "response_format": "b64_json"
    }
  }'
```

#### 6. 多图合成请求

用于将多张输入图像组合成一个新场景。

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.0-flash",
    "prompt": "Combine the two characters into an intense fantasy battle scene, dynamic lighting, detailed background, cinematic composition",
    "size": "1024x768",
    "extra_body": {
      "image": [
        "https://example.com/character-1.png",
        "https://example.com/character-2.png"
      ],
      "response_format": "url"
    }
  }'
```

### 九、响应格式

#### 1. URL 输出

```json
{
  "created": 1780000000,
  "data": [
    {
      "url": "https://storage.googleapis.com/agnes-aigc/xxx.png",
      "b64_json": null,
      "revised_prompt": null
    }
  ]
}
```

#### 2. Base64 输出

```json
{
  "created": 1780000000,
  "data": [
    {
      "url": null,
      "b64_json": "iVBORw0KGgoAAAANSUhEUgAA...",
      "revised_prompt": null
    }
  ]
}
```

### 十、响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `created` | integer | 请求创建时间戳 |
| `data` | array | 生成图片结果列表 |
| `data[].url` | string / null | 生成图片 URL，Base64 输出时通常为 `null` |
| `data[].b64_json` | string / null | Base64 图片数据，URL 输出时通常为 `null` |
| `data[].revised_prompt` | string / null | 修订后的 Prompt，如无则为 `null` |

### 十一、价格

| 类型 | 原价 | 当前价格 |
|------|------|----------|
| Generated Images | `$0.003 / image` | `$0 / image` |

### 十二、功能与兼容性

Agnes-Image-2.0-Flash 支持以下能力：

- 文生图生成
- 图生图编辑
- 多图输入与合成
- 基于 Prompt 的图像转换
- 稳定的风格与构图控制
- 支持公网 URL 图片输入
- 支持 Data URI Base64 图片输入
- 支持 URL 或 Base64 输出
- 面向生产工作流的快速生成
- 兼容 OpenAI Images API 的请求结构

### 十三、最佳实践

#### 1. 文生图 Prompt 编写建议

为了获得更好的生成效果，建议在 Prompt 中提供清晰的视觉指令，包括主体、场景、风格、光照、构图和质量要求。

> A professional product photo of a wireless headphone on a clean white background, soft studio lighting, sharp details, commercial photography style

#### 2. 图像编辑 Prompt 编写建议

对于编辑任务，建议明确描述需要改变的内容，以及需要保持不变的内容。

> Change the background to a futuristic city at night while keeping the person's face, outfit, and pose unchanged

#### 3. 多图合成 Prompt 编写建议

对于多图合成任务，建议描述不同输入图像之间的关系。

> Place the person from the first image beside the robot from the second image in a cinematic sci-fi battle scene

### 十四、推荐 Prompt 结构

#### 文生图 Prompt 结构

```
[Main subject] + [Scene / background] + [Style] + [Lighting] + [Composition] + [Quality requirements]
```

示例：

> A young explorer standing in an ancient temple, cinematic fantasy style, warm dramatic lighting, wide-angle composition, ultra detailed, high quality

#### 图生图 Prompt 结构

```
[Editing instruction] + [Elements to preserve] + [Target style / scene] + [Lighting] + [Composition] + [Quality requirements]
```

示例：

> Change the background into a cinematic fantasy temple while preserving the person's face, outfit, and pose, warm dramatic lighting, wide-angle composition, ultra detailed, high quality

### 十五、常见问题

#### 1. Agnes-Image-2.0-Flash 是否支持文生图？

支持。文生图请求不需要传入 `image`，只需要传入 `model`、`prompt` 和 `size`。

#### 2. Agnes-Image-2.0-Flash 是否支持图生图？

支持。

#### 3. 输入图片 URL 不可访问怎么办？

如果输入图片 URL 不能被服务端访问，可能导致请求失败。建议使用：

- 公网可访问的 HTTPS 图片地址
- Data URI Base64 输入

#### 4. 请求超时怎么办？

图片生成可能需要数秒到几十秒。客户端建议设置较长超时时间，例如：`60s - 360s`

### 十六、接入检查清单

接入前建议确认：

- 已获得有效 API Key
- 请求地址为 `https://apihub.agnes-ai.com/v1/images/generations`
- Header 中已添加 `Authorization: Bearer YOUR_API_KEY`
- Header 中已添加 `Content-Type: application/json`
- 模型名称为 `agnes-image-2.0-flash`
- `response_format` 放在 `extra_body` 中
