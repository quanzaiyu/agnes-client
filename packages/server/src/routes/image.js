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
    const { model, prompt, size, n, image } = req.body || {};
    if (!prompt) throw new HttpError(400, '请提供提示词');
    const own = { userId: req.userId, clientId: req.clientId };
    const { logId } = pts.deduct({ owner: own, type: 'image' });
    try {
      const client = getAgnesClient();
      const result = await client.generateImage({ model: model || 'agnes-image-2.1-flash', prompt, size, n, image });
      pts.completeLog(logId, result);
      res.json(result);
    } catch (err) {
      pts.failLog(logId);
      pts.refund(logId);
      throw err;
    }
  } catch (e) { next(e); }
});

export default router;
