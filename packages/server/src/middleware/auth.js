import jwt from 'jsonwebtoken';

let _jwtSecret = 'agnes-server-secret-change-in-production';
export function setJwtSecret(s) { _jwtSecret = s; }
export const JWT_SECRET = () => _jwtSecret;

export function authMiddleware(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录，请先登录' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET());
    req.userId = decoded.userId;
    req.openid = decoded.openid;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: '登录已过期，请重新登录' });
    return res.status(401).json({ error: '无效的登录凭证' });
  }
}

export function optionalAuth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET());
    req.userId = decoded.userId;
    req.openid = decoded.openid;
  } catch {}
  next();
}

// 小程序 openid 鉴权（预留）：传 X-Client-Id + X-Openid 头
export function clientIdMiddleware(req, res, next) {
  req.clientId = req.headers['x-client-id'] || null;
  req.openidHeader = req.headers['x-openid'] || null;
  next();
}
