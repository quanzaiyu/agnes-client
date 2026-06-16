import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/index.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import pointsRoutes from './routes/points.js';
import textRoutes from './routes/text.js';
import imageRoutes from './routes/image.js';
import videoRoutes from './routes/video.js';
import configRoutes from './routes/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
await initDatabase();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '200mb' }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/text', textRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/config', configRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(staticPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n  🚀 Agnes WebUI running at http://localhost:${PORT}\n`);
});

export default app;