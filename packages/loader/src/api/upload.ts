/**
 * Upload helpers (Node-friendly). The webui backend stores files in tmp/,
 * returns a data URI (we never expose the file path to the browser).
 */

export interface UploadResult {
  dataUri: string;
}

export async function uploadImage(file: Blob & { name?: string }): Promise<UploadResult> {
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!res.ok) {
    const detail = await extractError(res);
    throw new Error(`Upload failed: ${detail}`);
  }
  return (await res.json()) as UploadResult;
}

export async function uploadImages(files: Array<Blob & { name?: string }>): Promise<Array<{ name: string; dataUri: string }>> {
  const fd = new FormData();
  for (const f of files) fd.append('images', f);
  const res = await fetch('/api/upload-multi', { method: 'POST', body: fd });
  if (!res.ok) {
    const detail = await extractError(res);
    throw new Error(`Upload failed: ${detail}`);
  }
  const j = (await res.json()) as { dataUris: Array<{ name: string; dataUri: string }> };
  return j.dataUris;
}

export interface SaveRequest {
  kind: 'text' | 'image' | 'video';
  source: { url?: string; dataUri?: string; text?: string; format?: string };
  savePath?: string;
  baseName?: string;
}

export async function saveOutput(req: SaveRequest): Promise<{ ok: true; path: string }> {
  const res = await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await extractError(res);
    throw new Error(`Save failed: ${detail}`);
  }
  return (await res.json()) as { ok: true; path: string };
}

export async function getConfig(): Promise<{ apiKey: string; baseUrl: string }> {
  const res = await fetch('/api/config');
  return (await res.json()) as { apiKey: string; baseUrl: string };
}

export async function setConfig(patch: { apiKey?: string; baseUrl?: string }): Promise<{ ok: boolean; savedPath?: string }> {
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return (await res.json()) as { ok: boolean; savedPath?: string };
}

async function extractError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error || res.statusText;
  } catch {
    return res.statusText;
  }
}
