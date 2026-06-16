import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { TextPreview } from '../components/NodePreview';
import { useWorkflowStore } from '../store/workflowStore';
import { renderParamInput } from '../components/ParamInput';
import type { NodeMeta } from '../engine/types';

export const meta: NodeMeta = {
  type: 'textGeneration',
  label: '文本生成',
  category: 'generation',
  icon: 'i-carbon-chat',
  inputs: [
    { id: 'prompt', type: 'text', label: '提示词', required: true },
    { id: 'model', type: 'text', label: '模型' },
    { id: 'image', type: 'image', label: '参考图（多模态）' },
  ],
  outputs: [{ id: 'text', type: 'text', label: '输出文本' }],
  params: {
    model: { kind: 'model', default: 'agnes-2.0-flash', label: '模型' },
    system: { kind: 'text', default: '', label: 'System Prompt' },
    temperature: { kind: 'number', default: 0.7, label: '温度', min: 0, max: 2, step: 0.1 },
    maxTokens: { kind: 'number', default: 1024, label: '最大 Token' },
    thinking: { kind: 'boolean', default: false, label: '深度思考' },
    stream: { kind: 'boolean', default: true, label: '流式输出' },
  },
};

export const Component = memo(function TextGenerationNode() {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const params = node?.data?.params || {};
  const streamText = (node?.data?.streamText as string) || '';
  return (
    <NodeShell meta={meta}>
      <TextPreview text={streamText} max={200} />
    </NodeShell>
  );
});
