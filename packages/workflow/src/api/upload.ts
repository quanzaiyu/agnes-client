/**
 * Upload helpers. The webui backend stores files in tmp/, returns a data URI
 * (we never expose the file path to the browser).
 */

export interface UploadResult {
  dataUri: string;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).error || detail; } catch { /* ignore */ }
    throw new Error(`Upload failed: ${detail}`);
  }
  return res.json();
}

export async function uploadImages(files: File[]): Promise<Array<{ name: string; dataUri: string }>> {
  const fd = new FormData();
  for (const f of files) fd.append('images', f);
  const res = await fetch('/api/upload-multi', { method: 'POST', body: fd });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).error || detail; } catch { /* ignore */ }
    throw new Error(`Upload failed: ${detail}`);
  }
  const j = await res.json();
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
    let detail = res.statusText;
    try { detail = (await res.json()).error || detail; } catch { /* ignore */ }
    throw new Error(`Save failed: ${detail}`);
  }
  return res.json();
}

/** Get current API config (apiKey is masked, baseUrl is full). */
export async function getConfig(): Promise<{ apiKey: string; baseUrl: string }> {
  const res = await fetch('/api/config');
  return res.json();
}

export async function setConfig(patch: { apiKey?: string; baseUrl?: string }): Promise<{ ok: boolean; savedPath?: string }> {
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return res.json();
}
