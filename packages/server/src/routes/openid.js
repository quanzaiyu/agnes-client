import express from 'express';
import { get, run } from '../db/repository.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = express.Router();

// 预留：未来对接微信小程序 code2Session
router.post('/login', async (req, res, next) => {
  try {
    const { code, nickname, avatar } = req.body || {};
    if (!code) throw new HttpError(400, '缺少 code');

    // TODO: 实际部署时调用微信 code2Session 换取 openid
    const mockOpenid = `mock_${code}`;
    let user = get('SELECT * FROM users WHERE openid = ?', mockOpenid);
    if (!user) {
      const { lastInsertRowid: id } = run('INSERT INTO users (openid, nickname, avatar, points) VALUES (?, ?, ?, 100)', mockOpenid, nickname || '微信用户', avatar || '');
      user = { id, openid: mockOpenid, nickname: nickname || '微信用户', avatar: avatar || '', points: 100 };
    }
    const token = jwt.sign({ userId: user.id, openid: user.openid }, JWT_SECRET(), { expiresIn: '7d' });
    res.json({ ok: true, token, user });
  } catch (e) { next(e); }
});

export default router;