import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { useWorkflowStore } from '../store/workflowStore';
import { VariablePorts } from './shared/VariablePorts';
import type { NodeMeta } from '../engine/types';

export const meta: NodeMeta = {
  type: 'promptInput',
  label: '提示词',
  category: 'input',
  icon: 'i-carbon-text-annotation-toggle',
  inputs: [],   // Dynamic var:* inputs are appended at runtime
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
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const updateParams = useWorkflowStore((s) => s.updateNodeParams);
  const value = (node?.data?.params?.text as string) || '';
  const varInputs = (node?.data?.varInputs as Array<{ id: string; name: string }> | undefined) || [];

  return (
    <NodeShell meta={meta}>
      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">提示词</label>
          <textarea
            className="input-base w-full min-h-[80px] font-mono text-[11px] leading-relaxed nodrag"
            placeholder={meta.params!.text.placeholder}
            value={value}
            onChange={(e) => updateParams(id, { text: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
        <VariablePorts vars={varInputs} />
      </div>
    </NodeShell>
  );
});
