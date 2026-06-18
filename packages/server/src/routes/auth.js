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
