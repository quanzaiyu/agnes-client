import express from 'express';
import { get, run, all } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get points balance
router.get('/', authMiddleware, (req, res) => {
  try {
    const user = get('SELECT points FROM users WHERE id = ?', req.userId);
    res.json({ points: user?.points || 0 });
  } catch (err) {
    console.error('Get points error:', err);
    res.status(500).json({ error: '获取积分失败' });
  }
});

// Check if checked in today
router.get('/checkin-status', authMiddleware, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const record = get('SELECT * FROM checkins WHERE user_id = ? AND checkin_date = ?', req.userId, today);
    res.json({ checkedIn: !!record });
  } catch (err) {
    console.error('Check checkin status error:', err);
    res.status(500).json({ error: '获取签到状态失败' });
  }
});

// Check in
router.post('/checkin', authMiddleware, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if already checked in today
    const existing = get('SELECT * FROM checkins WHERE user_id = ? AND checkin_date = ?', req.userId, today);
    if (existing) {
      return res.status(400).json({ error: '今日已签到，明天再来吧！' });
    }

    // Record check-in
    run('INSERT INTO checkins (user_id, checkin_date, points_earned) VALUES (?, ?, 10)', req.userId, today);

    // Add points
    run('UPDATE users SET points = points + 10 WHERE id = ?', req.userId);

    // Get updated points
    const user = get('SELECT points FROM users WHERE id = ?', req.userId);

    res.json({
      ok: true,
      points: user.points,
      earned: 10,
      message: '签到成功！获得 10 积分'
    });
  } catch (err) {
    console.error('Check in error:', err);
    res.status(500).json({ error: '签到失败' });
  }
});

// Get points history
router.get('/history', authMiddleware, (req, res) => {
  try {
    // Get check-in history
    const checkins = all(`
      SELECT checkin_date as date, points_earned as points, '签到' as type
      FROM checkins WHERE user_id = ?
      ORDER BY checkin_date DESC LIMIT 30
    `, req.userId);

    // Get generation history
    const generations = all(`
      SELECT DATE(created_at) as date, cost_points as points, type, status
      FROM generation_logs WHERE user_id = ? AND status = 'completed'
      ORDER BY created_at DESC LIMIT 30
    `, req.userId).map(g => ({
      date: g.date,
      points: -g.points,
      type: g.type === 'text' ? '文本生成' : g.type === 'image' ? '图片生成' : '视频生成'
    }));

    // Merge and sort
    const history = [...checkins, ...generations].sort((a, b) => b.date.localeCompare(a.date));

    res.json({ history });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: '获取历史记录失败' });
  }
});

export default router;