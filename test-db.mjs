import initSqlJs from 'sql.js';
import fs from 'fs';

const SQL = await initSqlJs();
const data = fs.readFileSync('data/agnes.db');
const db = new SQL.Database(data);

const result = db.exec('SELECT id, username, points FROM users');
console.log('Users result:', JSON.stringify(result, null, 2));

// Check if we can query
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
stmt.bind([0]);
if (stmt.step()) {
  console.log('User found:', stmt.getAsObject());
} else {
  console.log('User NOT found');
}
stmt.free();