import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { useWorkflowStore } from '../store/workflowStore';
import { renderParamInput } from '../components/ParamInput';
import type { NodeMeta } from '../engine/types';

export const meta: NodeMeta = {
  type: 'numberInput',
  label: '数字输入',
  category: 'utility',
  icon: 'i-carbon-number-0',
  inputs: [],
  outputs: [{ id: 'number', type: 'number', label: '数字' }],
  params: {
    value: { kind: 'number', default: 0, label: '值' },
  },
};

export const Component = memo(function NumberInputNode() {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const updateParams = useWorkflowStore((s) => s.updateNodeParams);
  const params = node?.data?.params || {};
  return (
    <NodeShell meta={meta}>
      {renderParamInput({
        paramKey: 'value', def: meta.params!.value,
        value: params.value, onChange: (v) => updateParams(id, { value: v }),
      })}
    </NodeShell>
  );
});
