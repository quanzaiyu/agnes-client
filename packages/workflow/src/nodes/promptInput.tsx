import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { TextPreview } from '../components/NodePreview';
import { renderParamInput } from '../components/ParamInput';
import { useWorkflowStore } from '../store/workflowStore';
import type { NodeMeta } from '../engine/types';

export const meta: NodeMeta = {
  type: 'promptInput',
  label: '提示词',
  category: 'input',
  icon: 'i-carbon-text-annotation-toggle',
  inputs: [],
  outputs: [{ id: 'text', type: 'text', label: '提示词' }],
  params: {
    text: {
      kind: 'multiline',
      default: '',
      label: '提示词内容',
      placeholder: '支持 ${varName} 占位符，运行时被 VariableInput 节点替换',
      help: '用 ${name} 引用 VariableInput 中 name=name 的变量',
    },
  },
};

export const Component = memo(function PromptInputNode() {
  const id = useNodeId()!;
  const data = useWorkflowStore((s) => s.nodes.find((n) => n.id === id)?.data);
  const updateParams = useWorkflowStore((s) => s.updateNodeParams);
  const value = (data?.params?.text as string) || '';
  return (
    <NodeShell meta={meta}>
      <div className="space-y-1">
        <div className="text-[10px] text-gray-500">内容</div>
        <TextPreview text={value} max={140} />
      </div>
    </NodeShell>
  );
});
