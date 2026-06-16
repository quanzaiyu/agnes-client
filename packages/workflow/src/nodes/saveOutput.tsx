import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { useWorkflowStore } from '../store/workflowStore';
import { renderParamInput } from '../components/ParamInput';
import type { NodeMeta } from '../engine/types';

export const meta: NodeMeta = {
  type: 'saveOutput',
  label: '保存',
  category: 'output',
  icon: 'i-carbon-save',
  inputs: [
    { id: 'text', type: 'text', label: '文本' },
    { id: 'image', type: 'image', label: '图片' },
    { id: 'video', type: 'video', label: '视频' },
  ],
  outputs: [{ id: 'text', type: 'text', label: '结果' }],
  params: {
    baseName: { kind: 'string', default: 'output', label: '文件名前缀' },
    savePath: { kind: 'string', default: '', label: '保存路径（可选）', placeholder: 'images/foo.png 或留空用默认' },
  },
};

export const Component = memo(function SaveOutputNode() {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const updateParams = useWorkflowStore((s) => s.updateNodeParams);
  const params = node?.data?.params || {};
  const out = (node?.data?.outputs as { text?: string } | undefined)?.text;
  return (
    <NodeShell meta={meta}>
      <div className="space-y-1">
        {out && <div className="text-green-400 text-[11px] break-words">{out}</div>}
        {!out && <div className="text-gray-500 italic">（运行后保存）</div>}
      </div>
    </NodeShell>
  );
});
