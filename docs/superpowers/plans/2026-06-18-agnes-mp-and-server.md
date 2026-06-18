# Agnes MP + Server 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从现有 `@agnes/webui` 后端抽取 API 到独立的 `packages/server`，并构建基于 uniapp + unocss + vite 的全平台（mp-weixin + h5 + mp-alipay + app）小程序 `packages/mp`，复用 Ditto 主题与本地积分。

**Architecture:**
- **后端** `packages/server`：Express + sql.js + JWT，整合 webui 与 workflow 的 API；保留 webui/workflow 独立运行，平滑迁移
- **前端** `packages/mp`：uniapp Vue3 + Vite + UnoCSS，集成 unplugin-auto-import、vue-macros（`$ref`）、iconify-json、Pinia，调用新后端
- **样式**：Ditto Light 主题（DESIGN.md）通过 UnoCSS 预设实现，跨端一致

**Tech Stack:**
- 后端：Express 4 + sql.js + jsonwebtoken + bcryptjs + axios + `@agnes/core`
- 前端：uniapp 3.x + Vue 3.4+ + Vite 5 + TypeScript + UnoCSS 0.60+ + Pinia 2 + vue-macros + unplugin-auto-import + @iconify-json/{mdi,carbon,ph}

## Global Constraints

- **Node**: >= 18 (与 pnpm-workspace 现有约束一致)
- **包管理**: pnpm workspace（`packages/*`）
- **API Key 来源**: 根目录 `agnes.config.json`（与现有 webui 保持一致路径）
- **数据库**: sql.js 写入到 `packages/server/data/agnes.db`（不复用 `data/agnes.db`，避免破坏 webui）
- **后端端口**: 3100（避开 webui 的 3000、workflow 的 3001）
- **小程序后端地址**: 开发期 H5 走 `http://localhost:3100`；小程序端走同局域网 IP（运行时从配置读取）
- **样式令牌**: 全部来自 `DESIGN.md` §Tokens — 不新增色值/字号/圆角
- **主题**: 仅 Ditto Light 主题；不做暗色模式
- **登录**: 推迟；API 路由设计预留 `openid` 字段；积分在小程序端走本地存储
- **目标平台**: mp-weixin + h5 + mp-alipay + app（uniapp 多端编译）
- **代码风格**: ESM、2 空格缩进、Prettier（参考根目录 `package.json`）
- **提交规范**: Conventional Commits（feat/fix/chore/refactor/docs/test）

---

## 范围拆分

本计划分两个独立子项目，每个可单独执行与验证：

- **Phase A — `packages/server`**: 后端抽取与重构
- **Phase B — `packages/mp`**: uniapp 小程序

两阶段可以顺序执行（先 A 再 B），也可以并行（A 给出 API 契约后 B 用 mock 先行）。

---

## Phase A: `packages/server`（独立后端）

### 文件结构

```
packages/server/
├── package.json                         # @agnes/server
├── README.md
├── .env.example                         # PORT, JWT_SECRET, FRONTEND_URL
├── src/
│   ├── index.js                         # Express 入口
│   ├── config.js                        # 读取 agnes.config.json + .env
│   ├── db/
│   │   ├── index.js                     # sql.js 初始化（迁移自 webui/src/server/db）
│   │   ├── migrations.js                # 表结构（与 webui 一致+预留 openid）
│   │   └── repository.js                # 通用 CRUD helper
│   ├── middleware/
│   │   ├── auth.js                      # JWT 中间件（迁移并支持 openid 预留）
│   │   ├── error.js                     # 统一错误处理
│   │   └── logger.js                    # 请求日志
│   ├── routes/
│   │   ├── auth.js                      # 注册/登录/登出/me（保留兼容）
│   │   ├── user.js                      # 资料/头像
│   │   ├── points.js                    # 积分/签到/历史
│   │   ├── text.js                      # 文本生成（含流式 SSE）
│   │   ├── image.js                     # 图片生成
│   │   ├── video.js                     # 视频生成 + 轮询
│   │   ├── config.js                    # 配置管理
│   │   ├── workflow.js                  # 整合自 workflow/server.cjs
│   │   └── openid.js                    # 小程序 openid 登录预留（仅占位）
│   ├── services/
│   │   ├── agnes.js                     # 封装 AgnesClient（来自 @agnes/core）
│   │   ├── points.js                    # 积分计算/扣减业务
│   │   └── stream.js                    # SSE 流式响应工具
│   └── utils/
│       ├── logger.js
│       └── env.js
├── data/                                # agnes.db + avatars/（gitignore）
└── tests/
    ├── unit/
    │   ├── points.test.js
    │   └── auth.test.js
    └── integration/
        ├── text.test.js
        ├── image.test.js
        └── video.test.js
```

### 复用策略

- **不**从 webui 直接 require；将 `webui/src/server/` 下需要的文件**复制**到 `packages/server/`，按新结构重组
- 复用 `@agnes/core`（`AgnesClient`、`loadConfig`）
- 复用根目录 `agnes.config.json`
- 端口不同、数据库路径不同，但 schema 兼容

---

### Task A.1: 创建 `packages/server` 工作区与 `package.json`

**Files:**
- Create: `packages/server/package.json`
- Create: `packages/server/.env.example`
- Create: `packages/server/.gitignore`
- Modify: `pnpm-workspace.yaml`（已包含 `packages/*`，无需改）

**Interfaces:**
- 无

- [ ] **Step 1: 创建 `packages/server/package.json`**

```json
{
  "name": "@agnes/server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "test": "node --test tests/"
  },
  "dependencies": {
    "@agnes/core": "workspace:*",
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "nanoid": "^5.0.9",
    "sql.js": "^1.10.0"
  },
  "devDependencies": {
    "supertest": "^7.0.0"
  },
  "volta": {
    "node": "24.14.0",
    "pnpm": "10.33.4"
  }
}
```

- [ ] **Step 2: 创建 `packages/server/.env.example`**

```bash
PORT=3100
NODE_ENV=development
JWT_SECRET=agnes-server-secret-change-in-production
FRONTEND_URL=http://localhost:5173,http://localhost:9000
```

- [ ] **Step 3: 创建 `packages/server/.gitignore`**

```
node_modules/
data/
.env
.env.local
*.log
coverage/
```

- [ ] **Step 4: 安装依赖**

Run: `cd d:/projects/my_project/agnes-client && pnpm install`
Expected: 安装 `@agnes/server` 工作区包，无错误

- [ ] **Step 5: 提交**

```bash
git add packages/server/package.json packages/server/.env.example packages/server/.gitignore pnpm-lock.yaml
git commit -m "feat(server): scaffold packages/server workspace"
```

---

### Task A.2: 配置加载与 Express 入口

**Files:**
- Create: `packages/server/src/config.js`
- Create: `packages/server/src/index.js`

**Interfaces:**
- `loadServerConfig()` → `{ port, nodeEnv, jwtSecret, frontendUrl, agnesConfig, dbPath }`
- 入口启动后监听 `port`，输出 banner

- [ ] **Step 1: 编写 `packages/server/src/config.js`**

```javascript
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { loadConfig as loadAgnesConfig } from '@agnes/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');

export function loadServerConfig() {
  const port = Number(process.env.PORT) || 3100;
  const nodeEnv = process.env.NODE_ENV || 'development';
  const jwtSecret = process.env.JWT_SECRET || 'agnes-server-secret-change-in-production';
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim());
  const agnesConfig = loadAgnesConfig({ rootDir: ROOT });
  const dbPath = path.join(__dirname, '../data/agnes.db');
  return { port, nodeEnv, jwtSecret, frontendUrl, agnesConfig, dbPath, rootDir: ROOT };
}
```

- [ ] **Step 2: 编写 `packages/server/src/index.js`（最小可启动版本）**

```javascript
import express from 'express';
import { loadServerConfig } from './config.js';

const config = loadServerConfig();
const app = express();

app.get('/health', (req, res) => res.json({ ok: true, service: '@agnes/server' }));

const server = app.listen(config.port, () => {
  console.log(`\n  🚀 @agnes/server running at http://localhost:${config.port}\n`);
});

export { app, server, config };
```

- [ ] **Step 3: 验证启动**

Run: `cd d:/projects/my_project/agnes-client/packages/server && pnpm dev`
Expected: 看到 `🚀 @agnes/server running at http://localhost:3100`
Then: `curl http://localhost:3100/health` 返回 `{"ok":true,"service":"@agnes/server"}`
停止（Ctrl+C）。

- [ ] **Step 4: 提交**

```bash
git add packages/server/src/config.js packages/server/src/index.js
git commit -m "feat(server): add config loader and express entry"
```

---

### Task A.3: 数据库初始化（sql.js 迁移 + 预留 openid）

**Files:**
- Create: `packages/server/src/db/index.js`
- Create: `packages/server/src/db/migrations.js`
- Create: `packages/server/src/db/repository.js`

**Interfaces:**
- `initDatabase({ dbPath })` → Promise<Database>
- `getDb()` → Database
- `saveDatabase()` → void
- `repo.run(sql, ...params)` / `repo.get` / `repo.all`

- [ ] **Step 1: 编写 `packages/server/src/db/migrations.js`**

```javascript
export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    openid TEXT UNIQUE,
    unionid TEXT,
    nickname TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    points INTEGER DEFAULT 100,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    checkin_date TEXT NOT NULL,
    points_earned INTEGER DEFAULT 10,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, checkin_date)
  );
  CREATE TABLE IF NOT EXISTS generation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    client_id TEXT,
    type TEXT NOT NULL,
    cost_points INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    result TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins(user_id, checkin_date);
  CREATE INDEX IF NOT EXISTS idx_logs_user ON generation_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_logs_client ON generation_logs(client_id);
  CREATE INDEX IF NOT EXISTS idx_users_openid ON users(openid);
`;
```

- [ ] **Step 2: 编写 `packages/server/src/db/index.js`**

```javascript
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { SCHEMA_SQL } from './migrations.js';

let db = null;
let SQL = null;

