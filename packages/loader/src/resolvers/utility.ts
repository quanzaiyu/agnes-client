/**
 * Resolvers for utility/IO nodes (input, output, combine, model, size, etc.).
 * These do not call the Agnes API directly — they shape data.
 */

import type { Resolver, PortValue } from './types';

export const promptInput: Resolver = async (node, ctx) => {
  const p = node.data.params || {};
  const raw = (p.text as string) || '';
  // Interpolate ${var} using vars collected from incoming var:xxx edges
  const text = ctx.interpolate(raw);
  return { text };
};

export const variableInput: Resolver = async (node) => {
  const pairs = ((node.data as { varPairs?: Array<{ id: string; name: string; value: string }> }).varPairs) || [];
  const out: Record<string, PortValue> = {};
  for (const p of pairs) {
    out[`var:${p.id}`] = { name: p.name, value: p.value ?? '' } as unknown as PortValue;
  }
  return out;
};

export const textInput: Resolver = async (node, ctx) => {
  const p = node.data.params || {};
  // textInput is the no-interpolation sibling of promptInput by design,
  // but if a user added var:xxx inputs and references, still allow interpolation
  const raw = (p.value as string) || '';
  return { text: ctx.variables && Object.keys(ctx.variables).length ? ctx.interpolate(raw) : raw };
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
  // The loader runs in Node; HTMLVideoElement/canvas are browser-only.
  // Throw a clear error so the user knows to run this workflow from the
  // editor instead.
  void ctx;
  void node;
  throw new Error('videoFrameExtract is not supported in the Node loader; run this workflow from the editor.');
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

export const previewText: Resolver = async (node, ctx) => {
  // previewText simply mirrors the upstream text into its own outputs so
  // that the node body (which reads from data.outputs.text via zustand)
  // is consistent with the execution engine. The UI also reads directly
  // from the upstream node's outputs as a fallback.
  const text = ctx.resolvePort(node.id, 'text') as string | undefined;
  return { text: text ?? '' };
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
  const { saveOutput } = await import('../api/upload');
  const res = await saveOutput({
    kind,
    source,
    savePath: (p.savePath as string) || undefined,
    baseName: (p.baseName as string) || (node.id.slice(0, 8)),
  });
  return { text: `已保存到 ${res.path}` };
};
