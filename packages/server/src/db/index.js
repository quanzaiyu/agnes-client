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
