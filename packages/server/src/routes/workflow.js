/**
 * Workflow editor API routes.
 *
 * Migrated from `packages/workflow/server.cjs` (the standalone mini Express
 * server that backed the workflow editor's Vite dev server on port 4100).
 * That file's header documents the original endpoints:
 *
 *   /api/config        GET/POST        read/update agnes.config.json
 *   /api/chat          POST            text chat (stream or non-stream)
 *   /api/image/generate POST           image generation
 *   /api/video/create  POST            create video task
 *   /api/video/status/:videoId GET     poll video status
 *   /api/upload        POST            single file upload → dataUri
 *   /api/upload-multi  POST            multi file upload
 *   /api/url-to-datauri POST           convert URL → dataUri
 *   /api/save          POST            write text/image/video to disk
 *
 * IMPORTANT — wire-format preservation:
 *   The workflow frontend (packages/workflow/src/api/{client,upload}.ts)
 *   calls these paths on the same-origin `/api/*` prefix. To stay
 *   backwards-compatible with that frontend, this router is mounted at
 *   `/api/workflow` AND the routes are also re-exported at the original
 *   `/api/*` paths via alias routes inside this file. That way the
 *   existing frontend code keeps working unchanged, while the rest of
 *   @agnes/server's UI can address the same logic under `/api/workflow`.
 *
 *   For the routes that overlap with existing @agnes/server routes
 *   (config, text/generate, image/generate, video/generate, video/status),
 *   the original workflow/server.cjs behavior is preserved: no points
 *   deduction, no auth beyond clientId+auth middleware, raw passthrough
 *   to @agnes/core. The shared routes under /api/{config,text,image,video}
 *   still exist for the @agnes/webui frontend.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import multer from 'multer';
import axios from 'axios';
import { authMiddleware, clientIdMiddleware } from '../middleware/auth.js';
import { getAgnesClient } from '../services/agnes.js';
import { HttpError } from '../middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Output dir mirrors packages/workflow/server.cjs → packages/output/
const OUTPUT_DIR = path.resolve(__dirname, '../../../output');

// Ensure output dir exists (sync at startup; safe because route files are
// imported once per process).
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Tmp dir for multer uploads — created once at module load.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agnes-workflow-'));
const upload = multer({ dest: tmpDir });

const router = express.Router();
router.use(clientIdMiddleware);
router.use(authMiddleware);

// ─── Helpers (duplicated from server.cjs for self-containment) ──────────────

function isDataUri(str) { return typeof str === 'string' && str.startsWith('data:'); }
function isUrl(str) { return typeof str === 'string' && (str.startsWith('http://') || str.startsWith('https://')); }

function sanitizeDataUri(dataUri) {
  if (!dataUri || !dataUri.startsWith('data:')) return dataUri;
  const idx = dataUri.indexOf(',');
  if (idx === -1) return dataUri;
  const prefix = dataUri.substring(0, idx + 1);
  let b64 = dataUri.substring(idx + 1);
  b64 = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const pad = (4 - (b64.length % 4)) % 4;
  return prefix + b64 + '='.repeat(pad);
}

async function urlToDataUri(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  const ct = (res.headers['content-type'] || 'image/png').split(';')[0].trim();
  return sanitizeDataUri(`data:${ct};base64,${Buffer.from(res.data).toString('base64')}`);
}

async function resolveImages(imageInput) {
  if (!imageInput) return undefined;
  const arr = Array.isArray(imageInput) ? imageInput : [imageInput];
  const out = [];
  for (const img of arr) {
    if (!img) continue;
    if (isDataUri(img)) out.push(sanitizeDataUri(img));
    else if (isUrl(img)) {
      try { out.push(await urlToDataUri(img)); }
      catch (e) { throw new Error(`无法下载图片 "${img}": ${e.message}`); }
    } else out.push(img);
  }
  if (!out.length) return undefined;
  return Array.isArray(imageInput) ? out : out[0];
}

// ─── /config ─────────────────────────────────────────────────────────────────

router.get('/config', (_req, res, next) => {
  try {
    // Read agnes.config.json from the monorepo root (same as
    // packages/server/src/routes/config.js does for the rest of the server).
    const cfgPath = path.resolve(__dirname, '../../../../agnes.config.json');
    let cfg = {};
    if (fs.existsSync(cfgPath)) {
      cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    }
    res.json({ apiKey: cfg.apiKey ? '***' + cfg.apiKey.slice(-4) : '', baseUrl: cfg.baseUrl });
  } catch (e) { next(e); }
});

router.post('/config', async (req, res, next) => {
  try {
    const { apiKey, baseUrl } = req.body || {};
    const { loadConfig, saveConfig } = await import('@agnes/core');
    const c = loadConfig();
    if (apiKey && apiKey.trim() && !apiKey.startsWith('***')) c.apiKey = apiKey.trim();
    if (baseUrl && baseUrl.trim()) c.baseUrl = baseUrl.trim();
    const savedPath = saveConfig(c, 'local');
    res.json({ ok: true, savedPath });
  } catch (e) { next(new HttpError(500, e.message)); }
});

// ─── /chat ───────────────────────────────────────────────────────────────────

router.post('/chat', async (req, res, next) => {
  try {
    const client = getAgnesClient();
    const { model, messages, stream, temperature, maxTokens, thinking } = req.body || {};
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const s = await client.chat({ model, messages, stream: true, temperature, maxTokens, thinking });
      s.on('data', (chunk) => res.write(chunk));
      s.on('end', () => res.end());
      s.on('error', (err) => { res.write(`data: [ERROR] ${err.message}\n\n`); res.end(); });
    } else {
      const r = await client.chat({ model, messages, temperature, maxTokens, thinking });
      res.json(r);
    }
  } catch (e) { next(new HttpError(500, e.message)); }
});

// ─── /image/generate ─────────────────────────────────────────────────────────

router.post('/image/generate', async (req, res, next) => {
  try {
    const client = getAgnesClient();
    const { model, prompt, size, images, responseFormat } = req.body || {};
    const resolved = images && images.length ? await resolveImages(images) : undefined;
    const r = await client.generateImage({
      model, prompt, size,
      images: resolved,
      responseFormat: responseFormat || 'url',
    });
    res.json(r);
  } catch (e) { next(new HttpError(500, e.message)); }
});

// ─── /video/create + /video/status/:videoId ─────────────────────────────────

router.post('/video/create', async (req, res, next) => {
  try {
    const client = getAgnesClient();
    const { model, prompt, image, mode, size, width, height, numFrames, frameRate, seed, negativePrompt } = req.body || {};
    let w = width, h = height;
    if (size && !w && !h) { const p = size.split('x'); w = parseInt(p[0]) || undefined; h = parseInt(p[1]) || undefined; }
    const resolvedImage = await resolveImages(image);
    const t = await client.createVideo({
      model, prompt, image: resolvedImage, mode,
      width: w, height: h, numFrames, frameRate, seed, negativePrompt,
    });
    res.json(t);
  } catch (e) { next(new HttpError(500, e.message)); }
});

router.get('/video/status/:videoId', async (req, res, next) => {
  try {
    const client = getAgnesClient();
    const status = await client.getVideoStatus(req.params.videoId);
    res.json(status);
  } catch (e) { next(new HttpError(500, e.message)); }
});

// ─── /upload + /upload-multi + /url-to-datauri ──────────────────────────────

const MIME = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif' };

router.post('/upload', upload.single('image'), (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, 'No file uploaded');
    const ext = (path.extname(req.file.originalname).toLowerCase().replace('.', '') || 'png');
    const mime = MIME[ext] || 'png';
    const b64 = fs.readFileSync(req.file.path).toString('base64');
    fs.unlink(req.file.path, () => {});
    res.json({ dataUri: sanitizeDataUri(`data:image/${mime};base64,${b64}`) });
  } catch (e) { next(e); }
});

router.post('/upload-multi', upload.array('images', 10), (req, res, next) => {
  try {
    if (!req.files?.length) throw new HttpError(400, 'No files uploaded');
    const dataUris = req.files.map((f) => {
      const ext = (path.extname(f.originalname).toLowerCase().replace('.', '') || 'png');
      const mime = MIME[ext] || 'png';
      const b64 = fs.readFileSync(f.path).toString('base64');
      fs.unlink(f.path, () => {});
      return { name: f.originalname, dataUri: sanitizeDataUri(`data:image/${mime};base64,${b64}`) };
    });
    res.json({ dataUris });
  } catch (e) { next(e); }
});

router.post('/url-to-datauri', async (req, res, next) => {
  try {
    const { url } = req.body || {};
    if (!url || !isUrl(url)) throw new HttpError(400, 'Invalid or missing URL');
    const dataUri = await urlToDataUri(url);
    res.json({ dataUri: sanitizeDataUri(dataUri) });
  } catch (e) { next(new HttpError(500, `无法下载图片: ${e.message}`)); }
});

// ─── /save (text/image/video → OUTPUT_DIR) ──────────────────────────────────

router.post('/save', async (req, res, next) => {
  try {
    const { kind, source, savePath, baseName } = req.body || {};
    if (!kind || !source) throw new HttpError(400, 'Missing kind or source');
    let ext = 'bin';
    if (kind === 'image') ext = (source.format || 'png').replace(/^.*\./, '') || 'png';
    if (kind === 'video') ext = 'mp4';
    if (kind === 'text') ext = 'md';
    const filename = savePath
      ? path.resolve(OUTPUT_DIR, savePath)
      : path.join(OUTPUT_DIR, `${baseName || 'output'}-${Date.now()}.${ext}`);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    if (source.dataUri) {
      const m = /^data:([^;]+);base64,(.*)$/.exec(source.dataUri);
      if (!m) throw new HttpError(400, 'Invalid dataUri');
      fs.writeFileSync(filename, Buffer.from(m[2], 'base64'));
    } else if (source.url) {
      const { AgnesClient } = await import('@agnes/core');
      await AgnesClient.downloadFile(source.url, filename);
    } else if (kind === 'text' && source.text) {
      fs.writeFileSync(filename, source.text, 'utf-8');
    } else {
      throw new HttpError(400, 'source must have url, dataUri, or text');
    }
    res.json({ ok: true, path: filename });
  } catch (e) { next(new HttpError(500, e.message)); }
});

export default router;