import express from 'express';
import axios from 'axios';
import { get, run } from '../db/index.js';
import { loadConfig } from '@agnes/core';
import { AgnesClient } from '@agnes/core';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const POINTS_COST = 1; // 1 point for image generation

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

async function resolveImages(images) {
  if (!images || !images.length) return undefined;
  const resolved = [];
  for (const img of images) {
    if (!img) continue;
    if (isDataUri(img)) {
      resolved.push(img);
    } else if (isUrl(img)) {
      try {
        resolved.push(await urlToDataUri(img));
      } catch (err) {
        throw new Error(`无法下载图片: ${err.message}`);
      }
    }
  }
  return resolved.length ? resolved : undefined;
}

// Image generation
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { model, prompt, size, images, responseFormat } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: '请提供图片描述' });
    }

    // Check points
    const user = get('SELECT points FROM users WHERE id = ?', req.userId);
    if (user.points < POINTS_COST) {
      return res.status(402).json({ error: `积分不足，需要 ${POINTS_COST} 积分，当前余额 ${user.points}` });
    }

    // Create pending log
    run('INSERT INTO generation_logs (user_id, type, cost_points, status) VALUES (?, ?, ?, ?)', req.userId, 'image', POINTS_COST, 'processing');
    const logId = get('SELECT last_insert_rowid() as id').id;

    try {
      // Resolve image URLs
      const resolvedImages = await resolveImages(images);

      // Call AI API
      const config = loadConfig();
      console.log('Image API config:', { baseUrl: config.baseUrl, hasKey: !!config.apiKey });

      const client = new AgnesClient(config);

      console.log('Calling generateImage with:', { model: model || 'agnes-image-2.1-flash', prompt, size, hasImages: !!resolvedImages });

      const result = await client.generateImage({
        model: model || 'agnes-image-2.1-flash',
        prompt,
        size: size || '1024x1024',
        images: resolvedImages,
        responseFormat: responseFormat || 'url'
      });

      console.log('Image result:', result);

      // Deduct points after completion
      run('UPDATE users SET points = points - ? WHERE id = ?', POINTS_COST, req.userId);
      run("UPDATE generation_logs SET status = 'completed', result = ?, completed_at = datetime('now') WHERE id = ?", JSON.stringify(result), logId);

      res.json(result);
    } catch (apiErr) {
      console.error('API Error:', apiErr);
      run("UPDATE generation_logs SET status = 'failed' WHERE id = ?", logId);
      res.status(500).json({ error: apiErr.message || '图片生成失败' });
      return;
    }
  } catch (err) {
    console.error('Image generation error:', err);
    res.status(500).json({ error: err.message || '图片生成失败' });
  }
});

export default router;