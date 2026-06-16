/**
 * Compact preview body shown inside a node (text excerpt, image thumbnail,
 * video placeholder). Stays within max-h to keep the canvas readable.
 */

import type { PortValue } from '../engine/types';

export function TextPreview({ text, max = 200 }: { text?: string; max?: number }) {
  const t = (text || '').trim();
  if (!t) return <span className="text-gray-500 italic">（无内容）</span>;
  const shown = t.length > max ? t.slice(0, max) + '…' : t;
  return <div className="whitespace-pre-wrap break-words text-[11px] leading-relaxed">{shown}</div>;
}

export function ImagePreview({ value, maxHeight = 120 }: { value?: PortValue; maxHeight?: number }) {
  const url = extractImageUrl(value);
  if (!url) return <span className="text-gray-500 italic">（无图片）</span>;
  return (
    <img
      src={url}
      alt="preview"
      className="block rounded border border-surface-border max-w-full"
      style={{ maxHeight }}
    />
  );
}

export function VideoPreview({ value, maxHeight = 120 }: { value?: PortValue; maxHeight?: number }) {
  const url = extractVideoUrl(value);
  if (!url) return <span className="text-gray-500 italic">（无视频）</span>;
  return (
    <video
      src={url}
      controls
      className="block rounded border border-surface-border max-w-full"
      style={{ maxHeight, maxWidth: 240 }}
    />
  );
}

export function extractImageUrl(v: PortValue): string | undefined {
  if (!v) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v && 'url' in v && (v as { url: string }).url) return (v as { url: string }).url;
  return undefined;
}

export function extractVideoUrl(v: PortValue): string | undefined {
  if (!v) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v && 'url' in v && (v as { url: string }).url) return (v as { url: string }).url;
  return undefined;
}