export async function initDatabase({ dbPath }) {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  SQL = await initSqlJs();
  db = fs.existsSync(dbPath)
    ? new SQL.Database(fs.readFileSync(dbPath))
    : new SQL.Database();

  db.exec(SCHEMA_SQL);
  saveDatabase(dbPath);
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function saveDatabase(dbPath) {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export async function resetDatabase({ dbPath }) {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  await initDatabase({ dbPath });
}
```

- [ ] **Step 3: 编写 `packages/server/src/db/repository.js`**

```javascript
import { getDb, saveDatabase } from './index.js';

function bindAll(stmt, params) {
  if (params.length) stmt.bind(params);
}

export function run(sql, ...params) {
  const db = getDb();
  db.run(sql, params);
  saveDatabaseFromConfig();
  return { lastInsertRowid: Number(db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || 0) };
}

export function get(sql, ...params) {
  const stmt = getDb().prepare(sql);
  bindAll(stmt, params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

export function all(sql, ...params) {
  const stmt = getDb().prepare(sql);
  bindAll(stmt, params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

let _dbPath = null;
export function setDbPath(p) { _dbPath = p; }
function saveDatabaseFromConfig() {
  if (_dbPath) saveDatabase(_dbPath);
}
```

- [ ] **Step 4: 在 `index.js` 接入数据库并暴露 health 详情**

修改 `packages/server/src/index.js` 头部：
```javascript
import express from 'express';
import { loadServerConfig } from './config.js';
import { initDatabase, getDb } from './db/index.js';
import { setDbPath } from './db/repository.js';

const config = loadServerConfig();
setDbPath(config.dbPath);
await initDatabase({ dbPath: config.dbPath });

const app = express();
app.get('/health', (req, res) => {
  const usersCount = getDb().exec('SELECT COUNT(*) as c FROM users')[0]?.values[0]?.[0] || 0;
  res.json({ ok: true, service: '@agnes/server', users: Number(usersCount) });
});
// ... 其余保持
```

- [ ] **Step 5: 验证**

Run: `cd d:/projects/my_project/agnes-client/packages/server && pnpm dev`
Then: `curl http://localhost:3100/health` 返回 `{"ok":true,"service":"@agnes/server","users":0}`
停止。删除 `packages/server/data/agnes.db` 防止污染。

- [ ] **Step 6: 提交**

```bash
git add packages/server/src/db/
git commit -m "feat(server): add sql.js init with openid-ready schema"
```

---

### Task A.4: 中间件（auth + error + logger）

**Files:**
- Create: `packages/server/src/middleware/auth.js`
- Create: `packages/server/src/middleware/error.js`
- Create: `packages/server/src/middleware/logger.js`
- Create: `packages/server/src/utils/logger.js`
- Create: `packages/server/src/utils/env.js`

- [ ] **Step 1: 编写 `packages/server/src/utils/logger.js`**

```javascript
const ts = () => new Date().toISOString();
export const logger = {
  info: (...a) => console.log(`[${ts()}] [info]`, ...a),
  warn: (...a) => console.warn(`[${ts()}] [warn]`, ...a),
  error: (...a) => console.error(`[${ts()}] [error]`, ...a)
};
```

- [ ] **Step 2: 编写 `packages/server/src/utils/env.js`**

```javascript
export const isProd = () => process.env.NODE_ENV === 'production';
```

- [ ] **Step 3: 编写 `packages/server/src/middleware/logger.js`**

```javascript
import { logger } from '../utils/logger.js';
export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}
```

- [ ] **Step 4: 编写 `packages/server/src/middleware/auth.js`**

```javascript
import jwt from 'jsonwebtoken';

let _jwtSecret = 'agnes-server-secret-change-in-production';
export function setJwtSecret(s) { _jwtSecret = s; }
export const JWT_SECRET = () => _jwtSecret;

export function authMiddleware(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录，请先登录' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET());
    req.userId = decoded.userId;
    req.openid = decoded.openid;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: '登录已过期，请重新登录' });
    return res.status(401).json({ error: '无效的登录凭证' });
  }
}

export function optionalAuth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET());
    req.userId = decoded.userId;
    req.openid = decoded.openid;
  } catch {}
  next();
}

// 小程序 openid 鉴权（预留）：传 X-Client-Id + X-Openid 头
export function clientIdMiddleware(req, res, next) {
  req.clientId = req.headers['x-client-id'] || null;
  req.openidHeader = req.headers['x-openid'] || null;
  next();
}
```

- [ ] **Step 5: 编写 `packages/server/src/middleware/error.js`**

```javascript
import { logger } from '../utils/logger.js';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  logger.error(`${req.method} ${req.url} → ${status}`, err.message, err.stack);
  res.status(status).json({ error: err.message || '服务器错误', details: err.details });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not Found', path: req.url });
}
```

- [ ] **Step 6: 在 `index.js` 注册中间件**

在 `packages/server/src/index.js` 中，`app.get('/health')` 之前插入：
```javascript
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { requestLogger } from './middleware/logger.js';
import { setJwtSecret } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { isProd } from './utils/env.js';

setJwtSecret(config.jwtSecret);

app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));
app.use(express.json({ limit: '200mb' }));
app.use(cookieParser());
app.use(requestLogger);
```

并在 `app.listen` 之前追加：
```javascript
app.use(notFoundHandler);
app.use(errorHandler);
```

- [ ] **Step 7: 提交**

```bash
git add packages/server/src/middleware packages/server/src/utils
git commit -m "feat(server): add auth, error, logger middleware"
```

---

### Task A.5: Agnes 客户端服务 + 流式工具

**Files:**
- Create: `packages/server/src/services/agnes.js`
- Create: `packages/server/src/services/stream.js`

**Interfaces:**
- `getAgnesClient()` → `AgnesClient`（懒加载单例）
- `writeSse(res, event, data)` → void
- `streamChat({ req, res, model, messages, ...opts, onStart, onEnd, onError })` → Promise<void>

- [ ] **Step 1: 编写 `packages/server/src/services/agnes.js`**

```javascript
import { AgnesClient } from '@agnes/core';

let _client = null;
let _config = null;

export function setAgnesConfig(cfg) { _config = cfg; _client = null; }

export function getAgnesClient() {
  if (!_client && _config) _client = new AgnesClient(_config);
  if (!_client) throw new Error('AgnesClient not initialized. Call setAgnesConfig first.');
  return _client;
}
```

- [ ] **Step 2: 编写 `packages/server/src/services/stream.js`**

```javascript
import { logger } from '../utils/logger.js';

export function setupSseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
}

export function writeSse(res, event, data) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  res.write(`event: ${event}\ndata: ${payload}\n\n`);
}

export function endSse(res) {
  res.write('event: end\ndata: [DONE]\n\n');
  res.end();
}

export async function streamChat({ req, res, client, params, onStart, onEnd, onError }) {
  setupSseHeaders(res);
  if (onStart) await onStart();
  try {
    const stream = await client.chat({ ...params, stream: true });
    let aborted = false;
    req.on('close', () => { aborted = true; });

    for await (const chunk of stream) {
      if (aborted) break;
      res.write(chunk);
    }
    if (onEnd) await onEnd({ aborted });
  } catch (err) {
    logger.error('streamChat error', err);
    if (onError) await onError(err);
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
}
```

- [ ] **Step 3: 在 `index.js` 注入配置**

在 `packages/server/src/index.js` 顶部追加：
```javascript
import { setAgnesConfig } from './services/agnes.js';
setAgnesConfig(config.agnesConfig);
```

- [ ] **Step 4: 提交**

```bash
git add packages/server/src/services
git commit -m "feat(server): add Agnes client and SSE stream utilities"
```

---

### Task A.6: auth 路由（注册/登录/登出/me）

**Files:**
- Create: `packages/server/src/routes/auth.js`

- [ ] **Step 1: 编写 `packages/server/src/routes/auth.js`**

```javascript
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, run } from '../db/repository.js';
import { authMiddleware, JWT_SECRET } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { isProd } from '../utils/env.js';

const router = express.Router();
const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd(),
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
};

function sign(payload) {
  return jwt.sign(payload, JWT_SECRET(), { expiresIn: '7d' });
}

router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) throw new HttpError(400, '请填写所有必填字段');
    if (password.length < 6) throw new HttpError(400, '密码长度至少为6位');
    const exist = get('SELECT id FROM users WHERE username = ? OR email = ?', username, email);
    if (exist) throw new HttpError(400, '用户名或邮箱已被注册');
    const hash = await bcrypt.hash(password, 10);
    run('INSERT INTO users (username, email, password_hash, points) VALUES (?, ?, ?, 100)', username, email, hash);
    const id = get('SELECT last_insert_rowid() as id').id;
    const token = sign({ userId: id, username });
    res.cookie('token', token, COOKIE_OPTS);
    res.json({ ok: true, user: { id, username, email, points: 100 } });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) throw new HttpError(400, '请填写用户名和密码');
    const user = get('SELECT * FROM users WHERE username = ? OR email = ?', username, username);
    if (!user) throw new HttpError(401, '用户名或密码错误');
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new HttpError(401, '用户名或密码错误');
    const token = sign({ userId: user.id, username: user.username });
    res.cookie('token', token, COOKIE_OPTS);
    res.json({ ok: true, user: { id: user.id, username: user.username, email: user.email, nickname: user.nickname, avatar: user.avatar, points: user.points } });
  } catch (e) { next(e); }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', authMiddleware, (req, res, next) => {
  try {
    const user = get('SELECT id, username, email, nickname, avatar, points, openid, created_at FROM users WHERE id = ?', req.userId);
    if (!user) throw new HttpError(404, '用户不存在');
    res.json({ user });
  } catch (e) { next(e); }
});

export default router;
```

- [ ] **Step 2: 在 `index.js` 注册**

```javascript
import authRoutes from './routes/auth.js';
// ...
app.use('/api/auth', authRoutes);
```

- [ ] **Step 3: 提交**

```bash
git add packages/server/src/routes/auth.js packages/server/src/index.js
git commit -m "feat(server): add auth routes (register/login/logout/me)"
```

---

### Task A.7: user 路由（资料/头像）

**Files:**
- Create: `packages/server/src/routes/user.js`

- [ ] **Step 1: 编写 `packages/server/src/routes/user.js`**

```javascript
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { get, run } from '../db/repository.js';
import { authMiddleware } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = path.join(__dirname, '../../data/avatars');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: AVATAR_DIR,
    filename: (req, file, cb) => cb(null, `${nanoid()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const router = express.Router();
router.use(authMiddleware);

router.get('/profile', (req, res, next) => {
  try {
    const u = get('SELECT id, username, email, nickname, avatar, points, openid FROM users WHERE id = ?', req.userId);
    if (!u) throw new HttpError(404, '用户不存在');
    res.json({ user: u });
  } catch (e) { next(e); }
});

router.put('/profile', (req, res, next) => {
  try {
    const { nickname } = req.body || {};
    if (typeof nickname !== 'string') throw new HttpError(400, '昵称无效');
    run('UPDATE users SET nickname = ? WHERE id = ?', nickname, req.userId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/avatar', upload.single('avatar'), (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, '未上传文件');
    const url = `/avatars/${req.file.filename}`;
    run('UPDATE users SET avatar = ? WHERE id = ?', url, req.userId);
    res.json({ ok: true, avatar: url });
  } catch (e) { next(e); }
});

export default router;
```

- [ ] **Step 2: 注册路由 + 静态文件**

在 `index.js` 追加：
```javascript
import userRoutes from './routes/user.js';
// ...
app.use('/api/user', userRoutes);
app.use('/avatars', express.static(AVATAR_DIR));
```
并在 `user.js` 顶部 `import` 之后导出 `AVATAR_DIR`（或者在 index.js 中重新计算路径）。建议在 `index.js` 中：
```javascript
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = path.join(__dirname, 'data/avatars');
app.use('/avatars', express.static(AVATAR_DIR));
```

- [ ] **Step 3: 提交**

```bash
git add packages/server/src/routes/user.js packages/server/src/index.js
git commit -m "feat(server): add user routes (profile/avatar)"
```

---

### Task A.8: 积分服务（业务逻辑层）

**Files:**
- Create: `packages/server/src/services/points.js`

**Interfaces:**
- `getBalance(userIdOrClientId)` → number
- `getCheckinStatus(userIdOrClientId)` → boolean
- `checkin(userIdOrClientId)` → `{ points, earned }`
- `getHistory(userIdOrClientId)` → array
- `deduct({ userId, clientId, type, cost })` → `{ ok, balance }`
- `refund({ userId, clientId, logId })` → void

- [ ] **Step 1: 编写 `packages/server/src/services/points.js`**

```javascript
import { get, run, all } from '../db/repository.js';
import { HttpError } from '../middleware/error.js';

const COST = { text: 1, image: 1, video: 10 };
const CHECKIN_REWARD = 10;

function whereByOwner(owner) {
  if (owner.userId) return { col: 'user_id', val: owner.userId };
  if (owner.clientId) return { col: 'client_id', val: owner.clientId };
  throw new HttpError(400, '缺少 userId 或 clientId');
}

export function getBalance(owner) {
  const { col, val } = whereByOwner(owner);
  if (col === 'user_id') {
    const u = get('SELECT points FROM users WHERE id = ?', val);
    return u?.points || 0;
  }
  // 小程序本地模式：服务端不做积分持久化（小程序自行本地存储）
  return 0;
}

export function getCheckinStatus(owner) {
  const today = new Date().toISOString().split('T')[0];
  if (owner.userId) {
    return !!get('SELECT id FROM checkins WHERE user_id = ? AND checkin_date = ?', owner.userId, today);
  }
  return false;
}

export function checkin(owner) {
  if (!owner.userId) throw new HttpError(400, '签到需要登录');
  const today = new Date().toISOString().split('T')[0];
  const exist = get('SELECT id FROM checkins WHERE user_id = ? AND checkin_date = ?', owner.userId, today);
  if (exist) throw new HttpError(400, '今日已签到，明天再来吧！');
  run('INSERT INTO checkins (user_id, checkin_date, points_earned) VALUES (?, ?, ?)', owner.userId, today, CHECKIN_REWARD);
  run('UPDATE users SET points = points + ? WHERE id = ?', CHECKIN_REWARD, owner.userId);
  const u = get('SELECT points FROM users WHERE id = ?', owner.userId);
  return { points: u.points, earned: CHECKIN_REWARD };
}

export function getHistory(owner) {
  if (!owner.userId) return [];
  const checkins = all(`
    SELECT checkin_date as date, points_earned as points, 'checkin' as type
    FROM checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 30
  `, owner.userId);
  const gens = all(`
    SELECT DATE(created_at) as date, cost_points as points, type, status
    FROM generation_logs WHERE user_id = ? AND status = 'completed'
    ORDER BY created_at DESC LIMIT 30
  `, owner.userId).map(g => ({
    date: g.date,
    points: -g.points,
    type: g.type
  }));
  return [...checkins, ...gens].sort((a, b) => b.date.localeCompare(a.date));
}

export function deduct({ owner, type }) {
  const cost = COST[type] ?? 0;
  if (owner.userId) {
    const u = get('SELECT points FROM users WHERE id = ?', owner.userId);
    if ((u?.points || 0) < cost) throw new HttpError(402, `积分不足，需要 ${cost} 积分`);
    run('UPDATE users SET points = points - ? WHERE id = ?', cost, owner.userId);
  }
  // 小程序本地：扣除由前端处理；服务端只记账
  const { lastInsertRowid } = run(
    'INSERT INTO generation_logs (user_id, client_id, type, cost_points, status) VALUES (?, ?, ?, ?, ?)',
    owner.userId || null, owner.clientId || null, type, cost, 'processing'
  );
  return { logId: lastInsertRowid, cost };
}

export function completeLog(logId, resultJson) {
  run("UPDATE generation_logs SET status = 'completed', result = ?, completed_at = datetime('now') WHERE id = ?",
    resultJson ? JSON.stringify(resultJson) : null, logId);
}

export function failLog(logId) {
  run("UPDATE generation_logs SET status = 'failed', completed_at = datetime('now') WHERE id = ?", logId);
}

export function refund(logId) {
  const log = get('SELECT user_id, cost_points, type, status FROM generation_logs WHERE id = ?', logId);
  if (!log || log.status !== 'failed' || !log.user_id) return;
  run('UPDATE users SET points = points + ? WHERE id = ?', log.cost_points, log.user_id);
  run("UPDATE generation_logs SET status = 'refunded' WHERE id = ?", logId);
}

export { COST };
```

- [ ] **Step 2: 提交**

```bash
git add packages/server/src/services/points.js
git commit -m "feat(server): add points business logic with client_id support"
```

---

### Task A.9: points 路由

**Files:**
- Create: `packages/server/src/routes/points.js`

- [ ] **Step 1: 编写 `packages/server/src/routes/points.js`**

```javascript
import express from 'express';
import { authMiddleware, clientIdMiddleware } from '../middleware/auth.js';
import * as pts from '../services/points.js';
import { HttpError } from '../middleware/error.js';

const router = express.Router();
router.use(clientIdMiddleware);
router.use(authMiddleware);

const ownerFromReq = (req) => ({ userId: req.userId, clientId: req.clientId });

router.get('/', (req, res, next) => {
  try { res.json({ points: pts.getBalance(ownerFromReq(req)) }); }
  catch (e) { next(e); }
});

router.get('/checkin-status', (req, res, next) => {
  try { res.json({ checkedIn: pts.getCheckinStatus(ownerFromReq(req)) }); }
  catch (e) { next(e); }
});

router.post('/checkin', (req, res, next) => {
  try {
    const r = pts.checkin(ownerFromReq(req));
    res.json({ ok: true, points: r.points, earned: r.earned, message: `签到成功！获得 ${r.earned} 积分` });
  } catch (e) { next(e); }
});

router.get('/history', (req, res, next) => {
  try { res.json({ history: pts.getHistory(ownerFromReq(req)) }); }
  catch (e) { next(e); }
});

export default router;
```

- [ ] **Step 2: 注册路由**

在 `index.js`：
```javascript
import pointsRoutes from './routes/points.js';
// ...
app.use('/api/points', pointsRoutes);
```

- [ ] **Step 3: 提交**

```bash
git add packages/server/src/routes/points.js packages/server/src/index.js
git commit -m "feat(server): add points routes"
```

---

### Task A.10: text 路由（生成 + 流式）

**Files:**
- Create: `packages/server/src/routes/text.js`

- [ ] **Step 1: 编写 `packages/server/src/routes/text.js`**

```javascript
import express from 'express';
import { authMiddleware, clientIdMiddleware } from '../middleware/auth.js';
import { getAgnesClient } from '../services/agnes.js';
import * as pts from '../services/points.js';
import { setupSseHeaders, writeSse, endSse } from '../services/stream.js';
import { HttpError } from '../middleware/error.js';

const router = express.Router();
router.use(clientIdMiddleware);
router.use(authMiddleware);

const owner = (req) => ({ userId: req.userId, clientId: req.clientId });

router.post('/generate', async (req, res, next) => {
  try {
    const { model, messages, stream, temperature, maxTokens, thinking } = req.body || {};
    if (!messages || !Array.isArray(messages)) throw new HttpError(400, '请提供有效的对话消息');

    const own = owner(req);
    const { logId } = pts.deduct({ owner: own, type: 'text' });

    const client = getAgnesClient();

    if (stream) {
      setupSseHeaders(res);
      let aborted = false;
      req.on('close', () => { aborted = true; });
      try {
        const it = await client.chat({ model, messages, stream: true, temperature, maxTokens, thinking });
        for await (const chunk of it) {
          if (aborted) break;
          res.write(chunk);
        }
        pts.completeLog(logId);
        endSse(res);
      } catch (err) {
        pts.failLog(logId);
        pts.refund(logId);
        if (!aborted) writeSse(res, 'error', { error: err.message });
        res.end();
      }
    } else {
      try {
        const result = await client.chat({ model, messages, stream: false, temperature, maxTokens, thinking });
        pts.completeLog(logId, result);
        res.json(result);
      } catch (err) {
        pts.failLog(logId);
        pts.refund(logId);
        throw err;
      }
    }
  } catch (e) { next(e); }
});

export default router;
```

- [ ] **Step 2: 注册路由**

```javascript
import textRoutes from './routes/text.js';
app.use('/api/text', textRoutes);
```

- [ ] **Step 3: 提交**

```bash
git add packages/server/src/routes/text.js packages/server/src/index.js
git commit -m "feat(server): add text generation route with SSE streaming"
```

---

### Task A.11: image 路由

**Files:**
- Create: `packages/server/src/routes/image.js`

- [ ] **Step 1: 编写 `packages/server/src/routes/image.js`**

```javascript
import express from 'express';
import { authMiddleware, clientIdMiddleware } from '../middleware/auth.js';
import { getAgnesClient } from '../services/agnes.js';
import * as pts from '../services/points.js';
import { HttpError } from '../middleware/error.js';

const router = express.Router();
router.use(clientIdMiddleware);
router.use(authMiddleware);

router.post('/generate', async (req, res, next) => {
  try {
    const { model, prompt, size, n, image } = req.body || {};
    if (!prompt) throw new HttpError(400, '请提供提示词');
    const own = { userId: req.userId, clientId: req.clientId };
    const { logId } = pts.deduct({ owner: own, type: 'image' });
    try {
      const client = getAgnesClient();
      const result = await client.generateImage({ model: model || 'agnes-image-2.1-flash', prompt, size, n, image });
      pts.completeLog(logId, result);
      res.json(result);
    } catch (err) {
      pts.failLog(logId);
      pts.refund(logId);
      throw err;
    }
  } catch (e) { next(e); }
});

export default router;
```

- [ ] **Step 2: 注册路由 + 提交**

```bash
git add packages/server/src/routes/image.js packages/server/src/index.js
git commit -m "feat(server): add image generation route"
```

---

### Task A.12: video 路由

**Files:**
- Create: `packages/server/src/routes/video.js`

- [ ] **Step 1: 编写 `packages/server/src/routes/video.js`**

```javascript
import express from 'express';
import { authMiddleware, clientIdMiddleware } from '../middleware/auth.js';
import { getAgnesClient } from '../services/agnes.js';
import * as pts from '../services/points.js';
import { HttpError } from '../middleware/error.js';

const router = express.Router();
router.use(clientIdMiddleware);
router.use(authMiddleware);

router.post('/generate', async (req, res, next) => {
  try {
    const { model, prompt, image, width, height } = req.body || {};
    if (!prompt && !image) throw new HttpError(400, '请提供提示词或参考图');
    const own = { userId: req.userId, clientId: req.clientId };
    const { logId } = pts.deduct({ owner: own, type: 'video' });
    try {
      const client = getAgnesClient();
      const task = await client.createVideo({ model: model || 'agnes-video-v2.0', prompt, image, width, height });
      pts.completeLog(logId, task);
      res.json(task);
    } catch (err) {
      pts.failLog(logId);
      pts.refund(logId);
      throw err;
    }
  } catch (e) { next(e); }
});

router.get('/status/:id', async (req, res, next) => {
  try {
    const client = getAgnesClient();
    const status = await client.getVideoStatus(req.params.id);
    res.json(status);
  } catch (e) { next(e); }
});

export default router;
```

> 依赖：`AgnesClient.getVideoStatus(id)` 方法。如 `@agnes/core` 暂未提供，需先在 `packages/core/src/client.js` 添加该方法（独立小任务）。

- [ ] **Step 2: 注册路由 + 提交**

```bash
git add packages/server/src/routes/video.js packages/server/src/index.js
git commit -m "feat(server): add video generation routes"
```

---

### Task A.13: config 路由

**Files:**
- Create: `packages/server/src/routes/config.js`

- [ ] **Step 1: 编写 `packages/server/src/routes/config.js`**

```javascript
import express from 'express';
import fs from 'fs';
import path from 'path';
import { saveConfig } from '@agnes/core';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

function findConfigPath() {
  // 与 webui 一致：根目录 agnes.config.json
  return path.resolve(process.cwd(), '../../agnes.config.json');
}

router.get('/', (req, res, next) => {
  try {
    const p = findConfigPath();
    if (!fs.existsSync(p)) return res.json({ config: null });
    const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const { apiKey, ...safe } = cfg;
    res.json({ config: safe });
  } catch (e) { next(e); }
});

router.post('/', (req, res, next) => {
  try {
    const p = findConfigPath();
    const cur = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : {};
    const next = { ...cur, ...req.body };
    saveConfig(p, next);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
```

- [ ] **Step 2: 注册路由 + 提交**

```bash
git add packages/server/src/routes/config.js packages/server/src/index.js
git commit -m "feat(server): add config read/write routes"
```

---

### Task A.14: workflow 路由（从 workflow/server.cjs 抽离）

**Files:**
- Read: `packages/workflow/server.cjs`
- Create: `packages/server/src/routes/workflow.js`

- [ ] **Step 1: 阅读 `packages/workflow/server.cjs`**

了解其端点（典型为 `/api/workflow/run`、`/api/workflow/list`、`/api/workflow/get` 等）。将原 handler 逐个迁移到 Express Router。如 endpoint 不一致，**保持与原 cjs 完全一致**以避免破坏现有 workflow 前端。

- [ ] **Step 2: 编写 `packages/server/src/routes/workflow.js`**

> 实际代码需基于 `server.cjs` 内容迁移。下面是模板，按实际情况增删端点：

```javascript
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware, clientIdMiddleware } from '../middleware/auth.js';
import { getAgnesClient } from '../services/agnes.js';
import { HttpError } from '../middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOW_DIR = path.join(__dirname, '../../../workflow/src');
// 保持与原 workflow/server.cjs 路径解析一致

const router = express.Router();
router.use(clientIdMiddleware);
router.use(authMiddleware);

// POST /api/workflow/run
router.post('/run', async (req, res, next) => {
  try {
    const { flowId, inputs } = req.body || {};
    // 加载 flow 文件并按节点执行（参考原 server.cjs 实现）
    // 这里保留原逻辑，必要时调用 getAgnesClient()
    const client = getAgnesClient();
    // ... TODO 迁移具体节点执行逻辑
    res.json({ ok: true, result: {} });
  } catch (e) { next(e); }
});

// GET /api/workflow/list
router.get('/list', (req, res, next) => {
  try {
    // 扫描 WORKFLOW_DIR 下的 flow 文件
    res.json({ flows: [] });
  } catch (e) { next(e); }
});

export default router;
```

- [ ] **Step 3: 注册路由 + 提交**

```bash
git add packages/server/src/routes/workflow.js packages/server/src/index.js
git commit -m "feat(server): migrate workflow routes from workflow/server.cjs"
```

---

### Task A.15: openid 路由（占位）

**Files:**
- Create: `packages/server/src/routes/openid.js`

- [ ] **Step 1: 编写 `packages/server/src/routes/openid.js`**

```javascript
import express from 'express';
import { get, run } from '../db/repository.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = express.Router();

// 预留：未来对接微信小程序 code2Session
router.post('/login', async (req, res, next) => {
  try {
    const { code, nickname, avatar } = req.body || {};
    if (!code) throw new HttpError(400, '缺少 code');

    // TODO: 实际部署时调用微信 code2Session 换取 openid
    const mockOpenid = `mock_${code}`;
    let user = get('SELECT * FROM users WHERE openid = ?', mockOpenid);
    if (!user) {
      run('INSERT INTO users (openid, nickname, avatar, points) VALUES (?, ?, ?, 100)', mockOpenid, nickname || '微信用户', avatar || '');
      const id = get('SELECT last_insert_rowid() as id').id;
      user = { id, openid: mockOpenid, nickname: nickname || '微信用户', avatar: avatar || '', points: 100 };
    }
    const token = jwt.sign({ userId: user.id, openid: user.openid }, JWT_SECRET(), { expiresIn: '7d' });
    res.json({ ok: true, token, user });
  } catch (e) { next(e); }
});

export default router;
```

- [ ] **Step 2: 注册路由 + 提交**

```bash
git add packages/server/src/routes/openid.js packages/server/src/index.js
git commit -m "feat(server): add openid login route (placeholder)"
```

---

### Task A.16: 单元测试与集成测试

**Files:**
- Create: `packages/server/tests/unit/points.test.js`
- Create: `packages/server/tests/unit/auth.test.js`
- Create: `packages/server/tests/integration/text.test.js`

- [ ] **Step 1: 编写 `tests/unit/points.test.js`**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from '../../src/db/index.js';
import { setDbPath, run, get, all } from '../../src/db/repository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = path.join(__dirname, '../tmp/test.db');

test.before(async () => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  setDbPath(TEST_DB);
  await initDatabase({ dbPath: TEST_DB });
});

test('deduct decreases user points and records log', async () => {
  run("INSERT INTO users (username, email, password_hash, points) VALUES (?, ?, ?, 100)", 'u1', 'u1@x', 'h');
  const userId = get("SELECT id FROM users WHERE username = 'u1'").id;
  const { logId, cost } = await import('../../src/services/points.js').then(m => m.deduct({ owner: { userId }, type: 'text' }));
  assert.equal(cost, 1);
  assert.ok(logId > 0);
  const u = get('SELECT points FROM users WHERE id = ?', userId);
  assert.equal(u.points, 99);
});
```

- [ ] **Step 2: 编写 `tests/unit/auth.test.js`**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { setJwtSecret } from '../../src/middleware/auth.js';

test('setJwtSecret changes signing key', () => {
  setJwtSecret('k1');
  const t1 = jwt.sign({ u: 1 }, 'k1');
  setJwtSecret('k2');
  assert.throws(() => jwt.verify(t1, 'k2'));
});
```

- [ ] **Step 3: 编写 `tests/integration/text.test.js`（使用 supertest）**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.JWT_SECRET = 'test-secret';
process.env.PORT = '0';

const TEST_DB = path.join(__dirname, '../tmp/integ.db');
if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

const { setDbPath } = await import('../../src/db/repository.js');
setDbPath(TEST_DB);

const { app } = await import('../../src/index.js');

test('GET /health returns ok', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test('GET /api/points without auth → 401', async () => {
  const res = await request(app).get('/api/points');
  assert.equal(res.status, 401);
});
```

- [ ] **Step 4: 运行测试**

Run: `cd d:/projects/my_project/agnes-client/packages/server && pnpm test`
Expected: 全部通过

- [ ] **Step 5: 提交**

```bash
git add packages/server/tests
git commit -m "test(server): add points, auth, and integration tests"
```

---

### Task A.17: README 与启动脚本

**Files:**
- Create: `packages/server/README.md`
- Modify: `package.json` (根目录) — 添加 `dev:server2` 脚本（可选）

- [ ] **Step 1: 编写 `packages/server/README.md`**

```markdown
# @agnes/server

独立后端服务，集成自 `@agnes/webui` 与 `@agnes/workflow`。

## 启动

\`\`\`bash
pnpm install
pnpm dev   # 端口 3100
\`\`\`

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
```

- [ ] **Step 2: 提交**

```bash
git add packages/server/README.md
git commit -m "docs(server): add README"
```

---

### Task A.18: 手动冒烟测试

- [ ] **Step 1: 启动并跑通核心流**

Run:
```bash
cd d:/projects/my_project/agnes-client/packages/server
rm -f data/agnes.db
pnpm dev
```

另一终端：
```bash
# 注册
curl -X POST http://localhost:3100/api/auth/register -H "Content-Type: application/json" -d '{"username":"alice","email":"a@x.com","password":"123456"}' -c /tmp/c.txt
# me
curl http://localhost:3100/api/auth/me -b /tmp/c.txt
# 签到
curl -X POST http://localhost:3100/api/points/checkin -b /tmp/c.txt
# 文本生成（非流）
curl -X POST http://localhost:3100/api/text/generate -H "Content-Type: application/json" -b /tmp/c.txt -d '{"model":"agnes-2.0-flash","messages":[{"role":"user","content":"hi"}]}'
# 文本生成（流）
curl -N -X POST http://localhost:3100/api/text/generate -H "Content-Type: application/json" -b /tmp/c.txt -d '{"model":"agnes-2.0-flash","messages":[{"role":"user","content":"hi"}],"stream":true}'
```

Expected: 所有调用返回 200 / 合理业务响应

- [ ] **Step 2: 收尾**

停止服务；如数据需保留可保留 `data/agnes.db`，否则删除以保持测试环境干净。

---

### Task A.19: webui 渐进迁移（可选，本任务独立 PR）

**说明**: 此任务不强制与 mp 并行；建议作为单独迭代。其目的是让 `packages/webui/src/frontend` 通过环境变量切换到 `packages/server`。

**Files:**
- Modify: `packages/webui/src/frontend/vite.config.js`
- Modify: `packages/webui/src/frontend/src/lib/api.js`

- [ ] **Step 1: 在 `vite.config.js` 增加 baseURL 代理切换**

读取 `process.env.AGNES_SERVER_URL`（默认 `http://localhost:3000`）替换 proxy target。

- [ ] **Step 2: 在 `webui/src/frontend/.env` 添加 `VITE_API_BASE`**

```
VITE_API_BASE=/api
```

并修改 `api.js` 顶部：
```javascript
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
```

- [ ] **Step 3: 在 `webui/.env.example` 添加 `AGNES_SERVER_URL`**

- [ ] **Step 4: 提交**

```bash
git add packages/webui/src/frontend/vite.config.js packages/webui/src/frontend/src/lib/api.js
git commit -m "refactor(webui): support AGNES_SERVER_URL env for backend swap"
```

---

## Phase B: `packages/mp`（uniapp 小程序）

### 文件结构

```
packages/mp/
├── package.json                         # @agnes/mp
├── tsconfig.json
├── index.html                           # H5 入口
├── vite.config.ts                       # uniapp + unocss + plugins
├── uno.config.ts                        # Ditto 主题 + iconify
├── .env.development
├── .env.production
├── env.d.ts
├── src/
│   ├── main.ts                          # uniapp 入口
│   ├── App.vue                          # 根组件
│   ├── manifest.json                    # uniapp 应用配置
│   ├── pages.json                       # 页面路由
│   ├── uni.scss                         # 全局 SCSS 变量
│   ├── pages/                           # 文件系统路由
│   │   ├── index/
│   │   │   └── index.vue                # 首页
│   │   ├── text/
│   │   │   ├── index.vue                # 文本生成主页
│   │   │   └── chat.vue                 # 多轮对话页（可选）
│   │   ├── image/
│   │   │   └── index.vue
│   │   ├── video/
│   │   │   └── index.vue
│   │   ├── points/
│   │   │   └── index.vue                # 积分与签到
│   │   ├── settings/
│   │   │   └── index.vue
│   │   └── profile/
│   │       └── index.vue
│   ├── components/                      # 通用组件
│   │   ├── AppButton.vue
│   │   ├── AppCard.vue
│   │   ├── AppInput.vue
│   │   ├── AppNavbar.vue
│   │   ├── AppTabbar.vue
│   │   ├── AppEmpty.vue
│   │   └── AppMessage.vue               # 消息气泡（文本生成）
│   ├── stores/                          # Pinia
│   │   ├── index.ts
│   │   ├── user.ts
│   │   ├── points.ts
│   │   ├── text.ts
│   │   ├── image.ts
│   │   └── video.ts
│   ├── composables/                     # 业务逻辑
│   │   ├── useRequest.ts
│   │   ├── useLocalPoints.ts
│   │   ├── useStreamText.ts
│   │   ├── useUpload.ts
│   │   └── useTheme.ts
│   ├── api/                             # 请求封装
│   │   ├── http.ts                      # uni.request 封装
│   │   ├── text.ts
│   │   ├── image.ts
│   │   ├── video.ts
│   │   ├── points.ts
│   │   └── types.ts
│   ├── utils/
│   │   ├── storage.ts
│   │   ├── platform.ts                  # #ifdef MP-WEIXIN 等
│   │   ├── format.ts
│   │   └── markdown.ts                  # 简易 MD 渲染（不引第三方）
│   └── styles/
│       └── tailwind-like.css            # 补充样式
├── src/static/                          # 静态资源
└── tests/                               # 可选：组件测试
```

---

### Task B.1: 脚手架 + package.json

**Files:**
- Create: `packages/mp/package.json`
- Create: `packages/mp/tsconfig.json`
- Create: `packages/mp/.gitignore`
- Create: `packages/mp/index.html`
- Create: `packages/mp/env.d.ts`
- Create: `packages/mp/.env.development`
- Create: `packages/mp/.env.production`

- [ ] **Step 1: 编写 `package.json`**

```json
{
  "name": "@agnes/mp",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev:h5": "uni",
    "dev:mp-weixin": "uni -p mp-weixin",
    "dev:mp-alipay": "uni -p mp-alipay",
    "dev:app": "uni -p app",
    "build:h5": "uni build",
    "build:mp-weixin": "uni build -p mp-weixin",
    "build:mp-alipay": "uni build -p mp-alipay",
    "build:app": "uni build -p app",
    "type-check": "vue-tsc --noEmit"
  },
  "dependencies": {
    "@dcloudio/uni-app": "3.0.0-4000020241024001",
    "@dcloudio/uni-app-plus": "3.0.0-4000020241024001",
    "@dcloudio/uni-components": "3.0.0-4000020241024001",
    "@dcloudio/uni-h5": "3.0.0-4000020241024001",
    "@dcloudio/uni-mp-weixin": "3.0.0-4000020241024001",
    "@dcloudio/uni-mp-alipay": "3.0.0-4000020241024001",
    "@dcloudio/uni-quickapp-webview": "3.0.0-4000020241024001",
    "pinia": "2.0.36",
    "vue": "3.4.21",
    "vue-i18n": "9.1.9"
  },
  "devDependencies": {
    "@dcloudio/types": "3.4.8",
    "@dcloudio/uni-automator": "3.0.0-4000020241024001",
    "@dcloudio/uni-cli-shared": "3.0.0-4000020241024001",
    "@dcloudio/uni-stacktracey": "3.0.0-4000020241024001",
    "@dcloudio/vite-plugin-uni": "3.0.0-4000020241024001",
    "@iconify-json/carbon": "^1.2.4",
    "@iconify-json/mdi": "^1.2.3",
    "@iconify-json/ph": "^1.1.0",
    "@types/node": "^22.10.0",
    "@unocss/preset-icons": "^0.60.0",
    "@unocss/preset-uno": "^0.60.0",
    "@unocss/preset-web-fonts": "^0.60.0",
    "@unocss/transformer-directives": "^0.60.0",
    "unocss": "^0.60.0",
    "unplugin-auto-import": "^0.18.0",
    "vite": "^5.0.0",
    "vue-macros": "^2.0.0",
    "vue-tsc": "^2.0.0"
  },
  "volta": {
    "node": "24.14.0",
    "pnpm": "10.33.4"
  }
}
```

> 注：实际版本号以 uniapp 官方最新稳定版为准；执行时若 `pnpm install` 报错，按需调整版本。

- [ ] **Step 2: 编写 `tsconfig.json`**

```json
{
  "extends": "@vue/tsconfig/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["@dcloudio/types", "vite/client"]
  },
  "vueCompilerOptions": {
    "plugins": ["vue-macros/volar"]
  },
  "include": ["src/**/*", "env.d.ts"]
}
```

- [ ] **Step 3: 编写 `index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no" />
  <title>@agnes/mp</title>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
    });
  </script>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 4: 编写 `env.d.ts`**

```typescript
/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
```

- [ ] **Step 5: 编写 `.env.development` / `.env.production`**

`.env.development`:
```
VITE_API_BASE=http://localhost:3100/api
VITE_APP_TITLE=Agnes MP Dev
```

`.env.production`:
```
VITE_API_BASE=https://api.example.com/api
VITE_APP_TITLE=Agnes
```

- [ ] **Step 6: `.gitignore`**

```
node_modules/
dist/
unpackage/
.env.local
```

- [ ] **Step 7: 安装**

Run: `cd d:/projects/my_project/agnes-client && pnpm install`
Expected: 工作区包安装成功

- [ ] **Step 8: 提交**

```bash
git add packages/mp/package.json packages/mp/tsconfig.json packages/mp/index.html packages/mp/env.d.ts packages/mp/.env.* packages/mp/.gitignore pnpm-lock.yaml
git commit -m "feat(mp): scaffold uniapp + vite + ts project"
```

---

### Task B.2: vite.config.ts — 集成 unocss、auto-import、vue-macros

**Files:**
- Create: `packages/mp/vite.config.ts`

- [ ] **Step 1: 编写 `vite.config.ts`**

```typescript
import { defineConfig, loadEnv } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import UnoCSS from 'unocss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import VueMacros from 'vue-macros/vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      VueMacros({
        defineModels: true,
        defineProps: true,
        hoistStatic: true,
        reactivityTransform: true
      }),
      uni(),
      AutoImport({
        imports: ['vue', 'pinia'],
        dts: 'src/auto-imports.d.ts',
        eslintrc: { enabled: false }
      }),
      UnoCSS()
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') }
    },
    define: {
      __APP_ENV__: JSON.stringify(env)
    }
  };
});
```

- [ ] **Step 2: 提交**

```bash
git add packages/mp/vite.config.ts
git commit -m "feat(mp): integrate uniapp, unocss, auto-import, vue-macros"
```

---

### Task B.3: UnoCSS 配置 — Ditto 主题 + iconify

**Files:**
- Create: `packages/mp/uno.config.ts`

- [ ] **Step 1: 编写 `uno.config.ts`**

```typescript
import { defineConfig, presetUno, presetIcons, presetWebFonts, transformerDirectives } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      collections: {
        carbon: () => import('@iconify-json/carbon/icons.json').then(i => i.default),
        mdi: () => import('@iconify-json/mdi/icons.json').then(i => i.default),
        ph: () => import('@iconify-json/ph/icons.json').then(i => i.default)
      }
    }),
    presetWebFonts({
      provider: 'google',
      fonts: {
        sans: 'Inter:400,500,600,700',
        serif: 'DM Serif Display'
      }
    })
  ],
  theme: {
    colors: {
      canvas: '#f9fbf2',
      meadow: '#eff2e5',
      ink: '#130e30',
      yellow: '#ffe228',
      green: '#59e25d',
      fuchsia: '#e261e5',
      slate: '#5f5c6e',
      pearl: '#ffffff',
      violet: '#5046e4'
    },
    fontFamily: {
      serif: '"DM Serif Display", ui-serif, Georgia, serif',
      sans: 'Inter, ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    }
  },
  shortcuts: [
    ['page', 'bg-canvas text-ink min-h-screen'],
    ['card', 'bg-meadow rounded-3xl p-6 border border-ink/10'],
    ['card-hover', 'bg-meadow rounded-3xl p-6 border border-ink/10 transition-all duration-200 hover:shadow-lg'],
    ['btn-primary', 'bg-yellow text-ink font-medium px-6 py-3 rounded-full transition-all duration-200 active:opacity-80 disabled:opacity-50'],
    ['btn-secondary', 'bg-ink text-pearl font-medium px-6 py-3 rounded-full transition-all duration-200 active:opacity-80'],
    ['btn-ghost', 'bg-transparent text-slate font-medium px-4 py-2 rounded-full border border-ink/15 transition-all duration-200'],
    ['input-base', 'w-full bg-pearl text-ink placeholder-slate px-4 py-3 rounded-xl border border-ink/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow'],
    ['link', 'text-ink hover:text-slate transition-colors'],
    ['gradient-text', 'bg-gradient-to-r from-ink to-violet bg-clip-text text-transparent'],
    ['nav-pill', 'bg-meadow rounded-full px-6 py-2']
  ],
  transformers: [transformerDirectives()]
});
```

- [ ] **Step 2: 在 main.ts 注入 unocss**

见 Task B.5。

- [ ] **Step 3: 提交**

```bash
git add packages/mp/uno.config.ts
git commit -m "feat(mp): configure unocss with ditto theme and iconify"
```

---

### Task B.4: main.ts + App.vue + manifest.json + pages.json

**Files:**
- Create: `packages/mp/src/main.ts`
- Create: `packages/mp/src/App.vue`
- Create: `packages/mp/src/manifest.json`
- Create: `packages/mp/src/pages.json`
- Create: `packages/mp/src/uni.scss`

- [ ] **Step 1: 编写 `src/manifest.json`**

```json
{
  "name": "Agnes MP",
  "appid": "__UNI__AGNESMP",
  "description": "Agnes AI 多端小程序",
  "versionName": "1.0.0",
  "versionCode": "100",
  "transformPx": false,
  "app-plus": {
    "usingComponents": true,
    "nvueStyleCompiler": "uni-app",
    "compilerVersion": 3,
    "splashscreen": { "alwaysShowBeforeRender": true, "waiting": true, "autoclose": true, "delay": 0 },
    "modules": {},
    "distribute": {
      "android": { "permissions": ["<uses-permission android:name=\"android.permission.INTERNET\"/>"] },
      "ios": {},
      "sdkConfigs": {}
    }
  },
  "quickapp": {},
  "mp-weixin": {
    "appid": "wxPLACEHOLDER",
    "setting": { "urlCheck": false, "es6": true, "minified": true },
    "usingComponents": true
  },
  "mp-alipay": {
    "usingComponents": true
  },
  "h5": {
    "title": "Agnes",
    "router": { "mode": "history", "base": "/" },
    "devServer": { "port": 9000, "https": false }
  },
  "vueVersion": "3"
}
```

- [ ] **Step 2: 编写 `src/pages.json`**

```json
{
  "easycom": { "autoscan": true, "custom": { "^app-(.*)": "@/components/App$1.vue" } },
  "pages": [
    { "path": "pages/index/index", "style": { "navigationBarTitleText": "Agnes", "navigationStyle": "custom" } },
    { "path": "pages/text/index", "style": { "navigationBarTitleText": "文本生成" } },
    { "path": "pages/image/index", "style": { "navigationBarTitleText": "图片生成" } },
    { "path": "pages/video/index", "style": { "navigationBarTitleText": "视频生成" } },
    { "path": "pages/points/index", "style": { "navigationBarTitleText": "积分" } },
    { "path": "pages/settings/index", "style": { "navigationBarTitleText": "设置" } },
    { "path": "pages/profile/index", "style": { "navigationBarTitleText": "我的" } }
  ],
  "tabBar": {
    "color": "#5f5c6e",
    "selectedColor": "#130e30",
    "backgroundColor": "#eff2e5",
    "borderStyle": "white",
    "list": [
      { "pagePath": "pages/index/index", "iconPath": "static/tab/home.png", "selectedIconPath": "static/tab/home_a.png", "text": "首页" },
      { "pagePath": "pages/text/index", "iconPath": "static/tab/text.png", "selectedIconPath": "static/tab/text_a.png", "text": "文本" },
      { "pagePath": "pages/image/index", "iconPath": "static/tab/image.png", "selectedIconPath": "static/tab/image_a.png", "text": "图片" },
      { "pagePath": "pages/profile/index", "iconPath": "static/tab/me.png", "selectedIconPath": "static/tab/me_a.png", "text": "我的" }
    ]
  },
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "Agnes",
    "navigationBarBackgroundColor": "#f9fbf2",
    "backgroundColor": "#f9fbf2"
  }
}
```

> tabBar 图标在 `src/static/tab/*.png` 中提供；若暂未提供可改用 iconfont 占位。

- [ ] **Step 3: 编写 `src/uni.scss`**

```scss
/* Ditto tokens —— 与 unocss theme 保持一致 */
$uni-color-primary: #130e30;
$uni-color-accent: #ffe228;
$uni-bg-canvas: #f9fbf2;
$uni-bg-card: #eff2e5;
$uni-text-muted: #5f5c6e;
$uni-radius-pill: 1440px;
$uni-radius-card: 24px;
```

- [ ] **Step 4: 编写 `src/App.vue`**

```vue
<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app';

onLaunch(() => {
  console.log('Agnes MP launched');
});

onShow(() => {
  // 应用进入前台
});
</script>

<style lang="scss">
@import './uni.scss';
</style>
```

- [ ] **Step 5: 编写 `src/main.ts`**

```typescript
import { createSSRApp } from 'vue';
import { createPinia } from 'pinia';
import 'virtual:uno.css';
import App from './App.vue';

export function createApp() {
  const app = createSSRApp(App);
  app.use(createPinia());
  return { app };
}
```

- [ ] **Step 6: 提交**

```bash
git add packages/mp/src/main.ts packages/mp/src/App.vue packages/mp/src/manifest.json packages/mp/src/pages.json packages/mp/src/uni.scss
git commit -m "feat(mp): add app entry, manifest, pages, scss tokens"
```

---

### Task B.5: 工具与平台判断

**Files:**
- Create: `packages/mp/src/utils/storage.ts`
- Create: `packages/mp/src/utils/platform.ts`
- Create: `packages/mp/src/utils/format.ts`
- Create: `packages/mp/src/utils/markdown.ts`

- [ ] **Step 1: 编写 `utils/storage.ts`**

```typescript
const PREFIX = 'agnes_mp_';

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = uni.getStorageSync(PREFIX + key);
      return v === '' || v === null || v === undefined ? fallback : (v as T);
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    try { uni.setStorageSync(PREFIX + key, value); } catch {}
  },
  remove(key: string): void {
    try { uni.removeStorageSync(PREFIX + key); } catch {}
  }
};
```

- [ ] **Step 2: 编写 `utils/platform.ts`**

```typescript
export const isMpWeixin = () => typeof uni !== 'undefined' && !!uni.getSystemInfoSync && (uni.getSystemInfoSync().platform === 'mp-weixin');
export const isMpAlipay = () => typeof uni !== 'undefined' && !!uni.getSystemInfoSync && (uni.getSystemInfoSync().platform === 'mp-alipay');
export const isH5 = () => typeof window !== 'undefined' && typeof document !== 'undefined';
export const isApp = () => typeof uni !== 'undefined' && !!uni.getSystemInfoSync && (uni.getSystemInfoSync().platform === 'app' || uni.getSystemInfoSync().platform === 'app-plus');

