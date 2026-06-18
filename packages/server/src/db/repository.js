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
