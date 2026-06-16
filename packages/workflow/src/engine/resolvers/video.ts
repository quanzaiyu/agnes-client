import type { Resolver, PortValue } from '../types';
import { createVideo, waitForVideo } from '../../api/client';
import { DEFAULT_MODEL } from '../../lib/models';
import { parseSize } from '../../lib/sizes';

export const videoGeneration: Resolver = async (node, ctx) => {
  const p = node.data.params || {};
  const rawPrompt = ctx.resolvePort(node.id, 'prompt') as string | undefined;
  if (!rawPrompt) throw new Error('未连接提示词');
  const prompt = ctx.interpolate(rawPrompt);

  const sizePort = ctx.resolvePort(node.id, 'size') as { width: number; height: number } | undefined;
  const sizeStr = (p.size as string) || '1216x832';
  let sizeObj = sizePort;
  if (!sizeObj && sizeStr !== 'custom') sizeObj = parseSize(sizeStr) || undefined;
  if (!sizeObj) sizeObj = parseSize((p.customSize as string) || '1216x832') || undefined;
  const sizeObj2 = sizeObj ?? { width: 1216, height: 832 };

  const imageInput = ctx.resolvePort(node.id, 'image') as { url: string; dataUri?: string } | undefined;
  let image: string | string[] | undefined;
  if (imageInput) {
    if (imageInput.dataUri) image = imageInput.dataUri;
    else if (imageInput.url) image = imageInput.url;
  }

  const modelPort = ctx.resolvePort(node.id, 'model') as string | undefined;
  const model = modelPort || (p.model as string) || DEFAULT_MODEL.video;

  const numFrames = (p.numFrames as number) || 121;
  const frameRate = (p.frameRate as number) || 24;
  const mode = (p.mode as string) || undefined;
  const negativePrompt = (p.negativePrompt as string) || undefined;
  const seed = p.seed !== undefined && p.seed !== null && p.seed !== '' ? Number(p.seed) : undefined;

  ctx.onProgress(0);
  const task = await createVideo({
    model,
    prompt,
    image,
    mode,
    width: sizeObj2.width,
    height: sizeObj2.height,
    numFrames,
    frameRate,
    seed,
    negativePrompt,
    signal: ctx.signal,
  });

  const result = await waitForVideo(task.video_id, {
    signal: ctx.signal,
    onProgress: (pct) => ctx.onProgress(pct),
    pollInterval: 5000,
    maxWait: 600000,
  });

  const url = result.remixed_from_video_id;
  if (!url) throw new Error('视频生成完成但未返回 URL');

  return { video: { url, meta: { ...result } } as PortValue };
};
