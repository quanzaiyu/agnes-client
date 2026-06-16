/**
 * Mini Express backend for the workflow editor. Mirrors the parts of
 * packages/webui/src/server.js that the frontend needs:
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
 * Run on port 4100 by default. Vite dev proxies /api → :4100.
 *
 * API Key is read from agnes.config.json (loaded via @agnes/core) and never
 * exposed to the browser.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');

// Resolve @agnes/core relative to monorepo root (this file is in
// packages/workflow/, @agnes/core is in packages/core/src).
const corePath = path.resolve(__dirname, '../core/src');
const { AgnesClient, loadConfig, saveConfig } = require(corePath);

const PORT = process.env.WORKFLOW_API_PORT || 4100;
const OUTPUT_DIR = path.resolve(__dirname, '../../output');

// Ensure output dir exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Tmp dir for multer
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agnes-workflow-'));
const upload = multer({ dest: tmpDir });

const app = express();
app.use(cors());
app.use(express.json({ limit: '200mb' }));

// Serve built static files from dist directory
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else {
  // Fallback to source directory during development
  app.use(express.static(__dirname));
}

// ─── Helpers (duplicated from webui for self-containment) ────────────────────

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
    else if (isUrl(img)) { try { out.push(await urlToDataUri(img)); } catch (e) { throw new Error(`无法下载图片 "${img}": ${e.message}`); } }
    else out.push(img);
  }
  if (!out.length) return undefined;
  return Array.isArray(imageInput) ? out : out[0];
}

// ─── Config API ──────────────────────────────────────────────────────────────

app.get('/api/config', (_req, res) => {
  const c = loadConfig();
  res.json({ apiKey: c.apiKey ? '***' + c.apiKey.slice(-4) : '', baseUrl: c.baseUrl });
});

app.post('/api/config', (req, res) => {
  try {
    const { apiKey, baseUrl } = req.body || {};
    const c = loadConfig();
    if (apiKey && apiKey.trim() && !apiKey.startsWith('***')) c.apiKey = apiKey.trim();
    if (baseUrl && baseUrl.trim()) c.baseUrl = baseUrl.trim();
    const savedPath = saveConfig(c, 'local');
    res.json({ ok: true, savedPath });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Chat API ────────────────────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  try {
    const client = new AgnesClient(loadConfig());
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Image API ───────────────────────────────────────────────────────────────

app.post('/api/image/generate', async (req, res) => {
  try {
    const client = new AgnesClient(loadConfig());
    const { model, prompt, size, images, responseFormat } = req.body || {};
    const resolved = images && images.length ? await resolveImages(images) : undefined;
    const r = await client.generateImage({ model, prompt, size, images: resolved, responseFormat: responseFormat || 'url' });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Video API ───────────────────────────────────────────────────────────────

app.post('/api/video/create', async (req, res) => {
  try {
    const client = new AgnesClient(loadConfig());
    const { model, prompt, image, mode, size, width, height, numFrames, frameRate, seed, negativePrompt } = req.body || {};
    let w = width, h = height;
    if (size && !w && !h) { const p = size.split('x'); w = parseInt(p[0]) || undefined; h = parseInt(p[1]) || undefined; }
    const resolvedImage = await resolveImages(image);
    const t = await client.createVideo({ model, prompt, image: resolvedImage, mode, width: w, height: h, numFrames, frameRate, seed, negativePrompt });
    res.json(t);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/video/status/:videoId', async (req, res) => {
  try {
    const cfg = loadConfig();
    const { data } = await axios.get(
      `https://apihub.agnes-ai.com/agnesapi?video_id=${req.params.videoId}`,
      { headers: { Authorization: `Bearer ${cfg.apiKey}` }, timeout: 15000 },
    );
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Upload ──────────────────────────────────────────────────────────────────

const MIME = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif' };

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const ext = (path.extname(req.file.originalname).toLowerCase().replace('.', '') || 'png');
  const mime = MIME[ext] || 'png';
  const b64 = fs.readFileSync(req.file.path).toString('base64');
  fs.unlink(req.file.path, () => {});
  res.json({ dataUri: sanitizeDataUri(`data:image/${mime};base64,${b64}`) });
});

app.post('/api/upload-multi', upload.array('images', 10), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });
  const dataUris = req.files.map((f) => {
    const ext = (path.extname(f.originalname).toLowerCase().replace('.', '') || 'png');
    const mime = MIME[ext] || 'png';
    const b64 = fs.readFileSync(f.path).toString('base64');
    fs.unlink(f.path, () => {});
    return { name: f.originalname, dataUri: sanitizeDataUri(`data:image/${mime};base64,${b64}`) };
  });
  res.json({ dataUris });
});

app.post('/api/url-to-datauri', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || !isUrl(url)) return res.status(400).json({ error: 'Invalid or missing URL' });
    res.json({ dataUri: sanitizeDataUri(await urlToDataUri(url)) });
  } catch (e) { res.status(500).json({ error: `无法下载图片: ${e.message}` }); }
});

// ─── Save (text/image/video to ./output/) ────────────────────────────────────

app.post('/api/save', async (req, res) => {
  try {
    const { kind, source, savePath, baseName } = req.body || {};
    if (!kind || !source) return res.status(400).json({ error: 'Missing kind or source' });
    let ext = 'bin';
    if (kind === 'image') ext = (source.format || 'png').replace(/^.*\./, '') || 'png';
    if (kind === 'video') ext = 'mp4';
    if (kind === 'text') ext = 'md';
    const filename = savePath ? path.resolve(OUTPUT_DIR, savePath) : path.join(OUTPUT_DIR, `${baseName || 'output'}-${Date.now()}.${ext}`);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    if (source.dataUri) {
      const m = /^data:([^;]+);base64,(.*)$/.exec(source.dataUri);
      if (!m) return res.status(400).json({ error: 'Invalid dataUri' });
      fs.writeFileSync(filename, Buffer.from(m[2], 'base64'));
    } else if (source.url) {
      const { downloadFile } = require(path.resolve(__dirname, '../core/src/client'));
      await downloadFile(source.url, filename);
    } else if (kind === 'text' && source.text) {
      fs.writeFileSync(filename, source.text, 'utf-8');
    } else {
      return res.status(400).json({ error: 'source must have url, dataUri, or text' });
    }
    res.json({ ok: true, path: filename });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Start ───────────────────────────────────────────────────────────────────

// Serve index.html for all other routes (SPA support)
app.get('*', (_req, res) => {
  const distIndex = path.join(__dirname, 'dist', 'index.html');
  const srcIndex = path.join(__dirname, 'index.html');
  res.sendFile(fs.existsSync(distIndex) ? distIndex : srcIndex);
});

app.listen(PORT, () => {
  console.log(`\n  Agnes workflow API running at http://localhost:${PORT}\n`);
  console.log(`  Output dir: ${OUTPUT_DIR}`);
  console.log(`  Tmp dir:    ${tmpDir}\n`);
});
