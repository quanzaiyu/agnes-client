import express from 'express';
import { get, run } from '../db/index.js';
import { loadConfig } from '@agnes/core';
import { AgnesClient } from '@agnes/core';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const POINTS_COST = 1; // 1 point for text generation

// Text generation
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { model, messages, stream, temperature, maxTokens, thinking } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: '请提供有效的对话消息' });
    }

    // Check points
    const user = get('SELECT points FROM users WHERE id = ?', req.userId);
    if (user.points < POINTS_COST) {
      return res.status(402).json({ error: `积分不足，需要 ${POINTS_COST} 积分，当前余额 ${user.points}` });
    }

    // Create pending log
    run('INSERT INTO generation_logs (user_id, type, cost_points, status) VALUES (?, ?, ?, ?)', req.userId, 'text', POINTS_COST, 'processing');
    const logId = get('SELECT last_insert_rowid() as id').id;

    try {
      // Call AI API
      const config = loadConfig();
      const client = new AgnesClient(config);

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const streamData = await client.chat({ model, messages, stream: true, temperature, maxTokens, thinking });

        streamData.on('data', (chunk) => res.write(chunk));
        streamData.on('end', async () => {
          // Deduct points after completion
          run('UPDATE users SET points = points - ? WHERE id = ?', POINTS_COST, req.userId);
          run("UPDATE generation_logs SET status = 'completed', completed_at = datetime('now') WHERE id = ?", logId);
          res.end();
        });
        streamData.on('error', (err) => {
          run("UPDATE generation_logs SET status = 'failed' WHERE id = ?", logId);
          res.write(`data: [ERROR] ${err.message}\n\n`);
          res.end();
        });
      } else {
        const result = await client.chat({ model, messages, stream: false, temperature, maxTokens, thinking });

        // Deduct points after completion
        run('UPDATE users SET points = points - ? WHERE id = ?', POINTS_COST, req.userId);
        run("UPDATE generation_logs SET status = 'completed', result = ?, completed_at = datetime('now') WHERE id = ?", JSON.stringify(result), logId);

        res.json(result);
      }
    } catch (apiErr) {
      // Mark as failed
      run("UPDATE generation_logs SET status = 'failed' WHERE id = ?", logId);
      throw apiErr;
    }
  } catch (err) {
    console.error('Text generation error:', err);
    res.status(500).json({ error: err.message || '文本生成失败' });
  }
});

export default router;