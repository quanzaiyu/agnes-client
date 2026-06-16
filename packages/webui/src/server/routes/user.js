import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { get, run } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Configure multer for avatar upload
const avatarDir = path.join(__dirname, '../../../../../data/avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `avatar_${req.userId}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、PNG、GIF、WebP 格式'));
    }
  }
});

// Get user profile
router.get('/profile', authMiddleware, (req, res) => {
  try {
    const user = get('SELECT id, username, email, nickname, avatar, points, created_at FROM users WHERE id = ?', req.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// Update profile
router.put('/profile', authMiddleware, (req, res) => {
  try {
    const { nickname, avatar } = req.body;

    if (nickname !== undefined) {
      run('UPDATE users SET nickname = ? WHERE id = ?', nickname, req.userId);
    }

    if (avatar !== undefined) {
      run('UPDATE users SET avatar = ? WHERE id = ?', avatar, req.userId);
    }

    const user = get('SELECT id, username, email, nickname, avatar, points FROM users WHERE id = ?', req.userId);
    res.json({ ok: true, user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

// Upload avatar
router.post('/avatar', authMiddleware, upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的头像图片' });
    }

    const avatarUrl = `/avatars/${req.file.filename}`;
    run('UPDATE users SET avatar = ? WHERE id = ?', avatarUrl, req.userId);

    res.json({ ok: true, avatar: avatarUrl });
  } catch (err) {
    console.error('Upload avatar error:', err);
    res.status(500).json({ error: '上传头像失败' });
  }
});

// Serve avatar files
router.use('/avatars', express.static(avatarDir));

export default router;