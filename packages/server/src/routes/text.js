import express from 'express';
import { authMiddleware, clientIdMiddleware } from '../middleware/auth.js';
import { getAgnesClient } from '../services/agnes.js';
import * as pts from '../services/points.js';
import { setupSseHeaders, writeSse, endSse } from '../services/stream.js';
import { HttpError } from '../middleware/error.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
router.use(clientIdMiddleware);
router.use(authMiddleware);

const owner = (req) => ({ userId: req.userId, clientId: req.clientId });

router.post('/generate', async (req, res, next) => {
  try {
    const { model, messages, stream, temperature, maxTokens, thinking } = req.body || {};
    if (!messages || !Array.isArray(messages)) throw new HttpError(400, '请提供有效的对话消息');

    const own = owner(req);
    const { logId } = pts.deduct({ owner: own, type: 'text' });

    const client = getAgnesClient();

    if (stream) {
      setupSseHeaders(res);
      let aborted = false;
      req.on('close', () => { aborted = true; });
      try {
        const nodeStream = await client.chat({ model, messages, stream: true, temperature, maxTokens, thinking });
        // AgnesClient.chat({ stream: true }) returns a Node Readable stream.
        // Consume via EventEmitter API: 'data' / 'end' / 'error'.
        await new Promise((resolve, reject) => {
          nodeStream.on('data', (chunk) => {
            if (aborted) return;
            try {
              res.write(chunk);
            } catch (writeErr) {
              reject(writeErr);
            }
          });
          nodeStream.on('end', () => resolve());
          nodeStream.on('error', (err) => reject(err));
        });
        if (!aborted) {
          pts.completeLog(logId);
          endSse(res);
        } else {
          // Client disconnected: mark log complete (data was streamed),
          // refund is NOT needed (work was delivered).
          pts.completeLog(logId);
        }
      } catch (err) {
        logger.error('text generate stream error', err);
        pts.failLog(logId);
        pts.refund(logId);
        if (!aborted && !res.writableEnded) {
          try { writeSse(res, 'error', { error: err.message }); } catch {}
        }
        if (!res.writableEnded) {
          try { res.end(); } catch {}
        }
      }
    } else {
      try {
        const result = await client.chat({ model, messages, stream: false, temperature, maxTokens, thinking });
        pts.completeLog(logId, result);
        res.json(result);
      } catch (err) {
        logger.error('text generate error', err);
        pts.failLog(logId);
        pts.refund(logId);
        throw err;
      }
    }
  } catch (e) { next(e); }
});

export default router;