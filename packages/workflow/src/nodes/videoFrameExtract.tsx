import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { useWorkflowStore } from '../store/workflowStore';
import { renderParamInput } from '../components/ParamInput';
import type { NodeMeta } from '../engine/types';

export const meta: NodeMeta = {
  type: 'videoFrameExtract',
  label: '视频取帧',
  category: 'utility',
  icon: 'i-carbon-camera',
  inputs: [{ id: 'video', type: 'video', label: '视频', required: true }],
  outputs: [{ id: 'image', type: 'image', label: '帧' }],
  params: {
    frame: { kind: 'number', default: 0, label: '帧序号（秒）' },
    format: { kind: 'enum', default: 'png', label: '格式', options: [
      { label: 'PNG', value: 'png' }, { label: 'JPEG', value: 'jpeg' },
    ] },
  },
};

export const Component = memo(function VideoFrameExtractNode() {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const updateParams = useWorkflowStore((s) => s.updateNodeParams);
  const params = node?.data?.params || {};
  const out = (node?.data?.outputs as { image?: { url: string } } | undefined)?.image;
  return (
    <NodeShell meta={meta}>
      <div className="space-y-1">
        {out?.url ? (
          <img src={out.url} className="rounded border border-surface-border max-w-full" style={{ maxHeight: 100 }} />
        ) : (
          <div className="text-gray-500 italic">（运行后显示帧）</div>
        )}
      </div>
    </NodeShell>
  );
});
