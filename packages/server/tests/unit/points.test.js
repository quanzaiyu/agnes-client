import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from '../../src/db/index.js';
import { setDbPath, run, get, all } from '../../src/db/repository.js';
import { deduct, getBalance, checkin, getHistory } from '../../src/services/points.js';

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

  const { logId, cost } = deduct({ owner: { userId }, type: 'text' });

  assert.equal(cost, 1);
  assert.ok(logId > 0, `logId should be > 0, got ${logId}`);

  const u = get('SELECT points FROM users WHERE id = ?', userId);
  assert.equal(u.points, 99);

  const logs = all('SELECT * FROM generation_logs WHERE id = ?', logId);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].user_id, userId);
  assert.equal(logs[0].type, 'text');
  assert.equal(logs[0].cost_points, 1);
  assert.equal(logs[0].status, 'processing');
});

// Regression test for A.18: routes/auth.js and routes/openid.js used to call
//   get('SELECT last_insert_rowid() as id').id AFTER run(), but run()'s saveDatabase
//   path triggers db.export(), which resets sql.js's last_insert_rowid cursor — so
//   the follow-up SELECT always returned 0. Correct usage: destructure the
//   `lastInsertRowid` returned by run() directly.
test('run() returns lastInsertRowid that survives subsequent get() queries (A.18 regression)', () => {
  const { lastInsertRowid: id } = run(
    "INSERT INTO users (username, email, password_hash, points) VALUES (?, ?, ?, 100)",
    'regress_a18', 'regress_a18@x', 'h'
  );
  assert.ok(id > 0, `run() must return lastInsertRowid > 0, got ${id}`);

  // Cross-check via a fresh SELECT — this is what routes used to do (and what
  // silently returned 0). Asserting here locks in the behavior: the returned
  // id matches the actual row in the DB.
  const row = get("SELECT id FROM users WHERE username = 'regress_a18'");
  assert.ok(row, 'inserted user must be readable');
  assert.equal(row.id, id, 'run() lastInsertRowid must equal the stored row id');
});

test('deduct throws HttpError(402) when balance is insufficient', async () => {
  run("INSERT INTO users (username, email, password_hash, points) VALUES (?, ?, ?, 0)", 'poor', 'poor@x', 'h');
  const userId = get("SELECT id FROM users WHERE username = 'poor'").id;

  await assert.rejects(
    async () => deduct({ owner: { userId }, type: 'video' }), // video costs 10
    (err) => err.status === 402
  );

  // points unchanged
  const u = get('SELECT points FROM users WHERE id = ?', userId);
  assert.equal(u.points, 0);
});

test('getBalance returns user points', () => {
  const balance = getBalance({ userId: 1 });
  assert.equal(balance, 99);
});

test('checkin awards 10 points once per day', () => {
  const userId = 1;
  const r = checkin({ userId });
  assert.equal(r.earned, 10);
  assert.equal(getBalance({ userId }), 109);

  // second checkin today throws
  assert.throws(() => checkin({ userId }), (err) => err.status === 400);

  // history contains checkin entry
  const h = getHistory({ userId });
  assert.ok(h.some(e => e.type === 'checkin' && e.points === 10));
});
