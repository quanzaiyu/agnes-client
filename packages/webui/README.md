# @agnes/webui - Agnes AI 网页界面

基于 SvelteKit + Express 的前后端分离 Web 应用，提供用户系统、积分系统和可视化生成界面。

## 技术栈

- **前端**: SvelteKit + UnoCSS + Vite
- **后端**: Express.js + sql.js (SQLite)
- **认证**: JWT + Cookie
- **样式**: Tailwind 兼容类 UnoCSS

## 快速开始

```bash
# 开发模式（同时启动前端和后端）
pnpm dev

# 仅启动后端 API
pnpm dev:server

# 仅启动前端开发服务器
pnpm dev:frontend

# 构建生产版本
pnpm build

# 运行生产版本
pnpm start
```

## 访问地址

- 前端: http://localhost:5173
- 后端 API: http://localhost:3000

## 功能模块

### 用户系统

- 注册 / 登录 / 登出
- JWT Token 认证（7 天有效期）
- 昵称、头像修改

### 积分系统

| 操作 | 积分变化 |
|------|----------|
| 注册 | +100 |
| 每日签到 | +10 |
| 文本生成 | -1 |
| 图片生成 | -1 |
| 视频生成 | -10 |

**注意**: 积分在生成完成后扣除，不是发起请求时扣除。

### 文本生成 `/text`

- 多轮对话
- 流式输出
- Markdown 渲染
- 模型选择（Flash/标准/Thinking）
- 图片理解（Vision）

### 图片生成 `/image`

- 文生图
- 多尺寸支持: 512x512, 768x768, 1024x1024, 1024x768, 768x1024, 1920x1080
- 预览和下载

### 视频生成 `/video`

- 文生视频
- 图生视频
- 实时进度轮询
- 在线播放

### 个人设置 `/settings`

- 修改昵称
- 上传头像
- 查看积分记录

## API 接口

### 认证 API

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册 | 否 |
| POST | `/api/auth/login` | 登录 | 否 |
| POST | `/api/auth/logout` | 登出 | 是 |
| GET | `/api/auth/me` | 获取当前用户 | 是 |

### 用户 API

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/user/profile` | 获取资料 | 是 |
| PUT | `/api/user/profile` | 更新资料 | 是 |
| POST | `/api/user/avatar` | 上传头像 | 是 |

### 积分 API

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/points` | 获取积分余额 | 是 |
| GET | `/api/points/checkin-status` | 签到状态 | 是 |
| POST | `/api/points/checkin` | 签到 | 是 |
| GET | `/api/points/history` | 历史记录 | 是 |

### 生成 API

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/text/generate` | 文本生成 | 是 |
| POST | `/api/image/generate` | 图片生成 | 是 |
| POST | `/api/video/generate` | 视频生成 | 是 |
| GET | `/api/video/status/:id` | 视频状态 | 是 |

## 数据库

数据存储在 `data/agnes.db`，包含以下表：

- `users` - 用户信息
- `checkins` - 签到记录
- `generation_logs` - 生成记录
- `sessions` - 会话管理

## 前端开发

### 添加新页面

在 `src/frontend/src/routes/` 下创建：

```
src/frontend/src/routes/
├── +layout.svelte          # 根布局（侧边栏）
├── +page.svelte            # 首页
├── login/+page.svelte      # 登录页
├── register/+page.svelte  # 注册页
├── text/+page.svelte      # 文本生成
├── image/+page.svelte     # 图片生成
├── video/+page.svelte     # 视频生成
└── settings/+page.svelte # 设置页
```

### UnoCSS 快捷类

```svelte
<!-- 按钮 -->
<button class="btn-primary">主要按钮</button>
<button class="btn-secondary">次要按钮</button>
<button class="btn-ghost">幽灵按钮</button>

<!-- 卡片 -->
<div class="card">内容卡片</div>
<a class="card-hover">可悬停卡片</a>

<!-- 输入框 -->
<input class="input-base" />

<!-- 链接 -->
<a class="link">链接文字</a>
```

### 主题颜色

```css
/* 主题色 */
primary-500  /* 紫色主色 #8B5CF6 */
primary-600  /* 深紫 */

/* 表面色 */
surface       /* 背景 #0F0F14 */
surface-100  /* 卡片背景 #1A1A24 */
surface-200  /* 输入框背景 #252532 */

/* 边框 */
border       /* #2A2A3A */
```

## 后端开发

### 添加新 API 路由

在 `src/server/routes/` 下创建：

```javascript
// src/server/routes/example.js
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/example', authMiddleware, (req, res) => {
  res.json({ userId: req.userId });
});

export default router;
```

然后在 `src/server/index.js` 中注册：

```javascript
import exampleRoutes from './routes/example.js';
app.use('/api/example', exampleRoutes);
```

### 中间件

```javascript
import { authMiddleware, optionalAuth } from '../middleware/auth.js';

// 需要登录
router.get('/protected', authMiddleware, handler);

// 可选登录
router.get('/optional', optionalAuth, handler);
```

## 环境变量

```bash
PORT=3000              # 后端端口
NODE_ENV=production    # 生产模式
FRONTEND_URL=https://example.com  # 生产环境前端地址
JWT_SECRET=your-secret-key      # JWT 密钥
```