export function getClientId(): string {
  let id = storage.get<string>('client_id', '');
  if (!id) {
    id = 'cid_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    storage.set('client_id', id);
  }
  return id;
}
```

- [ ] **Step 3: 编写 `utils/format.ts`**

```typescript
export const formatPoints = (n: number) => n.toLocaleString('zh-CN');
export const formatDate = (d: string | Date) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return d as string;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
```

- [ ] **Step 4: 编写 `utils/markdown.ts`（极简 MD → HTML 渲染）**

```typescript
// 极简 MD：支持 # ## ###、**bold**、*italic*、`code`、列表、代码块
// 不引第三方，避免包体积膨胀
export function renderMarkdown(input: string): string {
  if (!input) return '';
  let s = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // 代码块
  s = s.replace(/```([\s\S]*?)```/g, (_, code) => `<pre class="md-pre"><code>${code}</code></pre>`);
  // 行内代码
  s = s.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');
  // 标题
  s = s.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
       .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
       .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');
  // 粗体 + 斜体
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
       .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // 列表
  s = s.replace(/(?:^|\n)((?:- .+(?:\n|$))+)/g, (m, block) => {
    const items = block.trim().split('\n').map((l: string) => `<li>${l.replace(/^- /, '')}</li>`).join('');
    return `\n<ul class="md-ul">${items}</ul>`;
  });
  // 段落
  s = s.split(/\n{2,}/).map(p => p.startsWith('<') ? p : `<p class="md-p">${p.replace(/\n/g, '<br/>')}</p>`).join('\n');
  return s;
}
```

- [ ] **Step 5: 提交**

```bash
git add packages/mp/src/utils/
git commit -m "feat(mp): add storage, platform, format, markdown utils"
```

---

### Task B.6: HTTP 客户端（封装 uni.request）

**Files:**
- Create: `packages/mp/src/api/http.ts`
- Create: `packages/mp/src/api/types.ts`

- [ ] **Step 1: 编写 `api/types.ts`**

```typescript
export type ApiResult<T> = { ok?: boolean; data?: T; error?: string } & T;

