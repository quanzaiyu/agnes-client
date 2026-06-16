import type { Resolver, WorkflowNode, ResolverContext, PortValue } from './types';
import { generateImage } from '../api/client';
import { parseSize } from '../lib/sizes';
import { DEFAULT_MODEL } from '../lib/models';

export const imageGeneration: Resolver = async (node, ctx) => {
  const p = node.data.params || {};
  const rawPrompt = ctx.resolvePort(node.id, 'prompt') as string | undefined;
  if (!rawPrompt) throw new Error('未连接提示词');
  const prompt = ctx.interpolate(rawPrompt);

  const sizePort = ctx.resolvePort(node.id, 'size') as { width: number; height: number } | undefined;
  const sizeStr = (p.size as string) || '1024x1024';
  let sizeObj = sizePort;
  if (!sizeObj && sizeStr !== 'custom') sizeObj = parseSize(sizeStr) || undefined;
  if (!sizeObj) sizeObj = parseSize((p.customSize as string) || '1024x1024') || undefined;
  const sizeObj2 = sizeObj ?? { width: 1024, height: 1024 };
  const size = `${sizeObj2.width}x${sizeObj2.height}`;

  // Image inputs (fan-in)
  const imageInputs = ctx.resolveAll(node.id, 'image') as Array<{ url: string; dataUri?: string } | string>;
  const images: string[] = [];
  for (const i of imageInputs) {
    if (!i) continue;
    if (typeof i === 'string') images.push(i);
    else if (i.dataUri) images.push(i.dataUri);
    else if (i.url) images.push(i.url);
  }

  const modelPort = ctx.resolvePort(node.id, 'model') as string | undefined;
  const model = modelPort || (p.model as string) || DEFAULT_MODEL.image;

  const responseFormat = (p.responseFormat as 'url' | 'b64_json') || 'url';

  ctx.onProgress(5);
  const result = await generateImage({
    model,
    prompt,
    size,
    images: images.length ? images : undefined,
    responseFormat,
    signal: ctx.signal,
  });
  ctx.onProgress(100);

  const first = result.data?.[0];
  let url: string | undefined;
  if (first?.url) url = first.url;
  else if (first?.b64_json) {
    url = `data:image/png;base64,${first.b64_json}`;
  }
  if (!url) throw new Error('图像生成返回为空');

  return { image: { url, source: 'generation' } as PortValue };
};
