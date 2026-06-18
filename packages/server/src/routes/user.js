import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { get, run } from '../db/repository.js';
import { authMiddleware } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = path.join(__dirname, '../../data/avatars');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: AVATAR_DIR,
    filename: (req, file, cb) => cb(null, `${nanoid()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const router = express.Router();
router.use(authMiddleware);

router.get('/profile', (req, res, next) => {
  try {
    const u = get('SELECT id, username, email, nickname, avatar, points, openid FROM users WHERE id = ?', req.userId);
    if (!u) throw new HttpError(404, '用户不存在');
    res.json({ user: u });
  } catch (e) { next(e); }
});

router.put('/profile', (req, res, next) => {
  try {
    const { nickname } = req.body || {};
    if (typeof nickname !== 'string') throw new HttpError(400, '昵称无效');
    run('UPDATE users SET nickname = ? WHERE id = ?', nickname, req.userId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/avatar', upload.single('avatar'), (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, '未上传文件');
    const url = `/avatars/${req.file.filename}`;
    run('UPDATE users SET avatar = ? WHERE id = ?', url, req.userId);
    res.json({ ok: true, avatar: url });
  } catch (e) { next(e); }
});

export default router;
