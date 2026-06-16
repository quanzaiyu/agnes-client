import express from 'express';
import axios from 'axios';
import { get, run } from '../db/index.js';
import { loadConfig } from '@agnes/core';
import { AgnesClient } from '@agnes/core';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const POINTS_COST = 10; // 10 points for video generation

function isDataUri(str) {
  return typeof str === 'string' && str.startsWith('data:');
}

function isUrl(str) {
  return typeof str === 'string' && (str.startsWith('http://') || str.startsWith('https://'));
}

async function urlToDataUri(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  const contentType = response.headers['content-type'] || 'image/png';
  const mime = contentType.split(';')[0].trim();
  const b64 = Buffer.from(response.data).toString('base64');
  return `data:${mime};base64,${b64}`;
}

async function resolveImage(image) {
  if (!image) return undefined;
  if (isDataUri(image)) return image;
  if (isUrl(image)) {
    try {
      return await urlToDataUri(image);
    } catch (err) {
      throw new Error(`无法下载图片: ${err.message}`);
    }
  }
  return image;
}

// Video generation
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { model, prompt, image, mode, size, width, height, numFrames, frameRate, seed, negativePrompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: '请提供视频描述' });
    }

    // Check points
    const user = get('SELECT points FROM users WHERE id = ?', req.userId);
    if (user.points < POINTS_COST) {
      return res.status(402).json({ error: `积分不足，需要 ${POINTS_COST} 积分，当前余额 ${user.points}` });
    }

    // Create pending log
    run('INSERT INTO generation_logs (user_id, type, cost_points, status) VALUES (?, ?, ?, ?)', req.userId, 'video', POINTS_COST, 'processing');
    const logId = get('SELECT last_insert_rowid() as id').id;

    try {
      // Resolve image if provided
      const resolvedImage = await resolveImage(image);

      // Parse size
      let w = width, h = height;
      if (size && !w && !h) {
        const parts = size.split('x');
        w = parseInt(parts[0]) || undefined;
        h = parseInt(parts[1]) || undefined;
      }

      // Call AI API
      const config = loadConfig();
      const client = new AgnesClient(config);

      const result = await client.createVideo({
        model: model || 'agnes-video-v2.0',
        prompt,
        image: resolvedImage,
        mode,
        width: w || 1152,
        height: h || 768,
        numFrames,
        frameRate,
        seed,
        negativePrompt
      });

      // Deduct points after task creation
      run('UPDATE users SET points = points - ? WHERE id = ?', POINTS_COST, req.userId);
      run("UPDATE generation_logs SET status = 'completed', result = ?, completed_at = datetime('now') WHERE id = ?", JSON.stringify(result), logId);

      res.json(result);
    } catch (apiErr) {
      run("UPDATE generation_logs SET status = 'failed' WHERE id = ?", logId);
      throw apiErr;
    }
  } catch (err) {
    console.error('Video generation error:', err);
    res.status(500).json({ error: err.message || '视频生成失败' });
  }
});

// Poll video status
router.get('/status/:videoId', authMiddleware, async (req, res) => {
  try {
    const config = loadConfig();
    const { data } = await axios.get(
      `https://apihub.agnes-ai.com/agnesapi?video_id=${req.params.videoId}`,
      {
        headers: { Authorization: `Bearer ${config.apiKey}` },
        timeout: 15000
      }
    );
    res.json(data);
  } catch (err) {
    console.error('Video status error:', err);
    res.status(500).json({ error: '获取视频状态失败' });
  }
});

export default router;