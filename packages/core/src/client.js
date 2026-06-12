const axios = require('axios');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Keep-alive agents to avoid socket hang up on long requests
const httpAgent = new http.Agent({ keepAlive: true, keepAliveMsecs: 30000 });
const httpsAgent = new https.Agent({ keepAlive: true, keepAliveMsecs: 30000 });

class AgnesClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://apihub.agnes-ai.com/v1').replace(/\/$/, '');

    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 300000, // 5 min default
      httpAgent,
      httpsAgent,
    });

    // Separate instance for video status query (different base URL /agnesapi).
    // KeepAlive is DISABLED here — polling every 5s means connections are idle
    // most of the time, and the server will close them. Reusing a stale socket
    // causes "socket disconnected before secure TLS connection was established".
    this.videoHttp = axios.create({
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      timeout: 30000,
    });
  }

  // ─── Text ────────────────────────────────────────────────────────────────────

  /**
   * Chat completion (text / vision)
   */
  async chat({ model, messages, stream = false, temperature, maxTokens, tools, thinking }) {
    const body = { model, messages, stream };
    if (temperature !== undefined) body.temperature = temperature;
    if (maxTokens !== undefined) body.max_tokens = maxTokens;
    if (tools) { body.tools = tools; }
    if (thinking) {
      body.chat_template_kwargs = { enable_thinking: true };
    }

    if (stream) {
      const response = await this.http.post('/chat/completions', body, {
        responseType: 'stream',
        timeout: 180000,
      });
      return response.data;
    }

    const { data } = await this.http.post('/chat/completions', body);
    return data;
  }

  // ─── Image ───────────────────────────────────────────────────────────────────

  /**
   * Generate image (text-to-image or image-to-image)
   * Supports both URLs and data URIs in the images array.
   */
  async generateImage({ model, prompt, size = '1024x1024', images, responseFormat = 'url' }) {
    const body = { model, prompt, size };

    if (images && images.length > 0) {
      // Convert any image URLs to data URIs
      const resolvedImages = await Promise.all(
        images.map(img => AgnesClient.resolveImage(img))
      );
      body.extra_body = { image: resolvedImages, response_format: responseFormat };
    } else {
      // text2img
      if (responseFormat === 'b64_json') {
        body.return_base64 = true;
      } else {
        body.extra_body = { response_format: responseFormat };
      }
    }

    const { data } = await this.http.post('/images/generations', body, {
      timeout: 600000, // 10 min for large images
    });
    return data;
  }

  // ─── Video ───────────────────────────────────────────────────────────────────

  /**
   * Create a video generation task.
   * image can be: a URL string, a data URI string, or an array of URLs/data URIs.
   */
  async createVideo({ model, prompt, image, mode, width = 1152, height = 768, numFrames = 121, frameRate = 24, seed, negativePrompt }) {
    const body = { model, prompt, width, height, num_frames: numFrames, frame_rate: frameRate };

    if (image) {
      if (Array.isArray(image) && image.length > 1) {
        // Multi-image: convert all to data URIs
        const resolvedImages = await Promise.all(
          image.map(img => AgnesClient.resolveImage(img))
        );
        body.extra_body = { image: resolvedImages };
        if (mode) body.extra_body.mode = mode;
      } else if (Array.isArray(image) && image.length === 1) {
        body.image = await AgnesClient.resolveImage(image[0]);
      } else {
        body.image = await AgnesClient.resolveImage(image);
      }
    }

    if (mode && !body.extra_body) body.mode = mode;
    if (seed !== undefined) body.seed = seed;
    if (negativePrompt) body.negative_prompt = negativePrompt;

    const { data } = await this.http.post('/videos', body, { timeout: 30000 });
    return data;
  }

  /**
   * Poll video task status until completed or failed
   */
  async waitForVideo(videoId, { pollInterval = 5000, maxWait = 600000, onProgress } = {}) {
    const start = Date.now();
    while (true) {
      const { data } = await this.videoHttp.get(
        `https://apihub.agnes-ai.com/agnesapi?video_id=${videoId}`,
        { timeout: 15000 }
      );

      if (onProgress) onProgress(data.progress, data.status);

      if (data.status === 'completed') return data;
      if (data.status === 'failed') throw new Error(`Video generation failed: ${JSON.stringify(data.error)}`);

      if (Date.now() - start > maxWait) throw new Error('Video generation timed out');
      await new Promise(r => setTimeout(r, pollInterval));
    }
  }

  // ─── Utilities ───────────────────────────────────────────────────────────────

  /**
   * Sanitize a data URI: strip whitespace from the base64 payload and fix padding.
   * JSON round-trips or buffer operations can sometimes corrupt base64 padding,
   * leading to "Incorrect padding" errors from the API.
   */
  static sanitizeDataUri(dataUri) {
    if (!dataUri || !dataUri.startsWith('data:')) return dataUri;

    // Split at the comma: "data:image/png;base64,<base64>"
    const commaIdx = dataUri.indexOf(',');
    if (commaIdx === -1) return dataUri;

    const prefix = dataUri.substring(0, commaIdx + 1); // includes the comma
    let b64 = dataUri.substring(commaIdx + 1);

    // Strip ALL non-base64 characters (whitespace, newlines, etc.)
    b64 = b64.replace(/[^A-Za-z0-9+/=]/g, '');

    // Fix base64 padding (must be a multiple of 4)
    const padLen = (4 - (b64.length % 4)) % 4;
    b64 += '='.repeat(padLen);

    return prefix + b64;
  }

  /**
   * Convert an image reference (URL, data URI, or local path) to a data URI.
   * Data URIs and local paths are returned as-is / converted.
   * URLs are downloaded and converted.
   */
  static async resolveImage(img) {
    if (!img) return img;

    // Already a data URI — sanitize before returning
    if (img.startsWith('data:')) return AgnesClient.sanitizeDataUri(img);

    // Local file path
    if (fs.existsSync(img)) {
      const ext = path.extname(img).toLowerCase().replace('.', '') || 'png';
      const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif', bmp: 'bmp' };
      const mime = mimeMap[ext] || 'png';
      const b64 = fs.readFileSync(img).toString('base64');
      return `data:image/${mime};base64,${b64}`;
    }

    // It's a URL — download and convert to data URI
    if (img.startsWith('http://') || img.startsWith('https://')) {
      try {
        const response = await axios.get(img, {
          responseType: 'arraybuffer',
          timeout: 30000,
          httpAgent,
          httpsAgent,
        });
        const contentType = response.headers['content-type'] || 'image/png';
        const mime = contentType.split(';')[0].trim();
        const b64 = Buffer.from(response.data).toString('base64');
        return `data:${mime};base64,${b64}`;
      } catch (err) {
        throw new Error(`Failed to download image from URL "${img}": ${err.message}`);
      }
    }

    // Unknown format, return as-is
    return img;
  }

  /**
   * Download a URL to a local file
   */
  static async downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      const file = fs.createWriteStream(destPath);

      const protocol = url.startsWith('https') ? https : require('http');
      protocol.get(url, { agent: url.startsWith('https') ? httpsAgent : httpAgent }, response => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(destPath); });
      }).on('error', reject);
    });
  }

  /**
   * Save base64 image data to a file
   */
  static saveBase64Image(b64, destPath) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, Buffer.from(b64, 'base64'));
    return destPath;
  }
}

module.exports = { AgnesClient };
