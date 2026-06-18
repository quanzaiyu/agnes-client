import express from 'express';
import { loadServerConfig } from './config.js';

const config = loadServerConfig();
const app = express();

app.get('/health', (req, res) => res.json({ ok: true, service: '@agnes/server' }));

const server = app.listen(config.port, () => {
  console.log(`\n  🚀 @agnes/server running at http://localhost:${config.port}\n`);
});

export { app, server, config };
