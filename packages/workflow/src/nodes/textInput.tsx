import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { useWorkflowStore } from '../store/workflowStore';
import { VariablePorts } from './shared/VariablePorts';
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
  const varInputs = (node?.data?.varInputs as Array<{ id: string; name: string }> | undefined) || [];

  return (
    <NodeShell meta={meta}>
      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">内容</label>
          <textarea
            className="input-base w-full min-h-[60px] font-mono text-[11px] leading-relaxed nodrag"
            placeholder={meta.params!.value.placeholder}
            value={(params.value as string) || ''}
            onChange={(e) => updateParams(id, { value: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
        <VariablePorts vars={varInputs} />
      </div>
    </NodeShell>
  );
});
