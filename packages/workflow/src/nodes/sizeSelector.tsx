import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { useWorkflowStore } from '../store/workflowStore';
import { renderParamInput } from '../components/ParamInput';
import type { NodeMeta } from '../engine/types';

export const meta: NodeMeta = {
  type: 'sizeSelector',
  label: '尺寸选择',
  category: 'utility',
  icon: 'i-carbon-aspect-ratio',
  inputs: [],
  outputs: [{ id: 'size', type: 'size', label: '尺寸' }],
  params: {
    preset: { kind: 'size', default: '1024x1024', label: '预设' },
    customSize: { kind: 'string', default: '', label: '自定义（WxH）', placeholder: '1024x768' },
  },
};

export const Component = memo(function SizeSelectorNode() {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const updateParams = useWorkflowStore((s) => s.updateNodeParams);
  const params = node?.data?.params || {};
  return (
    <NodeShell meta={meta}>
      <div>
        {renderParamInput({
          paramKey: 'preset', def: meta.params!.preset,
          value: params.preset, onChange: (v) => updateParams(id, { preset: v }),
        })}
        {params.preset === 'custom' && (
          <div className="mt-1">
            {renderParamInput({
              paramKey: 'customSize', def: meta.params!.customSize,
              value: params.customSize, onChange: (v) => updateParams(id, { customSize: v }),
            })}
          </div>
        )}
      </div>
    </NodeShell>
  );
});
