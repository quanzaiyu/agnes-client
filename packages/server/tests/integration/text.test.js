import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// IMPORTANT: set env vars BEFORE importing index.js, because index.js
// runs `await initDatabase({ dbPath: config.dbPath })` at top level.
// config.js honors AGNES_TEST_DB when NODE_ENV === 'test' (see config.js).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.PORT = '0';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = path.join(__dirname, '../tmp/integ.db');
if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
process.env.AGNES_TEST_DB = TEST_DB;

// Now safe to import — index.js will read AGNES_TEST_DB from env and
// init the DB at TEST_DB rather than the production __dirname-based path.
const { app, server } = await import('../../src/index.js');

// Close the http server after all tests so node:test can exit cleanly.
// (Otherwise the listen() handle keeps the event loop alive past the last test.)
test.after(() => new Promise((resolve) => {
  if (server && server.listening) server.close(() => resolve());
  else resolve();
}));

test('GET /health returns ok', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.service, '@agnes/server');
});

test('GET /api/points without auth returns 401', async () => {
  const res = await request(app).get('/api/points');
  assert.equal(res.status, 401);
});
