# @agnes/server

独立后端服务（端口 3100），从原 `@agnes/webui` 与 `@agnes/workflow` 中拆分而来，使用 sql.js 做内嵌持久化、jsonwebtoken 做鉴权。聚合 auth、积分、文本/图片/视频生成与 OpenID 占位等 API，作为 Agnes 客户端的统一后端。

## 启动

```bash
pnpm install
pnpm dev   # 端口 3100
```

## 环境变量

- `PORT` (默认 3100)
- `JWT_SECRET`
- `FRONTEND_URL` (逗号分隔)
- `NODE_ENV`

## API 端点

| Method | Path | 说明 |
|--------|------|------|
| POST | /api/auth/register | 注册 |
| POST | /api/auth/login | 登录 |
| GET  | /api/auth/me | 当前用户 |
| GET  | /api/user/profile | 资料 |
| GET  | /api/points | 积分余额 |
| POST | /api/points/checkin | 签到 |
| POST | /api/text/generate | 文本生成（支持 stream） |
| POST | /api/image/generate | 图片生成 |
| POST | /api/video/generate | 视频生成 |
| GET  | /api/video/status/:id | 视频状态 |
| POST | /api/openid/login | 小程序 OpenID 登录（占位） |
