import express from 'express';
import { authMiddleware, clientIdMiddleware } from '../middleware/auth.js';
import * as pts from '../services/points.js';
import { HttpError } from '../middleware/error.js';

const router = express.Router();
router.use(clientIdMiddleware);
router.use(authMiddleware);

const ownerFromReq = (req) => ({ userId: req.userId, clientId: req.clientId });

router.get('/', (req, res, next) => {
  try { res.json({ points: pts.getBalance(ownerFromReq(req)) }); }
  catch (e) { next(e); }
});

router.get('/checkin-status', (req, res, next) => {
  try { res.json({ checkedIn: pts.getCheckinStatus(ownerFromReq(req)) }); }
  catch (e) { next(e); }
});

router.post('/checkin', (req, res, next) => {
  try {
    const r = pts.checkin(ownerFromReq(req));
    res.json({ ok: true, points: r.points, earned: r.earned, message: `签到成功！获得 ${r.earned} 积分` });
  } catch (e) { next(e); }
});

router.get('/history', (req, res, next) => {
  try { res.json({ history: pts.getHistory(ownerFromReq(req)) }); }
  catch (e) { next(e); }
});

export default router;