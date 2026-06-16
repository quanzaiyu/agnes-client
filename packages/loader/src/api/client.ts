/**
 * API client for the loader. The default base URL is `/api` (works behind a
 * reverse proxy or in browser). For standalone Node use, set `baseUrl` to the
 * full https://apihub.agnes-ai.com/v1 — and supply an Authorization header
 * (apiKey) via the `setAuth()` shim below.
 */

let BASE_URL = '/api';
let AUTH_HEADER: Record<string, string> = {};

export function setApiBase(url: string) {
  BASE_URL = url.replace(/\/+$/, '');
}
export function setApiKey(apiKey: string) {
  AUTH_HEADER = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  thinking?: boolean;
  signal?: AbortSignal;
}

export interface ChatResult {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: { role: string; content: string };
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface ImageOptions {
  model: string;
  prompt: string;
  size: string;
  images?: string[];
  responseFormat?: 'url' | 'b64_json';
  signal?: AbortSignal;
}

export interface ImageResult {
  created: number;
  data: Array<{ url?: string | null; b64_json?: string | null; revised_prompt?: string | null }>;
}

export interface VideoOptions {
  model: string;
  prompt: string;
  image?: string | string[];
  mode?: string;
  width: number;
  height: number;
  numFrames: number;
  frameRate: number;
  seed?: number;
  negativePrompt?: string;
  signal?: AbortSignal;
}

export interface VideoTask {
  id: string;
  task_id: string;
  video_id: string;
  object: string;
  model: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  created_at: number;
  seconds?: string;
  size?: string;
  remixed_from_video_id?: string;
  error?: unknown;
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return { 'Content-Type': 'application/json', ...AUTH_HEADER, ...extra };
}

export async function chat(opts: ChatOptions): Promise<ChatResult | AsyncIterable<string>> {
  if (opts.stream) {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: true,
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
        thinking: opts.thinking,
      }),
      signal: opts.signal,
    });
    if (!res.ok || !res.body) {
      const detail = await extractError(res);
      throw new Error(`Chat stream failed: ${res.status} ${detail}`);
    }
    return parseSseStream(res.body, opts.signal);
  }
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      thinking: opts.thinking,
    }),
    signal: opts.signal,
  });
  return await jsonOrThrow<ChatResult>(res);
}

export async function generateImage(opts: ImageOptions): Promise<ImageResult> {
  const body: Record<string, unknown> = {
    model: opts.model,
    prompt: opts.prompt,
    size: opts.size,
  };
  if (opts.images && opts.images.length) body.images = opts.images;
  if (opts.responseFormat) body.responseFormat = opts.responseFormat;
  const res = await fetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  return await jsonOrThrow<ImageResult>(res);
}

export async function createVideo(opts: VideoOptions): Promise<VideoTask> {
  const body: Record<string, unknown> = {
    model: opts.model,
    prompt: opts.prompt,
    size: `${opts.width}x${opts.height}`,
    num_frames: opts.numFrames,
    frame_rate: opts.frameRate,
  };
  if (opts.image) body.image = opts.image;
  if (opts.mode) body.mode = opts.mode;
  if (opts.seed !== undefined) body.seed = opts.seed;
  if (opts.negativePrompt) body.negative_prompt = opts.negativePrompt;
  const res = await fetch(`${BASE_URL}/videos`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  return await jsonOrThrow<VideoTask>(res);
}

export async function getVideoStatus(videoId: string, signal?: AbortSignal): Promise<VideoTask> {
  // The video status endpoint lives at apihub.agnes-ai.com/agnesapi (no /v1 prefix)
  // regardless of baseUrl, so we always hit it directly.
  const isAbsolute = /^https?:\/\//.test(BASE_URL);
  const url = isAbsolute
    ? `${BASE_URL.replace(/\/v1\/?$/, '')}/agnesapi?video_id=${encodeURIComponent(videoId)}`
    : `${BASE_URL.replace(/\/v1\/?$/, '')}/agnesapi?video_id=${encodeURIComponent(videoId)}`;
  const res = await fetch(url, { headers: headers(), signal });
  return await jsonOrThrow<VideoTask>(res);
}

export async function waitForVideo(
  videoId: string,
  opts: { signal?: AbortSignal; onProgress?: (pct: number, status: string) => void; pollInterval?: number; maxWait?: number } = {},
): Promise<VideoTask> {
  const start = Date.now();
  const pollInterval = opts.pollInterval ?? 5000;
  const maxWait = opts.maxWait ?? 600000;
  while (true) {
    if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const data = await getVideoStatus(videoId, opts.signal);
    opts.onProgress?.(data.progress ?? 0, data.status);
    if (data.status === 'completed') return data;
    if (data.status === 'failed') throw new Error(`Video generation failed: ${JSON.stringify(data.error)}`);
    if (Date.now() - start > maxWait) throw new Error('Video generation timed out');
    await new Promise<void>((r, j) => {
      const t = setTimeout(r, pollInterval);
      opts.signal?.addEventListener('abort', () => { clearTimeout(t); j(new DOMException('Aborted', 'AbortError')); });
    });
  }
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await extractError(res);
    throw new Error(`${res.status} ${detail}`);
  }
  return (await res.json()) as T;
}

async function extractError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    let j: unknown = null;
    try { j = JSON.parse(text); } catch { /* not JSON */ }
    if (j && typeof j === 'object') {
      const obj = j as { error?: unknown; message?: unknown; detail?: unknown };
      if (typeof obj.error === 'string') return obj.error;
      if (typeof obj.message === 'string') return obj.message;
      if (typeof obj.detail === 'string') return obj.detail;
      if (obj.error && typeof obj.error === 'object') {
        const e = obj.error as { message?: unknown; type?: unknown; code?: unknown };
        if (typeof e.message === 'string') return e.message;
        if (typeof e.type === 'string') return e.type;
        if (typeof e.code === 'string') return e.code;
        return JSON.stringify(e);
      }
    }
    return text || res.statusText;
  } catch {
    return res.statusText;
  }
}

async function* parseSseStream(body: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const evt = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        for (const line of evt.split('\n')) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (data === '[DONE]' || data === '[ERROR]') continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) yield delta as string;
            } catch { /* ignore */ }
          }
        }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }
}
