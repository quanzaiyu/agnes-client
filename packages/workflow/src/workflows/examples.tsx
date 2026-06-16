/**
 * Built-in example workflows. They are plain data — no React code — so they
 * can be loaded into the workflow store on demand.
 */

import type { WorkflowNode, WorkflowEdge } from '../engine/types';

interface Example {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

function n(id: string, type: string, x: number, y: number, params: Record<string, unknown> = {}): WorkflowNode {
  return {
    id,
    type,
    position: { x, y },
    data: { params, status: 'idle' },
  };
}

function e(id: string, source: string, sourceHandle: string, target: string, targetHandle: string): WorkflowEdge {
  return { id, source, sourceHandle, target, targetHandle };
}

export const examples: Example[] = [
  {
    id: 'text-to-image',
    name: '文生图（基础）',
    description: '提示词 → 图像生成 → 预览',
    nodes: [
      n('n1', 'promptInput', 80, 80, { text: 'A cinematic shot of a cat astronaut floating in space, soft starfield, photorealistic, 8k' }),
      n('n2', 'imageGeneration', 480, 80, { model: 'agnes-image-2.1-flash', size: '1024x1024' }),
      n('n3', 'previewOutput', 880, 80, {}),
    ],
    edges: [
      e('e1', 'n1', 'text', 'n2', 'prompt'),
      e('e2', 'n2', 'image', 'n3', 'image'),
    ],
  },
  {
    id: 'img-to-img',
    name: '图生图（参考图）',
    description: '上传图 → 提示词 → 图像生成 → 预览',
    nodes: [
      n('n1', 'imageInput', 80, 60, {}),
      n('n2', 'promptInput', 80, 240, { text: 'Transform into a watercolor illustration, soft pastels, paper texture' }),
      n('n3', 'imageGeneration', 480, 160, { model: 'agnes-image-2.1-flash', size: '1024x1024' }),
      n('n4', 'previewOutput', 880, 160, {}),
    ],
    edges: [
      e('e1', 'n1', 'image', 'n3', 'image'),
      e('e2', 'n2', 'text', 'n3', 'prompt'),
      e('e3', 'n3', 'image', 'n4', 'image'),
    ],
  },
  {
    id: 'variable-text',
    name: '变量 + 文本生成',
    description: '用 ${subject} 占位 + 变量输入',
    nodes: [
      n('n1', 'variableInput', 80, 60, { name: 'subject', value: 'a silver fox in a snowy forest' }),
      n('n2', 'promptInput', 80, 220, { text: 'Write a one-sentence poetic description of: ${subject}' }),
      n('n3', 'textGeneration', 480, 140, { model: 'agnes-2.0-flash' }),
      n('n4', 'previewOutput', 880, 140, {}),
    ],
    edges: [
      e('e1', 'n1', 'text', 'n2', 'text'),
      e('e2', 'n2', 'text', 'n3', 'prompt'),
      e('e3', 'n3', 'text', 'n4', 'text'),
    ],
  },
  {
    id: 'image-to-video',
    name: '图生视频',
    description: '上传图 → 视频生成 → 预览',
    nodes: [
      n('n1', 'imageInput', 80, 80, {}),
      n('n2', 'promptInput', 80, 260, { text: 'The subject slowly turns and smiles, hair moving gently in the wind, cinematic camera movement' }),
      n('n3', 'videoGeneration', 480, 160, { model: 'agnes-video-v2.0', size: '1216x832', numFrames: 121, frameRate: 24 }),
      n('n4', 'previewOutput', 880, 160, {}),
    ],
    edges: [
      e('e1', 'n1', 'image', 'n3', 'image'),
      e('e2', 'n2', 'text', 'n3', 'prompt'),
      e('e3', 'n3', 'video', 'n4', 'video'),
    ],
  },
  {
    id: 'full-chain',
    name: '完整链：文本 → 图像 → 视频',
    description: 'TextGen 写提示词 → ImageGen 生成关键帧 → VideoGen 动画化',
    nodes: [
      n('n1', 'textInput', 80, 80, { value: 'A bioluminescent jellyfish drifting through a deep ocean trench, glowing cyan tendrils, cinematic underwater footage' }),
      n('n2', 'imageGeneration', 380, 80, { model: 'agnes-image-2.1-flash', size: '1216x832' }),
      n('n3', 'promptInput', 80, 280, { text: 'The jellyfish pulses gently, its tendrils swaying with the current, slow cinematic camera drift' }),
      n('n4', 'videoGeneration', 720, 200, { model: 'agnes-video-v2.0', size: '1216x832', numFrames: 121, frameRate: 24 }),
      n('n5', 'previewOutput', 1100, 200, {}),
    ],
    edges: [
      e('e1', 'n1', 'text', 'n2', 'prompt'),
      e('e2', 'n2', 'image', 'n4', 'image'),
      e('e3', 'n3', 'text', 'n4', 'prompt'),
      e('e4', 'n4', 'video', 'n5', 'video'),
    ],
  },
];
