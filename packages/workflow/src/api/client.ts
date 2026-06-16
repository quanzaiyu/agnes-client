/**
 * Browser-side API client.
 *
 * The workflow editor always calls /api/* (same-origin) which the Vite dev
 * server (or @agnes/webui's Express in production) proxies to Agnes AI. This
 * avoids CORS and keeps the API key on the server.
 *
 * For streaming, we use fetch + ReadableStream (browser-friendly replacement
 * for the Node stream returned by @agnes/core).
 */

const BASE = '/api';

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
  images?: string[];        // URLs or data URIs
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

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = j.error || JSON.stringify(j);
    } catch { /* ignore */ }
    throw new Error(`${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}

export async function chat(opts: ChatOptions): Promise<ChatResult | AsyncIterable<string>> {
  if (opts.stream) {
    const res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: true,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
        thinking: opts.thinking,
      }),
      signal: opts.signal,
    });
    if (!res.ok || !res.body) {
      const detail = await res.text();
      throw new Error(`Chat stream failed: ${res.status} ${detail}`);
    }
    return parseSseStream(res.body, opts.signal);
  }
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      thinking: opts.thinking,
    }),
    signal: opts.signal,
  });
  return jsonOrThrow<ChatResult>(res);
}

export async function generateImage(opts: ImageOptions): Promise<ImageResult> {
  const res = await fetch(`${BASE}/image/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      prompt: opts.prompt,
      size: opts.size,
      images: opts.images,
      responseFormat: opts.responseFormat || 'url',
    }),
    signal: opts.signal,
  });
  return jsonOrThrow<ImageResult>(res);
}

export async function createVideo(opts: VideoOptions): Promise<VideoTask> {
  const res = await fetch(`${BASE}/video/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      prompt: opts.prompt,
      image: opts.image,
      mode: opts.mode,
      size: `${opts.width}x${opts.height}`,
      numFrames: opts.numFrames,
      frameRate: opts.frameRate,
      seed: opts.seed,
      negativePrompt: opts.negativePrompt,
    }),
    signal: opts.signal,
  });
  return jsonOrThrow<VideoTask>(res);
}

export async function getVideoStatus(videoId: string, signal?: AbortSignal): Promise<VideoTask> {
  const res = await fetch(`${BASE}/video/status/${encodeURIComponent(videoId)}`, { signal });
  return jsonOrThrow<VideoTask>(res);
}

/** Poll video status until completion or failure. */
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

/** Parse SSE text/event-stream into a string AsyncIterable (yielding only content deltas). */
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
      // SSE messages are separated by a blank line (\n\n). We split on newlines
      // and accumulate until we see a blank line.
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
