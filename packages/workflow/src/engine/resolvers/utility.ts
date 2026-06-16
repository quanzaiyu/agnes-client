/**
 * Resolvers for utility/IO nodes (input, output, combine, model, size, etc.).
 * These do not call the Agnes API directly — they shape data.
 */

import type { Resolver, PortValue } from '../types';

export const promptInput: Resolver = async (node) => {
  const p = node.data.params || {};
  const text = (p.text as string) || '';
  return { text };
};

export const variableInput: Resolver = async (node) => {
  const p = node.data.params || {};
  const name = (p.name as string) || '';
  const value = (p.value as string) ?? '';
  return { text: value, __varName: name };
};

export const textInput: Resolver = async (node) => {
  const p = node.data.params || {};
  return { text: (p.value as string) || '' };
};

export const textCombine: Resolver = async (node, ctx) => {
  const p = node.data.params || {};
  const a = (ctx.resolvePort(node.id, 'a') as string) || '';
  const b = (ctx.resolvePort(node.id, 'b') as string) || '';
  const sep = (p.separator as string) ?? '\n';
  return { text: `${a}${sep}${b}` };
};

export const imageInput: Resolver = async (node) => {
  const p = node.data.params || {};
  const url = (p.url as string) || '';
  const dataUri = (p.dataUri as string) || '';
  if (!url && !dataUri) throw new Error('未上传图片');
  return { image: { url: url || dataUri, dataUri: dataUri || url } };
};

export const sizeSelector: Resolver = async (node) => {
  const p = node.data.params || {};
  const preset = (p.preset as string) || '1024x1024';
  const customSize = (p.customSize as string) || '';
  let value = preset;
  if (preset === 'custom') {
    value = customSize || '1024x1024';
  }
  const m = /^(\d+)x(\d+)$/.exec(value);
  if (!m) throw new Error(`无效尺寸: ${value}`);
  return { size: { width: parseInt(m[1]), height: parseInt(m[2]) } as PortValue };
};

export const numberInput: Resolver = async (node) => {
  const p = node.data.params || {};
  const v = p.value;
  return { number: typeof v === 'number' ? v : Number(v) || 0 };
};

export const modelSelector: Resolver = async (node) => {
  const p = node.data.params || {};
  return { text: (p.model as string) || '' };
};

export const videoFrameExtract: Resolver = async (node, ctx) => {
  const p = node.data.params || {};
  const video = ctx.resolvePort(node.id, 'video') as { url: string } | undefined;
  if (!video?.url) throw new Error('未连接视频');
  const frameIdx = (p.frame as number) ?? 0;
  const format = ((p.format as string) || 'png') as 'png' | 'jpeg';
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  // Browser-side: load <video>, seek, draw to canvas
  const dataUri = await new Promise<string>((resolve, reject) => {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.preload = 'auto';
    v.muted = true;
    v.playsInline = true;
    v.src = video.url;
    const cleanup = () => { v.removeAttribute('src'); v.load(); };
    const fail = (msg: string) => { cleanup(); reject(new Error(msg)); };
    v.addEventListener('error', () => fail('视频加载失败'));
    v.addEventListener('loadedmetadata', () => {
      const t = Math.min(frameIdx / Math.max(v.duration, 0.001), Math.max(0, v.duration - 0.05));
      v.currentTime = t;
    }, { once: true });
    v.addEventListener('seeked', () => {
      try {
        const c = document.createElement('canvas');
        c.width = v.videoWidth || 640;
        c.height = v.videoHeight || 360;
        const ctx2d = c.getContext('2d');
        if (!ctx2d) return fail('canvas 不可用');
        ctx2d.drawImage(v, 0, 0, c.width, c.height);
        const data = c.toDataURL(mime, 0.92);
        cleanup();
        resolve(data);
      } catch (e) {
        fail((e as Error).message);
      }
    }, { once: true });
  });

  return { image: { url: dataUri, dataUri, source: 'video-frame' } as PortValue };
};

export const previewOutput: Resolver = async (node, ctx) => {
  // PreviewOutput doesn't need to do anything; the UI reads the upstream
  // value from `data.outputs` (already populated by upstream).
  const text = ctx.resolvePort(node.id, 'text') as string | undefined;
  const image = ctx.resolvePort(node.id, 'image') as { url: string } | undefined;
  const video = ctx.resolvePort(node.id, 'video') as { url: string } | undefined;
  // No outputs
  void text; void image; void video;
  return {};
};

export const saveOutput: Resolver = async (node, ctx) => {
  const p = node.data.params || {};
  const text = ctx.resolvePort(node.id, 'text') as string | undefined;
  const image = ctx.resolvePort(node.id, 'image') as { url: string; dataUri?: string } | undefined;
  const video = ctx.resolvePort(node.id, 'video') as { url: string } | undefined;
  const kind: 'text' | 'image' | 'video' =
    video ? 'video' : image ? 'image' : text !== undefined ? 'text' : 'text';
  const source: { url?: string; dataUri?: string; text?: string } = {};
  if (kind === 'image' && image) {
    if (image.dataUri) source.dataUri = image.dataUri;
    else source.url = image.url;
  } else if (kind === 'video' && video) {
    source.url = video.url;
  } else if (kind === 'text' && text !== undefined) {
    source.text = text;
  }
  const { saveOutput } = await import('../../api/upload');
  const res = await saveOutput({
    kind,
    source,
    savePath: (p.savePath as string) || undefined,
    baseName: (p.baseName as string) || (node.id.slice(0, 8)),
  });
  return { text: `已保存到 ${res.path}` };
};
