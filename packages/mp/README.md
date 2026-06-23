# @agnes/mp

Agnes AI 多端小程序（uniapp + Vue 3 + UnoCSS + Pinia + vue-macros）。

## 支持平台

- H5
- 微信小程序（mp-weixin）
- 支付宝小程序（mp-alipay）
- App（iOS / Android）

## 启动

```bash
pnpm install
pnpm dev:h5          # H5 开发
pnpm dev:mp-weixin   # 微信小程序
pnpm dev:mp-alipay   # 支付宝小程序
pnpm build:h5        # 构建 H5
```

## 技术栈

- uniapp 3 + Vue 3
- Vite 5
- UnoCSS（Ditto Light 主题）
- Pinia（持久化到 uni.storage）
- vue-macros（`$ref` / `$$` 解包）
- unplugin-auto-import（Vue / Pinia 自动引入）
- iconify-json（mdi / carbon / ph）

## 后端

调用 `@agnes/server`（默认 `http://localhost:3100/api`）。
通过 `VITE_API_BASE` 环境变量切换。

## 目录

```
src/
├── api/        # 接口封装
├── components/ # 通用组件
├── composables/# 业务逻辑
├── pages/      # 文件系统路由
├── stores/     # Pinia
├── styles/     # 全局样式
└── utils/      # 工具函数
```