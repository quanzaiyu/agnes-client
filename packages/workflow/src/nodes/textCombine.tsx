import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { useWorkflowStore } from '../store/workflowStore';
import { renderParamInput } from '../components/ParamInput';
import type { NodeMeta } from '../engine/types';

export const meta: NodeMeta = {
  type: 'textCombine',
  label: '文本拼接',
  category: 'utility',
  icon: 'i-carbon-join',
  inputs: [
    { id: 'a', type: 'text', label: 'A' },
    { id: 'b', type: 'text', label: 'B' },
  ],
  outputs: [{ id: 'text', type: 'text', label: '拼接结果' }],
  params: {
    separator: { kind: 'string', default: '\n', label: '分隔符', placeholder: '\\n / , / 留空' },
  },
};

export const Component = memo(function TextCombineNode() {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const updateParams = useWorkflowStore((s) => s.updateNodeParams);
  const params = node?.data?.params || {};
  return (
    <NodeShell meta={meta}>
      <div>
        <label className="text-[10px] text-gray-500">分隔符</label>
        {renderParamInput({
          paramKey: 'separator', def: meta.params!.separator,
          value: params.separator, onChange: (v) => updateParams(id, { separator: v }),
        })}
      </div>
    </NodeShell>
  );
});
