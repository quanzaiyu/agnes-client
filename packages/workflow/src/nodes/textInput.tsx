import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { TextPreview } from '../components/NodePreview';
import { useWorkflowStore } from '../store/workflowStore';
import { renderParamInput } from '../components/ParamInput';
import type { NodeMeta } from '../engine/types';

export const meta: NodeMeta = {
  type: 'textInput',
  label: '文本输入',
  category: 'input',
  icon: 'i-carbon-document',
  inputs: [],
  outputs: [{ id: 'text', type: 'text', label: '文本' }],
  params: {
    value: { kind: 'multiline', default: '', label: '内容', placeholder: '任意文本（不会进行 ${var} 插值）' },
  },
};

export const Component = memo(function TextInputNode() {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const updateParams = useWorkflowStore((s) => s.updateNodeParams);
  const params = node?.data?.params || {};
  return (
    <NodeShell meta={meta}>
      <div className="space-y-1">
        <div className="text-[10px] text-gray-500">内容</div>
        <TextPreview text={params.value as string} max={140} />
      </div>
    </NodeShell>
  );
});
