import type { Resolver, WorkflowNode, ResolverContext, PortValue } from '../types';
import { chat } from '../../api/client';
import { DEFAULT_MODEL } from '../../lib/models';

export const textGeneration: Resolver = async (node, ctx) => {
  const p = node.data.params || {};
  const rawPrompt = ctx.resolvePort(node.id, 'prompt') as string | undefined;
  if (!rawPrompt) throw new Error('未连接提示词');
  const prompt = ctx.interpolate(rawPrompt);

  const imageInputs = ctx.resolveAll(node.id, 'image') as Array<{ url: string } | string>;

  const modelPort = ctx.resolvePort(node.id, 'model') as string | undefined;
  const model = modelPort || (p.model as string) || DEFAULT_MODEL.text;

  const messages: Array<{ role: string; content: unknown }> = [];
  if (p.system && (p.system as string).trim()) {
    messages.push({ role: 'system', content: p.system });
  }
  if (imageInputs.length > 0) {
    // Vision mode
    const img = imageInputs[0];
    const imgUrl = typeof img === 'string' ? img : img.url;
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imgUrl } },
      ],
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const useStream = p.stream !== false;
  const thinking = !!p.thinking;

  ctx.onProgress(5);

  if (useStream) {
    const stream = await chat({
      model,
      messages: messages as never,
      stream: true,
      temperature: p.temperature as number | undefined,
      maxTokens: p.maxTokens as number | undefined,
      thinking,
      signal: ctx.signal,
    });
    let full = '';
    for await (const delta of stream as AsyncIterable<string>) {
      full += delta;
      ctx.onStream(delta);
    }
    ctx.onProgress(100);
    return { text: full };
  } else {
    const result = (await chat({
      model,
      messages: messages as never,
      temperature: p.temperature as number | undefined,
      maxTokens: p.maxTokens as number | undefined,
      thinking,
      signal: ctx.signal,
    })) as { choices: Array<{ message: { content: string } }> };
    const text = result.choices?.[0]?.message?.content || '';
    ctx.onProgress(100);
    return { text };
  }
};
