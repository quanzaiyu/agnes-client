import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { useWorkflowStore } from '../store/workflowStore';
import { renderParamInput } from '../components/ParamInput';
import type { NodeMeta } from '../engine/types';

export const meta: NodeMeta = {
  type: 'modelSelector',
  label: '模型选择',
  category: 'utility',
  icon: 'i-carbon-model-alt',
  inputs: [],
  outputs: [{ id: 'text', type: 'text', label: '模型 ID' }],
  params: {
    model: { kind: 'model', default: 'agnes-2.0-flash', label: '模型' },
  },
};

export const Component = memo(function ModelSelectorNode() {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const updateParams = useWorkflowStore((s) => s.updateNodeParams);
  const params = node?.data?.params || {};
  return (
    <NodeShell meta={meta}>
      {renderParamInput({
        paramKey: 'model', def: meta.params!.model,
        value: params.model, onChange: (v) => updateParams(id, { model: v }),
      })}
    </NodeShell>
  );
});