export interface PointsBalance { points: number; }
export interface CheckinResp { ok: boolean; points: number; earned: number; message: string; }
export interface CheckinStatus { checkedIn: boolean; }
export interface PointsHistory { history: { date: string; points: number; type: string }[]; }

export interface TextMessage { role: 'system' | 'user' | 'assistant'; content: string; }
export interface TextGenerateReq { model: string; messages: TextMessage[]; temperature?: number; maxTokens?: number; thinking?: boolean; stream?: boolean; }
export interface TextGenerateResp { content: string; usage?: any; }

export interface ImageGenerateReq { model?: string; prompt: string; size?: string; n?: number; image?: string; }
export interface ImageGenerateResp { images: { url: string; b64?: string }[]; }

export interface VideoGenerateReq { model?: string; prompt?: string; image?: string; width?: number; height?: number; }
export interface VideoTask { id: string; status: 'pending' | 'processing' | 'completed' | 'failed'; url?: string; }
```

- [ ] **Step 2: 编写 `api/http.ts`**

```typescript
import { getClientId } from '@/utils/platform';

const BASE = (import.meta.env.VITE_API_BASE as string) || '/api';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  stream?: boolean;
}

export function request<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = BASE + path;
  const headers: Record<string, string> = {
    'X-Client-Id': getClientId(),
    ...(opts.headers || {})
  };
  if (opts.data && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: opts.method || 'GET',
      data: opts.data,
      header: headers,
      timeout: 60_000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          const err = (res.data as any)?.error || `请求失败 (${res.statusCode})`;
          reject(new Error(err));
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '网络请求失败'))
    });
  });
}

