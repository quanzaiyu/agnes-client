import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, run } from '../db/index.js';
import { authMiddleware, JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少为6位' });
    }

    // Check if user exists
    const existingUser = get('SELECT id FROM users WHERE username = ? OR email = ?', username, email);
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已被注册' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with 100 initial points
    run('INSERT INTO users (username, email, password_hash, points) VALUES (?, ?, ?, 100)', username, email, passwordHash);

    const userId = get('SELECT last_insert_rowid() as id').id;

    // Generate JWT
    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      ok: true,
      user: { id: userId, username, email, points: 100 }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '请填写用户名和密码' });
    }

    const user = get('SELECT * FROM users WHERE username = ? OR email = ?', username, username);

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        points: user.points
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = get('SELECT id, username, email, nickname, avatar, points, created_at FROM users WHERE id = ?', req.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

export default router;