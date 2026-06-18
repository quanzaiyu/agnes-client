import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { loadServerConfig } from './config.js';
import { initDatabase, getDb } from './db/index.js';
import { setDbPath } from './db/repository.js';
import { requestLogger } from './middleware/logger.js';
import { setJwtSecret } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { isProd } from './utils/env.js';
import { setAgnesConfig } from './services/agnes.js';

const config = loadServerConfig();
setDbPath(config.dbPath);
await initDatabase({ dbPath: config.dbPath });

setAgnesConfig(config.agnesConfig);
setJwtSecret(config.jwtSecret);

const app = express();

app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));
app.use(express.json({ limit: '200mb' }));
app.use(cookieParser());
app.use(requestLogger);

app.get('/health', (req, res) => {
  const usersCount = getDb().exec('SELECT COUNT(*) as c FROM users')[0]?.values[0]?.[0] || 0;
  res.json({ ok: true, service: '@agnes/server', users: Number(usersCount) });
});

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`\n  🚀 @agnes/server running at http://localhost:${config.port}\n`);
});

export { app, server, config };
