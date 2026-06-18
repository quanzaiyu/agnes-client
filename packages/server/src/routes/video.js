import express from 'express';
import { authMiddleware, clientIdMiddleware } from '../middleware/auth.js';
import { getAgnesClient } from '../services/agnes.js';
import * as pts from '../services/points.js';
import { HttpError } from '../middleware/error.js';

const router = express.Router();
router.use(clientIdMiddleware);
router.use(authMiddleware);

router.post('/generate', async (req, res, next) => {
  try {
    const { model, prompt, image, width, height } = req.body || {};
    if (!prompt && !image) throw new HttpError(400, '请提供提示词或参考图');
    const own = { userId: req.userId, clientId: req.clientId };
    const { logId } = pts.deduct({ owner: own, type: 'video' });
    try {
      const client = getAgnesClient();
      const task = await client.createVideo({ model: model || 'agnes-video-v2.0', prompt, image, width, height });
      pts.completeLog(logId, task);
      res.json(task);
    } catch (err) {
      pts.failLog(logId);
      pts.refund(logId);
      throw err;
    }
  } catch (e) { next(e); }
});

router.get('/status/:id', async (req, res, next) => {
  try {
    const client = getAgnesClient();
    const status = await client.getVideoStatus(req.params.id);
    res.json(status);
  } catch (e) { next(e); }
});

export default router;
