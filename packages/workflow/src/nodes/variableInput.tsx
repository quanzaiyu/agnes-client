import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { useWorkflowStore } from '../store/workflowStore';
import { renderParamInput } from '../components/ParamInput';
import type { NodeMeta } from '../engine/types';

export const meta: NodeMeta = {
  type: 'variableInput',
  label: '变量',
  category: 'input',
  icon: 'i-carbon-tag',
  inputs: [],
  outputs: [{ id: 'text', type: 'text', label: '变量值' }],
  params: {
    name: { kind: 'string', default: 'subject', label: '变量名', placeholder: 'subject', help: '与提示词中的 ${name} 对应' },
    value: { kind: 'string', default: 'cat', label: '值' },
  },
};

export const Component = memo(function VariableInputNode() {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const updateParams = useWorkflowStore((s) => s.updateNodeParams);
  const params = node?.data?.params || {};
  return (
    <NodeShell meta={meta}>
      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-gray-500">变量名</label>
          {renderParamInput({
            paramKey: 'name', def: meta.params!.name,
            value: params.name, onChange: (v) => updateParams(id, { name: v }),
          })}
        </div>
        <div>
          <label className="text-[10px] text-gray-500">值</label>
          {renderParamInput({
            paramKey: 'value', def: meta.params!.value,
            value: params.value, onChange: (v) => updateParams(id, { value: v }),
          })}
        </div>
      </div>
    </NodeShell>
  );
});