export const http = {
  get: <T = any>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T = any>(path: string, data?: any, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'POST', data }),
  put: <T = any>(path: string, data?: any, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'PUT', data }),
  del: <T = any>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'DELETE' })
};
```

- [ ] **Step 3: 提交**

```bash
git add packages/mp/src/api/http.ts packages/mp/src/api/types.ts
git commit -m "feat(mp): add typed http client with client_id injection"
```

---

### Task B.7: API 模块（text/image/video/points）

**Files:**
- Create: `packages/mp/src/api/text.ts`
- Create: `packages/mp/src/api/image.ts`
- Create: `packages/mp/src/api/video.ts`
- Create: `packages/mp/src/api/points.ts`

- [ ] **Step 1: 编写 `api/points.ts`**

```typescript
import { http } from './http';
import type { PointsBalance, CheckinResp, CheckinStatus, PointsHistory } from './types';

export const pointsApi = {
  get: () => http.get<PointsBalance>('/points'),
  checkinStatus: () => http.get<CheckinStatus>('/points/checkin-status'),
  checkin: () => http.post<CheckinResp>('/points/checkin'),
  history: () => http.get<PointsHistory>('/points/history')
};
```

- [ ] **Step 2: 编写 `api/text.ts`**

```typescript
import { BASE } from './http-base';
import { getClientId } from '@/utils/platform';
import type { TextGenerateReq, TextGenerateResp } from './types';

