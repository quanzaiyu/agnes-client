import express from 'express';
import { loadConfig, saveConfig } from '@agnes/core';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get API config (masked)
router.get('/', (req, res) => {
  try {
    const config = loadConfig();
    res.json({
      apiKey: config.apiKey ? '***' + config.apiKey.slice(-4) : '',
      baseUrl: config.baseUrl
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save API config
router.post('/', authMiddleware, (req, res) => {
  try {
    const { apiKey, baseUrl } = req.body;
    const config = loadConfig();

    if (apiKey && apiKey.trim() && !apiKey.startsWith('***')) {
      config.apiKey = apiKey.trim();
    }
    if (baseUrl && baseUrl.trim()) {
      config.baseUrl = baseUrl.trim();
    }

    const savedPath = saveConfig(config, 'local');
    res.json({ ok: true, savedPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;