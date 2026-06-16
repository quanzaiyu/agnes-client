import { memo } from 'react';
import { useNodeId } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';
import { useWorkflowStore } from '../store/workflowStore';
import { newId } from '../lib/id';
import type { NodeMeta, WorkflowNode } from '../engine/types';

interface VarPair { id: string; name: string; value: string }

export const meta: NodeMeta = {
  type: 'variableInput',
  label: '变量',
  category: 'input',
  icon: 'i-carbon-tag',
  inputs: [],
  // Outputs are dynamic (one per VarPair); we add `var:<id>` ports via
  // NodeShell's allInputs extension reading data.varPairs.
  outputs: [],  // not used directly; NodeShell renders dynamic handles from data
  params: {},
};

export const Component = memo(function VariableInputNode() {
  const id = useNodeId()!;
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const setNodes = useWorkflowStore((s) => s.setNodes);
  const pairs = ((node?.data?.varPairs as VarPair[] | undefined) || []);

  const addPair = () => {
    setNodes((nodes: WorkflowNode[]) => nodes.map((n) => {
      if (n.id !== id) return n;
      const cur = (n.data.varPairs as VarPair[] | undefined) || [];
      const newName = `var${cur.length + 1}`;
      return { ...n, data: { ...n.data, varPairs: [...cur, { id: newId('vp'), name: newName, value: '' }] } };
    }));
  };
  const updatePair = (vid: string, patch: Partial<VarPair>) => {
    setNodes((nodes: WorkflowNode[]) => nodes.map((n) => {
      if (n.id !== id) return n;
      const cur = (n.data.varPairs as VarPair[] | undefined) || [];
      return { ...n, data: { ...n.data, varPairs: cur.map((p) => p.id === vid ? { ...p, ...patch } : p) } };
    }));
  };
  const removePair = (vid: string) => {
    setNodes((nodes: WorkflowNode[]) => nodes.map((n) => {
      if (n.id !== id) return n;
      const cur = (n.data.varPairs as VarPair[] | undefined) || [];
      return { ...n, data: { ...n.data, varPairs: cur.filter((p) => p.id !== vid) } };
    }));
    const { edges, onEdgesChange } = useWorkflowStore.getState();
    const toRemove = edges.filter((e) => e.source === id && e.sourceHandle === `var:${vid}`);
    if (toRemove.length) onEdgesChange(toRemove.map((e) => ({ id: e.id, type: 'remove' as const })));
  };

  return (
    <NodeShell meta={meta}>
      <div className="space-y-2">
        {pairs.length === 0 && (
          <div className="text-[10px] text-gray-500 italic">点击下方按钮添加变量</div>
        )}
        {pairs.map((p) => (
          <div key={p.id} className="border border-surface-border rounded p-1.5 space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-primary-400 font-mono shrink-0">$</span>
              <input
                type="text"
                className="input-base flex-1 text-[11px] font-mono nodrag"
                placeholder="name"
                value={p.name}
                onChange={(e) => updatePair(p.id, { name: e.target.value.replace(/[^\w-]/g, '_') })}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
              <button
                className="text-gray-500 hover:text-red-400 text-xs px-1"
                onClick={() => removePair(p.id)}
                title="删除"
              >×</button>
            </div>
            <input
              type="text"
              className="input-base w-full text-[11px] nodrag"
              placeholder="value"
              value={p.value}
              onChange={(e) => updatePair(p.id, { value: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
        ))}
        <button
          className="btn-ghost w-full justify-center text-[11px]"
          onClick={addPair}
        >
          + 添加变量
        </button>
      </div>
    </NodeShell>
  );
});