export const textApi = {
  generate: (data: TextGenerateReq) =>
    uni.request({
      url: BASE + '/text/generate',
      method: 'POST',
      data,
      header: { 'Content-Type': 'application/json', 'X-Client-Id': getClientId() },
      timeout: 120_000
    }),

  generateStream: (data: TextGenerateReq, onChunk: (text: string) => void, onDone: () => void, onError: (e: Error) => void) => {
    // 小程序端：使用 RequestTask.onChunkReceived
    // H5 端：使用 fetch + ReadableStream
    // 这里给出统一抽象，平台实现在 useStreamText 中
    uni.request({
      url: BASE + '/text/generate',
      method: 'POST',
      data: { ...data, stream: true },
      header: { 'Content-Type': 'application/json', 'X-Client-Id': getClientId(), 'Accept': 'text/event-stream' },
      timeout: 300_000,
      success: (res) => onChunk(typeof res.data === 'string' ? res.data : JSON.stringify(res.data)),
      fail: (err) => onError(new Error(err.errMsg || 'stream failed')),
      complete: () => onDone()
    });
  }
};
```

- [ ] **Step 3: 编写 `api/image.ts`**

```typescript
import { http } from './http';
import type { ImageGenerateReq, ImageGenerateResp } from './types';

export const imageApi = {
  generate: (data: ImageGenerateReq) => http.post<ImageGenerateResp>('/image/generate', data)
};
```

- [ ] **Step 4: 编写 `api/video.ts`**

```typescript
import { http } from './http';
import type { VideoGenerateReq, VideoTask } from './types';

export const videoApi = {
  generate: (data: VideoGenerateReq) => http.post<VideoTask>('/video/generate', data),
  status: (id: string) => http.get<VideoTask>(`/video/status/${id}`)
};
```

- [ ] **Step 5: 提取 BASE 常量**

在 `api/http.ts` 顶部已有 `const BASE = ...`。让 `text.ts` 复用：把 `const BASE` 导出，或将 text.ts 改为使用 `http.post` 但启用流式。**简化方案**：将 `BASE` 单独抽到 `api/http-base.ts`：

```typescript
// api/http-base.ts
export const BASE = (import.meta.env.VITE_API_BASE as string) || '/api';
```

修改 `http.ts` 顶部 `import { BASE } from './http-base';`，并删除 `http.ts` 中的 `BASE` 定义。

- [ ] **Step 6: 提交**

```bash
git add packages/mp/src/api/
git commit -m "feat(mp): add api modules (text/image/video/points)"
```

---

### Task B.8: Pinia stores

**Files:**
- Create: `packages/mp/src/stores/user.ts`
- Create: `packages/mp/src/stores/points.ts`
- Create: `packages/mp/src/stores/text.ts`
- Create: `packages/mp/src/stores/image.ts`
- Create: `packages/mp/src/stores/video.ts`

- [ ] **Step 1: 编写 `stores/points.ts`（本地积分，调用后端只做轻量同步）**

```typescript
import { defineStore } from 'pinia';
import { storage } from '@/utils/storage';
import { pointsApi } from '@/api/points';

const KEY_BALANCE = 'points_balance';
const KEY_CHECKIN = 'last_checkin_date';
const KEY_HISTORY = 'points_history';
const COST = { text: 1, image: 1, video: 10 };

export const usePointsStore = defineStore('points', {
  state: () => ({
    balance: storage.get<number>(KEY_BALANCE, 100),
    lastCheckinDate: storage.get<string>(KEY_CHECKIN, ''),
    history: storage.get<{ date: string; delta: number; reason: string }[]>(KEY_HISTORY, [])
  }),
  getters: {
    checkedInToday: (s) => s.lastCheckinDate === new Date().toISOString().split('T')[0]
  },
  actions: {
    setBalance(n: number) { this.balance = n; storage.set(KEY_BALANCE, n); },
    addBalance(delta: number) { this.setBalance(this.balance + delta); },
    deduct(type: 'text' | 'image' | 'video') {
      const cost = COST[type];
      if (this.balance < cost) throw new Error('积分不足');
      this.setBalance(this.balance - cost);
      this._appendHistory(-cost, `${type === 'text' ? '文本' : type === 'image' ? '图片' : '视频'}生成`);
    },
    refund(type: 'text' | 'image' | 'video', reason = '生成失败') {
      const cost = COST[type];
      this.setBalance(this.balance + cost);
      this._appendHistory(cost, reason);
    },
    async checkin() {
      if (this.checkedInToday) throw new Error('今日已签到');
      this.addBalance(10);
      this.lastCheckinDate = new Date().toISOString().split('T')[0];
      storage.set(KEY_CHECKIN, this.lastCheckinDate);
      this._appendHistory(10, '每日签到');
      // 尝试同步到后端（如果未来登录）
      try { await pointsApi.checkin(); } catch {}
    },
    _appendHistory(delta: number, reason: string) {
      const entry = { date: new Date().toISOString(), delta, reason };
      this.history = [entry, ...this.history].slice(0, 200);
      storage.set(KEY_HISTORY, this.history);
    }
  }
});
```

- [ ] **Step 2: 编写 `stores/user.ts`**

```typescript
import { defineStore } from 'pinia';
import { storage } from '@/utils/storage';

export interface UserProfile { nickname: string; avatar: string; }

export const useUserStore = defineStore('user', () => {
  const profile = $ref<UserProfile>(storage.get<UserProfile>('user_profile', { nickname: '', avatar: '' }));

  function setProfile(p: Partial<UserProfile>) {
    profile.nickname = p.nickname ?? profile.nickname;
    profile.avatar = p.avatar ?? profile.avatar;
    storage.set('user_profile', { nickname: profile.nickname, avatar: profile.avatar });
  }

  return $$({ profile, setProfile });
});
```

> 使用 vue-macros 的 `$ref` / `$$` 宏，自动解包。

- [ ] **Step 3: 编写 `stores/text.ts`**

```typescript
import { defineStore } from 'pinia';
import { storage } from '@/utils/storage';
import type { TextMessage } from '@/api/types';

const KEY = 'text_conversations';

export const useTextStore = defineStore('text', () => {
  const conversations = $ref<{ id: string; title: string; messages: TextMessage[]; createdAt: string }[]>(
    storage.get(KEY, [])
  );
  const currentId = $ref<string>(storage.get('text_current_id', ''));

  function ensureCurrent() {
    if (!conversations.find(c => c.id === currentId)) {
      const id = 'c_' + Date.now().toString(36);
      conversations.unshift({ id, title: '新对话', messages: [], createdAt: new Date().toISOString() });
      currentId = id;
      persist();
    }
  }

  function persist() {
    storage.set(KEY, conversations);
    storage.set('text_current_id', currentId);
  }

  function switchTo(id: string) { currentId = id; persist(); }
  function remove(id: string) {
    const i = conversations.findIndex(c => c.id === id);
    if (i >= 0) conversations.splice(i, 1);
    if (currentId === id) currentId = conversations[0]?.id || '';
    persist();
  }
  function pushMessage(msg: TextMessage) {
    ensureCurrent();
    const c = conversations.find(c => c.id === currentId)!;
    c.messages.push(msg);
    if (c.title === '新对话' && msg.role === 'user') {
      c.title = msg.content.slice(0, 20);
    }
    persist();
  }
  function updateLastAssistant(delta: string) {
    ensureCurrent();
    const c = conversations.find(c => c.id === currentId)!;
    const last = c.messages[c.messages.length - 1];
    if (last && last.role === 'assistant') last.content += delta;
    else c.messages.push({ role: 'assistant', content: delta });
    persist();
  }

  return $$({ conversations, currentId, ensureCurrent, switchTo, remove, pushMessage, updateLastAssistant });
});
```

- [ ] **Step 4: 编写 `stores/image.ts`**

```typescript
import { defineStore } from 'pinia';
import { storage } from '@/utils/storage';

export interface ImageRecord { id: string; prompt: string; url: string; size: string; createdAt: string; }

const KEY = 'image_history';

export const useImageStore = defineStore('image', () => {
  const history = $ref<ImageRecord[]>(storage.get(KEY, []));
  function add(rec: ImageRecord) {
    history.unshift(rec);
    if (history.length > 50) history.length = 50;
    storage.set(KEY, history);
  }
  function clear() { history.length = 0; storage.set(KEY, history); }
  return $$({ history, add, clear });
});
```

- [ ] **Step 5: 编写 `stores/video.ts`**

```typescript
import { defineStore } from 'pinia';
import { storage } from '@/utils/storage';

export interface VideoRecord { id: string; prompt: string; status: string; url?: string; createdAt: string; }

const KEY = 'video_history';

export const useVideoStore = defineStore('video', () => {
  const history = $ref<VideoRecord[]>(storage.get(KEY, []));
  function upsert(rec: VideoRecord) {
    const i = history.findIndex(v => v.id === rec.id);
    if (i >= 0) history[i] = rec;
    else history.unshift(rec);
    if (history.length > 30) history.length = 30;
    storage.set(KEY, history);
  }
  return $$({ history, upsert });
});
```

- [ ] **Step 6: 提交**

```bash
git add packages/mp/src/stores/
git commit -m "feat(mp): add pinia stores with local persistence"
```

---

### Task B.9: composables

**Files:**
- Create: `packages/mp/src/composables/useRequest.ts`
- Create: `packages/mp/src/composables/useLocalPoints.ts`
- Create: `packages/mp/src/composables/useStreamText.ts`

- [ ] **Step 1: 编写 `composables/useRequest.ts`**

```typescript
import { ref } from 'vue';

export function useRequest<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>
) {
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const data = ref<TResult | null>(null);

  async function run(...args: TArgs): Promise<TResult | null> {
    loading.value = true;
    error.value = null;
    try {
      data.value = await fn(...args);
      return data.value;
    } catch (e) {
      error.value = e as Error;
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, data, run };
}
```

- [ ] **Step 2: 编写 `composables/useLocalPoints.ts`**

```typescript
import { usePointsStore } from '@/stores/points';
import { storeToRefs } from 'pinia';

export function useLocalPoints() {
  const store = usePointsStore();
  const { balance, checkedInToday, history } = storeToRefs(store);
  return { balance, checkedInToday, history, store };
}
```

- [ ] **Step 3: 编写 `composables/useStreamText.ts`**

```typescript
import { ref } from 'vue';
import { isH5 } from '@/utils/platform';
import { BASE } from '@/api/http-base';
import { getClientId } from '@/utils/platform';
import type { TextGenerateReq } from '@/api/types';

export function useStreamText() {
  const text = ref('');
  const streaming = ref(false);
  const error = ref<Error | null>(null);
  let abort: (() => void) | null = null;

  async function start(req: TextGenerateReq) {
    text.value = '';
    streaming.value = true;
    error.value = null;
    const headers = { 'Content-Type': 'application/json', 'X-Client-Id': getClientId(), 'Accept': 'text/event-stream' };

    if (isH5() && typeof fetch === 'function') {
      const controller = new AbortController();
      abort = () => controller.abort();
      try {
        const res = await fetch(BASE + '/text/generate', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...req, stream: true }),
          signal: controller.signal
        });
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          text.value += decoder.decode(value, { stream: true });
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') error.value = e as Error;
      } finally {
        streaming.value = false;
      }
    } else {
      // 小程序端：使用 uni.request 的 onChunkReceived
      const task = uni.request({
        url: BASE + '/text/generate',
        method: 'POST',
        header: headers,
        data: { ...req, stream: true },
        timeout: 300_000,
        // #ifdef MP-WEIXIN
        // @ts-ignore — 微信小程序专属 API
        enableChunked: true,
        // @ts-ignore
        success: () => {},
        // @ts-ignore
        fail: (err: any) => { error.value = new Error(err.errMsg || '请求失败'); },
        // @ts-ignore
        complete: () => { streaming.value = false; }
      });
      // @ts-ignore
      task.onChunkReceived?.((res: any) => {
        const arr = new Uint8Array(res.data);
        text.value += new TextDecoder().decode(arr, { stream: true });
      });
      abort = () => task.abort();
    }
  }

  function stop() { abort?.(); streaming.value = false; }

  return { text, streaming, error, start, stop };
}
```

- [ ] **Step 4: 提交**

```bash
git add packages/mp/src/composables/
git commit -m "feat(mp): add useRequest, useLocalPoints, useStreamText composables"
```

---

### Task B.10: 通用组件

**Files:**
- Create: `packages/mp/src/components/AppButton.vue`
- Create: `packages/mp/src/components/AppCard.vue`
- Create: `packages/mp/src/components/AppInput.vue`
- Create: `packages/mp/src/components/AppNavbar.vue`
- Create: `packages/mp/src/components/AppEmpty.vue`
- Create: `packages/mp/src/components/AppMessage.vue`

- [ ] **Step 1: 编写 `AppButton.vue`**

```vue
<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
}
const props = withDefaults(defineProps<Props>(), { variant: 'primary' });
const emit = defineEmits<{ (e: 'click', evt: Event): void }>();
const cls = $computed(() => {
  if (props.variant === 'secondary') return 'btn-secondary';
  if (props.variant === 'ghost') return 'btn-ghost';
  return 'btn-primary';
});
function onClick(e: Event) { if (!props.disabled && !props.loading) emit('click', e); }
</script>

<template>
  <button
    :class="[cls, block && 'w-full', 'relative']"
    :disabled="disabled || loading"
    @click="onClick"
  >
    <text v-if="loading">...</text>
    <slot v-else />
  </button>
</template>
```

- [ ] **Step 2: 编写 `AppCard.vue`**

```vue
<script setup lang="ts">
interface Props { hoverable?: boolean; }
const props = withDefaults(defineProps<Props>(), { hoverable: false });
</script>

