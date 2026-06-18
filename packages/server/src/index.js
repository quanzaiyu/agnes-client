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

const server = app.listen(config.port, () => {
  console.log(`\n  🚀 @agnes/server running at http://localhost:${config.port}\n`);
});

export { app, server, config };
