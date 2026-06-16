import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { ImagePreview } from '../components/NodePreview';
import { useWorkflowStore } from '../store/workflowStore';
import { renderParamInput } from '../components/ParamInput';
import type { NodeMeta } from '../engine/types';

export const meta: NodeMeta = {
  type: 'imageGeneration',
  label: '图像生成',
  category: 'generation',
  icon: 'i-carbon-image',
  inputs: [
    { id: 'prompt', type: 'text', label: '提示词', required: true },
    { id: 'size', type: 'size', label: '尺寸' },
    { id: 'image', type: 'image', label: '参考图' },
    { id: 'model', type: 'text', label: '模型' },
  ],
  outputs: [{ id: 'image', type: 'image', label: '输出图像' }],
  params: {
    model: { kind: 'model', default: 'agnes-image-2.1-flash', label: '模型' },
    size: { kind: 'size', default: '1024x1024', label: '尺寸' },
    responseFormat: { kind: 'enum', default: 'url', label: '返回格式', options: [
      { label: 'URL', value: 'url' }, { label: 'Base64', value: 'b64_json' },
    ] },
  },
};

export const Component = memo(function ImageGenerationNode() {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const params = node?.data?.params || {};
  const out = (node?.data?.outputs as { image?: { url: string } } | undefined)?.image;
  return (
    <NodeShell meta={meta}>
      {out?.url ? <ImagePreview value={out} maxHeight={140} /> : <div className="text-gray-500 italic">（无图像）</div>}
    </NodeShell>
  );
});