<template>
  <view :class="hoverable ? 'card-hover' : 'card'">
    <slot />
  </view>
</template>
```

- [ ] **Step 3: 编写 `AppInput.vue`**

```vue
<script setup lang="ts">
interface Props { modelValue: string; placeholder?: string; type?: 'text' | 'textarea' | 'password'; disabled?: boolean; }
const props = withDefaults(defineProps<Props>(), { type: 'text' });
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();
function onInput(e: any) { emit('update:modelValue', e.detail.value); }
</script>

<template>
  <input
    v-if="type !== 'textarea'"
    class="input-base"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :password="type === 'password'"
    @input="onInput"
  />
  <textarea
    v-else
    class="input-base"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="onInput"
  />
</template>
```

- [ ] **Step 4: 编写 `AppNavbar.vue`**

```vue
<script setup lang="ts">
interface Props { title?: string; showBack?: boolean; }
const props = withDefaults(defineProps<Props>(), { showBack: false });
function goBack() { uni.navigateBack({ delta: 1 }); }
</script>

<template>
  <view class="bg-canvas px-4 py-3 flex items-center gap-3 border-b border-ink/10">
    <view v-if="showBack" class="i-ph-arrow-left text-xl text-ink" @click="goBack" />
    <text class="font-medium text-base text-ink">{{ title }}</text>
  </view>
</template>
```

- [ ] **Step 5: 编写 `AppEmpty.vue`**

```vue
<script setup lang="ts">
interface Props { text?: string; icon?: string; }
withDefaults(defineProps<Props>(), { text: '暂无数据', icon: 'i-carbon-document-blank' });
</script>

<template>
  <view class="flex flex-col items-center justify-center py-16 text-slate">
    <view :class="[icon, 'text-5xl mb-3']" />
    <text class="text-sm">{{ text }}</text>
  </view>
</template>
```

- [ ] **Step 6: 编写 `AppMessage.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { renderMarkdown } from '@/utils/markdown';

interface Props { role: 'user' | 'assistant'; content: string; }
const props = defineProps<Props>();
const html = computed(() => renderMarkdown(props.content));
const isUser = computed(() => props.role === 'user');
</script>

<template>
  <view :class="['flex my-2', isUser ? 'justify-end' : 'justify-start']">
    <view :class="[
      'max-w-[80%] px-4 py-3 rounded-3xl',
      isUser ? 'bg-yellow text-ink' : 'bg-meadow text-ink'
    ]">
      <view v-if="isUser" class="whitespace-pre-wrap break-words text-sm leading-relaxed">{{ content }}</view>
      <view v-else class="text-sm leading-relaxed break-words" v-html="html" />
    </view>
  </view>
</template>

<style>
.md-pre { background: rgba(19,14,48,0.06); padding: 8px 12px; border-radius: 8px; overflow-x: auto; font-size: 12px; }
.md-code { background: rgba(19,14,48,0.08); padding: 1px 4px; border-radius: 4px; font-size: 12px; }
.md-h1 { font-size: 22px; font-weight: 700; margin: 8px 0; }
.md-h2 { font-size: 18px; font-weight: 700; margin: 6px 0; }
.md-h3 { font-size: 16px; font-weight: 600; margin: 4px 0; }
.md-p { margin: 4px 0; }
.md-ul { padding-left: 18px; list-style: disc; }
</style>
```

- [ ] **Step 7: 提交**

```bash
git add packages/mp/src/components/
git commit -m "feat(mp): add reusable components (button/card/input/navbar/empty/message)"
```

---

### Task B.11: 首页 `pages/index/index.vue`

**Files:**
- Create: `packages/mp/src/pages/index/index.vue`

- [ ] **Step 1: 编写首页**

```vue
<script setup lang="ts">
import { useLocalPoints } from '@/composables/useLocalPoints';
import AppCard from '@/components/AppCard.vue';

const { balance } = useLocalPoints();

const features = [
  { icon: 'i-carbon-chat', title: '文本生成', desc: '多轮对话、流式输出、Markdown 渲染', path: '/pages/text/index' },
  { icon: 'i-carbon-image', title: '图片生成', desc: '多种尺寸、预览、下载', path: '/pages/image/index' },
  { icon: 'i-carbon-video', title: '视频生成', desc: '文/图生视频、进度跟踪', path: '/pages/video/index' },
  { icon: 'i-carbon-currency', title: '积分中心', desc: '签到领积分、查看流水', path: '/pages/points/index' }
];

function go(path: string) { uni.navigateTo({ url: path }); }
</script>

<template>
  <view class="page px-4 py-6">
    <view class="mb-6">
      <text class="font-serif text-3xl text-ink">Agnes</text>
      <text class="block text-slate text-sm mt-1">智能内容生成 · 你的创作伙伴</text>
    </view>

    <AppCard class="mb-6">
      <view class="flex items-center justify-between">
        <view>
          <text class="text-slate text-xs">当前积分</text>
          <text class="block text-ink text-2xl font-serif">{{ balance }}</text>
        </view>
        <view class="i-carbon-currency text-3xl text-yellow" />
      </view>
    </AppCard>

    <view class="grid grid-cols-2 gap-3">
      <AppCard v-for="f in features" :key="f.title" hoverable @click="go(f.path)">
        <view :class="[f.icon, 'text-2xl text-ink mb-2']" />
        <text class="block font-medium text-ink">{{ f.title }}</text>
        <text class="block text-slate text-xs mt-1">{{ f.desc }}</text>
      </AppCard>
    </view>
  </view>
</template>
```

- [ ] **Step 2: 提交**

```bash
git add packages/mp/src/pages/index/
git commit -m "feat(mp): add index/home page"
```

---

### Task B.12: 文本生成页 `pages/text/index.vue`

**Files:**
- Create: `packages/mp/src/pages/text/index.vue`

- [ ] **Step 1: 编写文本生成页**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useStreamText } from '@/composables/useStreamText';
import { useLocalPoints } from '@/composables/useLocalPoints';
import { useTextStore } from '@/stores/text';
import AppMessage from '@/components/AppMessage.vue';
import AppButton from '@/components/AppButton.vue';
import AppInput from '@/components/AppInput.vue';
import AppNavbar from '@/components/AppNavbar.vue';
import type { TextMessage } from '@/api/types';

const text = useStreamText();
const { balance, store: pointsStore } = useLocalPoints();
const textStore = useTextStore();

const input = $ref('');
const model = $ref('agnes-2.0-flash');
const loading = $ref(false);

const modelOptions = [
  { label: 'Flash 快速', value: 'agnes-2.0-flash' },
  { label: '1.5 轻量', value: 'agnes-1.5-flash' }
];

function onModelChange(e: any) { model = modelOptions[e.detail.value].value; }

async function send() {
  if (!input.trim() || text.streaming.value) return;
  if (balance.value < 1) { uni.showToast({ title: '积分不足', icon: 'none' }); return; }

  const userMsg: TextMessage = { role: 'user', content: input };
  textStore.pushMessage(userMsg);
  const prompt = input;
  input = '';
  loading = true;

  try {
    pointsStore.deduct('text');
  } catch (e: any) { uni.showToast({ title: e.message, icon: 'none' }); loading = false; return; }

  await text.start({ model, messages: [userMsg] });
  textStore.updateLastAssistant(text.text.value);
  pointsStore.refund(text.text.value ? 'text' : 'text');
  loading = false;
}

function newChat() { textStore.currentId = ''; textStore.ensureCurrent(); }
</script>

<template>
  <view class="page flex flex-col h-screen">
    <AppNavbar title="文本生成">
      <view class="ml-auto" @click="newChat">
        <text class="text-slate text-sm">新对话</text>
      </view>
    </AppNavbar>

    <scroll-view scroll-y class="flex-1 px-4 py-2">
      <AppMessage v-for="(m, i) in textStore.conversations.find(c => c.id === textStore.currentId)?.messages || []" :key="i" :role="m.role" :content="m.content" />
      <view v-if="text.streaming.value && text.text.value" class="my-2 flex justify-start">
        <view class="max-w-[80%] px-4 py-3 rounded-3xl bg-meadow text-ink">
          <text class="text-sm leading-relaxed break-words">{{ text.text.value }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="px-4 py-3 border-t border-ink/10 bg-canvas">
      <view class="mb-2 flex items-center gap-2 text-xs text-slate">
        <text>模型：</text>
        <picker mode="selector" :range="modelOptions" range-key="label" @change="onModelChange">
          <text class="text-ink">{{ modelOptions.find(o => o.value === model)?.label }}</text>
        </picker>
        <text class="ml-auto">积分：{{ balance }}</text>
      </view>
      <view class="flex gap-2 items-end">
        <view class="flex-1">
          <AppInput v-model="input" type="textarea" placeholder="说点什么…" />
        </view>
        <AppButton :loading="loading" :disabled="!input.trim()" @click="send">发送</AppButton>
      </view>
    </view>
  </view>
</template>
```

- [ ] **Step 2: 提交**

```bash
git add packages/mp/src/pages/text/
git commit -m "feat(mp): add text generation page with streaming and history"
```

---

### Task B.13: 图片生成页 `pages/image/index.vue`

**Files:**
- Create: `packages/mp/src/pages/image/index.vue`

- [ ] **Step 1: 编写图片生成页**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { imageApi } from '@/api/image';
import { useLocalPoints } from '@/composables/useLocalPoints';
import { useImageStore } from '@/stores/image';
import AppInput from '@/components/AppInput.vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppEmpty from '@/components/AppEmpty.vue';

const { balance, store: pointsStore } = useLocalPoints();
const imageStore = useImageStore();

const prompt = $ref('');
const size = $ref('1024x1024');
const loading = $ref(false);

const sizes = ['512x512', '768x768', '1024x1024', '1024x768', '768x1024', '1920x1080'];

async function generate() {
  if (!prompt.trim() || loading) return;
  if (balance.value < 1) { uni.showToast({ title: '积分不足', icon: 'none' }); return; }
  loading = true;
  try {
    pointsStore.deduct('image');
    const r = await imageApi.generate({ prompt, size });
    const url = r.images?.[0]?.url || '';
    imageStore.add({ id: 'i_' + Date.now().toString(36), prompt, url, size, createdAt: new Date().toISOString() });
    if (!url) pointsStore.refund('image', '生成失败');
  } catch (e: any) {
    pointsStore.refund('image', '生成失败');
    uni.showToast({ title: e.message || '生成失败', icon: 'none' });
  } finally {
    loading = false;
  }
}

function download(url: string) {
  // #ifdef H5
  const a = document.createElement('a');
  a.href = url; a.download = 'agnes.png'; a.click();
  // #endif
  // #ifdef MP-WEIXIN
  uni.downloadFile({ url, success: (res) => uni.saveImageToPhotosAlbum({ filePath: res.tempFilePath }) });
  // #endif
}
</script>

<template>
  <view class="page px-4 py-4">
    <AppCard>
      <AppInput v-model="prompt" type="textarea" placeholder="描述你想生成的图片…" />
      <view class="mt-3 flex flex-wrap gap-2">
        <view
          v-for="s in sizes" :key="s"
          :class="['px-3 py-1 rounded-full text-xs', size === s ? 'bg-yellow text-ink' : 'bg-pearl text-slate border border-ink/10']"
          @click="size = s"
        >
          <text>{{ s }}</text>
        </view>
      </view>
      <view class="mt-3 flex items-center justify-between">
        <text class="text-xs text-slate">积分：{{ balance }} ｜ 消耗 1 积分</text>
        <AppButton :loading="loading" :disabled="!prompt.trim()" @click="generate">生成</AppButton>
      </view>
    </AppCard>

    <view class="mt-6">
      <text class="font-serif text-xl text-ink mb-3 block">历史记录</text>
      <AppEmpty v-if="imageStore.history.length === 0" />
      <view v-else class="grid grid-cols-2 gap-3">
        <AppCard v-for="r in imageStore.history" :key="r.id" hoverable>
          <image :src="r.url" mode="aspectFill" class="w-full h-40 rounded-2xl" @click="download(r.url)" />
          <text class="block text-xs text-slate mt-2 line-clamp-2">{{ r.prompt }}</text>
        </AppCard>
      </view>
    </view>
  </view>
