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