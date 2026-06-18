import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveConfig } from '@agnes/core';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');

const router = express.Router();
router.use(authMiddleware);

function findConfigPath() {
  // 与 webui 一致：monorepo 根目录 agnes.config.json
  return path.join(ROOT, 'agnes.config.json');
}

router.get('/', (req, res, next) => {
  try {
    const p = findConfigPath();
    if (!fs.existsSync(p)) return res.json({ config: null });
    const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const { apiKey, ...safe } = cfg;
    res.json({ config: safe });
  } catch (e) { next(e); }
});

router.post('/', (req, res, next) => {
  try {
    const p = findConfigPath();
    const cur = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : {};
    const next = { ...cur, ...req.body };
    // @agnes/core 的 saveConfig 签名是 (config, location)
    saveConfig(next, 'local');
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