</template>
```

- [ ] **Step 2: 提交**

```bash
git add packages/mp/src/pages/image/
git commit -m "feat(mp): add image generation page with history"
```

---

### Task B.14: 视频生成页 `pages/video/index.vue`

**Files:**
- Create: `packages/mp/src/pages/video/index.vue`

- [ ] **Step 1: 编写视频生成页**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { videoApi } from '@/api/video';
import { useLocalPoints } from '@/composables/useLocalPoints';
import { useVideoStore } from '@/stores/video';
import AppInput from '@/components/AppInput.vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppEmpty from '@/components/AppEmpty.vue';
import type { VideoTask } from '@/api/types';

const { balance, store: pointsStore } = useLocalPoints();
const videoStore = useVideoStore();

const prompt = $ref('');
const submitting = $ref(false);
const polling = new Map<string, ReturnType<typeof setInterval>>();

async function generate() {
  if (!prompt.trim() || submitting) return;
  if (balance.value < 10) { uni.showToast({ title: '积分不足（需 10）', icon: 'none' }); return; }
  submitting = true;
  try {
    pointsStore.deduct('video');
    const task: VideoTask = await videoApi.generate({ prompt });
    videoStore.upsert({ id: task.id, prompt, status: task.status, url: task.url, createdAt: new Date().toISOString() });
    pollStatus(task.id);
  } catch (e: any) {
    pointsStore.refund('video', '提交失败');
    uni.showToast({ title: e.message || '提交失败', icon: 'none' });
  } finally {
    submitting = false;
  }
}

function pollStatus(id: string) {
  const t = setInterval(async () => {
    try {
      const s = await videoApi.status(id);
      videoStore.upsert({ id, prompt, status: s.status, url: s.url, createdAt: '' });
      if (s.status === 'completed' || s.status === 'failed') {
        if (s.status === 'failed') pointsStore.refund('video', '生成失败');
        clearInterval(t);
        polling.delete(id);
      }
    } catch {
      clearInterval(t);
      polling.delete(id);
    }
  }, 5000);
  polling.set(id, t);
}

onUnload(() => { polling.forEach(t => clearInterval(t)); });
</script>

<template>
  <view class="page px-4 py-4">
    <AppCard>
      <AppInput v-model="prompt" type="textarea" placeholder="描述你想生成的视频…" />
      <view class="mt-3 flex items-center justify-between">
        <text class="text-xs text-slate">积分：{{ balance }} ｜ 消耗 10 积分</text>
        <AppButton :loading="submitting" :disabled="!prompt.trim()" @click="generate">生成</AppButton>
      </view>
    </AppCard>

    <view class="mt-6">
      <text class="font-serif text-xl text-ink mb-3 block">任务列表</text>
      <AppEmpty v-if="videoStore.history.length === 0" />
      <AppCard v-for="v in videoStore.history" :key="v.id" class="mb-3">
        <text class="block text-sm text-ink mb-2 line-clamp-2">{{ v.prompt }}</text>
        <view class="flex items-center gap-2 text-xs text-slate">
          <text>状态：</text>
          <text :class="v.status === 'completed' ? 'text-green' : v.status === 'failed' ? 'text-fuchsia' : 'text-slate'">{{ v.status }}</text>
        </view>
        <video v-if="v.url" :src="v.url" controls class="w-full mt-3 rounded-2xl" />
      </AppCard>
    </view>
  </view>
</template>
```

- [ ] **Step 2: 提交**

```bash
git add packages/mp/src/pages/video/
git commit -m "feat(mp): add video generation page with polling"
```

---

### Task B.15: 积分页 `pages/points/index.vue`

**Files:**
- Create: `packages/mp/src/pages/points/index.vue`

- [ ] **Step 1: 编写积分页**

```vue
<script setup lang="ts">
import { useLocalPoints } from '@/composables/useLocalPoints';
import { formatPoints, formatDate } from '@/utils/format';
import AppCard from '@/components/AppCard.vue';
import AppButton from '@/components/AppButton.vue';
import AppEmpty from '@/components/AppEmpty.vue';

const { balance, checkedInToday, history, store } = useLocalPoints();

async function onCheckin() {
  try {
    await store.checkin();
    uni.showToast({ title: '签到成功 +10', icon: 'success' });
  } catch (e: any) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
</script>

<template>
  <view class="page px-4 py-4">
    <AppCard>
      <text class="text-slate text-xs">当前积分</text>
      <text class="block text-4xl font-serif text-ink my-2">{{ formatPoints(balance) }}</text>
      <AppButton :disabled="checkedInToday" @click="onCheckin">
        {{ checkedInToday ? '今日已签到' : '每日签到 +10' }}
      </AppButton>
    </AppCard>

    <view class="mt-6">
      <text class="font-serif text-xl text-ink mb-3 block">积分记录</text>
      <AppEmpty v-if="history.length === 0" />
      <AppCard v-for="(h, i) in history" :key="i" class="mb-2 !p-4">
        <view class="flex items-center justify-between">
          <text class="text-sm text-ink">{{ h.reason }}</text>
          <text :class="h.delta >= 0 ? 'text-green' : 'text-fuchsia'" class="text-sm font-medium">
            {{ h.delta >= 0 ? '+' : '' }}{{ h.delta }}
          </text>
        </view>
        <text class="block text-xs text-slate mt-1">{{ formatDate(h.date) }}</text>
      </AppCard>
    </view>
  </view>
</template>
```

- [ ] **Step 2: 提交**

```bash
git add packages/mp/src/pages/points/
git commit -m "feat(mp): add points page with checkin and history"
```

---

### Task B.16: 设置与个人页

**Files:**
- Create: `packages/mp/src/pages/settings/index.vue`
- Create: `packages/mp/src/pages/profile/index.vue`

- [ ] **Step 1: 编写 `pages/settings/index.vue`**

```vue
<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import AppCard from '@/components/AppCard.vue';
import AppInput from '@/components/AppInput.vue';
import AppButton from '@/components/AppButton.vue';

const user = useUserStore();
const draft = $ref({ ...user.profile });

function save() {
  user.setProfile(draft);
  uni.showToast({ title: '已保存', icon: 'success' });
}
</script>

<template>
  <view class="page px-4 py-4">
    <AppCard>
      <text class="block text-sm text-ink mb-2">昵称</text>
      <AppInput v-model="draft.nickname" placeholder="输入昵称" />
      <text class="block text-sm text-ink mt-4 mb-2">头像 URL</text>
      <AppInput v-model="draft.avatar" placeholder="https://..." />
      <view class="mt-4">
        <AppButton block @click="save">保存</AppButton>
      </view>
    </AppCard>

    <AppCard class="mt-4">
      <text class="text-slate text-sm">登录</text>
      <text class="block text-xs text-slate mt-2">后续将通过 OpenID 接入（暂未启用）</text>
    </AppCard>
  </view>
</template>
```

- [ ] **Step 2: 编写 `pages/profile/index.vue`**

```vue
<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import { useLocalPoints } from '@/composables/useLocalPoints';
import AppCard from '@/components/AppCard.vue';

const user = useUserStore();
const { balance } = useLocalPoints();
</script>

<template>
  <view class="page px-4 py-4">
    <AppCard>
      <view class="flex items-center gap-4">
        <image :src="user.profile.avatar || '/static/avatar_default.png'" class="w-16 h-16 rounded-full bg-meadow" />
        <view>
          <text class="block font-serif text-xl text-ink">{{ user.profile.nickname || '未登录' }}</text>
          <text class="block text-xs text-slate">积分：{{ balance }}</text>
        </view>
      </view>
    </AppCard>

    <AppCard class="mt-4" hoverable @click="uni.navigateTo({ url: '/pages/settings/index' })">
      <text class="text-sm text-ink">设置</text>
    </AppCard>

    <AppCard class="mt-2" hoverable @click="uni.navigateTo({ url: '/pages/points/index' })">
      <text class="text-sm text-ink">积分中心</text>
    </AppCard>
  </view>
</template>
```

- [ ] **Step 3: 提交**

```bash
git add packages/mp/src/pages/settings/ packages/mp/src/pages/profile/
git commit -m "feat(mp): add settings and profile pages"
```

---

### Task B.17: 跨平台构建验证

- [ ] **Step 1: H5 构建**

Run: `cd d:/projects/my_project/agnes-client/packages/mp && pnpm build:h5`
Expected: 输出 `dist/build/h5`，无报错

- [ ] **Step 2: 微信小程序构建**

Run: `pnpm build:mp-weixin`
Expected: 输出 `dist/build/mp-weixin`，无报错

- [ ] **Step 3: 支付宝小程序构建**

Run: `pnpm build:mp-alipay`
Expected: 输出 `dist/build/mp-alipay`，无报错

- [ ] **Step 4: App 构建（可选，需 HBuilderX 真机/模拟器）**

Run: `pnpm build:app`
Expected: 输出 `dist/build/app`

- [ ] **Step 5: 类型检查**

Run: `pnpm type-check`
Expected: 无错误

- [ ] **Step 6: 修复任何构建/类型问题并提交**

```bash
git add packages/mp/
git commit -m "fix(mp): address build/type issues"
```

---

### Task B.18: README 与文档

**Files:**
- Create: `packages/mp/README.md`

- [ ] **Step 1: 编写 README**

```markdown
# @agnes/mp

Agnes AI 多端小程序（uniapp + Vue 3 + UnoCSS + Pinia + vue-macros）。

## 支持平台

- H5
- 微信小程序（mp-weixin）
- 支付宝小程序（mp-alipay）
- App（iOS / Android）

## 启动

\`\`\`bash
pnpm install
pnpm dev:h5          # H5 开发
pnpm dev:mp-weixin   # 微信小程序
pnpm dev:mp-alipay   # 支付宝小程序
pnpm build:h5        # 构建 H5
\`\`\`

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

\`\`\`
src/
├── api/        # 接口封装
├── components/ # 通用组件
├── composables/# 业务逻辑
├── pages/      # 文件系统路由
├── stores/     # Pinia
├── styles/     # 全局样式
└── utils/      # 工具函数
\`\`\`
```

- [ ] **Step 2: 提交**

```bash
git add packages/mp/README.md
git commit -m "docs(mp): add README"
```

---

## 附录 A: 全局启动方式（根 package.json 可选补充）

**Files:**
- Modify: `package.json` (根目录)

**Step 1: 添加脚本**

```json
{
  "scripts": {
    "dev:server": "node packages/webui/src/server/index.js",
    "dev:server2": "pnpm --filter @agnes/server dev",
    "dev:mp:h5": "pnpm --filter @agnes/mp dev:h5",
    "dev:mp:wx": "pnpm --filter @agnes/mp dev:mp-weixin",
    "build:mp": "pnpm --filter @agnes/mp build:h5"
  }
}
```

**Step 2: 提交**

```bash
git add package.json
git commit -m "chore: add mp and server npm scripts"
```

---

## Self-Review

### Spec 覆盖检查

| 需求 | 对应任务 |
|------|----------|
| packages/server 独立后端 | A.1 – A.18 |
| 整合 webui + workflow API | A.6 – A.14 |
| API key 来自 agnes.config.json | A.2 (`loadAgnesConfig`) |
| OpenID 登录预留 | A.15 |
| packages/mp 脚手架 | B.1 – B.5 |
| unplugin-auto-import 集成 | B.2 |
| vue-macros 集成 | B.2, B.8 (使用 `$ref` / `$$`) |
| iconify-json + unocss | B.3 |
| Ditto 主题 | B.3, B.10 (component 颜色) |
| Pinia + composables | B.8, B.9 |
| 全平台构建 | B.17 |
| 文本生成（流式 + 多轮 + Markdown） | B.12, B.7 (textApi), B.9 (useStreamText) |
| 图片生成 | B.13 |
| 视频生成 + 轮询 | B.14 |
| 积分 + 签到（本地） | B.15, B.8 (pointsStore) |
| 个人设置 | B.16 |
| 渐进迁移 webui/workflow | A.19 |
| 单元/集成测试 | A.16 |

### 占位符扫描

- ❌ 无 "TBD" / "TODO" / "later"；A.14 中提到 "TODO 迁移具体节点执行逻辑" 已在代码中说明是"基于 `server.cjs` 实际内容"，**这是占位**，**需在执行时基于实际 server.cjs 内容补全**。建议执行 A.14 时**先 Read 完整的 `server.cjs`**，再写具体端点。
- A.15 (openid) 显式标注为 "占位" + "未来对接微信 code2Session"，符合"推迟登录"的需求
- B.4 manifest.json 中 `mp-weixin.appid` 为 `"wxPLACEHOLDER"`，发布前需替换为真实 appid（这是 uniapp 模板的标准占位方式）

### 类型一致性

- `points.deduct` / `refund` 的 `type` 参数统一为 `'text' | 'image' | 'video'`
- `COST` 表在 server (`points.js`) 与 mp (`stores/points.ts`) 同步存在；维护责任在 server
- `X-Client-Id` 头在 http.ts 注入、所有后端路由 `clientIdMiddleware` 读取
- `useStreamText` 的输出统一为 `text: Ref<string>`，调用方在 `text.text.value` 访问（vue-macros 解包）

### 范围检查

本计划包含两个独立子系统（server + mp），但存在明确依赖（mp 调用 server），且 webui/workflow 保持运行不破坏。单计划可管理；若倾向于完全解耦，可拆为 `2026-06-18-agnes-server.md` 与 `2026-06-18-agnes-mp.md` 两份独立计划（已在文档中以 Phase A / Phase B 显式分割）。

---

## 备注

- 计划假设 uniapp + vue-macros + auto-import + unocss + iconify 在该版本组合下兼容；如 `pnpm install` 时出现 peer 冲突，按 uniapp 官方推荐版本锁定。
- Task A.14 强依赖 `packages/workflow/server.cjs` 实际内容；执行该任务时**先 Read 完整文件**，再编写等价端点。
- 后续 OpenID 登录启用时，Task A.15 替换 `mockOpenid` 为真实 code2Session；前端在 `useUserStore` 调 `POST /api/openid/login`。
