/**
 * Right-click context menu for a node. Provides type-specific actions
 * (currently: "添加变量输入" for promptInput/textInput) plus generic actions
 * (duplicate, delete) for every node.
 */

import { useEffect, useRef, useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { newId } from '../lib/id';
import { getNodeMeta } from '../nodes';
import type { WorkflowNode } from '../engine/types';

interface Props {
  nodeId: string;
  nodeType: string;
  x: number;
  y: number;
  onClose: () => void;
}

export function NodeContextMenu({ nodeId, nodeType, x, y, onClose }: Props) {
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === nodeId));
  const setNodes = useWorkflowStore((s) => s.setNodes);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const updateNodeParams = useWorkflowStore((s) => s.updateNodeParams);
  const addNode = useWorkflowStore((s) => s.addNode);
  const menuRef = useRef<HTMLDivElement>(null);
  const [askName, setAskName] = useState(false);

  // Adjust position so menu stays in viewport
  const [pos, setPos] = useState({ x, y });
  useEffect(() => {
    if (!menuRef.current) return;
    const r = menuRef.current.getBoundingClientRect();
    let nx = x, ny = y;
    if (x + r.width > window.innerWidth - 8) nx = window.innerWidth - r.width - 8;
    if (y + r.height > window.innerHeight - 8) ny = window.innerHeight - r.height - 8;
    setPos({ x: nx, y: ny });
  }, [x, y]);

  if (!node) return null;

  const supportsVariables = nodeType === 'promptInput' || nodeType === 'textInput';
  const varInputPorts = (node.data as { varInputs?: Array<{ id: string; name: string }> })?.varInputs || [];

  const addVariableInput = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setNodes((nodes) => nodes.map((n) => {
      if (n.id !== nodeId) return n;
      const cur = (n.data as { varInputs?: Array<{ id: string; name: string }> }).varInputs || [];
      if (cur.some((v) => v.name === trimmed)) return n;
      return {
        ...n,
        data: {
          ...n.data,
          varInputs: [...cur, { id: newId('v'), name: trimmed }],
        },
      };
    }));
    setAskName(false);
    onClose();
  };

  const removeVariableInput = (vid: string) => {
    setNodes((nodes) => nodes.map((n) => {
      if (n.id !== nodeId) return n;
      const cur = (n.data as { varInputs?: Array<{ id: string; name: string }> }).varInputs || [];
      return { ...n, data: { ...n.data, varInputs: cur.filter((v) => v.id !== vid) } };
    }));
    // Also remove any edges connected to that port
    const { edges, onEdgesChange } = useWorkflowStore.getState();
    const toRemove = edges.filter((e) => e.source === nodeId && e.target === nodeId ? false : (e.target === nodeId && e.targetHandle === `var:${vid}`));
    if (toRemove.length) {
      onEdgesChange(toRemove.map((e) => ({ id: e.id, type: 'remove' as const })));
    }
  };

  const duplicate = () => {
    const offset = { x: 40, y: 40 };
    const dup: WorkflowNode = {
      ...node,
      id: newId('n'),
      position: { x: node.position.x + offset.x, y: node.position.y + offset.y },
      data: { ...node.data, status: 'idle', error: undefined, progress: undefined, outputs: undefined, streamText: undefined },
      selected: false,
    };
    setNodes((nodes) => [...nodes, dup]);
    onClose();
  };

  const remove = () => {
    removeNode(nodeId);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 panel min-w-[200px] py-1 text-xs shadow-xl"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {supportsVariables && (
        <>
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-500">变量输入</div>
          {varInputPorts.length === 0 && (
            <div className="px-3 py-1 text-gray-500 italic">（未添加）</div>
          )}
          {varInputPorts.map((v) => (
            <div key={v.id} className="px-3 py-1 flex items-center gap-2 hover:bg-surface-border">
              <span className="font-mono text-primary-400">${v.name}</span>
              <span className="text-gray-400 flex-1 truncate">{v.id}</span>
              <button
                className="text-gray-500 hover:text-red-400"
                onClick={() => removeVariableInput(v.id)}
                title="删除"
              >×</button>
            </div>
          ))}
          {askName ? (
            <VariableNameInput
              onSubmit={addVariableInput}
              onCancel={() => setAskName(false)}
            />
          ) : (
            <button
              className="block w-full text-left px-3 py-1.5 hover:bg-surface-border text-primary-400"
              onClick={() => setAskName(true)}
            >
              + 添加变量输入
            </button>
          )}
          <div className="border-t border-surface-border my-1" />
        </>
      )}

      <button
        className="block w-full text-left px-3 py-1.5 hover:bg-surface-border"
        onClick={duplicate}
      >
        复制节点
      </button>
      <button
        className="block w-full text-left px-3 py-1.5 hover:bg-surface-border text-red-400"
        onClick={remove}
      >
        删除节点
      </button>

      <div className="border-t border-surface-border my-1" />
      <div className="px-3 py-1 text-[10px] text-gray-500 font-mono">
        {getNodeMeta(nodeType)?.label || nodeType}
      </div>
    </div>
  );
}

function VariableNameInput({ onSubmit, onCancel }: { onSubmit: (name: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState('');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <form
      className="px-3 py-1.5 flex gap-1"
      onSubmit={(e) => { e.preventDefault(); onSubmit(val); }}
    >
      <input
        type="text"
        autoFocus
        placeholder="变量名（如 subject）"
        className="input-base flex-1 text-xs"
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <button type="submit" className="btn-primary text-[10px] px-2">添加</button>
    </form>
  );
}
