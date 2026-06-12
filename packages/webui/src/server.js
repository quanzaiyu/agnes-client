'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');

const corePath = path.resolve(__dirname, '../../core/src');
const { AgnesClient, loadConfig, saveConfig } = require(corePath);

const app = express();
const PORT = process.env.PORT || 3000;

// Upload temp dir — ensure it exists
const tmpDir = path.join(__dirname, '../tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
const upload = multer({ dest: tmpDir });

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isDataUri(str) {
  return typeof str === 'string' && str.startsWith('data:');
}

function isUrl(str) {
  return typeof str === 'string' && (str.startsWith('http://') || str.startsWith('https://'));
}

/**
 * Sanitize a data URI: strip non-base64 chars from payload and fix padding.
 * Prevents "Incorrect padding" errors caused by JSON round-trip corruption.
 */
function sanitizeDataUri(dataUri) {
  if (!dataUri || !dataUri.startsWith('data:')) return dataUri;

  const commaIdx = dataUri.indexOf(',');
  if (commaIdx === -1) return dataUri;

  const prefix = dataUri.substring(0, commaIdx + 1);
  let b64 = dataUri.substring(commaIdx + 1);

  // Strip ALL non-base64 characters
  b64 = b64.replace(/[^A-Za-z0-9+/=]/g, '');

  // Fix padding to multiple of 4
  const padLen = (4 - (b64.length % 4)) % 4;
  if (padLen > 0) b64 += '='.repeat(padLen);

  return prefix + b64;
}

async function urlToDataUri(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  const contentType = response.headers['content-type'] || 'image/png';
  const mime = contentType.split(';')[0].trim();
  const b64 = Buffer.from(response.data).toString('base64');
  return sanitizeDataUri(`data:${mime};base64,${b64}`);
}

async function resolveImages(imageInput) {
  if (!imageInput) return undefined;

  const images = Array.isArray(imageInput) ? imageInput : [imageInput];
  const resolved = [];

  for (const img of images) {
    if (!img) continue;
    if (isDataUri(img)) {
      resolved.push(sanitizeDataUri(img));
    } else if (isUrl(img)) {
      try {
        resolved.push(await urlToDataUri(img));
      } catch (err) {
        throw new Error(`无法下载图片 "${img}": ${err.message}`);
      }
    } else {
      resolved.push(img);
    }
  }

  if (!resolved.length) return undefined;
  return Array.isArray(imageInput) ? resolved : resolved[0];
}

// ─── Config API ──────────────────────────────────────────────────────────────

app.get('/api/config', (req, res) => {
  const config = loadConfig();
  res.json({ apiKey: config.apiKey ? '***' + config.apiKey.slice(-4) : '', baseUrl: config.baseUrl });
});

app.post('/api/config', (req, res) => {
  try {
    const { apiKey, baseUrl } = req.body;
    const config = loadConfig();
    if (apiKey && apiKey.trim() && !apiKey.startsWith('***')) config.apiKey = apiKey.trim();
    if (baseUrl && baseUrl.trim()) config.baseUrl = baseUrl.trim();
    const savedPath = saveConfig(config, 'local');
    res.json({ ok: true, savedPath });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Text API ────────────────────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  try {
    const config = loadConfig();
    const client = new AgnesClient(config);
    const { model, messages, stream, temperature, maxTokens, thinking } = req.body;

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const streamData = await client.chat({ model, messages, stream: true, temperature, maxTokens, thinking });
      streamData.on('data', (chunk) => res.write(chunk));
      streamData.on('end', () => res.end());
      streamData.on('error', (err) => { res.write(`data: [ERROR] ${err.message}\n\n`); res.end(); });
    } else {
      const result = await client.chat({ model, messages, temperature, maxTokens, thinking });
      res.json(result);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Image Upload ────────────────────────────────────────────────────────────

// Single file upload
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '') || 'png';
  const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif' };
  const mime = mimeMap[ext] || 'png';
  const b64 = fs.readFileSync(req.file.path).toString('base64');
  fs.unlink(req.file.path, () => {});
  res.json({ dataUri: sanitizeDataUri(`data:image/${mime};base64,${b64}`) });
});

// Multiple file upload
app.post('/api/upload-multi', upload.array('images', 10), (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded' });
  const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif' };
  const dataUris = req.files.map(file => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '') || 'png';
    const mime = mimeMap[ext] || 'png';
    const b64 = fs.readFileSync(file.path).toString('base64');
    fs.unlink(file.path, () => {});
    return { name: file.originalname, dataUri: sanitizeDataUri(`data:image/${mime};base64,${b64}`) };
  });
  res.json({ dataUris });
});

// URL to Data URI conversion
app.post('/api/url-to-datauri', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !isUrl(url)) return res.status(400).json({ error: 'Invalid or missing URL' });
    const dataUri = await urlToDataUri(url);
    res.json({ dataUri: sanitizeDataUri(dataUri) });
  } catch (e) {
    res.status(500).json({ error: `无法下载图片: ${e.message}` });
  }
});

// ─── Image API ───────────────────────────────────────────────────────────────

app.post('/api/image/generate', async (req, res) => {
  try {
    const config = loadConfig();
    const client = new AgnesClient(config);
    const { model, prompt, size, images, responseFormat } = req.body;

    // Convert any image URLs to data URIs before sending to API
    const resolved = images && images.length ? await resolveImages(images) : undefined;

    const result = await client.generateImage({
      model, prompt, size,
      images: resolved,
      responseFormat: responseFormat || 'url',
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Video API ───────────────────────────────────────────────────────────────

app.post('/api/video/create', async (req, res) => {
  try {
    const config = loadConfig();
    const client = new AgnesClient(config);
    const { model, prompt, image, mode, size, width, height, numFrames, frameRate, seed, negativePrompt } = req.body;

    // Parse size string (e.g. "1216x832") into width/height
    let w = width, h = height;
    if (size && !w && !h) {
      const parts = size.split('x');
      w = parseInt(parts[0]) || undefined;
      h = parseInt(parts[1]) || undefined;
    }

    // Convert any image URLs to data URIs before sending to API
    const resolvedImage = await resolveImages(image);

    const task = await client.createVideo({
      model, prompt,
      image: resolvedImage,
      mode, width: w, height: h, numFrames, frameRate, seed, negativePrompt,
    });
    res.json(task);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/video/status/:videoId', async (req, res) => {
  try {
    const config = loadConfig();
    // Direct axios call — no keepAlive to avoid TLS stale-connection errors during polling
    const { data } = await axios.get(
      `https://apihub.agnes-ai.com/agnesapi?video_id=${req.params.videoId}`,
      {
        headers: { Authorization: `Bearer ${config.apiKey}` },
        timeout: 15000,
      }
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  Agnes AI WebUI running at http://localhost:${PORT}\n`);
});
