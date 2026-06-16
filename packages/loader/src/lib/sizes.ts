/** Common size presets for image and video generation. */

export interface SizePreset {
  label: string;
  value: string; // "WxH"
  width: number;
  height: number;
  kind: 'image' | 'video' | 'both';
}

export const SIZE_PRESETS: SizePreset[] = [
  { label: '1024x1024 (方形)',  value: '1024x1024', width: 1024, height: 1024, kind: 'image' },
  { label: '1024x768 (4:3)',    value: '1024x768',  width: 1024, height: 768,  kind: 'image' },
  { label: '768x1024 (3:4)',    value: '768x1024',  width: 768,  height: 1024, kind: 'image' },
  { label: '1280x720 (16:9)',   value: '1280x720',  width: 1280, height: 720,  kind: 'image' },
  { label: '720x1280 (9:16)',   value: '720x1280',  width: 720,  height: 1280, kind: 'image' },
  { label: '1920x1080 (FHD)',   value: '1920x1080', width: 1920, height: 1080, kind: 'image' },
  { label: '1216x832',          value: '1216x832',  width: 1216, height: 832,  kind: 'video' },
  { label: '1152x768',          value: '1152x768',  width: 1152, height: 768,  kind: 'both' },
  { label: '1088x640 (16:9)',   value: '1088x640',  width: 1088, height: 640,  kind: 'video' },
  { label: '960x576',           value: '960x576',   width: 960,  height: 576,  kind: 'video' },
  { label: '🖊 自定义',         value: 'custom',    width: 0,    height: 0,    kind: 'both' },
];

export function parseSize(s: string): { width: number; height: number } | null {
  const m = /^(\d+)x(\d+)$/i.exec(s);
  if (!m) return null;
  return { width: parseInt(m[1]), height: parseInt(m[2]) };
}
