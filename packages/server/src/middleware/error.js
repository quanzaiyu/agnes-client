import { logger } from '../utils/logger.js';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  logger.error(`${req.method} ${req.url} → ${status}`, err.message, err.stack);
  res.status(status).json({ error: err.message || '服务器错误', details: err.details });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not Found', path: req.url });
}
